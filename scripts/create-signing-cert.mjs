// Creates the certificate that signs PDFs from /admin/firmas and prints the two
// environment variables to set (in .env.local and in Vercel). Run it ONCE:
// a new certificate makes earlier signatures show a different identity.
//
//   node scripts/create-signing-cert.mjs "Vicente G. Gómez" vicente@vicentegomez.cl
//
// The key is printed to your terminal only; nothing is written to disk.
// Paste each value whole — BEGIN/END lines and `\n`s included — into Vercel
// (without the outer quotes) and, as printed, into .env.local.

// Node warns that the .ts helper isn't declared as an ES module. It is, and it
// loads fine; the warning would only clutter what you copy.
const emitWarning = process.emitWarning;
process.emitWarning = (warning, ...rest) => {
  const code = typeof rest[0] === "object" ? rest[0]?.code : rest[1];
  if (code !== "MODULE_TYPELESS_PACKAGE_JSON") emitWarning.call(process, warning, ...rest);
};

const { createSelfSignedIdentity } = await import(
  new URL("../lib/self-signed-cert.ts", import.meta.url).href
);

const [commonName = "Vicente G. Gómez", email = "vicente@vicentegomez.cl"] =
  process.argv.slice(2);

const { certPem, keyPem } = createSelfSignedIdentity({ commonName, email });
const oneLine = (pem) => pem.trim().replace(/\r?\n/g, "\\n");

console.log(`# Signing certificate for ${commonName} <${email}>`);
console.log(`SIGNING_CERT_PEM="${oneLine(certPem)}"`);
console.log(`SIGNING_KEY_PEM="${oneLine(keyPem)}"`);
