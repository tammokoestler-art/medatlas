import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Eye, EyeOff, Focus, Layers, List, Search, X } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { knoten, link, type Struktur, type Szene } from '../daten';
import Viewer3D, { MARKIERT, type Blick, type Sicht } from '../teile/Viewer3D';

const ANSICHTEN: [string, [number, number, number]][] = [['Vorn', [0, 0.08, 1]], ['Hinten', [0, 0.08, -1]], ['Außen', [-1, 0.08, 0]], ['Innen', [1, 0.08, 0]]];
const NAECHSTE: Record<Sicht, Sicht> = { an: 'durch', durch: 'aus', aus: 'an' };
const SICHT_NAME: Record<Sicht, string> = { an: 'sichtbar', durch: 'durchsichtig', aus: 'aus' };
const REGION: Record<string, string> = { huefte: 'Becken und Hüfte', oberschenkel: 'Oberschenkel', knie: 'Knie', unterschenkel: 'Unterschenkel', fuss: 'Fuß', bein: 'ganzes Bein' };

export default function Szeneseite({ k }: { k: Szene }) {
  const [param, setParam] = useSearchParams();
  const [schichten, setSchichten] = useState<Record<string, Sicht>>(() => Object.fromEntries(k.schichten.map((s) => [s.id, s.id === 'haut' ? 'aus' : 'an'])) as Record<string, Sicht>);
  const [frei, setFrei] = useState(false);
  const [blick, setBlick] = useState<Blick>({ richtung: [-0.6, 0.12, 1], n: 0 });
  const [tafel, setTafel] = useState<'schichten' | 'liste' | null>(() => (innerWidth >= 900 ? 'schichten' : null));
  const [filter, setFilter] = useState('');

  const einheit = knoten(param.get('e'));
  const gewaehlt = useMemo(() => {
    const s = param.get('s');
    if (s) return [s];
    return einheit ? k.strukturen.filter((x) => x.einheit === einheit.id).map((x) => x.id) : [];
  }, [param, einheit, k]);
  const erste = k.strukturen.find((s) => s.id === gewaehlt[0]);
  const waehle = (id: string | null) => setParam(id ? { s: id } : {}, { replace: true });

  // gewählte Strukturen immer einblenden
  useEffect(() => {
    const noetig = new Set(k.strukturen.filter((s) => gewaehlt.includes(s.id)).map((s) => s.schicht));
    setSchichten((alt) => { const neu = { ...alt }; for (const s of noetig) if (neu[s] === 'aus') neu[s] = 'an'; return neu; });
    if (!gewaehlt.length) setFrei(false);
  }, [gewaehlt, k]);

  const sicht = (s: Struktur): Sicht => (gewaehlt.includes(s.id) ? 'an' : frei && gewaehlt.length ? (schichten[s.schicht] === 'aus' ? 'aus' : 'durch') : schichten[s.schicht]);
  const liste = k.strukturen.filter((s) => `${s.lat} ${s.de}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="relative h-full overflow-hidden bg-[radial-gradient(ellipse_at_center,var(--flaeche2),var(--bg))]" data-testid="szene">
      <Suspense fallback={<div className="grid h-full place-items-center text-leise">3D-Modell lädt …</div>}>
        <Viewer3D szene={k} sicht={sicht} gewaehlt={gewaehlt} fokus={gewaehlt} blick={blick} onWaehle={waehle} />
      </Suspense>

      {/* Werkzeugleiste */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-2 p-3">
        <div className="pointer-events-auto flex gap-1.5">
          <button className={`knopf !min-h-10 !px-3 ${tafel === 'schichten' ? 'knopf-fach' : ''}`} onClick={() => setTafel(tafel === 'schichten' ? null : 'schichten')}><Layers size={16} /><span className="hidden sm:inline">Schichten</span></button>
          <button className={`knopf !min-h-10 !px-3 ${tafel === 'liste' ? 'knopf-fach' : ''}`} onClick={() => setTafel(tafel === 'liste' ? null : 'liste')}><List size={16} /><span className="hidden sm:inline">Strukturen</span></button>
        </div>
        <div className="pointer-events-auto ml-auto flex gap-1 rounded-xl border border-rand bg-flaeche/90 p-1 backdrop-blur">
          {ANSICHTEN.map(([name, richtung]) => (
            <button key={name} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-flaeche2" onClick={() => setBlick((b) => ({ richtung, n: b.n + 1 }))}>{name}</button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {tafel && (
          <motion.div key={tafel} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            className="karte absolute left-3 top-[5.2rem] z-10 flex max-h-[calc(100%-6.5rem)] w-64 flex-col overflow-hidden bg-flaeche/95 backdrop-blur">
            {tafel === 'schichten' ? (
              <div className="space-y-1 p-2" data-testid="schichten">
                {k.schichten.map((s) => (
                  <button key={s.id} onClick={() => setSchichten((a) => ({ ...a, [s.id]: NAECHSTE[a[s.id]] }))} aria-label={`${s.titel}: ${SICHT_NAME[schichten[s.id]]}`}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-flaeche2">
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: s.farbe, opacity: schichten[s.id] === 'aus' ? 0.25 : 1 }} />
                    <span className={`flex-1 font-semibold ${schichten[s.id] === 'aus' ? 'text-leise line-through' : ''}`}>{s.titel}</span>
                    <span className="text-xs text-leise">{SICHT_NAME[schichten[s.id]]}</span>
                    {schichten[s.id] === 'aus' ? <EyeOff size={16} className="text-leise" /> : <Eye size={16} className={schichten[s.id] === 'durch' ? 'opacity-50' : ''} />}
                  </button>
                ))}
                <p className="px-3 pb-1 pt-2 text-xs leading-snug text-leise">Tippen wechselt: sichtbar → durchsichtig → aus.</p>
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 border-b border-rand px-3"><Search size={15} className="text-leise" />
                  <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Struktur suchen …" className="h-11 w-full bg-transparent text-sm !outline-none" /></label>
                <ul className="overflow-y-auto p-1.5">
                  {liste.map((s) => (
                    <li key={s.id}><button onClick={() => waehle(s.id)} className={`w-full rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-flaeche2 ${gewaehlt.includes(s.id) ? 'bg-fach-zart' : ''}`}>
                      <span className="block truncate font-semibold italic">{s.lat}</span><span className="block truncate text-xs text-leise">{s.de}</span></button></li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Infokarte */}
      <AnimatePresence>
        {erste && (
          <motion.aside key={gewaehlt.join()} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} data-testid="infokarte"
            className="karte absolute inset-x-3 bottom-3 max-h-[46%] overflow-y-auto p-4 sm:inset-x-auto sm:right-3 sm:w-80 sm:max-h-[70%]">
            <button aria-label="Auswahl aufheben" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg hover:bg-flaeche2" onClick={() => waehle(null)}><X size={16} /></button>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-leise">
              <span className="h-3 w-3 rounded-full" style={{ background: MARKIERT }} />{k.schichten.find((s) => s.id === erste.schicht)?.titel} · {REGION[erste.region] ?? erste.region}
            </div>
            {gewaehlt.length > 1 && einheit ? (
              <>
                <h2 className="pr-8 text-xl font-extrabold italic leading-tight">{einheit.titel}</h2>
                <ul className="mt-2 space-y-0.5 text-sm">{k.strukturen.filter((s) => gewaehlt.includes(s.id)).map((s) => (
                  <li key={s.id}><button className="text-left underline decoration-dotted" onClick={() => waehle(s.id)}><i>{s.lat}</i> – {s.de}</button></li>))}</ul>
              </>
            ) : (
              <>
                <h2 className="pr-8 text-xl font-extrabold italic leading-tight" data-testid="struktur-lat">{erste.lat}</h2>
                <p className="font-semibold text-fach-text" data-testid="struktur-de">{erste.de}</p>
                {erste.info && <p className="mt-2 text-sm leading-relaxed">{erste.info}</p>}
                {erste.schematisch && <p className="mt-2 rounded-lg bg-amber-400/15 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300">⚠ Schematischer Verlauf – nicht aus dem Datensatz, zu prüfen.</p>}
                {erste.fma && <p className="mt-2 text-xs text-leise">FMA-ID: {erste.fma.replace('FMA', '')}</p>}
              </>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {(erste.einheit || einheit) && <Link to={link(einheit?.id ?? erste.einheit!)} className="knopf knopf-fach !min-h-9 !py-1.5 text-sm"><BookOpen size={15} />Zur Lerneinheit</Link>}
              <button className={`knopf !min-h-9 !py-1.5 text-sm ${frei ? 'knopf-fach' : ''}`} aria-pressed={frei} onClick={() => setFrei(!frei)}><Focus size={15} />Freistellen</button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <Link to="/quellen" className="absolute left-3 top-[3.9rem] text-[.62rem] text-leise underline sm:bottom-1 sm:top-auto sm:text-[.68rem]">3D-Daten: BodyParts3D © DBCLS, {k.quelle.lizenz}</Link>
      {!erste && <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-leise sm:bottom-6">Struktur antippen · ziehen = drehen · zwei Finger / Mausrad = zoomen</p>}
    </div>
  );
}
