// Liest content/ ein, prüft alles und schreibt src/generated/inhalte.json.
// Ordner = Baum. Dateitypen:  *.md (Lerneinheit) · *.szene.json · *.mindmap.json · *.leitfaden.json
//                             *.karten.json · *.quiz.json · *.trainer.json · _ordner.json (Ordner-Infos)
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { z } from 'zod';

const WURZEL = 'content';
const fehler = [];
const melde = (datei, text) => fehler.push(`${datei}: ${text}`);

const Ordner = z.object({
  titel: z.string(), latein: z.string().optional(), beschreibung: z.string().optional(),
  farbe: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), icon: z.string().optional(), reihenfolge: z.number().default(99),
}).strict();
const Einheit = z.object({
  lat: z.string(), de: z.string(), titel: z.string().optional(), wortherkunft: z.string().optional(),
  reihenfolge: z.number().default(99), steckbrief: z.record(z.string()).optional(),
  verwandt: z.array(z.string()).default([]), zu_pruefen: z.array(z.string()).default([]), quellen: z.array(z.string()).min(1),
}).strict();
const Quelle = z.object({ name: z.string(), urheber: z.string(), lizenz: z.string(), lizenzUrl: z.string(), url: z.string(), hinweis: z.string().optional() });
const Kopf = { titel: z.string(), beschreibung: z.string().optional(), reihenfolge: z.number().default(50) };
const Typen = {
  szene: z.object({
    ...Kopf, typ: z.literal('szene'), modell: z.string(), quelle: Quelle,
    schichten: z.array(z.object({ id: z.string(), titel: z.string(), farbe: z.string() })),
    strukturen: z.array(z.object({
      id: z.string(), lat: z.string(), de: z.string(), schicht: z.string(), art: z.string(), region: z.string(),
      dateien: z.array(z.string()).optional(), fma: z.string().optional(), schematisch: z.boolean().optional(),
      einheit: z.string().optional(), info: z.string().optional(),
    })),
  }),
  mindmap: z.object({
    ...Kopf, typ: z.literal('mindmap'),
    knoten: z.array(z.object({ id: z.string(), text: z.string(), unter: z.string().optional(), einheit: z.string().optional(), notiz: z.string().optional() })),
    verbindungen: z.array(z.object({ von: z.string(), nach: z.string(), text: z.string() })).default([]),
  }),
  leitfaden: z.object({
    ...Kopf, typ: z.literal('leitfaden'), quellen: z.array(z.string()).min(1), zu_pruefen: z.array(z.string()).default([]),
    knoten: z.array(z.object({
      id: z.string(), art: z.enum(['start', 'schritt', 'entscheidung', 'massnahme', 'warnung', 'ende']),
      titel: z.string(), kurz: z.string().optional(), kuerzel: z.string().optional(), details: z.array(z.string()).default([]),
    })),
    kanten: z.array(z.object({ von: z.string(), nach: z.string(), text: z.string().optional() })),
  }),
  karten: z.object({
    ...Kopf, typ: z.literal('karten'),
    karten: z.array(z.object({ id: z.string(), einheit: z.string().optional(), vorne: z.string(), hinten: z.string() })),
  }),
  quiz: z.object({
    ...Kopf, typ: z.literal('quiz'),
    fragen: z.array(z.object({
      id: z.string(), einheit: z.string().optional(), frage: z.string(), antworten: z.array(z.string()).min(3),
      richtig: z.number(), erklaerung: z.string(),
    })),
    benennen: z.object({ szene: z.string(), strukturen: z.array(z.string()) }).optional(),
  }),
  trainer: z.object({
    ...Kopf, typ: z.literal('trainer'),
    gruppen: z.array(z.object({
      id: z.string(), titel: z.string(),
      eintraege: z.array(z.object({ begriff: z.string(), bedeutung: z.string(), herkunft: z.string().optional(), beispiel: z.string().optional() })).min(4),
    })),
  }),
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// [[Patella|Kniescheibe]] oder [[Patella|Kniescheibe|Zusatzerklärung]] → antippbarer Fachbegriff
const begriffe = (md) => md.replace(/\[\[([^\]|]+)\|([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, lat, de, erkl) =>
  `<span class="begriff" tabindex="0" data-de="${esc(de)}"${erkl ? ` data-erkl="${esc(erkl)}"` : ''}>${esc(lat)}</span>`);

const knoten = [];           // alle Knoten flach
const verweise = [];         // später aufzulösende Kurznamen
function lies(dir, eltern) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const pfad = path.join(dir, e.name);
    const rel = path.relative(WURZEL, pfad).split(path.sep).join('/');
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
    if (e.isDirectory()) {
      const info = path.join(pfad, '_ordner.json');
      if (!fs.existsSync(info)) { melde(rel, '_ordner.json fehlt'); continue; }
      const p = Ordner.safeParse(JSON.parse(fs.readFileSync(info, 'utf8')));
      if (!p.success) { melde(rel + '/_ordner.json', p.error.message); continue; }
      const k = { id: rel, kurz: e.name, typ: 'ordner', eltern, ...p.data };
      knoten.push(k);
      lies(pfad, rel);
    } else if (e.name.endsWith('.md')) {
      const id = rel.replace(/\.md$/, '');
      const { data, content } = matter(fs.readFileSync(pfad, 'utf8'));
      const p = Einheit.safeParse(data);
      if (!p.success) { melde(rel, p.error.message); continue; }
      const abschnitte = content.split(/^## /m).slice(1).map((teil) => {
        const [kopf, ...rest] = teil.split('\n');
        const html = marked.parse(begriffe(rest.join('\n').trim()), { async: false })
          .replace(/href="@([^"]+)"/g, (_, kurz) => { verweise.push({ datei: rel, kurz }); return `href="@${kurz}"`; });
        return { titel: kopf.trim(), html };
      });
      for (const pflicht of ['Kurz erklärt', 'Aufbau und Funktion', 'Klinischer Bezug']) {
        if (!abschnitte.some((a) => a.titel.startsWith(pflicht))) melde(rel, `Abschnitt „## ${pflicht}" fehlt`);
      }
      const text = content.replace(/\[\[([^\]|]+)\|([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1 $2').replace(/[#*_>\[\]()@]/g, ' ');
      knoten.push({ id, kurz: e.name.replace(/\.md$/, ''), typ: 'einheit', eltern, ...p.data, titel: p.data.titel ?? p.data.lat, abschnitte, text });
    } else if (e.name.endsWith('.json')) {
      const m = e.name.match(/^(.+)\.(szene|mindmap|leitfaden|karten|quiz|trainer)\.json$/);
      if (!m) { melde(rel, 'unbekannter Dateityp'); continue; }
      let roh;
      try { roh = JSON.parse(fs.readFileSync(pfad, 'utf8')); } catch (err) { melde(rel, 'kein gültiges JSON: ' + err.message); continue; }
      const p = Typen[m[2]].safeParse({ typ: m[2], ...roh });
      if (!p.success) { melde(rel, p.error.message); continue; }
      knoten.push({ id: rel.replace(/\.json$/, '').replace(/\.(\w+)$/, '-$1'), kurz: m[1], eltern, ...p.data });
    }
  }
}
lies(WURZEL, null);

// ---------- Kurznamen auflösen und Verweise prüfen ----------
const nachKurz = (typ) => {
  const map = new Map();
  for (const k of knoten.filter((k) => k.typ === typ)) {
    if (map.has(k.kurz)) melde(k.id, `Kurzname „${k.kurz}" ist doppelt vergeben (${map.get(k.kurz)})`);
    map.set(k.kurz, k.id);
  }
  return map;
};
const einheiten = nachKurz('einheit'), szenen = nachKurz('szene');
const einheitId = (kurz, wo) => { const id = einheiten.get(kurz); if (!id) melde(wo, `Lerneinheit „${kurz}" gibt es nicht`); return id; };
for (const v of verweise) einheitId(v.kurz, v.datei);
for (const k of knoten) {
  if (k.typ === 'einheit') {
    k.verwandt = k.verwandt.map((v) => einheitId(v, k.id)).filter(Boolean);
    for (const a of k.abschnitte) a.html = a.html.replace(/href="@([^"]+)"/g, (_, kurz) => `href="#/n/${einheiten.get(kurz) ?? ''}"`);
  }
  if (k.typ === 'szene') for (const s of k.strukturen) {
    if (s.einheit) s.einheit = einheitId(s.einheit, k.id);
    if (!k.schichten.some((x) => x.id === s.schicht)) melde(k.id, `Schicht „${s.schicht}" unbekannt (${s.id})`);
  }
  if (k.typ === 'mindmap') {
    const ids = new Set(k.knoten.map((n) => n.id));
    for (const n of k.knoten) {
      if (n.einheit) n.einheit = einheitId(n.einheit, k.id);
      if (n.unter && !ids.has(n.unter)) melde(k.id, `Knoten „${n.unter}" fehlt`);
    }
    if (k.knoten.filter((n) => !n.unter).length !== 1) melde(k.id, 'genau ein Knoten ohne „unter" (Mitte) nötig');
    for (const v of k.verbindungen) if (!ids.has(v.von) || !ids.has(v.nach)) melde(k.id, `Verbindung ${v.von}→${v.nach} zeigt ins Leere`);
  }
  if (k.typ === 'leitfaden') {
    const ids = new Set(k.knoten.map((n) => n.id));
    for (const v of k.kanten) if (!ids.has(v.von) || !ids.has(v.nach)) melde(k.id, `Kante ${v.von}→${v.nach} zeigt ins Leere`);
  }
  if (k.typ === 'karten') for (const c of k.karten) { c.id = `${k.id}#${c.id}`; if (c.einheit) c.einheit = einheitId(c.einheit, k.id); }
  if (k.typ === 'quiz') {
    for (const f of k.fragen) {
      f.id = `${k.id}#${f.id}`;
      if (f.einheit) f.einheit = einheitId(f.einheit, k.id);
      if (f.richtig < 0 || f.richtig >= f.antworten.length) melde(k.id, `Frage ${f.id}: „richtig" liegt außerhalb der Antworten`);
    }
    if (k.benennen) {
      const sid = szenen.get(k.benennen.szene);
      const sz = knoten.find((x) => x.id === sid);
      if (!sz) melde(k.id, `Szene „${k.benennen.szene}" gibt es nicht`);
      else for (const s of k.benennen.strukturen) if (!sz.strukturen.some((x) => x.id === s)) melde(k.id, `Struktur ${s} fehlt in der Szene`);
      k.benennen.szene = sid;
    }
  }
}
for (const k of knoten) for (const [feld, wert] of Object.entries(k)) {
  if (feld === 'id' && knoten.filter((x) => x.id === wert).length > 1) melde(wert, 'ID doppelt');
}

if (fehler.length) {
  console.error(`\n✗ ${fehler.length} Fehler in den Inhalten:\n` + fehler.map((f) => '  - ' + f).join('\n') + '\n');
  process.exit(1);
}
fs.mkdirSync('src/generated', { recursive: true });
fs.writeFileSync('src/generated/inhalte.json', JSON.stringify({ knoten }));
const n = (t) => knoten.filter((k) => k.typ === t).length;
console.log(`✓ Inhalte: ${n('ordner')} Ordner, ${n('einheit')} Lerneinheiten, ${n('szene')} 3D-Szenen, ${n('mindmap')} Mindmaps, ${n('leitfaden')} Leitfäden, ${n('karten')} Kartenstapel, ${n('quiz')} Quiz, ${n('trainer')} Trainer`);
