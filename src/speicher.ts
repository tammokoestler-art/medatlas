// Lernfortschritt und Einstellungen – liegt nur im Browser dieses Geräts (localStorage).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';
import { alleKarten, einheitenIn, kartenIn } from './daten';

export type Thema = 'system' | 'hell' | 'dunkel';
type KarteZustand = Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string };
interface Tag { karten: number; einheiten: number; fragen: number }
interface Zustand {
  thema: Thema; tagesziel: number; hinweisOk: boolean;
  einheiten: Record<string, { gelernt: boolean; besucht: number }>;
  karten: Record<string, KarteZustand>;
  fragen: Record<string, { richtig: number; falsch: number }>;
  tage: Record<string, Tag>;
  offen: Record<string, boolean>;
  setze: (teil: Partial<Zustand>) => void;
  besuche: (id: string) => void;
  setzeGelernt: (id: string, gelernt: boolean) => void;
  bewerte: (id: string, note: Grade) => void;
  beantworte: (id: string, richtig: boolean) => void;
  klappe: (id: string, auf?: boolean) => void;
  zuruecksetzen: () => void;
}

export const heute = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const planer = fsrs({ enable_fuzz: true });
const alsKarte = (z?: KarteZustand): Card => z
  ? { ...z, due: new Date(z.due), last_review: z.last_review ? new Date(z.last_review) : undefined } as Card
  : createEmptyCard(new Date());
const zaehle = (tage: Record<string, Tag>, feld: keyof Tag) => {
  const t = heute(), alt = tage[t] ?? { karten: 0, einheiten: 0, fragen: 0 };
  return { ...tage, [t]: { ...alt, [feld]: alt[feld] + 1 } };
};
const LEER = { einheiten: {}, karten: {}, fragen: {}, tage: {}, offen: {} };

export const useSpeicher = create<Zustand>()(persist((set) => ({
  thema: 'system', tagesziel: 20, hinweisOk: false, ...LEER,
  setze: (teil) => set(teil),
  besuche: (id) => set((s) => ({ einheiten: { ...s.einheiten, [id]: { gelernt: s.einheiten[id]?.gelernt ?? false, besucht: Date.now() } } })),
  setzeGelernt: (id, gelernt) => set((s) => ({
    einheiten: { ...s.einheiten, [id]: { gelernt, besucht: Date.now() } },
    tage: gelernt ? zaehle(s.tage, 'einheiten') : s.tage,
  })),
  bewerte: (id, note) => set((s) => {
    const neu = planer.next(alsKarte(s.karten[id]), new Date(), note).card;
    return { karten: { ...s.karten, [id]: JSON.parse(JSON.stringify(neu)) }, tage: zaehle(s.tage, 'karten') };
  }),
  beantworte: (id, richtig) => set((s) => {
    const a = s.fragen[id] ?? { richtig: 0, falsch: 0 };
    return { fragen: { ...s.fragen, [id]: richtig ? { ...a, richtig: a.richtig + 1 } : { ...a, falsch: a.falsch + 1 } }, tage: zaehle(s.tage, 'fragen') };
  }),
  klappe: (id, auf) => set((s) => ({ offen: { ...s.offen, [id]: auf ?? !s.offen[id] } })),
  zuruecksetzen: () => set({ ...LEER }),
}), { name: 'medatlas-v1' }));

// ---------- Auswertungen ----------
export { Rating };
export const NOTEN: { note: Grade; name: string; farbe: string }[] = [
  { note: Rating.Again, name: 'Nochmal', farbe: '#ef4444' }, { note: Rating.Hard, name: 'Schwer', farbe: '#f59e0b' },
  { note: Rating.Good, name: 'Gut', farbe: '#22c55e' }, { note: Rating.Easy, name: 'Leicht', farbe: '#3b82f6' },
];
/** Wann käme die Karte bei dieser Note wieder? (für die Beschriftung der Knöpfe) */
export function vorschau(z: KarteZustand | undefined, note: Grade): string {
  const ms = planer.next(alsKarte(z), new Date(), note).card.due.getTime() - Date.now();
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} Min.`;
  if (min < 60 * 24) return `${Math.round(min / 60)} Std.`;
  const tage = Math.round(min / 1440);
  return tage < 31 ? `${tage} T.` : tage < 365 ? `${Math.round(tage / 30)} Mon.` : `${(tage / 365).toFixed(1)} J.`;
}
export type KartenStatus = 'neu' | 'lernen' | 'faellig' | 'sicher';
export function kartenStatus(z: KarteZustand | undefined, jetzt = Date.now()): KartenStatus {
  if (!z) return 'neu';
  if (new Date(z.due).getTime() <= jetzt) return z.state === State.Review ? 'faellig' : 'lernen';
  return z.state === State.Review ? 'sicher' : 'lernen';
}
/** Karten, die jetzt dran sind: erst fällige, dann neue (begrenzt). */
export function warteschlange(karten: Zustand['karten'], ordner = '', maxNeu = 10) {
  const im = ordner ? kartenIn(ordner) : alleKarten, jetzt = Date.now();
  const faellig = im.filter((k) => karten[k.id] && new Date(karten[k.id].due).getTime() <= jetzt);
  const neu = im.filter((k) => !karten[k.id]).slice(0, maxNeu);
  return { faellig, neu, alle: [...faellig, ...neu] };
}
export interface Fortschritt { einheiten: number; gelernt: number; karten: number; sicher: number; anteil: number }
export function fortschritt(s: Pick<Zustand, 'einheiten' | 'karten'>, ordner: string): Fortschritt {
  const e = einheitenIn(ordner), k = kartenIn(ordner);
  const gelernt = e.filter((x) => s.einheiten[x.id]?.gelernt).length;
  const sicher = k.filter((x) => kartenStatus(s.karten[x.id]) === 'sicher').length;
  const gesamt = e.length + k.length;
  return { einheiten: e.length, gelernt, karten: k.length, sicher, anteil: gesamt ? (gelernt + sicher) / gesamt : 0 };
}
export function serie(tage: Record<string, Tag>): number {
  let n = 0;
  const d = new Date();
  const aktiv = (t?: Tag) => !!t && t.karten + t.einheiten + t.fragen > 0;
  if (!aktiv(tage[heute(d)])) d.setDate(d.getDate() - 1);
  while (aktiv(tage[heute(d)])) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function wendeThemaAn(thema: Thema) {
  const t = thema === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dunkel' : 'hell') : thema;
  document.documentElement.dataset.thema = t;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dunkel' ? '#0f1218' : '#f6f7fb');
}
