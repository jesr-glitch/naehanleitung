# Fadenlauf

Schnittmuster aus einem Foto. Foto hochladen, Größe wählen, sagen wie es sitzen soll. Fadenlauf erkennt mit Claude Schnitt und Details, konstruiert die Schnittteile nach den Maßen und gibt sie in Originalgröße als PDF aus, mit Zuschnittplan, Stoffverbrauch, Nähanleitung und einer drehbaren 3D-Skizze.

- **Einfach-Modus:** Foto → Größe → Passform und Länge → „Schnittmuster erstellen“.
- **Profi-Modus:** eigene Körpermaße, alle Modelloptionen, Naht- und Saumzugaben, Stoffbreite, Export als A4, Letter, Plotter-PDF und SVG 1:1.
- **Installierbar (PWA):** läuft wie eine App auf dem Startbildschirm; Schnittkonstruktion, 3D und PDF funktionieren auch offline.

## Live stellen in 3 Minuten

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/jesr-glitch/naehanleitung)

1. Auf den Knopf klicken und mit GitHub bei Render anmelden. Render fragt einmalig nach Zugriff auf dieses Repository.
2. Bei `ANTHROPIC_API_KEY` deinen Schlüssel aus der [Anthropic Console](https://console.anthropic.com/settings/keys) einfügen und **Apply** klicken.
3. Nach etwa zwei Minuten ist die App unter `https://fadenlauf-….onrender.com` erreichbar.

Der kostenlose Render-Tarif schläft nach 15 Minuten ohne Besucher ein; der erste Aufruf danach dauert dann etwa eine Minute. Zum Ausprobieren reicht das. Die Tagesgrenze steht zum Testen auf 100 Analysen (`ANALYZE_PER_DAY`).

## Schnellstart

```bash
npm install                 # kopiert auch jsPDF, three.js und die Schriften nach public/
cp .env.example .env        # ANTHROPIC_API_KEY eintragen
node --env-file=.env src/server.js
```

Dann <http://localhost:3000> öffnen. Ohne API-Schlüssel startet die App trotzdem: Die Foto-Analyse ist dann aus und es gibt Standardschnitte über „Was ist es?“.

Tests: `npm test` (Schnittkonstruktion in über 250 Varianten, Server, Eingabeprüfung, Begrenzung, statische Auslieferung).

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/engine.js` | Schnittkonstruktion ohne DOM: Geometrie, Grundschnitte (Oberteil, Kleid, Rock, Hose, Kragen, Manschetten), Nahtzugaben, Zuschnitt, Stoffverbrauch, Nähschritte. Läuft im Browser und in Node. |
| `src/analyze.js` | Prompt, JSON-Schema und Aufruf von Claude (`claude-opus-5-5`, Structured Outputs, Server-Fallback bei Ablehnungen). |
| `src/server.js` | Node-Server ohne Framework: liefert `public/` aus, `/api/health`, `/api/analyze`, Sicherheits-Header (CSP), Begrenzung pro IP/Stunde und pro Tag. |
| `public/app.js` | Oberfläche: Bedienung, Schnittbogen, 3D-Skizze (three.js), PDF/SVG-Export (jsPDF). |
| `public/sw.js` | Service Worker für den Offline-Betrieb. `/api/` wird nie zwischengespeichert. |
| `scripts/vendor.mjs` | Kopiert Bibliotheken und Schriften aus `node_modules` nach `public/` (läuft bei `npm install`). |
| `scripts/icons.mjs` | Erzeugt die PNG-Icons aus `public/icons/icon.svg` (braucht Playwright). |

Der API-Schlüssel bleibt auf dem Server. Der Browser schickt das verkleinerte Foto (max. 1600 px, JPEG) an `/api/analyze`, der Server ruft Claude auf und gibt nur die Schnittoptionen zurück. Fotos werden nicht gespeichert.

## Konfiguration

| Variable | Zweck | Standard |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Schlüssel für die Foto-Analyse | leer = Analyse aus |
| `PORT` | Port | `3000` |
| `CLAUDE_MODEL` | Modell | `claude-opus-5-5` |
| `CLAUDE_EFFORT` | Denktiefe: `low` bis `max`; `medium` spart Kosten | `high` |
| `ANALYZE_PER_HOUR` | Analysen pro IP und Stunde | `20` |
| `ANALYZE_PER_DAY` | Analysen insgesamt pro Tag (Kostenbremse) | `500` |
| `TRUST_PROXY` | `1`, wenn ein Reverse Proxy davor sitzt (echte Client-IP für die Begrenzung) | aus |

## Kosten

Eine Analyse schickt bis zu drei Fotos und einen festen Prompt mit Schema und bekommt eine strukturierte Antwort mit Nähschritten. Grob geschätzt sind das einige tausend Eingabe- und Ausgabetokens, also **etwa 5 bis 10 Cent pro Analyse** bei `claude-opus-5-5` (4 $ / 20 $ pro Million Tokens). Das ist eine Schätzung: Miss die echten Werte über die Usage-Ansicht in der Anthropic Console und setze dort zusätzlich ein Ausgabenlimit. `ANALYZE_PER_DAY` begrenzt die Tageskosten auf Serverseite.

## Veröffentlichen

Die App ist ein einzelner Node-Prozess ohne Datenbank. Jeder Anbieter mit Node 20+ oder Docker passt.

**Render / Railway (am einfachsten):** Repository verbinden, Build-Befehl `npm ci`, Start-Befehl `npm start`, Umgebungsvariablen `ANTHROPIC_API_KEY` und `TRUST_PROXY=1` setzen. Eigene Domain im Dashboard hinzufügen, HTTPS kommt automatisch.

**Fly.io / eigener Server mit Docker:**

```bash
docker build -t fadenlauf .
docker run -d -p 3000:3000 --env-file .env --restart unless-stopped fadenlauf
```

Davor einen Reverse Proxy mit HTTPS setzen, z. B. Caddy: `fadenlauf.de { reverse_proxy localhost:3000 }`. HTTPS ist Pflicht, sonst funktionieren Installation und Offline-Betrieb nicht.

**In die App-Stores:** Die PWA lässt sich ohne Umbau verpacken. Für Android mit einer Trusted Web Activity (z. B. Bubblewrap oder PWABuilder), für iOS mit Capacitor. Beide laden die veröffentlichte URL; nötig sind Store-Konten, Store-Texte, Screenshots und für Android eine `/.well-known/assetlinks.json`.

## Checkliste vor dem Start

Technisch ist die App fertig. Diese Punkte brauchen eine Entscheidung oder Angaben von dir:

- [ ] **Impressum und Datenschutz ausfüllen** (`public/impressum.html`, `public/datenschutz.html`, markierte Stellen). Die Datenschutzerklärung ist ein Entwurf und sollte fachkundig geprüft werden. Vertrag und Datenverarbeitungsbedingungen von Anthropic sowie die Hosting-Logs abgleichen.
- [ ] **Domain und Hosting** wählen, `ANTHROPIC_API_KEY` als Geheimnis hinterlegen, `TRUST_PROXY=1` setzen.
- [ ] **Ausgabenlimit** in der Anthropic Console setzen und `ANALYZE_PER_DAY` passend wählen.
- [ ] **Schnitte prüfen lassen:** Je Kleidungsart ein Probeteil nähen und die Grundschnitte von einer Schnittdirektrice oder erfahrenen Schneiderin durchsehen lassen (Passform, Größentabelle, Zugaben).
- [ ] **Name prüfen:** Marken- und Domainrecherche für „Fadenlauf“.
- [ ] **Icon und Store-Material** final gestalten, falls die Apps in die Stores sollen.
- [ ] **Fehler-Monitoring** (z. B. Server-Logs beim Hoster beobachten) und ein Kontakt für Rückmeldungen.

## Bekannte Grenzen

- Grundschnitte ohne Brustabnäher in der Oberteil-Grundform; Passen, Raglanärmel, Reverskragen, Volants und Futter werden nicht konstruiert. Claude nennt solche Details unter „Nicht im Grundschnitt enthalten“ mit einem Tipp.
- Die 3D-Ansicht ist eine Skizze der Silhouette, keine Stoffsimulation.
- Größentabellen: deutsche Konfektionsgrößen Damen 34–48, Herren 44–56. Kinder- und Plus-Größen fehlen noch.
