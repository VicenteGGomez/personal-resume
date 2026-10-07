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
  placementKey,
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

/** One person's signature: the image, and the "name · date" line under it. */
export interface SignatureMark {
  image: Uint8Array;
  caption: string;
}

export interface SignOptions {
  id: string;
  /** Everyone who signs, as printed in the stamp. */
  signerNames: string[];
  /** Who the digital signature names: you, the site's owner. */
  ownerName: string;
  ownerEmail: string;
  lang: DocLang;
  stamp: StampPosition;
  placements: Placement[];
  /** "owner" for your signature, otherwise a signer's id (see placementKey). */
  marks: Record<string, SignatureMark>;
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

/**
 * The standard fonts only cover Latin-1-ish text (WinAnsi). A name in another
 * script would throw mid-document, so characters the font can't draw become "?".
 */
export function drawable(font: PDFFont, text: string): string {
  let out = "";
  for (const char of text.normalize("NFC")) {
    try {
      font.encodeText(char);
      out += char;
    } catch {
      out += "?";
    }
  }
  return out;
}

/** Fits an image of `ratio` (h/w) inside a box, centred, resting on its bottom edge. */
function contain(ratio: number, x: number, y: number, w: number, h: number) {
  if (ratio * w <= h) return { x, y: y + h - ratio * w, w, h: ratio * w };
  const fitted = h / ratio;
  return { x: x + (w - fitted) / 2, y, w: fitted, h };
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
  const stamp = drawable(font, stampText(options.id, options.signerNames, options.lang));
  for (const view of views) drawStamp(view, stamp, font, options.stamp);

  const images = new Map<string, PDFImage>();
  for (const placement of options.placements) {
    if (placement.kind === "qr") continue;
    const key = placementKey(placement);
    if (images.has(key)) continue;
    const mark = options.marks[key];
    if (!mark) {
      throw new SigningError(
        key === "owner" ? "Sube primero la imagen de tu firma." : "Falta la firma de un firmante.",
      );
    }
    images.set(key, await doc.embedPng(mark.image));
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

  for (const placement of options.placements) {
    const view = views[placement.page];
    if (!view) continue;
    const x = placement.x * view.width;
    const y = placement.y * view.height;
    const w = placement.w * view.width;
    const h = placement.h * view.height;
    if (placement.kind === "qr") {
      if (!qrImage) continue;
      view.drawImage(qrImage, x, y, w, h);
      const label = QR_CAPTION[options.lang];
      // The address may run a little wider than a small QR, centred under it.
      const size = Math.min(5.5, (5.5 * w * 1.4) / font.widthOfTextAtSize(label, 5.5));
      const width = font.widthOfTextAtSize(label, size);
      view.drawText(label, font, size, x + (w - width) / 2, y + h + size + 1);
      continue;
    }
    const key = placementKey(placement);
    const image = images.get(key)!;
    // A signer's drawing has whatever shape they gave it: fit it to the box.
    const box = contain(image.height / image.width, x, y, w, h);
    view.drawImage(image, box.x, box.y, box.w, box.h);
    if (options.signatureCaption) {
      const caption = drawable(font, options.marks[key].caption);
      const size = Math.min(CAPTION_SIZE, (CAPTION_SIZE * w) / font.widthOfTextAtSize(caption, CAPTION_SIZE));
      view.drawText(caption, font, size, x, y + h + size + 1);
    }
  }

  const signed = await signPdfDocument(doc, {
    reason: `Doc ID ${options.id}`,
    name: options.ownerName,
    email: options.ownerEmail,
    location: verifyUrl(options.id, options.lang),
    signedAt: options.signedAt,
  });
  return { ...signed, pages: views.length };
}

/**
 * Seals a finished PDF: a PAdES signature with your certificate and a FreeTSA
 * timestamp, so a reader shows any later change. Used for the document and
 * for its audit certificate.
 */
export async function signPdfDocument(
  doc: PDFDocument,
  meta: { reason: string; name: string; email: string; location: string; signedAt: Date },
): Promise<Omit<SignResult, "pages">> {
  doc.setProducer("resume.vicentegomez.cl");
  doc.setModificationDate(meta.signedAt);

  pdflibAddPlaceholder({
    pdfDoc: doc,
    reason: meta.reason,
    contactInfo: meta.email,
    name: meta.name,
    location: meta.location,
    signingTime: meta.signedAt,
    signatureLength: SIGNATURE_LENGTH,
    subFilter: SUBFILTER_ETSI_CADES_DETACHED,
    appName: "resume.vicentegomez.cl",
  });
  // The placeholder must stay a plain object for @signpdf to find and fill it.
  const prepared = Buffer.from(await doc.save({ useObjectStreams: false }));

  const identity = await getSigningIdentity();
  const signer = new CadesSigner(identity);
  const pdf = await signpdf.sign(prepared, signer, meta.signedAt);
  return { pdf, timestamp: signer.timestamp, certFingerprint: identity.fingerprint };
}
