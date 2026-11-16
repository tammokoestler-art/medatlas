import { ArrowLeftRight, Check, Flame, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { mischen, type Trainer } from '../daten';
import { useSpeicher } from '../speicher';

export default function Trainerseite({ k }: { k: Trainer }) {
  const beantworte = useSpeicher((s) => s.beantworte);
  const [gruppe, setGruppe] = useState(k.gruppen[0].id);
  const [umgekehrt, setUmgekehrt] = useState(false);
  const [nr, setNr] = useState(0);
  const [wahl, setWahl] = useState<string | null>(null);
  const [serie, setSerie] = useState(0);
  const [bilanz, setBilanz] = useState({ richtig: 0, gesamt: 0 });
  const g = k.gruppen.find((x) => x.id === gruppe)!;
  const aufgabe = useMemo(() => {
    const e = mischen(g.eintraege)[0];
    const falsch = mischen(g.eintraege.filter((x) => x.bedeutung !== e.bedeutung && x.begriff !== e.begriff)).slice(0, 3);
    return { e, auswahl: mischen([e, ...falsch]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, nr]);
  const { e, auswahl } = aufgabe;
  const frage = umgekehrt ? e.bedeutung : e.begriff, richtig = umgekehrt ? e.begriff : e.bedeutung;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex flex-wrap items-end gap-3">
        <div className="flex-1"><h1 className="text-2xl font-extrabold tracking-tight">{k.titel}</h1><p className="text-leise">{k.beschreibung}</p></div>
        <span className="marke" style={{ ['--fach' as string]: '#f59e0b' }} data-testid="trainer-serie"><Flame size={13} />{serie} in Folge</span>
        <span className="marke">{bilanz.richtig} / {bilanz.gesamt} richtig</span>
      </header>
      <div className="flex flex-wrap gap-2">
        {k.gruppen.map((x) => (
          <button key={x.id} onClick={() => { setGruppe(x.id); setWahl(null); setNr(nr + 1); }} className={`knopf !min-h-9 !py-1.5 text-sm ${x.id === gruppe ? 'knopf-fach' : ''}`}>{x.titel}</button>
        ))}
        <button className="knopf !min-h-9 !py-1.5 text-sm" onClick={() => { setUmgekehrt(!umgekehrt); setWahl(null); setNr(nr + 1); }}><ArrowLeftRight size={15} />{umgekehrt ? 'Deutsch → Fachbegriff' : 'Fachbegriff → Deutsch'}</button>
      </div>
      <div className="karte relative overflow-hidden p-6 text-center sm:p-10">
        <span className="absolute inset-x-0 top-0 h-1.5 bg-fach" />
        <div className="text-xs font-bold uppercase tracking-wider text-leise">{umgekehrt ? 'Wie lautet der Fachbegriff?' : 'Was bedeutet …'}</div>
        <div className={`mt-2 text-3xl font-extrabold ${umgekehrt ? '' : 'italic'}`} data-testid="trainer-frage">{frage}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {auswahl.map((x) => {
          const text = umgekehrt ? x.begriff : x.bedeutung;
          const ok = wahl !== null && text === richtig, falsch = wahl === text && text !== richtig;
          return (
            <button key={text} disabled={wahl !== null} data-richtig={text === richtig || undefined}
              onClick={() => { const r = text === richtig; setWahl(text); setSerie(r ? serie + 1 : 0); setBilanz({ richtig: bilanz.richtig + (r ? 1 : 0), gesamt: bilanz.gesamt + 1 }); beantworte(`${k.id}#${g.id}#${e.begriff}`, r); }}
              className={`karte flex items-center gap-3 !rounded-2xl p-4 text-left font-semibold ${ok ? '!border-emerald-500 bg-emerald-500/10' : falsch ? '!border-rose-500 bg-rose-500/10' : wahl === null ? 'hover:border-fach' : 'opacity-60'}`}>
              {ok ? <Check size={18} className="shrink-0 text-emerald-500" /> : falsch ? <X size={18} className="shrink-0 text-rose-500" /> : <span className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-rand" />}{text}
            </button>
          );
        })}
      </div>
      {wahl !== null && (
        <div className="einblenden space-y-3">
          <div className="rounded-2xl bg-fach-zart p-4 text-sm leading-relaxed">
            <strong className="italic">{e.begriff}</strong> = {e.bedeutung}{e.herkunft && <span className="text-leise"> ({e.herkunft})</span>}
            {e.beispiel && <div className="mt-1">Beispiel: {e.beispiel}</div>}
          </div>
          <button className="knopf knopf-fach w-full" onClick={() => { setWahl(null); setNr(nr + 1); }}>Nächster Begriff</button>
        </div>
      )}
    </div>
  );
}
