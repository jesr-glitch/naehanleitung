// Erzeugt die PNG-App-Icons aus public/icons/icon.svg (braucht Playwright/Chromium, nur bei Icon-Änderungen nötig).
import fs from "node:fs";
import { chromium } from "playwright";
const svg = fs.readFileSync("public/icons/icon.svg", "utf8");
const b = await chromium.launch();
const p = await b.newPage();
for (const [name, size, pad, round] of [["icon-192.png", 192, 0, true], ["icon-512.png", 512, 0, true], ["icon-maskable-512.png", 512, 0.1, false], ["apple-touch-icon.png", 180, 0, false]]) {
  const inner = round ? svg : svg.replace('rx="112"', 'rx="0"');
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0;background:#23493c"><div style="width:${size}px;height:${size}px;display:grid;place-items:center"><div style="width:${size * (1 - 2 * pad)}px;height:${size * (1 - 2 * pad)}px">${inner.replace("<svg ", '<svg width="100%" height="100%" ')}</div></div></body></html>`);
  await p.screenshot({ path: `public/icons/${name}`, omitBackground: round });
}
await b.close();
