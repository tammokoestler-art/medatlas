import {
  Activity, Atom, Bandage, Bone, Box, Brain, Dna, Zap, FileText, FlaskConical, Folder, GalleryVerticalEnd, HeartPulse, Languages, ListChecks,
  Microscope, Network, Siren, SpellCheck, Syringe, Workflow, type LucideProps,
} from 'lucide-react';
import type { Knoten } from '../daten';

const FACH: Record<string, React.ComponentType<LucideProps>> = {
  languages: Languages, bone: Bone, activity: Activity, flask: FlaskConical, microscope: Microscope,
  bandage: Bandage, siren: Siren, heart: HeartPulse, syringe: Syringe, dna: Dna, atom: Atom, zap: Zap, brain: Brain,
};
const TYP: Record<Knoten['typ'], React.ComponentType<LucideProps>> = {
  ordner: Folder, einheit: FileText, szene: Box, mindmap: Network, leitfaden: Workflow, karten: GalleryVerticalEnd, quiz: ListChecks, trainer: SpellCheck,
};
export function Ikon({ von: k, ...rest }: { von: Knoten } & LucideProps) {
  const I = (k.typ === 'ordner' && k.icon && FACH[k.icon]) || TYP[k.typ];
  return <I {...rest} />;
}

/** Kleiner Fortschrittsring (0–1). */
export function Ring({ anteil, gr = 18, dicke = 3, farbe = 'var(--fach)' }: { anteil: number; gr?: number; dicke?: number; farbe?: string }) {
  const r = (gr - dicke) / 2, u = 2 * Math.PI * r;
  return (
    <svg width={gr} height={gr} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={gr / 2} cy={gr / 2} r={r} fill="none" stroke="var(--rand)" strokeWidth={dicke} />
      <circle cx={gr / 2} cy={gr / 2} r={r} fill="none" stroke={farbe} strokeWidth={dicke} strokeLinecap="round"
        strokeDasharray={u} strokeDashoffset={u * (1 - Math.min(1, anteil))} style={{ transition: 'stroke-dashoffset .5s ease' }} />
    </svg>
  );
}
export function Balken({ anteil, farbe = 'var(--fach)' }: { anteil: number; farbe?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-flaeche2">
      <div className="h-full rounded-full" style={{ width: `${Math.round(anteil * 100)}%`, background: farbe, transition: 'width .5s ease' }} />
    </div>
  );
}
export function ZuPruefen({ punkte }: { punkte: string[] }) {
  if (!punkte.length) return null;
  return (
    <div className="rounded-2xl border border-amber-400/50 bg-amber-400/10 p-4 text-sm">
      <div className="mb-1 font-bold text-amber-700 dark:text-amber-300">⚠ Zu prüfen</div>
      <ul className="list-disc space-y-1 pl-5">{punkte.map((p) => <li key={p}>{p}</li>)}</ul>
    </div>
  );
}
