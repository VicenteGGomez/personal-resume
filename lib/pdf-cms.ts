import "server-only";

import { createHash, randomBytes, sign as rsaSign } from "node:crypto";
import forge from "node-forge";
import { Signer } from "@signpdf/utils";
import type { SigningIdentity } from "@/lib/signing-identity";
import type { DocTimestamp } from "@/lib/signed-docs";

/**
 * The CMS signature inside a signed PDF (PAdES baseline: `ETSI.CAdES.detached`),
 * plus an RFC 3161 timestamp on it from a free, independent authority — so the
 * signing time doesn't rest on this server's clock alone.
 *
 * Built by hand with node-forge's ASN.1 module because forge's own PKCS#7
 * signer can't carry the two attributes PAdES needs: `signingCertificateV2`
 * (signed) and `signatureTimeStampToken` (unsigned).
 */

const asn1 = forge.asn1;
const { Class, Type } = asn1;

const OID = {
  data: "1.2.840.113549.1.7.1",
  signedData: "1.2.840.113549.1.7.2",
  sha256: "2.16.840.1.101.3.4.2.1",
  sha256WithRSA: "1.2.840.113549.1.1.11",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  signingCertificateV2: "1.2.840.113549.1.9.16.2.47",
  signatureTimeStampToken: "1.2.840.113549.1.9.16.2.14",
};

/** FreeTSA: free, long-running, and its certificates are published. */
const DEFAULT_TSA_URL = "https://freetsa.org/tsr";
const TSA_TIMEOUT_MS = 10_000;

type Node = forge.asn1.Asn1;

const seq = (...value: Node[]) => asn1.create(Class.UNIVERSAL, Type.SEQUENCE, true, value);
const set = (...value: Node[]) => asn1.create(Class.UNIVERSAL, Type.SET, true, value);
const oid = (id: string) =>
  asn1.create(Class.UNIVERSAL, Type.OID, false, asn1.oidToDer(id).getBytes());
const octets = (bytes: Buffer) =>
  asn1.create(Class.UNIVERSAL, Type.OCTETSTRING, false, bytes.toString("binary"));
const int = (n: number) =>
  asn1.create(Class.UNIVERSAL, Type.INTEGER, false, asn1.integerToDer(n).getBytes());
const algorithm = (id: string) =>
  seq(oid(id), asn1.create(Class.UNIVERSAL, Type.NULL, false, ""));
const der = (node: Node) => Buffer.from(asn1.toDer(node).getBytes(), "binary");
const attribute = (type: string, value: Node) => seq(oid(type), set(value));

/** The issuer Name and serial INTEGER, straight from the certificate's bytes. */
function issuerAndSerial(certDer: Buffer): { issuer: Node; serial: Node } {
  const cert = asn1.fromDer(certDer.toString("binary"));
  const tbs = (cert.value as Node[])[0].value as Node[];
  // `[0] version` is optional; v3 certificates carry it.
  const offset = tbs[0].tagClass === Class.CONTEXT_SPECIFIC ? 1 : 0;
  return { serial: tbs[offset], issuer: tbs[offset + 2] };
}

/** ESS signing-certificate-v2: binds the signature to this exact certificate. */
function signingCertificateV2(certDer: Buffer): Node {
  const { issuer, serial } = issuerAndSerial(certDer);
  const certHash = createHash("sha256").update(certDer).digest();
  const issuerSerial = seq(
    // GeneralNames { [4] directoryName }
    seq(asn1.create(Class.CONTEXT_SPECIFIC, 4, true, [issuer])),
    serial,
  );
  // hashAlgorithm is omitted: SHA-256 is its default.
  return seq(seq(seq(octets(certHash), issuerSerial)));
}

/** DER `SET OF` is sorted by each element's encoding. */
function sortedForSet(nodes: Node[]): Node[] {
  return nodes
    .map((node) => ({ node, bytes: der(node) }))
    .sort((a, b) => Buffer.compare(a.bytes, b.bytes))
    .map(({ node }) => node);
}

// -- RFC 3161 ----------------------------------------------------------------

interface TimestampResult {
  token: Node;
  timestamp: DocTimestamp;
}

function timestampRequest(digest: Buffer): Buffer {
  // A positive nonce with no leading zero byte, so its DER is minimal.
  const nonce = randomBytes(8);
  nonce[0] = (nonce[0] & 0x7f) | 0x01;
  return der(
    seq(
      int(1),
      seq(algorithm(OID.sha256), octets(digest)),
      asn1.create(Class.UNIVERSAL, Type.INTEGER, false, nonce.toString("binary")),
      asn1.create(Class.UNIVERSAL, Type.BOOLEAN, false, String.fromCharCode(0xff)),
    ),
  );
}

/** TimeStampToken → TSTInfo, checking it stamps `digest`. */
function readTstInfo(token: Node, digest: Buffer): Date {
  const signedData = ((token.value as Node[])[1].value as Node[])[0].value as Node[];
  const encap = signedData[2].value as Node[];
  const eContent = (encap[1].value as Node[])[0];
  const tstInfo = asn1.fromDer(
    typeof eContent.value === "string"
      ? eContent.value
      : (eContent.value as Node[]).map((part) => part.value as string).join(""),
  ).value as Node[];
  const imprint = (tstInfo[2].value as Node[])[1].value as string;
  if (Buffer.compare(Buffer.from(imprint, "binary"), digest) !== 0) {
    throw new Error("The timestamp authority stamped a different hash.");
  }
  return asn1.generalizedTimeToDate(tstInfo[4].value as string);
}

async function requestTimestamp(digest: Buffer): Promise<TimestampResult> {
  const url = process.env.TSA_URL || DEFAULT_TSA_URL;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/timestamp-query" },
    body: new Uint8Array(timestampRequest(digest)),
    signal: AbortSignal.timeout(TSA_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`TSA answered ${response.status}`);
  const reply = asn1.fromDer(
    Buffer.from(await response.arrayBuffer()).toString("binary"),
  ).value as Node[];
  const status = asn1.derToInteger(((reply[0].value as Node[])[0].value as string));
  // 0 = granted, 1 = granted with modifications.
  if (status > 1 || !reply[1]) throw new Error(`TSA refused the request (${status}).`);
  const time = readTstInfo(reply[1], digest);
  return {
    token: reply[1],
    timestamp: { authority: new URL(url).host, time: time.toISOString() },
  };
}

// -- The signer ----------------------------------------------------------------

/**
 * `@signpdf` hands this the PDF bytes outside the signature's ByteRange and
 * embeds whatever it returns. After `sign`, `timestamp` says whether the
 * authority answered: a signature without one is still valid, just weaker.
 */
export class CadesSigner extends Signer {
  timestamp: DocTimestamp | null = null;

  constructor(private readonly identity: SigningIdentity) {
    super();
  }

  async sign(pdfBuffer: Buffer): Promise<Buffer> {
    const { certDer, key } = this.identity;
    const digest = createHash("sha256").update(pdfBuffer).digest();

    // PAdES puts the claimed signing time in the signature dictionary's /M,
    // not in a CMS signingTime attribute.
    const signedAttrs = sortedForSet([
      attribute(OID.contentType, oid(OID.data)),
      attribute(OID.messageDigest, octets(digest)),
      attribute(OID.signingCertificateV2, signingCertificateV2(certDer)),
    ]);
    const signature = rsaSign("sha256", der(set(...signedAttrs)), key);

    let unsignedAttrs: Node | null = null;
    try {
      const stamped = await requestTimestamp(
        createHash("sha256").update(signature).digest(),
      );
      this.timestamp = stamped.timestamp;
      unsignedAttrs = asn1.create(Class.CONTEXT_SPECIFIC, 1, true, [
        attribute(OID.signatureTimeStampToken, stamped.token),
      ]);
    } catch (error) {
      console.error("[firmas] timestamp failed, signing without it:", error);
    }

    const { issuer, serial } = issuerAndSerial(certDer);
    const signerInfo = seq(
      int(1),
      seq(issuer, serial),
      algorithm(OID.sha256),
      asn1.create(Class.CONTEXT_SPECIFIC, 0, true, signedAttrs),
      algorithm(OID.sha256WithRSA),
      octets(signature),
      ...(unsignedAttrs ? [unsignedAttrs] : []),
    );
    const contentInfo = seq(
      oid(OID.signedData),
      asn1.create(Class.CONTEXT_SPECIFIC, 0, true, [
        seq(
          int(1),
          set(algorithm(OID.sha256)),
          seq(oid(OID.data)),
          asn1.create(Class.CONTEXT_SPECIFIC, 0, true, [
            asn1.fromDer(certDer.toString("binary")),
          ]),
          set(signerInfo),
        ),
      ]),
    );
    return der(contentInfo);
  }
}
