import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Eye, EyeOff, Focus, Layers, List, Search, X } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { knoten, link, strukturName, type Einheit, type Struktur, type Szene } from '../daten';
import Viewer3D, { MARKIERT, type Blick, type Sicht } from '../teile/Viewer3D';

const ANSICHTEN: [string, [number, number, number]][] = [['Vorn', [0, 0.08, 1]], ['Hinten', [0, 0.08, -1]], ['Rechts', [-1, 0.08, 0]], ['Links', [1, 0.08, 0]]];
const NAECHSTE: Record<Sicht, Sicht> = { an: 'durch', durch: 'aus', aus: 'an' };
const SICHT_NAME: Record<Sicht, string> = { an: 'sichtbar', durch: 'durchsichtig', aus: 'aus' };
const REGION: Record<string, string> = { kopf: 'Kopf und Hals', rumpf: 'Rumpf', arm: 'Arm', huefte: 'Becken und Hüfte', oberschenkel: 'Oberschenkel', knie: 'Knie', unterschenkel: 'Unterschenkel', fuss: 'Fuß', bein: 'Bein', ganz: 'ganzer Körper' };
const ART: Record<string, string> = { knochen: 'Knochen', knorpel: 'Knorpel', zahn: 'Zahn', band: 'Band', muskel: 'Muskel', sehne: 'Sehne', arterie: 'Arterie', vene: 'Vene', nerv: 'Nerv', zns: 'Gehirn / Rückenmark', organ: 'Organ', haut: 'Haut' };

/** Großes Infofenster zu einer oder mehreren gewählten Strukturen. */
function Info({ k, gewaehlt, einheit, frei, setFrei, waehle }: { k: Szene; gewaehlt: Struktur[]; einheit?: Einheit; frei: boolean; setFrei: (b: boolean) => void; waehle: (id: string | null) => void }) {
  const s = gewaehlt[0];
  const mehrere = gewaehlt.length > 1;
  const e = einheit ?? (knoten(s.einheit) as Einheit | undefined);
  const abschnitt = (anfang: string) => e?.abschnitte.find((a) => a.titel.startsWith(anfang));
  return (
    <div className="flex h-full flex-col" data-testid="infokarte">
      <header className="relative border-b border-rand bg-fach-zart p-5 pr-12">
        <button aria-label="Auswahl aufheben" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-flaeche/70 hover:bg-flaeche" onClick={() => waehle(null)}><X size={18} /></button>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="marke"><span className="h-2.5 w-2.5 rounded-full" style={{ background: MARKIERT }} />{mehrere ? `${gewaehlt.length} Strukturen` : ART[s.art] ?? s.art}</span>
          {!mehrere && <span className="marke">{REGION[s.region] ?? s.region}</span>}
          {!mehrere && s.seite && <span className="marke">{s.seite}</span>}
        </div>
        <h2 className="text-2xl font-extrabold italic leading-tight sm:text-3xl" data-testid="struktur-lat">{mehrere && e ? e.lat : strukturName(s)}</h2>
        <p className="mt-1 text-lg font-semibold text-fach-text sm:text-xl" data-testid="struktur-de">{mehrere && e ? e.de : s.de || '–'}</p>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {!mehrere && !s.lat && <p className="rounded-xl bg-amber-400/15 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">Noch nicht übersetzt – das ist der englische Name aus dem Datensatz.</p>}
        {!mehrere && s.lat && !s.de && <p className="text-sm text-leise">Für diese Struktur ist noch kein deutscher Name hinterlegt.</p>}
        {!mehrere && s.schematisch && <p className="rounded-xl bg-amber-400/15 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">⚠ Schematischer Verlauf – nicht aus dem Datensatz, zu prüfen.</p>}
        {!mehrere && s.info && <p className="text-[1.05rem] leading-relaxed">{s.info}</p>}

        {mehrere && (
          <div className="grid gap-2 sm:grid-cols-2">
            {gewaehlt.map((x) => (
              <button key={x.id} onClick={() => waehle(x.id)} className="rounded-xl border border-rand bg-flaeche2 p-3 text-left transition-colors hover:border-fach">
                <span className="block font-bold italic leading-tight">{strukturName(x)}</span>
                <span className="block text-sm text-leise">{[x.de, x.seite].filter(Boolean).join(' · ')}</span>
              </button>
            ))}
          </div>
        )}

        {e && (
          <>
            {e.wortherkunft && <div><h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-leise">Wortherkunft</h3><p>{e.wortherkunft}</p></div>}
            {e.steckbrief && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-leise">Steckbrief{!mehrere && e.lat !== s.lat ? `: ${e.titel}` : ''}</h3>
                <dl className="divide-y divide-rand overflow-hidden rounded-xl border border-rand">
                  {Object.entries(e.steckbrief).map(([a, b]) => <div key={a} className="px-3.5 py-2.5"><dt className="text-xs font-bold uppercase tracking-wide text-fach-text">{a}</dt><dd className="leading-snug">{b}</dd></div>)}
                </dl>
              </div>
            )}
            {abschnitt('Kurz') && <div><h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-leise">Kurz erklärt</h3><div className="prosa" dangerouslySetInnerHTML={{ __html: abschnitt('Kurz')!.html }} /></div>}
            {abschnitt('Klinisch') && <div className="rounded-2xl bg-fach-zart p-4"><h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-fach-text">Warum ist das wichtig?</h3><div className="prosa !text-[.95rem]" dangerouslySetInnerHTML={{ __html: abschnitt('Klinisch')!.html }} /></div>}
          </>
        )}
        {!e && !mehrere && <p className="text-sm text-leise">Zu dieser Struktur gibt es noch keine Lerneinheit.</p>}
        {!mehrere && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-leise">
            <dt>Schicht</dt><dd>{k.schichten.find((x) => x.id === s.schicht)?.titel}</dd>
            {s.en && <><dt>Englisch</dt><dd>{s.en}</dd></>}
            {s.fma && <><dt>FMA-ID</dt><dd>{s.fma.replace('FMA', '')}</dd></>}
          </dl>
        )}
      </div>
      <footer className="flex flex-wrap gap-2 border-t border-rand p-4">
        {e && <Link to={link(e.id)} className="knopf knopf-fach flex-1"><BookOpen size={17} />Zur Lerneinheit</Link>}
        <button className={`knopf ${e ? '' : 'flex-1'} ${frei ? 'knopf-fach' : ''}`} aria-pressed={frei} onClick={() => setFrei(!frei)}><Focus size={17} />Freistellen</button>
      </footer>
    </div>
  );
}

export default function Szeneseite({ k }: { k: Szene }) {
  const [param, setParam] = useSearchParams();
  const [schichten, setSchichten] = useState<Record<string, Sicht>>(() => Object.fromEntries(k.schichten.map((s) => [s.id, k.start ? (k.start[s.id] ?? 'aus') : s.id === 'haut' ? 'aus' : 'an'])) as Record<string, Sicht>);
  const [frei, setFrei] = useState(false);
  const [bereich, setBereich] = useState('');
  const [blick, setBlick] = useState<Blick>({ richtung: k.rahmen ? [-0.35, 0.1, 1] : [-0.6, 0.12, 1], n: 0 });
  const [tafel, setTafel] = useState<'schichten' | 'liste' | null>(() => (innerWidth >= 900 ? 'schichten' : null));
  const [filter, setFilter] = useState('');
  const [breit, setBreit] = useState(() => matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const m = matchMedia('(min-width: 1024px)'), hoere = () => setBreit(m.matches);
    m.addEventListener('change', hoere);
    return () => m.removeEventListener('change', hoere);
  }, []);

  const einheit = knoten(param.get('e')) as Einheit | undefined;
  const gewaehlt = useMemo(() => {
    const s = param.get('s');
    if (s) return [s];
    return einheit ? k.strukturen.filter((x) => x.einheit === einheit.id).map((x) => x.id) : [];
  }, [param, einheit, k]);
  const gewaehlte = useMemo(() => k.strukturen.filter((s) => gewaehlt.includes(s.id)), [k, gewaehlt]);
  const waehle = useCallback((id: string | null) => setParam(id ? { s: id } : {}, { replace: true }), [setParam]);

  // gewählte Strukturen immer einblenden
  useEffect(() => {
    const noetig = new Set(gewaehlte.map((s) => s.schicht));
    setSchichten((alt) => { const neu = { ...alt }; for (const s of noetig) if (neu[s] !== 'an') neu[s] = 'an'; return neu; });
    if (!gewaehlte.length) setFrei(false);
  }, [gewaehlte]);

  const sicht = useCallback((s: Struktur): Sicht => (gewaehlt.includes(s.id) ? 'an' : frei && gewaehlt.length ? (schichten[s.schicht] === 'aus' ? 'aus' : 'durch') : schichten[s.schicht]), [gewaehlt, frei, schichten]);
  const regionen = useMemo(() => [...new Set(k.strukturen.map((s) => s.region))].filter((r) => r !== 'ganz'), [k]);
  const fokus = useMemo(() => (gewaehlt.length ? gewaehlt : bereich ? k.strukturen.filter((s) => s.region === bereich && schichten[s.schicht] !== 'aus' && s.art !== 'haut').map((s) => s.id) : []), [gewaehlt, bereich, k, schichten]);
  const treffer = useMemo(() => { const f = filter.toLowerCase(); return k.strukturen.filter((s) => `${s.lat} ${s.de} ${s.en ?? ''}`.toLowerCase().includes(f)); }, [k, filter]);
  const nur = (id: string) => setSchichten(Object.fromEntries(k.schichten.map((s) => [s.id, s.id === id ? 'an' : s.id === 'haut' ? 'durch' : 'aus'])) as Record<string, Sicht>);
  const knopf = 'rounded-lg px-2.5 py-1.5 text-xs font-semibold';

  return (
    <div className="flex h-full" data-testid="szene">
      <div className="relative min-w-0 flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_center,var(--flaeche2),var(--bg))]">
        <Suspense fallback={<div className="grid h-full place-items-center text-leise">3D-Modell lädt …</div>}>
          <Viewer3D szene={k} sicht={sicht} gewaehlt={gewaehlt} fokus={fokus} blick={blick} onWaehle={waehle} />
        </Suspense>

        {/* Werkzeugleiste */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-2 p-3">
          <div className="pointer-events-auto flex gap-1.5">
            <button className={`knopf !min-h-10 !px-3 ${tafel === 'schichten' ? 'knopf-fach' : ''}`} onClick={() => setTafel(tafel === 'schichten' ? null : 'schichten')}><Layers size={16} /><span className="hidden sm:inline">Schichten</span></button>
            <button className={`knopf !min-h-10 !px-3 ${tafel === 'liste' ? 'knopf-fach' : ''}`} onClick={() => setTafel(tafel === 'liste' ? null : 'liste')}><List size={16} /><span className="hidden sm:inline">Strukturen</span></button>
          </div>
          <div className="pointer-events-auto ml-auto flex flex-col items-end gap-1.5">
            <div className="flex gap-1 rounded-xl border border-rand bg-flaeche/90 p-1 backdrop-blur">
              {ANSICHTEN.map(([name, richtung]) => <button key={name} className={`${knopf} hover:bg-flaeche2`} onClick={() => setBlick((b) => ({ richtung, n: b.n + 1 }))}>{name}</button>)}
            </div>
            {regionen.length > 1 && k.rahmen && (
              <div className="flex flex-wrap justify-end gap-1 rounded-xl border border-rand bg-flaeche/90 p-1 backdrop-blur" data-testid="bereiche">
                {['', ...regionen].map((r) => <button key={r} className={`${knopf} ${bereich === r && !gewaehlt.length ? 'bg-fach text-white' : 'hover:bg-flaeche2'}`} onClick={() => { waehle(null); setBereich(r); }}>{r ? REGION[r] ?? r : 'Ganzer Körper'}</button>)}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {tafel && (
            <motion.div key={tafel} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              className="karte absolute left-3 top-16 z-10 flex max-h-[calc(100%-6rem)] w-72 flex-col overflow-hidden bg-flaeche/95 backdrop-blur">
              {tafel === 'schichten' ? (
                <div className="space-y-0.5 overflow-y-auto p-2" data-testid="schichten">
                  {k.schichten.map((s) => (
                    <div key={s.id} className="flex items-center rounded-xl hover:bg-flaeche2">
                      <button onClick={() => setSchichten((a) => ({ ...a, [s.id]: NAECHSTE[a[s.id]] }))} aria-label={`${s.titel}: ${SICHT_NAME[schichten[s.id]]}`}
                        className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-3 text-left">
                        <span className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ background: s.farbe, opacity: schichten[s.id] === 'aus' ? 0.25 : 1 }} />
                        <span className={`min-w-0 flex-1 truncate font-semibold ${schichten[s.id] === 'aus' ? 'text-leise line-through' : ''}`}>{s.titel}</span>
                        {schichten[s.id] === 'aus' ? <EyeOff size={16} className="shrink-0 text-leise" /> : <Eye size={16} className={`shrink-0 ${schichten[s.id] === 'durch' ? 'opacity-40' : ''}`} />}
                      </button>
                      <button onClick={() => nur(s.id)} aria-label={`Nur ${s.titel} zeigen`} className="mx-1.5 rounded-lg border border-rand px-2 py-1 text-xs font-semibold text-leise hover:border-fach hover:text-text">nur</button>
                    </div>
                  ))}
                  <div className="flex gap-1.5 px-2 pt-2">
                    <button className="knopf !min-h-8 flex-1 !py-1 text-xs" onClick={() => setSchichten(Object.fromEntries(k.schichten.map((s) => [s.id, s.id === 'haut' ? 'durch' : 'an'])) as Record<string, Sicht>)}>Alles zeigen</button>
                  </div>
                  <p className="px-3 pb-1 pt-2 text-xs leading-snug text-leise">Tippen wechselt: sichtbar → durchsichtig → aus. „nur“ zeigt ein System allein in der Silhouette.</p>
                </div>
              ) : (
                <>
                  <label className="flex items-center gap-2 border-b border-rand px-3"><Search size={15} className="text-leise" />
                    <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`${k.strukturen.length} Strukturen durchsuchen …`} className="h-11 w-full bg-transparent text-sm !outline-none" /></label>
                  <ul className="overflow-y-auto p-1.5">
                    {treffer.slice(0, 120).map((s) => (
                      <li key={s.id}><button onClick={() => waehle(s.id)} className={`w-full rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-flaeche2 ${gewaehlt.includes(s.id) ? 'bg-fach-zart' : ''}`}>
                        <span className="block truncate font-semibold italic">{strukturName(s)}</span><span className="block truncate text-xs text-leise">{[s.de, s.seite].filter(Boolean).join(' · ') || '–'}</span></button></li>
                    ))}
                    {treffer.length > 120 && <li className="px-3 py-2 text-xs text-leise">… und {treffer.length - 120} weitere. Suchbegriff eingeben, um einzugrenzen.</li>}
                  </ul>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Infofenster auf Handy und Tablet hochkant: von unten */}
        <AnimatePresence>
          {gewaehlte.length > 0 && !breit && (
            <motion.aside key="unten" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.22 }}
              className="karte absolute inset-x-2 bottom-2 z-20 flex h-[56%] flex-col overflow-hidden">
              <Info k={k} gewaehlt={gewaehlte} einheit={gewaehlte.length > 1 ? einheit : undefined} frei={frei} setFrei={setFrei} waehle={waehle} />
            </motion.aside>
          )}
        </AnimatePresence>

        <Link to="/quellen" className="absolute bottom-1 left-3 text-[.66rem] text-leise underline">3D-Daten: BodyParts3D © DBCLS, {k.quelle.lizenz}</Link>
        {!gewaehlte.length && <p className="pointer-events-none absolute inset-x-0 bottom-6 hidden text-center text-xs text-leise sm:block">Struktur antippen · ziehen = drehen · zwei Finger / Mausrad = zoomen</p>}
      </div>

      {/* Infofenster auf großen Bildschirmen: eigene Spalte rechts */}
      {gewaehlte.length > 0 && breit && (
        <aside className="w-[448px] shrink-0 overflow-hidden border-l border-rand bg-flaeche">
          <Info k={k} gewaehlt={gewaehlte} einheit={gewaehlte.length > 1 ? einheit : undefined} frei={frei} setFrei={setFrei} waehle={waehle} />
        </aside>
      )}
    </div>
  );
}
