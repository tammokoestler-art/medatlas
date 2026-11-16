import { ArrowRight, Flame, GalleryVerticalEnd, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { alle, faecher, fachFarbe, kinder, knoten, link, type Knoten } from '../daten';
import { fortschritt, heute, serie, useSpeicher, warteschlange } from '../speicher';
import { Balken, Ikon, Ring } from '../teile/Ikon';

export default function Start() {
  const s = useSpeicher();
  const tag = s.tage[heute()] ?? { karten: 0, einheiten: 0, fragen: 0 };
  const dran = warteschlange(s.karten);
  const zuletzt = Object.entries(s.einheiten).sort((a, b) => b[1].besucht - a[1].besucht).map(([id]) => knoten(id)).filter(Boolean)[0];
  const werkzeuge = alle.filter((k) => ['szene', 'mindmap', 'leitfaden', 'quiz', 'trainer'].includes(k.typ));
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Hallo! Was lernst du heute?</h1>
        <p className="mt-1 text-leise">Dein Medizin-Atlas: Ordner für Ordner vom Überblick ins Detail.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="karte flex items-center gap-4 p-5" style={{ ['--fach' as string]: '#22c55e' }}>
          <div className="relative grid place-items-center">
            <Ring anteil={tag.karten / s.tagesziel} gr={68} dicke={7} />
            <Target size={22} className="absolute text-fach" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-leise">Tagesziel</div>
            <div className="text-2xl font-extrabold" data-testid="tagesziel">{tag.karten}<span className="text-base font-semibold text-leise"> / {s.tagesziel} Karten</span></div>
            <div className="text-xs text-leise">{tag.einheiten} {tag.einheiten === 1 ? 'Einheit' : 'Einheiten'} · {tag.fragen} {tag.fragen === 1 ? 'Frage' : 'Fragen'} heute</div>
          </div>
        </div>
        <Link to="/lernen" className="karte group flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5" style={{ ['--fach' as string]: '#e11d48' }}>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-fach text-white"><GalleryVerticalEnd size={26} /></span>
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-leise">Karteikarten</div>
            <div className="text-2xl font-extrabold">{dran.faellig.length} <span className="text-base font-semibold text-leise">fällig</span> · {dran.neu.length} <span className="text-base font-semibold text-leise">neu</span></div>
            <div className="flex items-center gap-1 text-sm font-semibold text-fach-text">Jetzt lernen <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></div>
          </div>
        </Link>
        <div className="karte flex items-center gap-4 p-5" style={{ ['--fach' as string]: '#f59e0b' }}>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-fach-zart text-fach"><Flame size={26} /></span>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-leise">Lernserie</div>
            <div className="text-2xl font-extrabold">{serie(s.tage)} <span className="text-base font-semibold text-leise">Tage in Folge</span></div>
          </div>
        </div>
      </section>

      {zuletzt && (
        <Link to={link(zuletzt.id)} className="karte flex items-center gap-3 p-4" style={{ ['--fach' as string]: fachFarbe(zuletzt.id) }}>
          <span className="marke">Weiterlernen</span><span className="font-semibold">{zuletzt.titel}</span><ArrowRight size={16} className="ml-auto text-fach" />
        </Link>
      )}

      {kinder(null).map((gruppe) => (
        <section key={gruppe.id}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-leise">{gruppe.titel}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {faecher.filter((f) => f.eltern === gruppe.id).map((f) => {
              const p = fortschritt(s, f.id);
              return (
                <Link key={f.id} to={link(f.id)} style={{ ['--fach' as string]: f.farbe }}
                  className="karte group relative overflow-hidden p-5 transition-transform hover:-translate-y-1">
                  <span className="absolute inset-x-0 top-0 h-1.5 bg-fach" />
                  <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-fach-zart text-fach"><Ikon von={f} size={24} /></span>
                  <h3 className="text-lg font-bold">{f.titel}</h3>
                  <p className="mb-3 mt-0.5 min-h-10 text-sm text-leise">{f.beschreibung}</p>
                  {p.einheiten ? <><Balken anteil={p.anteil} /><div className="mt-1.5 text-xs text-leise">{p.gelernt} von {p.einheiten} Einheiten gelernt</div></>
                    : <span className="text-xs font-semibold text-leise">Noch keine Inhalte</span>}
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-leise">Direkt ausprobieren</h2>
        <div className="flex flex-wrap gap-2">
          {werkzeuge.map((k: Knoten) => (
            <Link key={k.id} to={link(k.id)} className="knopf" style={{ ['--fach' as string]: fachFarbe(k.id) }}><Ikon von={k} size={16} className="text-fach" />{k.titel}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}
