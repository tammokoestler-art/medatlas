// Zugriff auf die beim Build erzeugten Inhalte (src/generated/inhalte.json).
import roh from './generated/inhalte.json';

interface Basis { id: string; kurz: string; eltern: string | null; titel: string; beschreibung?: string; reihenfolge: number }
export interface Ordner extends Basis { typ: 'ordner'; latein?: string; farbe?: string; icon?: string }
export interface Einheit extends Basis {
  typ: 'einheit'; lat: string; de: string; wortherkunft?: string; steckbrief?: Record<string, string>;
  verwandt: string[]; zu_pruefen: string[]; quellen: string[]; abschnitte: { titel: string; html: string }[]; text: string;
}
export interface Struktur {
  id: string; lat: string; de: string; en?: string; seite?: string; schicht: string; art: string; region: string;
  fma?: string; schematisch?: boolean; einheit?: string; info?: string;
}
export interface Szene extends Basis {
  typ: 'szene'; modell?: string; rahmen?: number[][]; start?: Record<string, 'an' | 'durch' | 'aus'>;
  quelle: { name: string; urheber: string; lizenz: string; lizenzUrl: string; url: string; hinweis?: string };
  schichten: { id: string; titel: string; farbe: string; datei?: string }[]; strukturen: Struktur[];
}
export interface Mindmap extends Basis {
  typ: 'mindmap'; knoten: { id: string; text: string; unter?: string; einheit?: string; notiz?: string }[];
  verbindungen: { von: string; nach: string; text: string }[];
}
export interface LeitKnoten { id: string; art: 'start' | 'schritt' | 'entscheidung' | 'massnahme' | 'warnung' | 'ende'; titel: string; kurz?: string; kuerzel?: string; details: string[] }
export interface Leitfaden extends Basis {
  typ: 'leitfaden'; quellen: string[]; zu_pruefen: string[]; knoten: LeitKnoten[]; kanten: { von: string; nach: string; text?: string }[];
}
export interface Karte { id: string; einheit?: string; vorne: string; hinten: string }
export interface Karten extends Basis { typ: 'karten'; karten: Karte[] }
export interface Frage { id: string; einheit?: string; frage: string; antworten: string[]; richtig: number; erklaerung: string }
export interface Quiz extends Basis { typ: 'quiz'; fragen: Frage[]; benennen?: { szene: string; strukturen: string[] } }
export interface Trainer extends Basis {
  typ: 'trainer'; gruppen: { id: string; titel: string; eintraege: { begriff: string; bedeutung: string; herkunft?: string; beispiel?: string }[] }[];
}
export type Knoten = Ordner | Einheit | Szene | Mindmap | Leitfaden | Karten | Quiz | Trainer;

export const alle = (roh as unknown as { knoten: Knoten[] }).knoten;
const nachId = new Map(alle.map((k) => [k.id, k]));
export const knoten = (id: string | null | undefined) => (id ? nachId.get(id) : undefined);

const rang = (k: Knoten) => (k.typ === 'ordner' || k.typ === 'einheit' ? 0 : 1);
const kinderVon = new Map<string | null, Knoten[]>();
for (const k of alle) kinderVon.set(k.eltern, [...(kinderVon.get(k.eltern) ?? []), k]);
for (const l of kinderVon.values()) l.sort((a, b) => rang(a) - rang(b) || a.reihenfolge - b.reihenfolge || a.titel.localeCompare(b.titel));
export const kinder = (id: string | null) => kinderVon.get(id) ?? [];

/** Weg von der Wurzel bis zum Knoten (einschließlich). */
export function pfad(id: string): Knoten[] {
  const weg: Knoten[] = [];
  for (let k = knoten(id); k; k = knoten(k.eltern)) weg.unshift(k);
  return weg;
}
export const STANDARDFARBE = '#64748b';
/** Farbe des Fachbereichs, zu dem der Knoten gehört. */
export function fachFarbe(id: string | null | undefined): string {
  for (let k = knoten(id); k; k = knoten(k.eltern)) if (k.typ === 'ordner' && k.farbe) return k.farbe;
  return STANDARDFARBE;
}
export const faecher = alle.filter((k): k is Ordner => k.typ === 'ordner' && !!k.farbe).sort((a, b) => a.reihenfolge - b.reihenfolge);
export const liegtIn = (id: string, ordner: string) => id === ordner || id.startsWith(ordner + '/');
export const einheitenIn = (ordner: string) => alle.filter((k): k is Einheit => k.typ === 'einheit' && liegtIn(k.id, ordner));
export const alleStapel = alle.filter((k): k is Karten => k.typ === 'karten');
export const alleKarten = alleStapel.flatMap((s) => s.karten.map((k) => ({ ...k, stapel: s.id })));
/** Karten, die inhaltlich zu einem Ordner gehören (über ihre Lerneinheit, sonst über den Ort des Stapels). */
export const kartenIn = (ordner: string) => alleKarten.filter((k) => liegtIn(k.einheit ?? k.stapel, ordner));

export const TYP_NAME: Record<Knoten['typ'], string> = {
  ordner: 'Ordner', einheit: 'Lerneinheit', szene: '3D-Modell', mindmap: 'Mindmap', leitfaden: 'Leitfaden', karten: 'Karteikarten', quiz: 'Quiz', trainer: 'Trainer',
};
export const link = (id: string, param = '') => `/n/${id}${param}`;
/** Anzeigename einer 3D-Struktur: lateinisch, sonst der englische Name aus dem Datensatz. */
export const strukturName = (s: Struktur) => s.lat || s.en || s.id;
/** **fett** in Karten- und Quiztexten. */
export const fett = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
export function mischen<T>(liste: T[]): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
