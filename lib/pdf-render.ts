/**
 * Renders a PDF's pages to images in the browser, for the editors that show a
 * document (placing signatures in /admin/firmas, signing it at /sign).
 */

/** A rendered page and its size as displayed, in PDF points. */
export interface PageImage {
  url: string;
  width: number;
  height: number;
}

export async function renderPdf(bytes: ArrayBuffer): Promise<PageImage[]> {
  // The legacy build: the modern one calls JavaScript too new for current
  // Safari and Chrome (Map#getOrInsertComputed, Math.sumPrecise…) and fails
  // on every PDF there. Legacy ships those polyfilled.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // The worker file's own URL, for pdf.js to start as a module worker. Not
  // `new Worker(new URL(…))`: Turbopack wraps that in a bootstrap that calls
  // importScripts, which module workers don't have — Safari then fails every
  // PDF with "undefined is not a function".
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  // pdf.js takes ownership of the buffer it's given, so hand it a copy.
  const task = pdfjs.getDocument({ data: bytes.slice(0) });
  const pdf = await task.promise;
  const pages: PageImage[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2, 1400 / base.width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    pages.push({ url: canvas.toDataURL("image/jpeg", 0.85), width: base.width, height: base.height });
    page.cleanup();
  }
  await task.destroy();
  return pages;
}
