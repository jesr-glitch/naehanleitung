// Foto- und Textanalyse eines Kleidungsstücks mit Claude.
// Liefert die Optionen, mit denen die Schnittkonstruktion (engine.js) das Modell nachbildet.

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
export const EFFORT = process.env.CLAUDE_EFFORT || "high";
export const MAX_IMAGES = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const e = (...values) => ({ type: "string", enum: values });
const bool = { type: "boolean" };
const str = { type: "string" };
const list = { type: "array", items: { type: "string" } };
const obj = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });

// Reihenfolge ist Absicht: erst beobachten (merkmale), dann entscheiden.
export const SCHEMA = obj({
  merkmale: list,
  fehler: str,
  erkannt: str,
  beschreibung: str,
  typ: e("oberteil", "kleid", "rock", "hose"),
  stoff: e("jersey", "webware"),
  oberteil: obj({
    passform: e("eng", "normal", "locker", "oversize"),
    silhouette: e("gerade", "tailliert", "ausgestellt"),
    laenge: e("bauchfrei", "huefte", "po", "oberschenkel"),
    ausschnitt: e("rund", "hoch", "v", "boot", "eckig"),
    aermel: e("ohne", "kurz", "ellenbogen", "dreiviertel", "lang"),
    aermelform: e("schmal", "gerade", "ausgestellt"),
    verschluss: e("keiner", "knopfleiste", "reissverschluss_hinten"),
    kragen: e("keiner", "hemdkragen", "stehkragen"),
    kapuze: bool, taschen: bool, buendchen: bool, manschetten: bool,
  }),
  kleid: obj({ taillennaht: bool, laenge: e("mini", "knie", "midi", "maxi") }),
  rock: obj({
    form: e("bleistift", "gerade", "a_linie", "ausgestellt", "halbteller", "teller", "gerafft"),
    laenge: e("mini", "knie", "midi", "maxi"),
    bund: e("fest", "gummizug"),
    taschen: bool,
  }),
  hose: obj({
    bein: e("eng", "gerade", "weit", "jogger"),
    laenge: e("kurz", "bermuda", "siebenachtel", "lang"),
    bund: e("fest", "gummizug"),
    taschen: bool,
  }),
  stoffempfehlung: str,
  zutaten: list,
  nicht_abgebildet: list,
  schritte: list,
});

export const SYSTEM = `Du bist eine erfahrene Schnittdirektrice. Eine Schnitt-App konstruiert aus deiner Einschätzung parametrische Schnittteile nach den Körpermaßen der Nutzerin. Du bestimmst den passenden Grundschnitt und die Optionen, mit denen sich das gezeigte Modell am besten nachbilden lässt.

Vorgehen:
1. "merkmale": Beschreibe zuerst genau, was du siehst: Kragenart, Verschluss, Ärmellänge und -abschluss, Taschen, wo der Saum am Körper endet, wie weit das Teil sitzt, vermutliche Stoffart.
2. Wähle danach die Optionen. Passform und Länge leitest du daraus ab, wie das Teil am Körper sitzt, nicht aus dem Stil.
3. Fülle alle Abschnitte (oberteil, kleid, rock, hose). Die App liest nur die zum "typ" passenden; die übrigen füllst du mit neutralen Standardwerten.
   - typ "oberteil": "oberteil" mit allen Feldern.
   - typ "kleid": "oberteil" für das Oberteil (laenge egal), "kleid", und bei Taillennaht "rock.form" für den Rockteil.
   - typ "rock": "rock". typ "hose": "hose".
4. Hemden, Jacken und Mäntel ordnest du dem nächsten Oberteil zu (z. B. Knopfleiste, Hemdkragen, Manschetten, lockere Passform). Overalls ordnest du "hose" zu.
5. "nicht_abgebildet": Details des Originals, die der Grundschnitt nicht abbildet (z. B. Passe, Raglanärmel, Volants, Reverskragen), jeweils mit einem kurzen Tipp, wie man es ergänzt. Leere Liste, wenn alles abgebildet ist.
6. "schritte": 6 bis 12 konkrete Nähschritte in der richtigen Reihenfolge, passend zu genau diesen Optionen. "zutaten": Zutaten mit Menge.
7. "fehler": leerer String. Nur wenn kein Kleidungsstück zu erkennen ist, eine kurze Begründung.

Schreib alle Texte auf Deutsch, knapp und konkret.`;

export function userText({ hasImages, desc, hint }) {
  const parts = [hasImages
    ? "Die Bilder zeigen ein Kleidungsstück (flach liegend oder getragen, evtl. mehrere Ansichten)."
    : "Es gibt kein Foto. Arbeite nur mit der Beschreibung."];
  if (hint) parts.push(`Die Nutzerin sagt, es ist ${hint}.`);
  if (desc) parts.push(`Beschreibung der Nutzerin: """${desc}"""`);
  return parts.join("\n");
}

export class AnalyzeError extends Error {
  constructor(code, status, message) { super(message || code); this.code = code; this.status = status; }
}

// Prüft die Eingabe aus dem Browser und baut die Bildblöcke.
export function validateInput(body) {
  if (!body || typeof body !== "object") throw new AnalyzeError("invalid_request", 400, "Ungültige Anfrage");
  const images = Array.isArray(body.images) ? body.images : [];
  if (images.length > MAX_IMAGES) throw new AnalyzeError("image_rejected", 400, `Höchstens ${MAX_IMAGES} Fotos`);
  const blocks = images.map((img) => {
    if (!img || !MEDIA_TYPES.has(img.media_type) || typeof img.data !== "string" || !/^[A-Za-z0-9+/=]+$/.test(img.data))
      throw new AnalyzeError("image_rejected", 400, "Bildformat nicht unterstützt");
    if (Buffer.byteLength(img.data, "base64") > MAX_IMAGE_BYTES) throw new AnalyzeError("image_rejected", 413, "Bild zu groß");
    return { type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } };
  });
  const desc = typeof body.desc === "string" ? body.desc.trim().slice(0, 600) : "";
  const hint = typeof body.hint === "string" ? body.hint.trim().slice(0, 60) : "";
  if (!blocks.length && !desc) throw new AnalyzeError("invalid_request", 400, "Foto oder Beschreibung fehlt");
  return { blocks, desc, hint };
}

export async function analyzeGarment(client, { blocks, desc, hint }, { signal } = {}) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: EFFORT, format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: [...blocks, { type: "text", text: userText({ hasImages: blocks.length > 0, desc, hint }) }] }],
  }, { signal });
  if (response.stop_reason === "refusal") throw new AnalyzeError("refused", 422, "Zu diesem Bild gibt es keine Analyse");
  if (response.stop_reason === "max_tokens") throw new AnalyzeError("upstream_error", 502, "Antwort unvollständig");
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try { return JSON.parse(text); } catch { throw new AnalyzeError("upstream_error", 502, "Antwort nicht lesbar"); }
}
