import { ArrowLeft, ArrowRight, BookOpen, Box, Brain, Check, GalleryVerticalEnd, Layers, Lightbulb, Stethoscope } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { alle, alleKarten, fachFarbe, kinder, knoten, link, type Einheit, type Szene } from '../daten';
import { useSpeicher } from '../speicher';
import { ZuPruefen } from '../teile/Ikon';

const SYMBOL = [['Kurz', Lightbulb], ['Aufbau', Layers], ['Klinisch', Stethoscope], ['Merk', Brain]] as const;

export default function Einheitseite({ k }: { k: Einheit }) {
  const gelernt = useSpeicher((s) => !!s.einheiten[k.id]?.gelernt);
  const { besuche, setzeGelernt } = useSpeicher.getState();
  const [tipp, setTipp] = useState<{ x: number; y: number; lat: string; de: string; erkl?: string } | null>(null);
  const text = useRef<HTMLDivElement>(null);
  useEffect(() => { besuche(k.id); setTipp(null); }, [k.id, besuche]);

  const szenen = alle.filter((s): s is Szene => s.typ === 'szene' && s.strukturen.some((x) => x.einheit === k.id));
  const stapel = alleKarten.find((c) => c.einheit === k.id)?.stapel;
  const anzahlKarten = alleKarten.filter((c) => c.einheit === k.id).length;
  const geschwister = kinder(k.eltern).filter((g) => g.typ === 'einheit');
  const i = geschwister.findIndex((g) => g.id === k.id);

  const zeige = (e: React.SyntheticEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.begriff');
    if (!el || !text.current) return setTipp(null);
    const r = el.getBoundingClientRect(), b = text.current.getBoundingClientRect();
    setTipp({ x: Math.min(Math.max(r.left - b.left + r.width / 2, 130), b.width - 130), y: r.bottom - b.top + 8, lat: el.textContent ?? '', de: el.dataset.de ?? '', erkl: el.dataset.erkl });
  };

  return (
    <article className="space-y-5">
      <header className="karte relative overflow-hidden p-6">
        <span className="absolute inset-x-0 top-0 h-1.5 bg-fach" />
        <span className="marke mb-2"><BookOpen size={13} />Lerneinheit</span>
        <h1 className="text-2xl font-extrabold italic tracking-tight sm:text-4xl">{k.lat}</h1>
        <p className="mt-1 text-lg font-semibold text-fach-text sm:text-xl">{k.de}</p>
        {k.wortherkunft && <p className="mt-2 text-sm text-leise"><strong>Wortherkunft:</strong> {k.wortherkunft}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {szenen.map((s) => <Link key={s.id} to={link(s.id, `?e=${k.id}`)} className="knopf knopf-fach"><Box size={16} />Im 3D-Modell zeigen</Link>)}
          {stapel && <Link to={link(stapel)} className="knopf"><GalleryVerticalEnd size={16} className="text-fach" />{anzahlKarten} Karten dazu</Link>}
        </div>
      </header>

      {k.steckbrief && (
        <section className="karte overflow-hidden">
          <h2 className="border-b border-rand bg-fach-zart px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-fach-text">Steckbrief</h2>
          <dl className="divide-y divide-rand">
            {Object.entries(k.steckbrief).map(([a, b]) => (
              <div key={a} className="grid gap-x-4 px-5 py-2.5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-semibold text-leise">{a}</dt><dd>{b}</dd></div>
            ))}
          </dl>
        </section>
      )}

      <div ref={text} className="relative space-y-5" onClick={zeige} onMouseOver={zeige} onFocus={zeige} onMouseLeave={() => setTipp(null)}>
        {k.abschnitte.map((a) => {
          const I = SYMBOL.find(([anfang]) => a.titel.startsWith(anfang))?.[1] ?? BookOpen;
          const klinik = a.titel.startsWith('Klinisch');
          return (
            <section key={a.titel} className={`karte p-5 sm:p-6 ${klinik ? 'border-fach/40 bg-fach-zart' : ''}`}>
              <h2 className="mb-1 flex items-center gap-2.5 text-lg font-bold">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-fach text-white"><I size={17} /></span>
                {klinik ? 'Klinischer Bezug – Warum ist das wichtig?' : a.titel}
              </h2>
              <div className="prosa" dangerouslySetInnerHTML={{ __html: a.html }} />
            </section>
          );
        })}
        {tipp && (
          <div role="tooltip" className="pointer-events-none absolute z-10 w-60 -translate-x-1/2 rounded-xl border border-rand bg-flaeche p-3 text-sm shadow-karte" style={{ left: tipp.x, top: tipp.y }}>
            <div className="font-bold italic">{tipp.lat}</div>
            <div className="font-semibold text-fach-text">{tipp.de}</div>
            {tipp.erkl && <div className="mt-1 text-xs text-leise">{tipp.erkl}</div>}
          </div>
        )}
      </div>

      <ZuPruefen punkte={k.zu_pruefen} />

      {k.verwandt.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-leise">Verwandte Einheiten</h2>
          <div className="flex flex-wrap gap-2">
            {k.verwandt.map((id) => { const v = knoten(id) as Einheit; return (
              <Link key={id} to={link(id)} className="knopf" style={{ ['--fach' as string]: fachFarbe(id) }}><span className="h-2.5 w-2.5 rounded-full bg-fach" />{v.titel}</Link>
            ); })}
          </div>
        </section>
      )}

      <details className="text-sm text-leise"><summary className="cursor-pointer font-semibold">Quellen</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">{k.quellen.map((q) => <li key={q}>{q}</li>)}</ul>
      </details>

      <footer className="flex flex-wrap items-center gap-3 border-t border-rand pt-5">
        {i > 0 && <Link to={link(geschwister[i - 1].id)} className="knopf"><ArrowLeft size={16} />{geschwister[i - 1].titel}</Link>}
        <button onClick={() => setzeGelernt(k.id, !gelernt)} aria-pressed={gelernt}
          className={`knopf ${gelernt ? '' : 'knopf-fach'}`} style={gelernt ? { ['--fach' as string]: '#22c55e', color: '#16a34a' } : undefined}>
          <Check size={17} />{gelernt ? 'Gelernt – zurücksetzen' : 'Als gelernt markieren'}
        </button>
        {i < geschwister.length - 1 && <Link to={link(geschwister[i + 1].id)} className="knopf ml-auto">{geschwister[i + 1].titel}<ArrowRight size={16} /></Link>}
      </footer>
    </article>
  );
}
