import { Download, Flame, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { faecher, kinder, link, type Knoten } from '../daten';
import { fortschritt, heute, serie, useSpeicher, type Thema } from '../speicher';
import { Balken, Ikon, Ring } from '../teile/Ikon';

function Zweig({ k, tiefe }: { k: Knoten; tiefe: number }) {
  const s = useSpeicher();
  const p = fortschritt(s, k.id);
  if (!p.einheiten) return null;
  return (
    <>
      <Link to={link(k.id)} className="flex items-center gap-3 rounded-lg py-1.5 pr-2 hover:bg-flaeche2" style={{ paddingLeft: 8 + tiefe * 18 }}>
        <span className="min-w-0 flex-1 truncate text-sm">{k.titel}</span>
        <span className="w-28 shrink-0"><Balken anteil={p.gelernt / p.einheiten} /></span>
        <span className="w-28 shrink-0 text-right text-xs text-leise">{p.gelernt}/{p.einheiten} gelernt · {p.einheiten - p.gelernt} offen</span>
      </Link>
      {kinder(k.id).filter((u) => u.typ === 'ordner').map((u) => <Zweig key={u.id} k={u} tiefe={tiefe + 1} />)}
    </>
  );
}

export default function Fortschrittseite() {
  const s = useSpeicher();
  const datei = useRef<HTMLInputElement>(null);
  const tag = s.tage[heute()] ?? { karten: 0, einheiten: 0, fragen: 0 };
  const woche = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return { d, t: s.tage[heute(d)] }; });
  const max = Math.max(s.tagesziel, ...woche.map((w) => w.t?.karten ?? 0));
  const sichern = () => {
    const { einheiten, karten, fragen, tage, tagesziel } = s;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ medatlas: 1, einheiten, karten, fragen, tage, tagesziel }, null, 1)], { type: 'application/json' }));
    a.download = `medatlas-fortschritt-${heute()}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  const laden = async (f?: File) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.medatlas !== 1) throw new Error();
      s.setze({ einheiten: d.einheiten ?? {}, karten: d.karten ?? {}, fragen: d.fragen ?? {}, tage: d.tage ?? {}, tagesziel: d.tagesziel ?? 20 });
      alert('Fortschritt wurde geladen.');
    } catch { alert('Diese Datei ist keine MedAtlas-Sicherung.'); }
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Fortschritt</h1>
      <section className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="karte flex items-center gap-5 p-5" style={{ ['--fach' as string]: '#22c55e' }}>
          <div className="relative grid place-items-center"><Ring anteil={tag.karten / s.tagesziel} gr={92} dicke={9} /><span className="absolute text-xl font-extrabold">{Math.min(100, Math.round((tag.karten / s.tagesziel) * 100))}%</span></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-leise">Tagesziel heute</div>
            <div className="text-2xl font-extrabold">{tag.karten} / {s.tagesziel} Karten</div>
            <div className="mt-1 flex items-center gap-1 text-sm text-leise"><Flame size={15} className="text-amber-500" />{serie(s.tage)} Tage in Folge</div>
          </div>
        </div>
        <div className="karte p-5">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-leise">Karten pro Tag – letzte 14 Tage</div>
          <div className="flex h-24 items-end gap-1.5">
            {woche.map(({ d, t }) => (
              <div key={d.toISOString()} className="flex flex-1 flex-col items-center gap-1" title={`${d.toLocaleDateString('de-DE')}: ${t?.karten ?? 0} Karten`}>
                <div className="w-full rounded-t-md" style={{ height: `${Math.max(3, ((t?.karten ?? 0) / max) * 76)}px`, background: (t?.karten ?? 0) >= s.tagesziel ? '#22c55e' : t?.karten ? '#f59e0b' : 'var(--rand)' }} />
                <span className="text-[.6rem] text-leise">{d.getDate()}.</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-leise">Nach Ordnern</h2>
        {faecher.map((f) => {
          const p = fortschritt(s, f.id);
          if (!p.einheiten) return null;
          return (
            <div key={f.id} className="karte p-4" style={{ ['--fach' as string]: f.farbe }}>
              <div className="mb-2 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-fach-zart text-fach"><Ikon von={f} size={20} /></span>
                <div className="flex-1"><div className="font-bold">{f.titel}</div><div className="text-xs text-leise">{p.gelernt} von {p.einheiten} Einheiten gelernt · {p.sicher} von {p.karten} Karten sicher</div></div>
                <span className="text-lg font-extrabold text-fach">{Math.round(p.anteil * 100)}%</span>
              </div>
              {kinder(f.id).filter((u) => u.typ === 'ordner').map((u) => <Zweig key={u.id} k={u} tiefe={0} />)}
            </div>
          );
        })}
      </section>

      <section className="karte space-y-5 p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-leise">Einstellungen</h2>
        <label className="flex flex-wrap items-center gap-3"><span className="w-40 font-semibold">Tagesziel</span>
          <input type="range" min={5} max={100} step={5} value={s.tagesziel} onChange={(e) => s.setze({ tagesziel: +e.target.value })} className="flex-1 accent-emerald-500" aria-label="Tagesziel in Karten" />
          <span className="w-24 text-right text-sm">{s.tagesziel} Karten</span></label>
        <div className="flex flex-wrap items-center gap-3"><span className="w-40 font-semibold">Darstellung</span>
          {(['system', 'hell', 'dunkel'] as Thema[]).map((t) => <button key={t} className={`knopf !min-h-9 !py-1.5 text-sm capitalize ${s.thema === t ? 'knopf-fach' : ''}`} onClick={() => s.setze({ thema: t })}>{t === 'system' ? 'Automatisch' : t}</button>)}</div>
        <div className="flex flex-wrap items-center gap-3"><span className="w-40 font-semibold">Sicherung</span>
          <button className="knopf !min-h-9 !py-1.5 text-sm" onClick={sichern}><Download size={15} />Fortschritt sichern</button>
          <button className="knopf !min-h-9 !py-1.5 text-sm" onClick={() => datei.current?.click()}><Upload size={15} />Sicherung laden</button>
          <input ref={datei} type="file" accept="application/json" hidden onChange={(e) => laden(e.target.files?.[0])} />
          <button className="knopf !min-h-9 !py-1.5 text-sm text-rose-500" onClick={() => { if (confirm('Wirklich den gesamten Lernfortschritt auf diesem Gerät löschen?')) s.zuruecksetzen(); }}><Trash2 size={15} />Zurücksetzen</button></div>
        <p className="text-xs text-leise">Der Fortschritt liegt nur im Browser dieses Geräts. Um ihn auf ein anderes Gerät (z. B. vom iPad aufs MacBook) mitzunehmen: hier sichern, dort laden.</p>
      </section>
    </div>
  );
}
