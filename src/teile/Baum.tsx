import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fachFarbe, kinder, link, pfad, type Knoten } from '../daten';
import { fortschritt, useSpeicher } from '../speicher';
import { Ikon, Ring } from './Ikon';

function Zeile({ k, tiefe, aktiv, schliesse }: { k: Knoten; tiefe: number; aktiv: string; schliesse: () => void }) {
  const offen = useSpeicher((s) => !!s.offen[k.id]);
  const klappe = useSpeicher((s) => s.klappe);
  const gelernt = useSpeicher((s) => k.typ === 'einheit' && !!s.einheiten[k.id]?.gelernt);
  const anteil = useSpeicher((s) => (k.typ === 'ordner' ? fortschritt(s, k.id).anteil : 0));
  const unter = k.typ === 'ordner' ? kinder(k.id) : [];
  const istAktiv = aktiv === k.id;
  const farbe = fachFarbe(k.id);
  return (
    <li style={{ ['--fach' as string]: farbe }}>
      <div className={`group flex items-center rounded-xl pr-2 text-[.9rem] transition-colors ${istAktiv ? 'bg-fach-zart font-semibold text-fach-text' : 'hover:bg-flaeche2'}`}
        style={{ paddingLeft: 4 + tiefe * 14 }}>
        {k.typ === 'ordner' ? (
          <button aria-label={offen ? 'Zuklappen' : 'Aufklappen'} aria-expanded={offen} onClick={() => klappe(k.id)}
            className="grid h-9 w-7 shrink-0 place-items-center text-leise">
            <ChevronRight size={15} className={`transition-transform duration-200 ${offen ? 'rotate-90' : ''} ${unter.length ? '' : 'opacity-25'}`} />
          </button>
        ) : <span className="w-7 shrink-0" />}
        <Link to={link(k.id)} onClick={() => { if (k.typ === 'ordner') klappe(k.id, true); schliesse(); }}
          className="flex min-w-0 flex-1 items-center gap-2 py-2">
          <Ikon von={k} size={16} className="shrink-0" style={{ color: tiefe < 2 || k.typ !== 'ordner' ? farbe : undefined }} />
          <span className="truncate">{k.titel}</span>
        </Link>
        {k.typ === 'ordner' && unter.length > 0 && <Ring anteil={anteil} gr={16} />}
        {gelernt && <Check size={15} className="shrink-0 text-emerald-500" />}
      </div>
      <AnimatePresence initial={false}>
        {offen && unter.length > 0 && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }} className="overflow-hidden">
            {unter.map((u) => <Zeile key={u.id} k={u} tiefe={tiefe + 1} aktiv={aktiv} schliesse={schliesse} />)}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

export function Baum({ aktiv, schliesse }: { aktiv: string; schliesse: () => void }) {
  const klappe = useSpeicher((s) => s.klappe);
  // den Weg zum aktuellen Knoten automatisch aufklappen
  useEffect(() => { for (const k of pfad(aktiv).slice(0, -1)) klappe(k.id, true); }, [aktiv, klappe]);
  return (
    <nav aria-label="Ordnerbaum">
      {kinder(null).map((gruppe) => (
        <div key={gruppe.id} className="mb-3">
          <Link to={link(gruppe.id)} onClick={schliesse} className="block px-3 pb-1 text-[.7rem] font-bold uppercase tracking-widest text-leise hover:text-text">{gruppe.titel}</Link>
          <ul>{kinder(gruppe.id).map((k) => <Zeile key={k.id} k={k} tiefe={0} aktiv={aktiv} schliesse={schliesse} />)}</ul>
        </div>
      ))}
    </nav>
  );
}
