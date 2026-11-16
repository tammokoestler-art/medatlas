import { Link } from 'react-router-dom';
import { alle, fachFarbe, link, pfad, type Einheit, type Leitfaden, type Szene } from '../daten';

export function Pruefliste() {
  const offen = alle.filter((k): k is Einheit | Leitfaden => (k.typ === 'einheit' || k.typ === 'leitfaden') && k.zu_pruefen.length > 0);
  return (
    <div className="space-y-5">
      <header><h1 className="text-3xl font-extrabold tracking-tight">Zu prüfen</h1>
        <p className="mt-1 text-leise">Stellen, bei denen die KI unsicher war oder Lehrbücher voneinander abweichen. Bitte vor dem Auswendiglernen mit einem Lehrbuch oder der aktuellen Leitlinie abgleichen.</p></header>
      {offen.map((k) => (
        <section key={k.id} className="karte p-4" style={{ ['--fach' as string]: fachFarbe(k.id) }}>
          <Link to={link(k.id)} className="font-bold text-fach-text underline">{k.titel}</Link>
          <div className="text-xs text-leise">{pfad(k.id).slice(0, -1).map((p) => p.titel).join(' › ')}</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{k.zu_pruefen.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}

export function Quellen() {
  const szenen = alle.filter((k): k is Szene => k.typ === 'szene');
  return (
    <div className="prosa space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Quellen &amp; Lizenzen</h1>
      <section className="karte p-5">
        <h2 className="text-lg font-bold">Wichtiger Hinweis</h2>
        <p>MedAtlas ist ein <strong>Lern-Tool</strong> und <strong>keine Grundlage für medizinische Entscheidungen</strong>. Es ersetzt weder Lehrbuch noch Leitlinie noch ärztlichen Rat.</p>
        <p>Alle Texte, Karteikarten, Quizfragen und Leitfäden wurden von einer KI (Claude) aus Lehrbuchwissen verfasst und <strong>nicht ärztlich gegengelesen</strong>. Stellen, an denen Unsicherheit besteht, stehen unter <Link to="/pruefen">Zu prüfen</Link>.</p>
      </section>
      <section className="karte p-5">
        <h2 className="text-lg font-bold">3D-Modelle</h2>
        {szenen.map((s) => (
          <div key={s.id}>
            <p><strong>{s.titel}</strong>: {s.quelle.name}, {s.quelle.urheber}, lizenziert unter <a href={s.quelle.lizenzUrl} target="_blank" rel="noreferrer">{s.quelle.lizenz}</a>. Quelle: <a href={s.quelle.url} target="_blank" rel="noreferrer">{s.quelle.url}</a></p>
            {s.quelle.hinweis && <p className="text-sm text-leise">{s.quelle.hinweis}</p>}
          </div>
        ))}
      </section>
      <section className="karte p-5">
        <h2 className="text-lg font-bold">Fachliche Grundlagen</h2>
        <ul>
          <li>Anatomische Nomenklatur: Terminologia Anatomica, 2. Auflage (FIPAT, 2019).</li>
          <li>Leitfäden: Leitlinien des European Resuscitation Council (ERC) / Deutscher Rat für Wiederbelebung (GRC) und AWMF-Leitlinien; die genaue Quelle steht bei jedem Leitfaden.</li>
          <li>Die Quellen jeder Lerneinheit stehen am Ende der Einheit.</li>
        </ul>
      </section>
      <section className="karte p-5">
        <h2 className="text-lg font-bold">Software</h2>
        <p>React, Vite, three.js / react-three-fiber, React Flow, ts-fsrs (Spaced Repetition), MiniSearch, Tailwind CSS, Lucide Icons – jeweils Open Source.</p>
      </section>
    </div>
  );
}
