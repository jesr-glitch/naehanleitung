// Kopiert Bibliotheken und Schriften aus node_modules nach public/, damit die App
// keine fremden Server braucht (Datenschutz, Offline-Betrieb).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };

copy(path.join(pkgDir("jspdf"), "dist/jspdf.umd.min.js"), path.join(root, "public/vendor/jspdf.umd.min.js"));
copy(path.join(pkgDir("three"), "build/three.min.js"), path.join(root, "public/vendor/three.min.js"));
const fonts = [
  ["@fontsource/young-serif", "young-serif-latin-400-normal.woff2", "young-serif-400.woff2"],
  ...[400, 500, 600, 700].map((w) => ["@fontsource/instrument-sans", `instrument-sans-latin-${w}-normal.woff2`, `instrument-sans-${w}.woff2`]),
  ...[400, 500].map((w) => ["@fontsource/ibm-plex-mono", `ibm-plex-mono-latin-${w}-normal.woff2`, `ibm-plex-mono-${w}.woff2`]),
];
for (const [pkg, file, out] of fonts) copy(path.join(pkgDir(pkg), "files", file), path.join(root, "public/fonts", out));
console.log("Fadenlauf: Bibliotheken und Schriften nach public/ kopiert.");
