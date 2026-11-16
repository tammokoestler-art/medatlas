import MiniSearch from 'minisearch';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alle, fachFarbe, knoten, link, pfad, strukturName, TYP_NAME, type Knoten } from '../daten';
import { Ikon } from './Ikon';

interface Eintrag { id: string; ziel: string; knoten: string; titel: string; unter: string; art: string; text: string }
const eintraege: Eintrag[] = [];
for (const k of alle) {
  const unter = k.typ === 'einheit' ? k.de : k.typ === 'ordner' ? (k.latein ?? '') : (k.beschreibung ?? '');
  const text = k.typ === 'einheit' ? `${k.text} ${Object.values(k.steckbrief ?? {}).join(' ')}` : (k.beschreibung ?? '');
  eintraege.push({ id: k.id, ziel: link(k.id), knoten: k.id, titel: k.titel, unter, art: TYP_NAME[k.typ], text });
  if (k.typ === 'szene') for (const s of k.strukturen)
    eintraege.push({ id: `${k.id}#${s.id}`, ziel: link(k.id, `?s=${s.id}`), knoten: k.id, titel: strukturName(s), unter: [s.de, s.seite].filter(Boolean).join(', '), art: '3D-Struktur', text: `${s.en ?? ''} ${s.info ?? ''}` });
  if (k.typ === 'trainer') for (const g of k.gruppen) for (const e of g.eintraege)
    eintraege.push({ id: `${k.id}#${g.id}#${e.begriff}`, ziel: link(k.id), knoten: k.id, titel: e.begriff, unter: e.bedeutung, art: 'Wortbaustein', text: e.beispiel ?? '' });
}
const glatt = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const index = new MiniSearch<Eintrag>({
  fields: ['titel', 'unter', 'text'], storeFields: ['ziel', 'knoten', 'titel', 'unter', 'art'],
  processTerm: (t) => glatt(t) || null,
  searchOptions: { boost: { titel: 4, unter: 3 }, prefix: true, fuzzy: 0.2 },
});
index.addAll(eintraege);

/** Der Dialog wird bei jedem Öffnen neu aufgebaut – so startet die Suche immer leer. */
export function Suche({ offen, schliesse }: { offen: boolean; schliesse: () => void }) {
  return offen ? <Dialog schliesse={schliesse} /> : null;
}

function Dialog({ schliesse }: { schliesse: () => void }) {
  const [frage, setFrage] = useState('');
  const [wahl, setWahl] = useState(0);
  const eingabe = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const treffer = useMemo(() => (frage.trim() ? index.search(frage).slice(0, 30) : []) as unknown as (Eintrag & { id: string })[], [frage]);
  useEffect(() => { eingabe.current?.focus(); }, []);
  const gehe = (t?: Eintrag) => { if (t) { nav(t.ziel); schliesse(); } };
  return (
    <>
      {(
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-3 pt-[8vh] backdrop-blur-sm" onClick={schliesse}>
          <div role="dialog" aria-label="Suche" className="karte einblenden flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-rand px-4">
              <Search size={18} className="text-leise" />
              <input ref={eingabe} autoFocus value={frage} placeholder="Suche: Begriff, Struktur, Thema …" className="h-14 flex-1 bg-transparent text-base !outline-none"
                onChange={(e) => { setFrage(e.target.value); setWahl(0); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setWahl((w) => Math.min(w + 1, treffer.length - 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setWahl((w) => Math.max(w - 1, 0)); }
                  if (e.key === 'Enter') gehe(treffer[wahl]);
                  if (e.key === 'Escape') schliesse();
                }} />
              <button aria-label="Suche schließen" onClick={schliesse} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-flaeche2"><X size={18} /></button>
            </div>
            <ul className="overflow-y-auto p-2" data-testid="suchtreffer">
              {!frage.trim() && <li className="p-6 text-center text-sm text-leise">Tippe z. B. „quadriceps“, „Kniescheibe“, „hyper“ oder „ABCDE“.</li>}
              {frage.trim() && !treffer.length && <li className="p-6 text-center text-sm text-leise">Nichts gefunden.</li>}
              {treffer.map((t, i) => {
                const k = knoten(t.knoten) as Knoten;
                return (
                  <li key={t.id} style={{ ['--fach' as string]: fachFarbe(t.knoten) }}>
                    <button onClick={() => gehe(t)} onMouseEnter={() => setWahl(i)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === wahl ? 'bg-fach-zart' : ''}`}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-fach-zart text-fach"><Ikon von={k} size={17} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{t.titel} {t.unter && <span className="font-normal text-leise">– {t.unter}</span>}</span>
                        <span className="block truncate text-xs text-leise">{t.art} · {pfad(t.knoten).slice(0, -1).map((p) => p.titel).join(' › ')}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
