import { Box, Check, ListChecks, X } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { knoten, link, mischen, type Quiz, type Struktur, type Szene } from '../daten';
import { useSpeicher } from '../speicher';
import type { Sicht } from '../teile/Viewer3D';

const Viewer3D = lazy(() => import('../teile/Viewer3D'));
interface Aufgabe { id: string; frage: string; antworten: string[]; richtig: number; erklaerung: string; einheit?: string; struktur?: Struktur }

function baue(k: Quiz, art: 'mc' | '3d', szene?: Szene): Aufgabe[] {
  if (art === 'mc') return mischen(k.fragen).slice(0, 10).map((f) => {
    const reihenfolge = mischen(f.antworten.map((_, i) => i));
    return { ...f, antworten: reihenfolge.map((i) => f.antworten[i]), richtig: reihenfolge.indexOf(f.richtig) };
  });
  if (!szene || !k.benennen) return [];
  return mischen(k.benennen.strukturen).slice(0, 8).map((id) => {
    const s = szene.strukturen.find((x) => x.id === id)!;
    const falsche = mischen(szene.strukturen.filter((x) => x.art === s.art && x.lat !== s.lat && x.region !== 'fuss')).slice(0, 3);
    const antworten = mischen([s, ...falsche]);
    return { id: `${k.id}#3d-${id}`, frage: 'Wie heißt die markierte Struktur?', antworten: antworten.map((a) => a.lat), richtig: antworten.indexOf(s),
      erklaerung: `${s.lat} – ${s.de}.${s.info ? ' ' + s.info : ''}`, einheit: s.einheit, struktur: s };
  });
}

export default function Quizseite({ k }: { k: Quiz }) {
  const beantworte = useSpeicher((s) => s.beantworte);
  const szene = knoten(k.benennen?.szene) as Szene | undefined;
  const [art, setArt] = useState<'mc' | '3d' | null>(null);
  const [runde, setRunde] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const aufgaben = useMemo(() => (art ? baue(k, art, szene) : []), [art, runde, k]);
  const [nr, setNr] = useState(0);
  const [wahl, setWahl] = useState<number | null>(null);
  const [punkte, setPunkte] = useState(0);
  const neu = (a: 'mc' | '3d' | null) => { setArt(a); setRunde((r) => r + 1); setNr(0); setWahl(null); setPunkte(0); };
  const a = aufgaben[nr];

  if (!art) return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header><h1 className="text-2xl font-extrabold tracking-tight">{k.titel}</h1><p className="text-leise">{k.beschreibung}</p></header>
      <div className="grid gap-4 sm:grid-cols-2">
        <button className="karte p-6 text-left transition-transform hover:-translate-y-1" onClick={() => neu('mc')}>
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-fach text-white"><ListChecks size={24} /></span>
          <h2 className="text-lg font-bold">Multiple Choice</h2><p className="text-sm text-leise">10 zufällige Fragen aus {k.fragen.length}.</p>
        </button>
        {szene && k.benennen && (
          <button className="karte p-6 text-left transition-transform hover:-translate-y-1" onClick={() => neu('3d')}>
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-fach text-white"><Box size={24} /></span>
            <h2 className="text-lg font-bold">Struktur benennen (3D)</h2><p className="text-sm text-leise">8 markierte Strukturen im 3D-Modell erkennen.</p>
          </button>
        )}
      </div>
    </div>
  );

  if (!a) return (
    <div className="karte mx-auto max-w-md space-y-4 p-8 text-center" data-testid="quiz-ergebnis">
      <div className="text-5xl font-extrabold text-fach">{punkte} / {aufgaben.length}</div>
      <h2 className="text-xl font-bold">{punkte === aufgaben.length ? 'Perfekt!' : punkte >= aufgaben.length * 0.7 ? 'Stark!' : 'Dranbleiben – Wiederholung macht den Unterschied.'}</h2>
      <div className="flex flex-wrap justify-center gap-2"><button className="knopf knopf-fach" onClick={() => neu(art)}>Noch eine Runde</button><button className="knopf" onClick={() => neu(null)}>Andere Quizart</button></div>
    </div>
  );

  const sicht = (s: Struktur): Sicht => (s.id === a.struktur?.id ? 'an' : s.schicht === 'haut' ? 'aus' : s.art === 'knochen' ? 'an' : 'durch');
  return (
    <div className={`mx-auto space-y-4 ${a.struktur ? 'max-w-4xl' : 'max-w-2xl'}`}>
      <div className="flex items-center gap-3 text-sm text-leise">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-flaeche2"><div className="h-full rounded-full bg-fach transition-all" style={{ width: `${(nr / aufgaben.length) * 100}%` }} /></div>
        Frage {nr + 1} / {aufgaben.length}
      </div>
      <div className={a.struktur ? 'grid gap-4 md:grid-cols-[1.15fr_1fr]' : ''}>
        {a.struktur && szene && (
          <div className="karte h-[42vh] overflow-hidden bg-[radial-gradient(ellipse_at_center,var(--flaeche2),var(--bg))] md:h-[62vh]" data-testid="quiz-3d">
            <Suspense fallback={<div className="grid h-full place-items-center text-leise">3D-Modell lädt …</div>}>
              <Viewer3D szene={szene} sicht={sicht} gewaehlt={[a.struktur.id]} fokus={[a.struktur.id]} blick={{ richtung: [-0.6, 0.15, 1], n: 0 }} />
            </Suspense>
          </div>
        )}
        <div className="space-y-3">
          <h2 className="text-xl font-bold leading-snug" data-testid="quiz-frage">{a.frage}</h2>
          {a.antworten.map((text, i) => {
            const zeigRichtig = wahl !== null && i === a.richtig, zeigFalsch = wahl === i && i !== a.richtig;
            return (
              <button key={text} disabled={wahl !== null} data-richtig={i === a.richtig || undefined}
                onClick={() => { setWahl(i); const ok = i === a.richtig; if (ok) setPunkte((p) => p + 1); beantworte(a.id, ok); }}
                className={`karte flex w-full items-center gap-3 !rounded-2xl p-4 text-left font-semibold transition-colors ${zeigRichtig ? '!border-emerald-500 bg-emerald-500/10' : zeigFalsch ? '!border-rose-500 bg-rose-500/10' : wahl === null ? 'hover:border-fach' : 'opacity-60'}`}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-flaeche2 text-sm">{zeigRichtig ? <Check size={16} className="text-emerald-500" /> : zeigFalsch ? <X size={16} className="text-rose-500" /> : 'ABCD'[i]}</span>
                <span className={a.struktur ? 'italic' : ''}>{text}</span>
              </button>
            );
          })}
          {wahl !== null && (
            <div className="einblenden space-y-3">
              <div className="rounded-2xl bg-fach-zart p-4 text-sm leading-relaxed"><strong>{wahl === a.richtig ? 'Richtig. ' : 'Leider falsch. '}</strong>{a.erklaerung}
                {a.einheit && <> <Link className="font-semibold underline" to={link(a.einheit)}>Zur Lerneinheit</Link></>}</div>
              <button className="knopf knopf-fach w-full" onClick={() => { setNr(nr + 1); setWahl(null); }}>{nr + 1 < aufgaben.length ? 'Weiter' : 'Ergebnis ansehen'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
