import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, ChevronRight, GalleryVerticalEnd, Home, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { fachFarbe, knoten, link, pfad } from './daten';
import { useSpeicher, warteschlange, wendeThemaAn } from './speicher';
import { Baum } from './teile/Baum';
import { Suche } from './teile/Suche';
import Start from './seiten/Start';
import Ordnerseite from './seiten/Ordnerseite';
import Einheitseite from './seiten/Einheitseite';
import Kartenseite from './seiten/Kartenseite';
import Quizseite from './seiten/Quizseite';
import Trainerseite from './seiten/Trainerseite';
import Fortschrittseite from './seiten/Fortschrittseite';
import { Pruefliste, Quellen } from './seiten/Infoseiten';

const Szeneseite = lazy(() => import('./seiten/Szeneseite'));
const Mindmapseite = lazy(() => import('./seiten/Mindmapseite'));
const Leitfadenseite = lazy(() => import('./seiten/Leitfadenseite'));
export const Laden = () => <div className="grid h-64 place-items-center text-leise">Lädt …</div>;

function Knotenseite({ id }: { id: string }) {
  const k = knoten(id);
  if (!k) return <div className="p-8"><h1 className="text-xl font-bold">Nicht gefunden</h1><Link className="underline" to="/">Zur Startseite</Link></div>;
  switch (k.typ) {
    case 'ordner': return <Ordnerseite k={k} />;
    case 'einheit': return <Einheitseite k={k} />;
    case 'szene': return <Szeneseite k={k} />;
    case 'mindmap': return <Mindmapseite k={k} />;
    case 'leitfaden': return <Leitfadenseite k={k} />;
    case 'karten': return <Kartenseite ordner={k.eltern ?? ''} titel={k.titel} />;
    case 'quiz': return <Quizseite k={k} />;
    case 'trainer': return <Trainerseite k={k} />;
  }
}

function Hinweis() {
  const ok = useSpeicher((s) => s.hinweisOk);
  const setze = useSpeicher((s) => s.setze);
  if (ok) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
      <div role="dialog" aria-label="Hinweis" className="karte einblenden max-w-md p-6">
        <h2 className="mb-2 text-xl font-bold">Willkommen bei MedAtlas</h2>
        <p className="mb-3 text-sm leading-relaxed text-leise">
          MedAtlas ist ein <strong className="text-text">Lern-Tool</strong> und <strong className="text-text">keine Grundlage für medizinische Entscheidungen</strong>.
          Die Inhalte wurden von einer KI aus Lehrbuchwissen zusammengestellt und nicht ärztlich geprüft. Unsichere Stellen sind als „zu prüfen“ markiert.
        </p>
        <p className="mb-5 text-sm leading-relaxed text-leise">Dein Fortschritt wird nur auf diesem Gerät gespeichert. Im Notfall: <strong className="text-text">112</strong>.</p>
        <button className="knopf knopf-fach w-full" style={{ ['--fach' as string]: '#e11d48' }} onClick={() => setze({ hinweisOk: true })}>Verstanden</button>
      </div>
    </div>
  );
}

export default function App() {
  const ort = useLocation();
  const id = ort.pathname.startsWith('/n/') ? decodeURI(ort.pathname.slice(3)).replace(/\/$/, '') : '';
  const farbe = fachFarbe(id);
  const [menue, setMenue] = useState(false);
  const [suche, setSuche] = useState(false);
  const thema = useSpeicher((s) => s.thema);
  const setze = useSpeicher((s) => s.setze);
  const faellig = useSpeicher((s) => warteschlange(s.karten).alle.length);
  const dunkel = thema === 'dunkel' || (thema === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => wendeThemaAn(thema), [thema]);
  useEffect(() => { setMenue(false); document.getElementById('inhalt')?.scrollTo(0, 0); }, [ort.pathname]);
  useEffect(() => {
    const taste = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSuche(true); } };
    addEventListener('keydown', taste);
    return () => removeEventListener('keydown', taste);
  }, []);
  const vollbild = ['szene', 'mindmap', 'leitfaden'].includes(knoten(id)?.typ ?? '');

  const leiste = (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-2.5 px-4 py-4">
        <img src="./icon.svg" alt="" className="h-8 w-8 rounded-[10px]" />
        <span className="text-lg font-extrabold tracking-tight">MedAtlas</span>
      </Link>
      <div className="flex-1 overflow-y-auto px-2 pb-4"><Baum aktiv={id} schliesse={() => setMenue(false)} /></div>
      <div className="space-y-0.5 border-t border-rand p-2 text-sm">
        {[['/fortschritt', 'Fortschritt & Einstellungen'], ['/pruefen', 'Zu prüfen'], ['/quellen', 'Quellen & Lizenzen']].map(([zu, name]) => (
          <NavLink key={zu} to={zu} className={({ isActive }) => `block rounded-lg px-3 py-2 ${isActive ? 'bg-flaeche2 font-semibold' : 'text-leise hover:bg-flaeche2'}`}>{name}</NavLink>
        ))}
        <p className="px-3 pt-2 text-[.7rem] leading-snug text-leise">Lern-Tool – keine Grundlage für medizinische Entscheidungen.</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full" style={{ ['--fach' as string]: farbe }}>
      <aside className="hidden w-[300px] shrink-0 border-r border-rand bg-flaeche lg:block">{leiste}</aside>
      <AnimatePresence>
        {menue && (
          <motion.div className="fixed inset-0 z-40 bg-black/45 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenue(false)}>
            <motion.aside className="h-full w-[86%] max-w-[330px] bg-flaeche shadow-2xl" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }} onClick={(e) => e.stopPropagation()}>
              <button aria-label="Menü schließen" className="absolute left-[min(86%,330px)] top-3 ml-2 grid h-10 w-10 place-items-center rounded-full bg-flaeche" onClick={() => setMenue(false)}><X size={18} /></button>
              {leiste}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-rand bg-flaeche/85 px-3 backdrop-blur">
          <button aria-label="Menü öffnen" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-flaeche2 lg:hidden" onClick={() => setMenue(true)}><Menu size={20} /></button>
          <nav aria-label="Brotkrumen" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none]">
            <Link to="/" aria-label="Startseite" className="rounded-lg p-1.5 text-leise hover:bg-flaeche2 hover:text-text"><Home size={16} /></Link>
            {pfad(id).map((p, i, a) => (
              <span key={p.id} className="flex items-center gap-1">
                <ChevronRight size={14} className="shrink-0 text-leise" />
                <Link to={link(p.id)} className={`rounded-lg px-1.5 py-1 hover:bg-flaeche2 ${i === a.length - 1 ? 'font-semibold text-fach-text' : 'text-leise'}`}>{p.titel}</Link>
              </span>
            ))}
          </nav>
          <button onClick={() => setSuche(true)} aria-label="Suche öffnen" className="flex h-10 items-center gap-2 rounded-xl border border-rand bg-flaeche2 px-3 text-sm text-leise hover:border-fach">
            <Search size={16} /><span className="hidden sm:inline">Suchen</span><kbd className="hidden rounded bg-flaeche px-1.5 text-[.7rem] md:inline">⌘K</kbd>
          </button>
          <button aria-label={dunkel ? 'Heller Modus' : 'Dunkler Modus'} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-flaeche2"
            onClick={() => setze({ thema: dunkel ? 'hell' : 'dunkel' })}>{dunkel ? <Sun size={18} /> : <Moon size={18} />}</button>
        </header>

        <main id="inhalt" className={`min-h-0 flex-1 ${vollbild ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <Suspense fallback={<Laden />}>
            <div key={ort.pathname} className={`einblenden ${vollbild ? 'h-full' : 'mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 lg:pb-10'}`}>
              <Routes>
                <Route path="/" element={<Start />} />
                <Route path="/n/*" element={<Knotenseite id={id} />} />
                <Route path="/lernen" element={<Kartenseite ordner="" titel="Heute lernen" />} />
                <Route path="/fortschritt" element={<Fortschrittseite />} />
                <Route path="/pruefen" element={<Pruefliste />} />
                <Route path="/quellen" element={<Quellen />} />
                <Route path="*" element={<Knotenseite id="" />} />
              </Routes>
            </div>
          </Suspense>
        </main>

        <nav aria-label="Hauptnavigation" className="flex h-16 shrink-0 items-stretch border-t border-rand bg-flaeche pb-[env(safe-area-inset-bottom)] lg:hidden">
          {([['/', 'Start', Home], ['/lernen', 'Lernen', GalleryVerticalEnd], ['/fortschritt', 'Fortschritt', BarChart3]] as const).map(([zu, name, I]) => (
            <NavLink key={zu} to={zu} end className={({ isActive }) => `relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[.7rem] font-semibold ${isActive ? 'text-text' : 'text-leise'}`}>
              <I size={20} />{name}
              {zu === '/lernen' && faellig > 0 && <span className="absolute right-[calc(50%-22px)] top-1.5 rounded-full bg-rose-500 px-1.5 text-[.62rem] text-white">{faellig}</span>}
            </NavLink>
          ))}
          <button onClick={() => setSuche(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[.7rem] font-semibold text-leise"><Search size={20} />Suche</button>
        </nav>
      </div>
      <Suche offen={suche} schliesse={() => setSuche(false)} />
      <Hinweis />
    </div>
  );
}
