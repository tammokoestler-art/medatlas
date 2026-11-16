# MedAtlas

Lern-Web-App für Medizin: Ordnerbaum, Lerneinheiten, 3D-Anatomie, Mindmaps, Leitfäden, Karteikarten (FSRS), Quiz und Terminologie-Trainer. Alles auf Deutsch, läuft offline im Browser.

> **Lern-Tool – keine Grundlage für medizinische Entscheidungen.** Die Inhalte wurden von einer KI aus Lehrbuchwissen verfasst und nicht ärztlich gegengelesen.

## Starten
```bash
npm install
npm run dev        # http://localhost:5173
```
Fertig gebaut: `npm run build && npm run preview` (http://localhost:4173).

## Stand
Pilotmodul **Untere Extremität**: 22 Lerneinheiten, 3D-Bein (126 Strukturen), Mindmap, 46 Karteikarten, 21 Quizfragen + 3D-Benennquiz. Dazu 3 Terminologie-Einheiten mit Trainer (74 Wortbausteine) und der Leitfaden **ABCDE-Schema**.

## Nächste Schritte (Ideen)
- Wortbaustein-Liste auf ca. 90 erweitern, Bausteine in Begriffen verlinken
- Nerven und lateinische Namen aus Z-Anatomy (CC BY-SA 4.0) übernehmen
- Weitere Leitfäden: BLS, ALS, Polytrauma, Atemweg, Sepsis
- Karten aus dem 3D-Modell erzeugen, Lückentext-Karten, Wochenziel statt harter Serie
- Sicht „Organsystem“ über Tags

Regeln und Vorlagen für neue Inhalte: `CLAUDE.md` und `content/_vorlagen/`.

## Lizenzen
3D-Daten: BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution 4.0 International.
