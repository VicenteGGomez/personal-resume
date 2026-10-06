"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  cancelRequestAction,
  finalizeAction,
  prepareUploadAction,
  resendInvitationAction,
  saveSignatureImageAction,
  signDocumentAction,
  updateDocAction,
} from "@/app/admin/firmas/actions";
import { renderPdf, type PageImage } from "@/lib/pdf-render";
import {
  MAX_PDF_BYTES,
  SIGNING_WINDOW_DAYS,
  docStatus,
  stampText,
  VERIFY_PATH,
  verifyUrl,
  type AdminDoc,
  type DocLang,
  type DocVisibility,
  type Placement,
  type StampPosition,
} from "@/lib/signed-docs";

/**
 * `/admin/firmas`: your signature image, a new document (upload → place your
 * signature, the QR and the boxes of anyone else who signs → sign or send) and
 * the list of everything signed or waiting for signatures.
 */

const CARD =
  "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10";
const INPUT =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-black/30 dark:focus:border-white/30";
const PRIMARY =
  "rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-60 dark:bg-white dark:text-black";
const SECONDARY =
  "rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-black/10 transition hover:bg-black/[0.04] disabled:opacity-50 dark:ring-white/15 dark:hover:bg-white/[0.06]";
const CHIP = "rounded-full px-2.5 py-0.5 text-[11px] font-semibold";

type Kind = Placement["kind"];

/** Which pages something is stamped on. */
type Coverage = "none" | "last" | "all";

/**
 * Where a signature or the QR goes: one spot, in fractions of the page,
 * repeated on every page it covers — drag it on any of them and all follow.
 * Its height follows from its width and what it shows. Keyed "signature"
 * (yours), "qr", or "signer:<key>" for each person you send it to.
 */
interface Spot {
  coverage: Coverage;
  x: number;
  y: number;
  w: number;
}

const COVERAGE_OPTIONS: { value: Coverage; label: string }[] = [
  { value: "none", label: "No" },
  { value: "last", label: "Última página" },
  { value: "all", label: "Todas las páginas" },
];

/** Someone else signs where they're placed: they can't be on "no" page. */
const SIGNER_COVERAGE = COVERAGE_OPTIONS.filter((option) => option.value !== "none");

/** A signer's box has no image yet: a signature-shaped space for one. */
const SIGNER_RATIO = 0.35;

/** Each signer's colour in the editor, so their boxes are told apart. */
const SIGNER_COLORS = ["#d97706", "#059669", "#7c3aed", "#db2777", "#0891b2", "#65a30d"];

interface DraftSigner {
  key: string;
  name: string;
  email: string;
}

const kindOf = (spot: string): Kind =>
  spot === "qr" ? "qr" : spot === "signature" ? "signature" : "signer";

let nextSignerKey = 0;

const defaultSpots = (hasSignature: boolean): Record<string, Spot> => ({
  signature: { coverage: hasSignature ? "last" : "none", x: 0.6, y: 0.74, w: 0.25 },
  // ~2 cm on A4: about as small as a phone camera reads comfortably.
  qr: { coverage: "last", x: 0.85, y: 0.83, w: 0.1 },
});

/** Any image → PNG, with its near-white background made transparent if asked. */
async function toSignaturePng(file: File, dropWhite: boolean): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  if (dropWhite) {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = image.data;
    for (let i = 0; i < px.length; i += 4) {
      const lightest = Math.min(px[i], px[i + 1], px[i + 2]);
      // Fade the last stretch to white instead of cutting it, so ink edges stay smooth.
      if (lightest > 235) px[i + 3] = 0;
      else if (lightest > 200) px[i + 3] = Math.round((px[i + 3] * (235 - lightest)) / 35);
    }
    ctx.putImageData(image, 0, 0);
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/png"),
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SigningStudio({
  email,
  signerName,
  initialDocs,
  hasSignature: initialHasSignature,
  certMissing,
}: {
  email: string;
  signerName: string;
  /** null when storage couldn't be read. */
  initialDocs: AdminDoc[] | null;
  hasSignature: boolean;
  certMissing: boolean;
}) {
  const [docs, setDocs] = useState<AdminDoc[]>(initialDocs ?? []);
  const [justSigned, setJustSigned] = useState<AdminDoc | null>(null);

  // -- Signature image --------------------------------------------------------
  const [signatureVersion, setSignatureVersion] = useState(initialHasSignature ? 1 : 0);
  const [signatureRatio, setSignatureRatio] = useState<number | null>(null);
  const [dropWhite, setDropWhite] = useState(true);
  const [signatureError, setSignatureError] = useState("");
  const [savingSignature, startSavingSignature] = useTransition();
  const signatureUrl = signatureVersion
    ? `/admin/firmas/imagen-firma?v=${signatureVersion}`
    : null;

  useEffect(() => {
    if (!signatureUrl) return;
    const image = new Image();
    image.onload = () => setSignatureRatio(image.naturalHeight / image.naturalWidth);
    image.src = signatureUrl;
  }, [signatureUrl]);

  function uploadSignature(file: File) {
    setSignatureError("");
    startSavingSignature(async () => {
      try {
        const png = await toSignaturePng(file, dropWhite);
        const form = new FormData();
        form.set("file", new File([png], "signature.png", { type: "image/png" }));
        const result = await saveSignatureImageAction(form);
        if (!result.ok) setSignatureError(result.error);
        else setSignatureVersion(Date.now());
      } catch {
        setSignatureError("No pude leer esa imagen.");
      }
    });
  }

  // -- New document -----------------------------------------------------------
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageImage[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [lang, setLang] = useState<DocLang>("es");
  const [visibility, setVisibility] = useState<DocVisibility>("public");
  const [stamp, setStamp] = useState<StampPosition>("side");
  const [caption, setCaption] = useState(true);
  // Kept from one document to the next: you tend to sign in the same place.
  const [spots, setSpots] = useState(() => defaultSpots(initialHasSignature));
  const [signers, setSigners] = useState<DraftSigner[]>([]);
  const [signError, setSignError] = useState("");
  const [signing, startSigning] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setPages(null);
    setTitle("");
    setNote("");
    setSigners([]);
    setSignError("");
    setLoadError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function openPdf(picked: File) {
    reset();
    if (picked.size > MAX_PDF_BYTES) {
      setLoadError("El PDF supera los 25 MB.");
      return;
    }
    setFile(picked);
    setTitle(picked.name.replace(/\.pdf$/i, ""));
    try {
      const rendered = await renderPdf(await picked.arrayBuffer());
      setPages(rendered);
    } catch (error) {
      console.error(error);
      setFile(null);
      setLoadError(
        String(error).includes("Password")
          ? "El PDF está protegido con contraseña. Quítale la protección y vuelve a subirlo."
          : `No pude abrir ese PDF (${error instanceof Error ? error.message : String(error)}).`,
      );
    }
  }

  /** Height over width of what a spot shows: the QR is square. */
  const ratioOf = (spot: string) => {
    const kind = kindOf(spot);
    return kind === "qr" ? 1 : kind === "signer" ? SIGNER_RATIO : (signatureRatio ?? 0.4);
  };

  const spotKeys = ["signature", "qr", ...signers.map((signer) => `signer:${signer.key}`)];

  function addSigner() {
    const key = `s${++nextSignerKey}`;
    // Side by side along the foot of the page, so new boxes don't stack.
    const slot = signers.length % 3;
    setSigners((list) => [...list, { key, name: "", email: "" }]);
    setSpots((all) => ({
      ...all,
      [`signer:${key}`]: { coverage: "last", x: 0.07 + slot * 0.3, y: 0.66, w: 0.25 },
    }));
  }

  function removeSigner(key: string) {
    setSigners((list) => list.filter((signer) => signer.key !== key));
    setSpots((all) => {
      const next = { ...all };
      delete next[`signer:${key}`];
      return next;
    });
  }

  const updateSigner = (key: string, change: Partial<DraftSigner>) =>
    setSigners((list) => list.map((signer) => (signer.key === key ? { ...signer, ...change } : signer)));

  /** Height, as a fraction of the page, of a box `w` wide whose content is `ratio` tall. */
  const heightFor = (w: number, ratio: number, page: PageImage) =>
    (w * ratio * page.width) / page.height;

  const covers = (spot: string, index: number) =>
    spots[spot]?.coverage === "all" ||
    (spots[spot]?.coverage === "last" && pages !== null && index === pages.length - 1);

  /** The spot as drawn on one page: pages of other sizes keep it inside them. */
  function boxOn(spot: string, page: PageImage) {
    const { x, y, w } = spots[spot];
    const h = heightFor(w, ratioOf(spot), page);
    return { x, y: Math.min(y, Math.max(0, 1 - h)), w, h };
  }

  function setCoverage(spot: string, coverage: Coverage) {
    setSpots((all) => ({ ...all, [spot]: { ...all[spot], coverage } }));
  }

  /** Drag to move; drag the corner to resize, keeping the content's proportions. */
  function startDrag(event: React.PointerEvent, kind: string, mode: "move" | "resize") {
    event.preventDefault();
    event.stopPropagation();
    const pageEl = (event.currentTarget as HTMLElement).closest("[data-page]") as HTMLElement;
    if (!pageEl || !pages) return;
    const rect = pageEl.getBoundingClientRect();
    const size = pages[Number(pageEl.dataset.page)];
    const ratio = ratioOf(kind);
    const box = boxOn(kind, size);
    const start = { x: event.clientX, y: event.clientY };

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - start.x) / rect.width;
      const dy = (ev.clientY - start.y) / rect.height;
      let next: Partial<Spot>;
      if (mode === "move") {
        next = {
          x: Math.min(1 - box.w, Math.max(0, box.x + dx)),
          y: Math.min(1 - box.h, Math.max(0, box.y + dy)),
        };
      } else {
        let w = Math.max(0.04, Math.min(1 - box.x, box.w + dx));
        if (box.y + heightFor(w, ratio, size) > 1) {
          w = ((1 - box.y) * size.height) / (ratio * size.width);
        }
        next = { w };
      }
      setSpots((all) => ({ ...all, [kind]: { ...all[kind], ...next } }));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  const needsSignatureImage = spots.signature.coverage !== "none" && !signatureUrl;
  const signersIncomplete = signers.some(
    (signer) => !signer.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email.trim()),
  );

  function sign() {
    if (!file) return;
    setSignError("");
    startSigning(async () => {
      const target = await prepareUploadAction();
      if (!target.ok) {
        setSignError(target.error);
        return;
      }
      const upload = await fetch(target.url, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      }).catch(() => null);
      if (!upload?.ok) {
        setSignError("No pude subir el PDF. Revisa tu conexión e inténtalo de nuevo.");
        return;
      }
      const result = await signDocumentAction({
        uploadKey: target.key,
        fileName: file.name,
        title,
        note,
        lang,
        visibility,
        stamp,
        signatureCaption: caption,
        placements: pages
          ? spotKeys.flatMap((spot) =>
              pages.flatMap((page, index) =>
                covers(spot, index)
                  ? [
                      {
                        kind: kindOf(spot),
                        ...(kindOf(spot) === "signer" ? { signerId: spot.slice(7) } : {}),
                        page: index,
                        ...boxOn(spot, page),
                      },
                    ]
                  : [],
              ),
            )
          : [],
        signers,
      });
      if (!result.ok) {
        setSignError(result.error);
        return;
      }
      setDocs((list) => [result.doc, ...list]);
      setJustSigned(result.doc);
      reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const stampNames = [
    ...(spots.signature.coverage !== "none" ? [signerName] : []),
    ...signers.map((signer, i) => signer.name.trim() || `Firmante ${i + 1}`),
  ];
  const preview = stampText("XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX", stampNames, lang);
  const sending = signers.length > 0;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#050505] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-black/70">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Firmar documentos</h1>
            <p className="truncate text-xs text-neutral-400">{email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/verify"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold dark:border-white/15"
            >
              /verify ↗
            </a>
            <Link
              href="/admin"
              className="rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white transition hover:scale-[1.03] dark:bg-white dark:text-black"
            >
              ← Volver al editor
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        {certMissing && (
          <p className="rounded-2xl bg-amber-500/15 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            Falta el certificado de firma (<code>SIGNING_CERT_PEM</code> /{" "}
            <code>SIGNING_KEY_PEM</code>). Créalo con{" "}
            <code>node scripts/create-signing-cert.mjs</code> y agrégalo en Vercel: sin
            él no se puede firmar.
          </p>
        )}
        {initialDocs === null && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            No pude leer los documentos firmados. ¿Corriste la parte de firmas de{" "}
            <code>supabase/schema.sql</code>?
          </p>
        )}

        {justSigned && <SignedNotice doc={justSigned} onClose={() => setJustSigned(null)} />}

        <section className={CARD}>
          <h2 className="text-sm font-semibold">Tu firma</h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Se guarda una vez y se usa en cada documento. Una foto de tu firma en papel
            blanco sirve: el fondo se vuelve transparente.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex h-24 w-56 items-center justify-center rounded-2xl bg-[repeating-conic-gradient(#0000000d_0_25%,transparent_0_50%)] bg-[length:16px_16px] ring-1 ring-black/10 dark:bg-white dark:ring-white/15">
              {signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signatureUrl} alt="Tu firma" className="max-h-20 max-w-52 object-contain" />
              ) : (
                <span className="text-xs text-neutral-400">Sin firma todavía</span>
              )}
            </div>
            <div className="space-y-2">
              <label className={`${SECONDARY} inline-block cursor-pointer`}>
                {savingSignature ? "Guardando…" : signatureUrl ? "Reemplazar firma" : "Subir firma"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={savingSignature}
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) uploadSignature(picked);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={dropWhite}
                  onChange={(e) => setDropWhite(e.target.checked)}
                />
                Quitar el fondo blanco
              </label>
              {signatureError && <p className="text-xs text-red-500">{signatureError}</p>}
            </div>
          </div>
        </section>

        <section className={CARD}>
          <h2 className="text-sm font-semibold">Nuevo documento</h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Sube un PDF, arrastra tu firma y el QR donde quieras y fírmalo. Cada página
            lleva el Doc ID y queda verificable en /verify (o /verificar, según el idioma).
          </p>

          {!pages && (
            <label
              className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-black/10 px-6 py-10 text-center transition hover:bg-black/[0.02] dark:border-white/15 dark:hover:bg-white/[0.03]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) void openPdf(dropped);
              }}
            >
              <span className="text-2xl">📄</span>
              <span className="text-sm font-semibold">
                {file ? "Abriendo…" : "Elige o arrastra un PDF"}
              </span>
              <span className="text-xs text-neutral-400">Hasta 25 MB</span>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) void openPdf(picked);
                }}
              />
            </label>
          )}
          {loadError && <p className="mt-3 text-sm text-red-500">{loadError}</p>}

          {pages && file && (
            <div className="mt-4 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium">
                  Título
                  <input
                    className={`${INPUT} mt-1`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                  />
                </label>
                <label className="block text-xs font-medium">
                  Nota en la verificación <span className="text-neutral-400">(opcional)</span>
                  <input
                    className={`${INPUT} mt-1`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ej.: Carta de recomendación para…"
                    maxLength={1000}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
                <Segmented
                  label="Quién lo ve al verificar"
                  value={visibility}
                  onChange={setVisibility}
                  options={[
                    { value: "public", label: "Público", hint: "Cualquiera con el ID ve y descarga el PDF." },
                    { value: "private", label: "Privado", hint: "Solo se ven los datos; el PDF se valida subiendo la copia." },
                  ]}
                />
                <Segmented
                  label="Sello del ID"
                  value={stamp}
                  onChange={setStamp}
                  options={[
                    { value: "side", label: "Margen izquierdo" },
                    { value: "bottom", label: "Pie de página" },
                  ]}
                />
                <Segmented
                  label="Idioma"
                  value={lang}
                  onChange={setLang}
                  options={[
                    { value: "es", label: "Español", hint: "Sello en español; el QR abre /verificar." },
                    { value: "en", label: "English", hint: "Sello en inglés; el QR abre /verify." },
                  ]}
                />
                <label className="flex items-center gap-2 self-end pb-1.5">
                  <input type="checkbox" checked={caption} onChange={(e) => setCaption(e.target.checked)} />
                  Nombre y fecha bajo la firma
                </label>
              </div>

              <div className="rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold">Otras personas que firman</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Cada una recibe un enlace por correo, confirma su correo con un código y
                      dibuja o escribe su firma. Tienen {SIGNING_WINDOW_DAYS} días.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={SECONDARY}
                    onClick={addSigner}
                    disabled={signers.length >= 10}
                  >
                    + Agregar firmante
                  </button>
                </div>
                {signers.length > 0 && (
                  <ul className="mt-3 space-y-3">
                    {signers.map((signer, i) => (
                      <li key={signer.key} className="flex flex-wrap items-end gap-2">
                        <span
                          className="mb-2.5 h-3 w-3 shrink-0 rounded-full"
                          style={{ background: SIGNER_COLORS[i % SIGNER_COLORS.length] }}
                        />
                        <label className="min-w-36 flex-1 text-xs font-medium">
                          Nombre
                          <input
                            className={`${INPUT} mt-1`}
                            value={signer.name}
                            maxLength={120}
                            onChange={(e) => updateSigner(signer.key, { name: e.target.value })}
                          />
                        </label>
                        <label className="min-w-48 flex-1 text-xs font-medium">
                          Correo
                          <input
                            className={`${INPUT} mt-1`}
                            type="email"
                            value={signer.email}
                            maxLength={200}
                            onChange={(e) => updateSigner(signer.key, { email: e.target.value })}
                          />
                        </label>
                        <div className="text-xs">
                          <Segmented
                            label="Firma en"
                            value={spots[`signer:${signer.key}`].coverage}
                            onChange={(coverage) => setCoverage(`signer:${signer.key}`, coverage)}
                            options={SIGNER_COVERAGE}
                          />
                        </div>
                        <button
                          type="button"
                          aria-label="Quitar firmante"
                          className="mb-1.5 rounded-full px-2 py-1 text-sm text-neutral-400 hover:text-red-500"
                          onClick={() => removeSigner(signer.key)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
                <Segmented
                  label={sending ? "Tu firma (firmas primero)" : "Tu firma"}
                  value={spots.signature.coverage}
                  onChange={(coverage) => setCoverage("signature", coverage)}
                  options={COVERAGE_OPTIONS}
                />
                <Segmented
                  label={`QR a ${VERIFY_PATH[lang]}`}
                  value={spots.qr.coverage}
                  onChange={(coverage) => setCoverage("qr", coverage)}
                  options={COVERAGE_OPTIONS}
                />
              </div>
              <p className="text-xs text-neutral-400">
                {pages.length} {pages.length === 1 ? "página" : "páginas"} · arrastra las firmas o
                el QR para moverlos y la esquina para cambiar el tamaño. En «Todas las páginas» van
                en el mismo lugar de cada una.
              </p>
              {needsSignatureImage && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Sube tu firma arriba para poder estamparla.
                </p>
              )}

              <div className="space-y-6">
                {pages.map((page, index) => (
                  <div key={index}>
                    <p className="mb-1.5 text-xs text-neutral-500">Página {index + 1}</p>
                    <div
                      data-page={index}
                      className="relative mx-auto w-full touch-none select-none overflow-hidden bg-white shadow-md ring-1 ring-black/10 [container-type:inline-size]"
                      style={{ aspectRatio: `${page.width} / ${page.height}`, maxWidth: 720 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={page.url} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
                      <StampPreview text={preview} position={stamp} pageWidth={page.width} />
                      {spotKeys.filter((spot) => covers(spot, index)).map((spot) => {
                        const box = boxOn(spot, page);
                        const kind = kindOf(spot);
                        const signerIndex = signers.findIndex((d) => `signer:${d.key}` === spot);
                        const color = SIGNER_COLORS[signerIndex % SIGNER_COLORS.length];
                        return (
                          <div
                            key={spot}
                            onPointerDown={(e) => startDrag(e, spot, "move")}
                            className="group absolute cursor-move outline-1 outline-dashed outline-sky-500/70 hover:outline-2"
                            style={{
                              left: `${box.x * 100}%`,
                              top: `${box.y * 100}%`,
                              width: `${box.w * 100}%`,
                              height: `${box.h * 100}%`,
                              ...(kind === "signer" ? { outlineColor: color } : {}),
                            }}
                          >
                            {kind === "signature" ? (
                              signatureUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={signatureUrl} alt="Firma" className="h-full w-full" draggable={false} />
                              ) : (
                                <span className="flex h-full items-center justify-center bg-sky-500/10 text-[10px] text-sky-700">
                                  Firma
                                </span>
                              )
                            ) : kind === "signer" ? (
                              <span
                                className="flex h-full items-center justify-center overflow-hidden px-1 text-center font-semibold"
                                style={{
                                  background: `${color}22`,
                                  color,
                                  fontSize: `${(8 / page.width) * 100}cqw`,
                                }}
                              >
                                {signers[signerIndex]?.name.trim() || `Firmante ${signerIndex + 1}`}
                              </span>
                            ) : (
                              <QrPlaceholder />
                            )}
                            {kind !== "qr" && caption && (
                              <span
                                className="absolute left-0 top-full whitespace-nowrap text-neutral-500"
                                style={{ fontSize: `${(7 / page.width) * 100}cqw` }}
                              >
                                {kind === "signer"
                                  ? `${signers[signerIndex]?.name.trim() || `Firmante ${signerIndex + 1}`} · fecha de su firma`
                                  : `${signerName} · ${new Date().toLocaleDateString("es-CL")}`}
                              </span>
                            )}
                            <button
                              type="button"
                              aria-label="Quitar"
                              title={kind === "signer" ? "Quitar este firmante" : "Quitar de todas las páginas"}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() =>
                                kind === "signer"
                                  ? removeSigner(spot.slice(7))
                                  : setCoverage(spot, "none")
                              }
                              className="absolute -right-2.5 -top-2.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs leading-none text-white group-hover:flex"
                            >
                              ×
                            </button>
                            <span
                              onPointerDown={(e) => startDrag(e, spot, "resize")}
                              className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-full border-2 border-white bg-sky-500"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {signError && <p className="text-sm text-red-500">{signError}</p>}
              <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-2 rounded-full bg-white/90 p-2 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-black/80 dark:ring-white/10">
                <button type="button" className={SECONDARY} onClick={reset} disabled={signing}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={PRIMARY}
                  onClick={sign}
                  disabled={
                    signing || !title.trim() || needsSignatureImage || certMissing || signersIncomplete
                  }
                >
                  {signing
                    ? sending
                      ? "Enviando…"
                      : "Firmando…"
                    : sending
                      ? `Enviar a ${signers.length} ${signers.length === 1 ? "firmante" : "firmantes"}`
                      : "Firmar documento"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className={CARD}>
          <h2 className="text-sm font-semibold">Documentos</h2>
          {docs.length === 0 ? (
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Aún no firmas ninguno.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10">
              {docs.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  onChange={(next) => setDocs((list) => list.map((d) => (d.id === next.id ? next : d)))}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string }[];
}) {
  return (
    <div>
      <p className="mb-1 font-medium">{label}</p>
      <div className="inline-flex rounded-full bg-black/[0.05] p-0.5 dark:bg-white/10">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 font-semibold transition ${
              value === option.value
                ? "bg-white shadow-sm dark:bg-white/20"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Where the ID line will run, at the size it will print. */
function StampPreview({
  text,
  position,
  pageWidth,
}: {
  text: string;
  position: StampPosition;
  pageWidth: number;
}) {
  const fontSize = `${(6.5 / pageWidth) * 100}cqw`;
  const margin = `${(10 / pageWidth) * 100}cqw`;
  return position === "side" ? (
    <span
      className="pointer-events-none absolute top-1/2 whitespace-nowrap text-neutral-500"
      style={{
        fontSize,
        left: margin,
        transform: "translateY(-50%) rotate(180deg)",
        writingMode: "vertical-rl",
      }}
    >
      {text}
    </span>
  ) : (
    <span
      className="pointer-events-none absolute inset-x-0 whitespace-nowrap text-center text-neutral-500"
      style={{ fontSize, bottom: margin }}
    >
      {text}
    </span>
  );
}

function QrPlaceholder() {
  return (
    <span className="grid h-full w-full grid-cols-5 grid-rows-5 gap-[6%] bg-white p-[6%]">
      {[1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1].map((on, i) => (
        <span key={i} className={on ? "bg-black" : ""} />
      ))}
    </span>
  );
}

function SignedNotice({ doc, onClose }: { doc: AdminDoc; onClose: () => void }) {
  const url = verifyUrl(doc.id, doc.lang);
  const [copied, setCopied] = useState(false);
  const sent = docStatus(doc) === "pending";
  return (
    <section className={`${CARD} ring-2 ring-emerald-500/40`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">
            {sent ? `✓ Enviado para firmar: ${doc.title}` : `✓ Firmado: ${doc.title}`}
          </h2>
          <p className="mt-1 font-mono text-xs text-neutral-500">{doc.id}</p>
          {sent ? (
            <p className="mt-1 text-xs text-neutral-500">
              Invitamos a {doc.signers.map((s) => s.name).join(", ")}. Te avisaremos por correo
              cuando firmen; con la última firma se genera el PDF final y su auditoría.
            </p>
          ) : (
            !doc.timestamp && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                FreeTSA no respondió, así que este va sin sello de tiempo externo. La firma es
                válida igual.
              </p>
            )
          )}
        </div>
        <button type="button" onClick={onClose} className="text-neutral-400" aria-label="Cerrar">
          ×
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!sent && (
          <a href={`/verify/${doc.id}/pdf`} className={PRIMARY}>
            Descargar PDF firmado
          </a>
        )}
        <a href={`${VERIFY_PATH[doc.lang]}/${doc.id}`} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
          Ver verificación ↗
        </a>
        <button
          type="button"
          className={SECONDARY}
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => setCopied(true));
          }}
        >
          {copied ? "Copiado ✓" : "Copiar enlace"}
        </button>
      </div>
    </section>
  );
}

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  pending: { label: "Esperando firmas", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  declined: { label: "Rechazado", className: "bg-red-500/15 text-red-600" },
  cancelled: { label: "Cancelado", className: "bg-black/[0.06] text-neutral-600 dark:bg-white/10 dark:text-neutral-300" },
  expired: { label: "Vencido", className: "bg-black/[0.06] text-neutral-600 dark:bg-white/10 dark:text-neutral-300" },
};

const SIGNER_STATUS: Record<string, string> = {
  pending: "Pendiente",
  signed: "Firmó",
  declined: "Rechazó",
};

function DocRow({ doc, onChange }: { doc: AdminDoc; onChange: (doc: AdminDoc) => void }) {
  const [pending, startTransition] = useTransition();
  const [revoking, setRevoking] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const status = docStatus(doc);
  const completed = status === "completed";
  const signed = doc.signers.filter((s) => s.status === "signed").length;
  const stuck = status === "pending" && doc.signers.length > 0 && signed === doc.signers.length;

  function run(action: () => Promise<{ ok: true; doc?: AdminDoc } | { ok: false; error: string }>, done = "") {
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.doc) onChange(result.doc);
      setRevoking(false);
      setReason("");
      setNotice(done);
    });
  }

  const update = (change: Parameters<typeof updateDocAction>[1]) =>
    run(() => updateDocAction(doc.id, change));

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{doc.title}</p>
          <p className="font-mono text-[11px] text-neutral-500">{doc.id}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {completed ? formatDate(doc.signedAt) : `Enviado ${formatDate(doc.sentAt ?? doc.signedAt)}`} ·{" "}
            {doc.pages} {doc.pages === 1 ? "pág." : "págs."}
            {doc.timestamp ? " · con sello de tiempo" : ""}
            {doc.signers.length > 0 ? ` · ${signed}/${doc.signers.length} firmas` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_CHIP[status] && (
            <span className={`${CHIP} ${STATUS_CHIP[status].className}`}>{STATUS_CHIP[status].label}</span>
          )}
          {doc.revokedAt && <span className={`${CHIP} bg-red-500/15 text-red-600`}>Revocado</span>}
          <span
            className={`${CHIP} ${
              doc.visibility === "public"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-black/[0.06] text-neutral-600 dark:bg-white/10 dark:text-neutral-300"
            }`}
          >
            {doc.visibility === "public" ? "Público" : "Privado"}
          </span>
        </div>
      </div>

      {doc.signers.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-xl bg-black/[0.03] px-3 py-2 text-xs dark:bg-white/[0.04]">
          {doc.signers.map((signer) => (
            <li key={signer.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="font-medium">{signer.name}</span>{" "}
                <span className="text-neutral-500">{signer.email}</span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={
                    signer.status === "signed"
                      ? "text-emerald-600"
                      : signer.status === "declined"
                        ? "text-red-600"
                        : "text-neutral-500"
                  }
                >
                  {SIGNER_STATUS[signer.status]}
                  {signer.signedAt ? ` · ${formatDate(signer.signedAt)}` : ""}
                </span>
                {status === "pending" && signer.status === "pending" && (
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-2 disabled:opacity-50"
                    disabled={pending}
                    onClick={() =>
                      run(() => resendInvitationAction(signer.id), `Reenviado a ${signer.email}.`)
                    }
                  >
                    Reenviar
                  </button>
                )}
              </span>
              {signer.status === "declined" && signer.declineReason && (
                <span className="w-full text-red-600">Motivo: {signer.declineReason}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {completed && (
          <a href={`/verify/${doc.id}/pdf`} className={SECONDARY}>
            Descargar
          </a>
        )}
        {completed && doc.auditSha256 && (
          <a href={`/verify/${doc.id}/audit`} className={SECONDARY}>
            Auditoría
          </a>
        )}
        <a href={`${VERIFY_PATH[doc.lang]}/${doc.id}`} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
          Verificación ↗
        </a>
        <button
          type="button"
          className={SECONDARY}
          disabled={pending}
          onClick={() => update({ visibility: doc.visibility === "public" ? "private" : "public" })}
        >
          {doc.visibility === "public" ? "Hacer privado" : "Hacer público"}
        </button>
        {stuck && (
          <button
            type="button"
            className={SECONDARY}
            disabled={pending}
            onClick={() => run(() => finalizeAction(doc.id), "PDF final generado.")}
          >
            Generar PDF final
          </button>
        )}
        {status === "pending" && (
          <button
            type="button"
            className={SECONDARY}
            disabled={pending}
            onClick={() => {
              if (window.confirm("¿Cancelar el envío? Los enlaces dejarán de funcionar.")) {
                run(() => cancelRequestAction(doc.id));
              }
            }}
          >
            Cancelar envío
          </button>
        )}
        {completed &&
          (doc.revokedAt ? (
            <button type="button" className={SECONDARY} disabled={pending} onClick={() => update({ restore: true })}>
              Quitar revocación
            </button>
          ) : (
            <button type="button" className={SECONDARY} disabled={pending} onClick={() => setRevoking((v) => !v)}>
              Revocar…
            </button>
          ))}
      </div>
      {revoking && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className={`${INPUT} max-w-md flex-1`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (se muestra al verificar)"
            maxLength={500}
          />
          <button
            type="button"
            className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            disabled={pending || !reason.trim()}
            onClick={() => update({ revoke: reason })}
          >
            Revocar
          </button>
        </div>
      )}
      {doc.revokedAt && doc.revokedReason && (
        <p className="mt-1.5 text-xs text-red-600">Motivo: {doc.revokedReason}</p>
      )}
      {notice && <p className="mt-1.5 text-xs text-emerald-600">{notice}</p>}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </li>
  );
}
