import "server-only";

import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { SUBFILTER_ETSI_CADES_DETACHED } from "@signpdf/utils";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import signpdf from "@signpdf/signpdf";
import QRCode from "qrcode";
import { CadesSigner } from "@/lib/pdf-cms";
import { getSigningIdentity } from "@/lib/signing-identity";
import {
  QR_CAPTION,
  signatureCaption,
  stampText,
  verifyUrl,
  type DocLang,
  type DocTimestamp,
  type Placement,
  type StampPosition,
} from "@/lib/signed-docs";

/**
 * Stamps a PDF (the ID on every page, the signature image and QR where they
 * were placed) and then signs it, so any later change shows up in a PDF
 * reader's signature panel as well as on /verify.
 */

/** A problem with the input, worded for the person who uploaded it. */
export class SigningError extends Error {}

export interface SignOptions {
  id: string;
  signerName: string;
  signerEmail: string;
  lang: DocLang;
  stamp: StampPosition;
  placements: Placement[];
  /** PNG bytes; required when a signature is placed. */
  signatureImage: Uint8Array | null;
  /** Writes "name · date" under each signature. */
  signatureCaption: boolean;
  signedAt: Date;
}

export interface SignResult {
  pdf: Buffer;
  pages: number;
  timestamp: DocTimestamp | null;
  certFingerprint: string;
}

/** Room for the CMS: a certificate, FreeTSA's token and its chain fit well inside. */
const SIGNATURE_LENGTH = 24_000;

const STAMP_SIZE = 6.5;
const STAMP_MARGIN = 10;
const CAPTION_SIZE = 7;
const GREY = rgb(0.35, 0.35, 0.4);

/**
 * A page as the reader sees it: its visible box and rotation, and how to turn
 * a point measured from the top-left of that view into PDF user space.
 */
class PageView {
  readonly width: number;
  readonly height: number;
  private readonly rotation: number;
  private readonly box: { x: number; y: number; width: number; height: number };

  constructor(readonly page: PDFPage) {
    this.box = page.getCropBox();
    this.rotation = ((page.getRotation().angle % 360) + 360) % 360;
    const sideways = this.rotation === 90 || this.rotation === 270;
    this.width = sideways ? this.box.height : this.box.width;
    this.height = sideways ? this.box.width : this.box.height;
  }

  /** View point (points from top-left) → user space. */
  toUser(dx: number, dy: number): { x: number; y: number } {
    const { x, y, width: W, height: H } = this.box;
    switch (this.rotation) {
      case 90:
        return { x: x + dy, y: y + dx };
      case 180:
        return { x: x + W - dx, y: y + dy };
      case 270:
        return { x: x + W - dy, y: y + H - dx };
      default:
        return { x: x + dx, y: y + H - dy };
    }
  }

  /** Drawn content must turn with the page to read upright. */
  angle(extra = 0) {
    return degrees(this.rotation + extra);
  }

  /** An image upright in the view, its top-left at (dx, dy). */
  drawImage(image: PDFImage, dx: number, dy: number, w: number, h: number) {
    const at = this.toUser(dx, dy + h);
    this.page.drawImage(image, { ...at, width: w, height: h, rotate: this.angle() });
  }

  /** One line of text upright in the view, its baseline starting at (dx, dy). */
  drawText(text: string, font: PDFFont, size: number, dx: number, dy: number, extra = 0) {
    const at = this.toUser(dx, dy);
    this.page.drawText(text, { ...at, font, size, color: GREY, rotate: this.angle(extra) });
  }
}

/** Shrinks the stamp on pages too small to hold it at full size. */
function fitSize(text: string, font: PDFFont, room: number): number {
  const width = font.widthOfTextAtSize(text, STAMP_SIZE);
  return width <= room ? STAMP_SIZE : Math.max(4, (STAMP_SIZE * room) / width);
}

function drawStamp(view: PageView, text: string, font: PDFFont, position: StampPosition) {
  if (position === "side") {
    // Up the left margin, reading bottom to top, centred on the page.
    const size = fitSize(text, font, view.height - 2 * STAMP_MARGIN);
    const width = font.widthOfTextAtSize(text, size);
    view.drawText(text, font, size, STAMP_MARGIN + size, (view.height + width) / 2, 90);
  } else {
    const size = fitSize(text, font, view.width - 2 * STAMP_MARGIN);
    const width = font.widthOfTextAtSize(text, size);
    view.drawText(text, font, size, (view.width - width) / 2, view.height - STAMP_MARGIN);
  }
}

export async function stampAndSign(original: Uint8Array, options: SignOptions): Promise<SignResult> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(original, { updateMetadata: false });
  } catch (error) {
    const encrypted = String(error).toLowerCase().includes("encrypt");
    throw new SigningError(
      encrypted
        ? "El PDF está protegido con contraseña. Quítale la protección y vuelve a subirlo."
        : "No pude leer el PDF. ¿Está dañado?",
    );
  }

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const views = doc.getPages().map((page) => new PageView(page));
  const stamp = stampText(options.id, options.signerName, options.lang);
  for (const view of views) drawStamp(view, stamp, font, options.stamp);

  const signatures = options.placements.filter((p) => p.kind === "signature");
  const signatureImage =
    signatures.length > 0 && options.signatureImage
      ? await doc.embedPng(options.signatureImage)
      : null;
  if (signatures.length > 0 && !signatureImage) {
    throw new SigningError("Sube primero la imagen de tu firma.");
  }
  const qrImage = options.placements.some((p) => p.kind === "qr")
    ? await doc.embedPng(
        await QRCode.toBuffer(verifyUrl(options.id, options.lang), {
          type: "png",
          margin: 1,
          width: 600,
          errorCorrectionLevel: "M",
        }),
      )
    : null;

  const caption = signatureCaption(options.signerName, options.signedAt, options.lang);
  for (const placement of options.placements) {
    const view = views[placement.page];
    if (!view) continue;
    const x = placement.x * view.width;
    const y = placement.y * view.height;
    const w = placement.w * view.width;
    const h = placement.h * view.height;
    if (placement.kind === "signature" && signatureImage) {
      view.drawImage(signatureImage, x, y, w, h);
      if (options.signatureCaption) {
        const size = Math.min(CAPTION_SIZE, (CAPTION_SIZE * w) / font.widthOfTextAtSize(caption, CAPTION_SIZE));
        view.drawText(caption, font, size, x, y + h + size + 1);
      }
    } else if (placement.kind === "qr" && qrImage) {
      view.drawImage(qrImage, x, y, w, h);
      const label = QR_CAPTION[options.lang];
      const size = Math.min(5.5, (5.5 * w) / font.widthOfTextAtSize(label, 5.5));
      const width = font.widthOfTextAtSize(label, size);
      view.drawText(label, font, size, x + (w - width) / 2, y + h + size + 1);
    }
  }

  doc.setProducer("resume.vicentegomez.cl");
  doc.setModificationDate(options.signedAt);

  pdflibAddPlaceholder({
    pdfDoc: doc,
    reason: `Doc ID ${options.id}`,
    contactInfo: options.signerEmail,
    name: options.signerName,
    location: verifyUrl(options.id, options.lang),
    signingTime: options.signedAt,
    signatureLength: SIGNATURE_LENGTH,
    subFilter: SUBFILTER_ETSI_CADES_DETACHED,
    appName: "resume.vicentegomez.cl",
  });
  // The placeholder must stay a plain object for @signpdf to find and fill it.
  const prepared = Buffer.from(await doc.save({ useObjectStreams: false }));

  const identity = await getSigningIdentity();
  const signer = new CadesSigner(identity);
  const pdf = await signpdf.sign(prepared, signer, options.signedAt);

  return {
    pdf,
    pages: views.length,
    timestamp: signer.timestamp,
    certFingerprint: identity.fingerprint,
  };
}
