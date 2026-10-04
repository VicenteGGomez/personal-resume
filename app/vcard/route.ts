import { userAgent } from "next/server";
import { getResumeData } from "@/lib/resume-store";
import { decodeVcardFields, trackedUrl, type ShareLang } from "@/lib/qr-shortcuts";
import { countView } from "@/lib/tracked-redirect";

export const dynamic = "force-dynamic";

/**
 * `/vcard?f=name-phone-email&lang=es&src=…` — your contact card, with only the
 * fields asked for. Served as a `.vcf`: a phone opens it as "add contact".
 *
 * The card's own links go through this site with `?src=vcard`, so whoever saved
 * you and later taps your LinkedIn or web shows up in the stats too.
 */

/** Escape a vCard text value (RFC 6350 §3.4). */
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** "Vicente G. Gómez" → family "Gómez", given "Vicente", middle "G.". */
function nameParts(full: string): string {
  const words = full.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return `${esc(full)};;;;`;
  const family = words[words.length - 1];
  const [given, ...middle] = words.slice(0, -1);
  return `${esc(family)};${esc(given)};${esc(middle.join(" "))};;`;
}

/** ASCII file name from the person's name: "Vicente-G-Gomez.vcf". */
function fileName(full: string): string {
  const base = full
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "contacto"}.vcf`;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const fields = new Set(decodeVcardFields(params.get("f")));
  const lang: ShareLang = params.get("lang") === "en" ? "en" : "es";
  const data = await getResumeData();
  const { shared } = data;

  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  // FN is mandatory in a vCard; without "name" it still carries the name, as
  // the contact would otherwise be saved blank.
  lines.push(`FN:${esc(shared.name)}`);
  if (fields.has("name")) lines.push(`N:${nameParts(shared.name)}`);

  if (fields.has("phone")) {
    const phone = shared.phone || (shared.whatsapp ? `+${shared.whatsapp}` : "");
    if (phone) lines.push(`TEL;TYPE=CELL:${esc(phone)}`);
  }
  if (fields.has("email") && shared.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${esc(shared.email)}`);
  }
  if (fields.has("title")) {
    const current = data[lang].experiences?.[0];
    if (current?.role) lines.push(`TITLE:${esc(current.role)}`);
    if (current?.place) lines.push(`ORG:${esc(current.place)}`);
  }
  if (fields.has("location") && shared.location) {
    // "Santiago, Chile" → city and country; anything else goes in as the city.
    const [city, ...rest] = shared.location.split(",").map((part) => part.trim());
    lines.push(`ADR;TYPE=HOME:;;;${esc(city)};;;${esc(rest.join(", "))}`);
  }

  // `itemN.X-ABLabel` names each link in the iPhone's contact card; other
  // apps ignore it and still show the URL.
  const links: [string, string][] = [];
  if (fields.has("linkedin")) {
    links.push(["LinkedIn", trackedUrl("/linkedin", "vcard")]);
  }
  if (fields.has("web")) links.push(["CV", trackedUrl(`/${lang}`, "vcard")]);
  if (fields.has("clases")) {
    links.push([lang === "es" ? "Clases" : "Tutoring", trackedUrl("/clases", "vcard")]);
  }
  links.forEach(([label, url], i) => {
    lines.push(`item${i + 1}.URL:${url}`, `item${i + 1}.X-ABLabel:${esc(label)}`);
  });

  lines.push("END:VCARD");

  countView(request, "/vcard");

  // Safari on iPhone and iPad opens an inline card straight into "Create New
  // Contact"; as an attachment it would first ask to download a file. Other
  // browsers get the download — inline, a desktop would just show the text.
  const { os } = userAgent({ headers: request.headers });
  const disposition = os.name === "iOS" || os.name === "iPadOS" ? "inline" : "attachment";

  const name = fileName(shared.name);
  return new Response(`${lines.join("\r\n")}\r\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `${disposition}; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
