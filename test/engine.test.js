import { test } from "node:test";
import assert from "node:assert/strict";
import * as F from "../src/engine.js";

const base = (over = {}) => ({
  typ: "oberteil", stoff: "jersey", group: "damen", size: "38", m: F.sizeM("damen", "38"),
  oberteil: { ...F.topDefaults(), lenKey: "huefte", len: null },
  kleid: { top: { ...F.topDefaults(), silhouette: "ausgestellt" }, taillennaht: false, rock: { form: "a_linie" }, lenKey: "knie", len: null },
  rock: { form: "a_linie", bund: "fest", taschen: false, lenKey: "knie", len: null },
  hose: { bein: "gerade", bund: "gummizug", leibhoehe: "normal", taschen: false, lenKey: "lang", len: null },
  sa: { seam: 1, hem: 2.5 }, fw: 140, ...over,
});
const SA = { seam: 1, hem: 2.5, fold: 0, facing: 4, casing: 3.5 };
const finite = (pts) => pts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));

function* variants() {
  for (const stoff of ["jersey", "webware"]) for (const group of ["damen", "herren"]) {
    const size = Object.keys(F.SIZES[group])[2];
    const m = F.sizeM(group, size);
    for (const passform of ["eng", "normal", "locker", "oversize"]) for (const aermel of ["ohne", "kurz", "lang"])
      for (const verschluss of ["keiner", "knopfleiste", "reissverschluss_hinten"]) for (const kragen of ["keiner", "hemdkragen"])
        yield base({ stoff, group, size, m, oberteil: { ...F.topDefaults(), passform, aermel, verschluss, kragen, manschetten: true, kapuze: passform === "oversize", taschen: true, buendchen: passform === "locker", lenKey: "po", len: null } });
    for (const form of ["bleistift", "gerade", "a_linie", "ausgestellt", "halbteller", "teller", "gerafft"]) {
      yield base({ stoff, group, size, m, typ: "rock", rock: { form, bund: "fest", taschen: true, lenKey: "midi", len: null } });
      yield base({ stoff, group, size, m, typ: "rock", rock: { form, bund: "gummizug", taschen: false, lenKey: "mini", len: null } });
      yield base({ stoff, group, size, m, typ: "kleid", kleid: { top: { ...F.topDefaults(), aermel: "kurz" }, taillennaht: true, rock: { form }, lenKey: "knie", len: null } });
    }
    for (const bein of ["eng", "gerade", "weit", "palazzo", "jogger"]) for (const bund of ["fest", "gummizug"]) for (const lenKey of ["kurz", "lang"]) for (const leibhoehe of ["normal", "tief", "hoch"])
      yield base({ stoff, group, size, m, typ: "hose", hose: { bein, bund, leibhoehe, taschen: true, lenKey, len: null } });
  }
}

test("alle Varianten ergeben gültige Schnittteile", () => {
  let n = 0;
  for (const S of variants()) {
    const R = F.draft(S);
    assert.ok(R.pieces.length >= 2, `${S.typ}: zu wenige Teile`);
    assert.ok(R.shape, `${S.typ}: keine 3D-Form`);
    const G = R.pieces.map((p) => F.buildPiece(p, SA, F.sizeLabel(S)));
    for (const g of G) {
      assert.ok(finite(g.cut) && finite(g.seam), `${g.p.name}: ungültige Koordinaten`);
      assert.ok(g.bb.w > 2 && g.bb.h > 2, `${g.p.name}: zu klein`);
      assert.ok(Math.abs(F.area(g.cut)) > Math.abs(F.area(g.seam)), `${g.p.name}: Zugabe liegt nicht außen`);
    }
    const fab = F.fabricNeed(G, S.fw);
    assert.ok(fab.len > 0 && fab.len < 600, `Stoffverbrauch unplausibel: ${fab.len}`);
    assert.ok(F.defaultSteps(S, R).length >= 4);
    n++;
  }
  assert.ok(n > 250, `nur ${n} Varianten geprüft`);
});

test("Stoffbruch-Kanten liegen auf x = 0 und haben keine Zugabe", () => {
  for (const S of variants()) for (const p of F.draft(S).pieces)
    for (const e of p.edges.filter((e) => e.sa === "fold"))
      assert.ok(e.pts.every(([x]) => Math.abs(x) < 1e-6), `${p.name}: Bruchkante nicht senkrecht`);
});

test("Ärmelkugel passt zum Armausschnitt (plus Einhaltweite)", () => {
  for (const stoff of ["jersey", "webware"]) {
    const S = base({ stoff, oberteil: { ...F.topDefaults(), aermel: "lang", lenKey: "huefte", len: null } });
    const R = F.draft(S);
    const arm = (name) => F.plen(R.pieces.find((p) => p.name === name).edges[2].pts);
    const sleeve = R.pieces.find((p) => p.name === "Ärmel");
    const cap = F.plen(sleeve.edges[0].pts) + F.plen(sleeve.edges[1].pts);
    const diff = cap - (arm("Vorderteil") + arm("Rückenteil"));
    assert.ok(diff >= 0 && diff < 2.5, `${stoff}: Mehrweite ${diff.toFixed(2)} cm`);
  }
});

test("Weite folgt der Passform", () => {
  const width = (passform) => F.draft(base({ oberteil: { ...F.topDefaults(), passform, lenKey: "huefte", len: null } })).info.hemCirc;
  assert.ok(width("eng") < width("normal") && width("normal") < width("locker") && width("locker") < width("oversize"));
});

test("Kragensteg ist so lang wie der halbe Halsausschnitt", () => {
  const R = F.draft(base({ stoff: "webware", oberteil: { ...F.topDefaults(), kragen: "hemdkragen", lenKey: "po", len: null } }));
  const front = R.pieces.find((p) => p.name === "Vorderteil"), back = R.pieces.find((p) => p.name === "Rückenteil");
  const half = F.plen(front.edges[0].pts) + F.plen(back.edges[0].pts);
  const stand = R.pieces.find((p) => p.name === "Kragensteg");
  assert.ok(Math.abs(F.plen(stand.edges[0].pts) - half) < 1, "Kragensteg passt nicht an den Ausschnitt");
});

test("Länge folgt der Wahl", () => {
  const L = (lenKey) => F.getLen(base({ typ: "hose", hose: { bein: "gerade", bund: "fest", taschen: false, lenKey, len: null } }), "hose");
  assert.ok(L("kurz") < L("bermuda") && L("bermuda") < L("siebenachtel") && L("siebenachtel") < L("lang"));
});

test("Palazzo ist weiter als weit, tiefer Bund ist weiter als Taillenbund", () => {
  const hem = (bein, leibhoehe = "normal") => F.draft(base({ typ: "hose", hose: { bein, bund: "fest", leibhoehe, taschen: false, lenKey: "lang", len: null } })).shape;
  assert.ok(hem("palazzo").legs.at(-1)[1] > hem("weit").legs.at(-1)[1] * 1.2);
  assert.ok(hem("weit", "tief").torso[0][1] > hem("weit").torso[0][1]);
  assert.ok(hem("weit", "tief").torso[0][0] === 5 && hem("weit", "hoch").torso[0][0] === -4);
});
