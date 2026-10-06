import type { DocLang } from "@/lib/signed-docs";

/**
 * The words on /verify (English) and /verificar (Spanish), kept side by side so
 * the two pages can't drift apart.
 */

interface Pair {
  en: string;
  es: string;
}

export const VERIFY_COPY = {
  heading: { en: "Verify a document", es: "Verificar un documento" },
  intro: {
    en: "Documents I sign electronically carry a Doc ID in the margin of every page, and sometimes a QR code. Enter the ID to see its record and check that your copy hasn't been changed.",
    es: "Los documentos que firmo electrónicamente llevan un Doc ID en el margen de cada página y, a veces, un código QR. Escribe el ID para ver su registro y comprobar que tu copia no fue modificada.",
  },
  idLabel: { en: "Doc ID", es: "ID del documento" },
  idInvalid: {
    en: "A Doc ID has 32 characters (digits and letters A–F).",
    es: "El Doc ID tiene 32 caracteres (números y letras A–F).",
  },
  verifyButton: { en: "Verify", es: "Verificar" },
  noId: { en: "No ID?", es: "¿No tienes el ID?" },
  noIdBody: {
    en: "Choose the PDF and we'll look it up by its fingerprint. It is checked in your browser: the file is not uploaded.",
    es: "Elige el PDF y lo buscamos por su huella. Se analiza en tu navegador: el archivo no se sube.",
  },
  lookupNone: {
    en: "That file doesn't match any document signed here. If it is a copy, it may have been modified.",
    es: "Ese archivo no corresponde a ningún documento firmado aquí. Si es una copia, puede haber sido modificada.",
  },
  seeRecord: { en: "See the document's record →", es: "Ver el registro del documento →" },
  anotherDoc: { en: "Verify another document", es: "Verificar otro documento" },
  switchLang: { en: "Ver en español", es: "View in English" },

  title: { en: "Document verification", es: "Verificación de documento" },
  valid: { en: "Valid document", es: "Documento válido" },
  validBody: {
    en: "This document was signed electronically and is registered on this site.",
    es: "Este documento fue firmado electrónicamente y está registrado en este sitio.",
  },
  revoked: { en: "Revoked document", es: "Documento revocado" },
  revokedBody: {
    en: "The signer revoked this document. It should no longer be relied on.",
    es: "El firmante revocó este documento. Ya no debe considerarse vigente.",
  },
  revokedOn: { en: "Revoked on", es: "Revocado el" },
  reason: { en: "Reason", es: "Motivo" },
  notFound: { en: "Document not found", es: "No encontramos ese documento" },
  notFoundBody: {
    en: "No signed document has that ID. Check that it is complete (32 characters) or scan the QR code again.",
    es: "Ningún documento firmado tiene ese ID. Revisa que esté completo (32 caracteres) o escanea de nuevo el QR.",
  },
  unavailable: {
    en: "We couldn't reach the register right now. Please try again in a few minutes.",
    es: "No pudimos consultar el registro ahora. Inténtalo en unos minutos.",
  },

  pendingTitle: { en: "Waiting for signatures", es: "Esperando firmas" },
  pendingBody: {
    en: "This document was sent for signing and isn't complete yet. Its final PDF appears here once everyone has signed.",
    es: "Este documento se envió para firmar y aún no está completo. Su PDF final aparecerá aquí cuando firmen todos.",
  },
  progress: { en: "signed", es: "firmaron" },
  declinedTitle: { en: "Declined", es: "Rechazado" },
  declinedBody: {
    en: "One of the signers declined, so this document was never completed.",
    es: "Uno de los firmantes rechazó firmarlo, así que este documento no se completó.",
  },
  cancelledTitle: { en: "Cancelled", es: "Cancelado" },
  cancelledBody: {
    en: "The sender cancelled this request before it was completed.",
    es: "Quien lo envió canceló la solicitud antes de que se completara.",
  },
  expiredTitle: { en: "Expired", es: "Vencido" },
  expiredBody: {
    en: "The time to sign ran out before everyone signed.",
    es: "El plazo para firmar venció antes de que firmaran todos.",
  },
  signers: { en: "Signers", es: "Firmantes" },
  signerSigned: { en: "Signed", es: "Firmó" },
  signerPending: { en: "Pending", es: "Pendiente" },
  signerDeclined: { en: "Declined", es: "Rechazó" },
  emailVerified: { en: "email verified with a one-time code", es: "correo verificado con un código" },
  sender: { en: "sender", es: "emisor" },
  matchAudit: {
    en: "This is the document's audit certificate, unchanged.",
    es: "Es el certificado de auditoría de este documento, sin cambios.",
  },
  auditHash: { en: "SHA-256 of the audit certificate", es: "SHA-256 del certificado de auditoría" },
  document: { en: "Document", es: "Documento" },
  note: { en: "Details", es: "Detalle" },
  signedBy: { en: "Signed by", es: "Firmado por" },
  signedAt: { en: "Signed on", es: "Fecha de firma" },
  timestamp: { en: "Timestamp", es: "Sello de tiempo" },
  timestampBy: { en: "issued by", es: "emitido por" },
  noTimestamp: { en: "No external timestamp", es: "Sin sello externo" },
  pages: { en: "Pages", es: "Páginas" },

  download: { en: "Download signed PDF", es: "Descargar PDF firmado" },
  open: { en: "Open full screen", es: "Pantalla completa" },
  privateOwner: {
    en: "Private: only you (signed in) see the PDF here.",
    es: "Privado: solo tú (con sesión iniciada) ves el PDF aquí.",
  },
  private: { en: "Private document", es: "Documento privado" },
  privateBody: {
    en: "This document's content is not public. If you have a copy, check it below: if it matches, it is exactly the signed document.",
    es: "El contenido de este documento no es público. Si tienes una copia, compruébala abajo: si coincide, es exactamente el documento firmado.",
  },

  checkTitle: { en: "Check your copy", es: "Comprueba tu copia" },
  checkBody: {
    en: "Choose the PDF you received. It is checked in your browser: the file is not uploaded anywhere.",
    es: "Elige el PDF que recibiste. Se analiza en tu navegador: el archivo no se sube a ningún sitio.",
  },
  checkPick: { en: "Choose PDF", es: "Elegir PDF" },
  checking: { en: "Checking…", es: "Comprobando…" },
  matchSigned: {
    en: "Match: this is exactly the signed document, unchanged.",
    es: "Coincide: es exactamente el documento firmado, sin cambios.",
  },
  matchOriginal: {
    en: "This is the original version, before signing. Same content, but without the signature.",
    es: "Es la versión original, antes de firmarse. El contenido es el mismo, pero no lleva la firma.",
  },
  noMatch: {
    en: "No match. This file is not the signed document: it was modified or is a different document.",
    es: "No coincide. Este archivo no es el documento firmado: fue modificado o es otro documento.",
  },

  technical: { en: "Technical details", es: "Detalles técnicos" },
  signedHash: { en: "SHA-256 of the signed PDF", es: "SHA-256 del PDF firmado" },
  originalHash: { en: "SHA-256 of the original PDF", es: "SHA-256 del PDF original" },
  certFingerprint: {
    en: "Certificate SHA-256 fingerprint",
    es: "Huella SHA-256 del certificado",
  },
  certDownload: { en: "Download certificate", es: "Descargar certificado" },
  adobeHelp: {
    en: "The PDF carries an embedded digital signature (PAdES) with a timestamp. Open your PDF reader's signature panel: it should say the document has not been modified. The certificate is the signer's own; to have the reader show it as a verified identity, add it as a trusted certificate.",
    es: "El PDF lleva una firma digital incrustada (PAdES) con sello de tiempo. Abre el panel de firmas de tu lector de PDF: debe decir que el documento no ha sido modificado. El certificado es propio del firmante; para que el lector lo muestre como identidad verificada, agrégalo como certificado de confianza.",
  },
  legal: {
    en: "Electronic signature made by the signer through this site. The PDF's digital signature and this record reveal any later modification.",
    es: "Firma electrónica realizada por el firmante a través de este sitio. La firma digital del PDF y este registro permiten detectar cualquier modificación posterior.",
  },
} satisfies Record<string, Pair>;

export type VerifyCopy = Record<keyof typeof VERIFY_COPY, string>;

/** Every string on the verifier, in one language. */
export function verifyCopy(lang: DocLang): VerifyCopy {
  return Object.fromEntries(
    Object.entries(VERIFY_COPY).map(([key, pair]) => [key, pair[lang]]),
  ) as VerifyCopy;
}

/** A moment, in the timezone the site's stats use. */
export function formatWhen(iso: string, lang: DocLang): string {
  return `${new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "es-CL", {
    timeZone: "Europe/Madrid",
    dateStyle: "long",
    timeStyle: "short",
  })} (Madrid)`;
}

/** SHA-256 of a file, in the browser, as lowercase hex. */
export async function sha256OfFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
