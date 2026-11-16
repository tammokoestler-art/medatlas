import { AnimatePresence, motion } from 'framer-motion';
import { PartyPopper, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { alleKarten, fachFarbe, fett, kartenIn, knoten, link, mischen } from '../daten';
import { kartenStatus, NOTEN, Rating, useSpeicher, vorschau, warteschlange, type KartenStatus } from '../speicher';

const STATUS: [KartenStatus, string, string][] = [['neu', 'neu', '#3b82f6'], ['lernen', 'im Lernen', '#f59e0b'], ['faellig', 'fällig', '#ef4444'], ['sicher', 'sicher', '#22c55e']];

export default function Kartenseite({ ordner, titel }: { ordner: string; titel: string }) {
  const zustand = useSpeicher((s) => s.karten);
  const bewerte = useSpeicher((s) => s.bewerte);
  const [runde, setRunde] = useState(0);
  const [alles, setAlles] = useState(false);
  const start = useMemo(() => {
    const k = useSpeicher.getState().karten;
    return alles ? mischen(ordner ? kartenIn(ordner) : alleKarten) : warteschlange(k, ordner).alle;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordner, runde, alles]);
  const [schlange, setSchlange] = useState(start);
  const [gesehen, setGesehen] = useState(0);
  const [offen, setOffen] = useState(false);
  const [vorigerStart, setVorigerStart] = useState(start);
  if (vorigerStart !== start) { setVorigerStart(start); setSchlange(start); setGesehen(0); setOffen(false); }

  const im = ordner ? kartenIn(ordner) : alleKarten;
  const zahl = (st: KartenStatus) => im.filter((k) => kartenStatus(zustand[k.id]) === st).length;
  const karte = schlange[0];
  const einheit = knoten(karte?.einheit);

  return (
    <div className="mx-auto max-w-2xl space-y-5" style={karte ? { ['--fach' as string]: fachFarbe(karte.einheit ?? karte.stapel) } : undefined}>
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">{titel}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold" data-testid="kartenstatus">
          {STATUS.map(([st, name, farbe]) => <span key={st} className="marke" style={{ ['--fach' as string]: farbe }}>{zahl(st)} {name}</span>)}
        </div>
      </header>

      {karte ? (
        <>
          <div className="flex items-center gap-3 text-sm text-leise">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-flaeche2"><div className="h-full rounded-full bg-fach transition-all duration-300" style={{ width: `${(gesehen / (gesehen + schlange.length)) * 100}%` }} /></div>
            noch {schlange.length}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={karte.id + gesehen} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }}
              className="karte relative flex min-h-[19rem] flex-col overflow-hidden" data-testid="karte">
              <span className="absolute inset-x-0 top-0 h-1.5 bg-fach" />
              <div className="flex flex-1 flex-col justify-center p-6 text-center sm:p-10">
                {einheit && <div className="mb-3 text-xs font-bold uppercase tracking-wider text-fach-text">{einheit.titel}</div>}
                <p className="text-xl font-semibold leading-snug" dangerouslySetInnerHTML={{ __html: fett(karte.vorne) }} />
                {offen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 border-t border-rand pt-6">
                    <p className="text-lg leading-relaxed" data-testid="antwort" dangerouslySetInnerHTML={{ __html: fett(karte.hinten) }} />
                    {einheit && <Link to={link(einheit.id)} className="mt-3 inline-block text-sm font-semibold text-fach-text underline">Zur Lerneinheit</Link>}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
          {offen ? (
            <div className="grid grid-cols-4 gap-2">
              {NOTEN.map((n) => (
                <button key={n.note} className="knopf flex-col !gap-0 !px-1 py-2" style={{ ['--fach' as string]: n.farbe, borderColor: n.farbe }}
                  onClick={() => {
                    bewerte(karte.id, n.note);
                    setSchlange((s) => (n.note === Rating.Again ? [...s.slice(1), karte] : s.slice(1)));
                    if (n.note !== Rating.Again) setGesehen((g) => g + 1);
                    setOffen(false);
                  }}>
                  <span style={{ color: n.farbe }}>{n.name}</span><span className="text-[.7rem] font-normal text-leise">{vorschau(zustand[karte.id], n.note)}</span>
                </button>
              ))}
            </div>
          ) : <button className="knopf knopf-fach w-full py-3.5 text-base" onClick={() => setOffen(true)}>Antwort zeigen</button>}
          <p className="text-center text-xs text-leise">Bewerte ehrlich – danach richtet sich, wann die Karte wiederkommt (Spaced Repetition, FSRS).</p>
        </>
      ) : (
        <div className="karte space-y-4 p-8 text-center">
          <PartyPopper size={40} className="mx-auto text-emerald-500" />
          <h2 className="text-xl font-bold">{gesehen ? `Geschafft – ${gesehen} Karten wiederholt!` : im.length ? 'Gerade ist nichts fällig.' : 'Hier gibt es noch keine Karten.'}</h2>
          <p className="text-leise">{im.length ? 'Komm später wieder – die App zeigt dir, wann Karten fällig sind.' : 'Karten entstehen zusammen mit neuen Modulen.'}</p>
          {im.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              <button className="knopf" onClick={() => { setAlles(false); setRunde((r) => r + 1); }}><RotateCcw size={16} />Weitere neue Karten</button>
              <button className="knopf" onClick={() => { setAlles(true); setRunde((r) => r + 1); }}>Alle {im.length} Karten durchgehen</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
