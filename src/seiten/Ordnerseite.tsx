import { Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { kinder, link, TYP_NAME, type Ordner } from '../daten';
import { fortschritt, useSpeicher } from '../speicher';
import { Balken, Ikon } from '../teile/Ikon';

export default function Ordnerseite({ k }: { k: Ordner }) {
  const s = useSpeicher();
  const p = fortschritt(s, k.id);
  const unter = kinder(k.id);
  const inhalt = unter.filter((u) => u.typ === 'ordner' || u.typ === 'einheit');
  const werkzeuge = unter.filter((u) => u.typ !== 'ordner' && u.typ !== 'einheit');
  return (
    <div className="space-y-6">
      <header className="karte relative overflow-hidden p-6">
        <span className="absolute inset-x-0 top-0 h-1.5 bg-fach" />
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-fach-zart text-fach"><Ikon von={k} size={28} /></span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{k.titel}</h1>
            {k.latein && <p className="italic text-fach-text">{k.latein}</p>}
            {k.beschreibung && <p className="mt-1 text-leise">{k.beschreibung}</p>}
          </div>
        </div>
        {p.einheiten + p.karten > 0 && (
          <div className="mt-5">
            <Balken anteil={p.anteil} />
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-leise" data-testid="ordner-fortschritt">
              <span><strong className="text-text">{p.gelernt}</strong> von {p.einheiten} Einheiten gelernt</span>
              <span><strong className="text-text">{p.einheiten - p.gelernt}</strong> offen</span>
              {p.karten > 0 && <span><strong className="text-text">{p.sicher}</strong> von {p.karten} Karten sicher</span>}
            </div>
          </div>
        )}
      </header>

      {werkzeuge.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2">
          {werkzeuge.map((w) => (
            <Link key={w.id} to={link(w.id)} className="karte group flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fach text-white"><Ikon von={w} size={20} /></span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-wider text-leise">{TYP_NAME[w.typ]}</span><span className="block truncate font-semibold">{w.titel}</span></span>
              <ChevronRight size={18} className="text-leise transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </section>
      )}

      {inhalt.length > 0 ? (
        <section className="karte divide-y divide-rand overflow-hidden">
          {inhalt.map((u) => {
            const up = u.typ === 'ordner' ? fortschritt(s, u.id) : null;
            const gelernt = u.typ === 'einheit' && s.einheiten[u.id]?.gelernt;
            return (
              <Link key={u.id} to={link(u.id)} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-flaeche2">
                <Ikon von={u} size={19} className="shrink-0 text-fach" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{u.titel}</span>
                  <span className="block truncate text-sm text-leise">{u.typ === 'einheit' ? u.de : u.typ === 'ordner' ? (u.latein ?? u.beschreibung) : ''}</span>
                </span>
                {up && up.einheiten > 0 && <span className="w-24 shrink-0 text-right text-xs text-leise"><Balken anteil={up.anteil} /><span className="mt-1 block">{up.gelernt}/{up.einheiten} gelernt</span></span>}
                {gelernt && <span className="marke" style={{ ['--fach' as string]: '#22c55e' }}><Check size={13} />gelernt</span>}
                {u.typ === 'einheit' && !gelernt && <span className="text-xs text-leise">offen</span>}
                <ChevronRight size={17} className="shrink-0 text-leise" />
              </Link>
            );
          })}
        </section>
      ) : werkzeuge.length === 0 && (
        <div className="karte p-8 text-center text-leise">Dieser Bereich ist noch leer. Neue Module kommen Schritt für Schritt dazu.</div>
      )}
    </div>
  );
}
