# MedAtlas – Projektregeln

Lern-Web-App für Medizin (Deutsch). Läuft rein im Browser: kein Login, kein Backend, Fortschritt in `localStorage`.
Nutzer: Schüler ohne Vorwissen, will Vorklinik (Physikum, ÄApprO 2002 / IMPP-GK1) und einen Klinik-Ausblick lernen.

## Befehle
- `npm run dev` – Entwicklungsserver (baut vorher die Inhalte)
- `npm run inhalte` – prüft `content/` und erzeugt `src/generated/inhalte.json`; bricht bei Fehlern mit Liste ab
- `npm run build` – Inhalte + Typprüfung + Produktions-Build nach `dist/`
- `npm run preview` – gebaute App auf Port 4173
- `npm run rundgang` – automatischer Rundgang mit Playwright gegen die Vorschau (23 Prüfungen, Bilder in `tests/bilder/`)
- `npm run modell:bein -- <Ordner mit BodyParts3D-OBJ>` – baut `public/models/bein-rechts.glb` neu
- Ganzkörper-Atlas: erst `python3 scripts/koerper/szene_erzeugen.py <BodyParts3D-Ordner>` (erzeugt `content/grundlagen/anatomie/ganzkoerper.szene.json`), dann `npm run modell:koerper -- <Ordner mit OBJ>` (baut `public/models/koerper-<schicht>.glb`)

## Aufbau
- `content/` – **alle Inhalte**, Ordner = Baum. Nie Inhalte in `src/` schreiben.
- `content/_vorlagen/` – Vorlagen für jeden Dateityp (werden nicht eingelesen)
- `scripts/inhalte-bauen.mjs` – Schema (zod) und Prüfung aller Verweise
- `scripts/modell-bein.mjs` – 3D-Pipeline (OBJ → GLB, Meshopt)
- `src/daten.ts` – Typen und Zugriff auf die Inhalte · `src/speicher.ts` – Fortschritt, FSRS, Tagesziel
- `src/seiten/` – eine Datei je Seitentyp · `src/teile/` – gemeinsame Bausteine (Baum, Suche, Viewer3D)
- Bezeichner und Kommentare im Code sind deutsch.

## Inhalte ergänzen
Hierarchie: Bereich → Fachbereich (hat `farbe` + `icon`) → Themengebiet → Unterthema → Lerneinheit.

| Datei | Bedeutung |
|---|---|
| `_ordner.json` | Pflicht in jedem Ordner: `titel`, `reihenfolge`, optional `latein`, `beschreibung` |
| `name.md` | Lerneinheit. Der Dateiname ist der **Kurzname** und muss app-weit eindeutig sein |
| `name.karten.json` / `.quiz.json` / `.mindmap.json` / `.leitfaden.json` / `.trainer.json` / `.szene.json` | Werkzeuge im selben Ordner |

- Verweise immer über Kurznamen: `verwandt: [femur]`, im Text `[Text](@femur)`, in Karten/Quiz/Mindmap `"einheit": "femur"`.
- Fachbegriffe im Text: `[[Latein|Deutsch|optionale Worterklärung]]`.
- Pflichtabschnitte jeder Einheit: `## Kurz erklärt`, `## Aufbau und Funktion`, `## Klinischer Bezug`; dazu möglichst `## Merkhilfe`.
- Ein Trainer braucht mindestens 4 Einträge je Gruppe, ein Quiz mindestens 3 Antworten je Frage.
- Neuer Fachbereich: Ordner mit `farbe` (Hex) und `icon` anlegen; neue Icon-Namen in `src/teile/Ikon.tsx` eintragen.
- Nach jeder Änderung `npm run inhalte` ausführen.

## Inhaltliche Regeln (wichtig)
1. **Korrektheit vor Menge.** Lieber wenige geprüfte Einheiten.
2. Fachbegriffe immer lateinisch/griechisch **und** deutsch **und** mit kurzer Worterklärung (`wortherkunft`).
3. Nomenklatur nach Terminologia Anatomica (TA2, FIPAT 2019); lateinische Schreibweise mit c/ae/oe.
4. **Nicht raten.** Unsichere oder zwischen Lehrbüchern abweichende Angaben in `zu_pruefen` eintragen – sie erscheinen gelb in der App und auf der Seite „Zu prüfen“.
5. Jede Einheit und jeder Leitfaden nennt `quellen` mit Stand – und ehrlich, ob etwas ärztlich gegengelesen wurde (bisher: nichts).
6. Leitfäden: eigene Worte, eigenes Layout, **keine Medikamente, Dosierungen, Zielwerte oder Zeitgrenzen** („laut Quelle“). Leitlinie mit Registernummer, Version und Stand angeben; abgelaufene Leitlinien kennzeichnen.
7. Keine Texte aus GK, NKLM, AMBOSS, Lehrbüchern oder Leitlinien kopieren.
8. Karteikarten: genau eine Information pro Karte, keine „Nenne alle …“-Listen bei neuen Karten.
9. Sprache: Deutsch, „du“, kurze Sätze, für Einsteiger verständlich.
10. Der Hinweis „Lern-Tool, keine Grundlage für medizinische Entscheidungen“ bleibt beim ersten Start, in der Seitenleiste und auf jedem Leitfaden.

## 3D-Modelle
- Quelle: BodyParts3D 4.0, © DBCLS, CC BY 4.0 (Lizenzseite Stand 27.02.2025). Namensnennung steht in `bein.szene.json` und erscheint im Viewer und unter „Quellen & Lizenzen“. Bei neuen Quellen zuerst die Lizenz am Original prüfen.
- Die Rohdaten (136 MB) liegen nicht im Repo; nur das fertige GLB.
- Jede Struktur in `*.szene.json`: `id` = Mesh-Name, `lat`, `de`, `schicht`, `art`, `region`, optional `einheit`, `info`.
- BodyParts3D enthält keine Beinnerven. Die fünf Nerven sind in `modell-bein.mjs` als **schematische Röhren** aus den Lagen der Nachbarstrukturen berechnet und mit `schematisch: true` markiert. Nicht als exakte Anatomie ausgeben.
- Beim Laden der GLB immer die Knoten-Matrix mit anwenden (Quantisierung), siehe `Viewer3D.tsx`.
- **Ganzkörper-Atlas** (`ganzkoerper.szene.json`, 2234 Strukturen): Die Datei wird erzeugt – nicht von Hand bearbeiten. Namen pflegt man in `scripts/koerper/namen.txt` (`englisch|latein|deutsch`, englischer Name ohne „right/left“), danach Szene neu erzeugen. Leeres Latein bei Muskeln heißt „Musculus + englischer Name“. Was in der Tabelle fehlt, bleibt englisch und wird in der App als „noch nicht übersetzt“ markiert. Namen nur eintragen, wenn sie sicher sind.
- Eine Szene hat entweder `modell` (eine Datei) oder `datei` je Schicht; Schichten werden erst geladen, wenn sie sichtbar sind. `start` legt fest, welche Schichten anfangs an sind, `rahmen` den Kameraausschnitt.
- Im Datensatz fehlen periphere Nerven, große Teile der Leber, Bauchwand- und Gesichtsmuskeln und Knochenhäute. Das steht unter „Quellen & Lizenzen“ und darf nicht verschwiegen werden. Vollständiger wäre Z-Anatomy (CC BY-SA 4.0, braucht GitHub-Zugriff und Blender).

## Arbeitsweise
- Vor dem Zeigen: `npm run build`, Vorschau starten, `npm run rundgang` – alle Prüfungen müssen OK sein, Konsolenfehler leer.
- Neue Funktionen im Rundgang ergänzen.
- Erweiterung Modul für Modul; Reihenfolge und offene Ideen stehen in `README.md`.
