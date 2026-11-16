import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle, CircleHelp, Flag, ListOrdered, Play, Workflow, Wrench, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Leitfaden, LeitKnoten } from '../daten';
import { ZuPruefen } from '../teile/Ikon';

const ART: Record<LeitKnoten['art'], { name: string; farbe: string; voll: boolean; I: typeof Play }> = {
  start: { name: 'Start', farbe: '#64748b', voll: true, I: Play },
  schritt: { name: 'Untersuchen', farbe: 'var(--fach)', voll: true, I: Workflow },
  entscheidung: { name: 'Entscheidung', farbe: '#8b5cf6', voll: false, I: CircleHelp },
  massnahme: { name: 'Maßnahme', farbe: '#16a34a', voll: false, I: Wrench },
  warnung: { name: 'Sofortmaßnahme', farbe: '#dc2626', voll: true, I: AlertTriangle },
  ende: { name: 'Ende', farbe: '#64748b', voll: true, I: Flag },
};
const B = 250, H = 74;

function Kasten({ data, selected }: NodeProps<Node<{ k: LeitKnoten }>>) {
  const { k } = data, a = ART[k.art];
  return (
    <div className={`flex items-center gap-3 border-2 px-3 shadow-karte transition-transform hover:scale-[1.03] ${k.art === 'entscheidung' ? 'rounded-[28px]' : k.art === 'start' || k.art === 'ende' ? 'rounded-full' : 'rounded-2xl'} ${selected ? 'ring-4 ring-fach/40' : ''}`}
      style={{ width: B, height: H, cursor: 'pointer', borderColor: a.farbe, background: a.voll ? a.farbe : `color-mix(in srgb, ${a.farbe} 12%, var(--flaeche))`, color: a.voll ? '#fff' : 'var(--text)' }}>
      <Handle id="o" type="target" position={Position.Top} isConnectable={false} style={{ pointerEvents: "none" }} /><Handle id="u" type="source" position={Position.Bottom} isConnectable={false} style={{ pointerEvents: "none" }} />
      <Handle id="raus" type="source" position={Position.Right} isConnectable={false} style={{ pointerEvents: "none" }} /><Handle id="links" type="source" position={Position.Left} isConnectable={false} style={{ pointerEvents: "none" }} /><Handle id="rein" type="target" position={Position.Right} isConnectable={false} style={{ pointerEvents: "none" }} />
      {k.kuerzel ? <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/25 text-2xl font-black">{k.kuerzel}</span>
        : <a.I size={22} className="shrink-0" style={{ color: a.voll ? '#fff' : a.farbe }} />}
      <div className="min-w-0"><div className="text-[.84rem] font-bold leading-tight">{k.titel}</div>{k.kurz && <div className="truncate text-[.72rem] opacity-80">{k.kurz}</div>}</div>
    </div>
  );
}
const typen = { lf: Kasten };

function Details({ k }: { k: LeitKnoten }) {
  const a = ART[k.art];
  return (
    <>
      <span className="marke" style={{ ['--fach' as string]: a.farbe === 'var(--fach)' ? undefined : a.farbe }}><a.I size={13} />{a.name}</span>
      <h2 className="mt-1.5 text-xl font-extrabold leading-tight">{k.kuerzel && <span className="text-fach">{k.kuerzel} · </span>}{k.titel}</h2>
      {k.kurz && <p className="text-leise">{k.kurz}</p>}
      {k.details.length > 0 && <ul className="prosa mt-2 list-disc pl-5 !text-[.95rem]">{k.details.map((d) => <li key={d}>{d}</li>)}</ul>}
    </>
  );
}

export default function Leitfadenseite({ k }: { k: Leitfaden }) {
  const [liste, setListe] = useState(false);
  const [wahl, setWahl] = useState<string | null>(null);
  const { nodes, edges } = useMemo(() => {
    // Hauptweg senkrecht in der Mitte; Maßnahmen und Sofortmaßnahmen stehen als Abzweig rechts daneben.
    const art = (id: string) => k.knoten.find((n) => n.id === id)?.art;
    const seitlich = (id: string) => art(id) === 'massnahme' || art(id) === 'warnung';
    const lage = new Map<string, { x: number; y: number }>();
    let y = 0;
    for (const n of k.knoten) if (!seitlich(n.id)) { lage.set(n.id, { x: 0, y }); y += H + 56; }
    for (const n of k.knoten) if (seitlich(n.id)) {
      const von = k.kanten.find((e) => e.nach === n.id)?.von;
      lage.set(n.id, { x: n.art === 'warnung' ? -(B + 96) : B + 96, y: (lage.get(von ?? '')?.y ?? 0) + H - 6 });
    }
    const nodes: Node[] = k.knoten.map((n) => ({ id: n.id, type: 'lf', position: lage.get(n.id)!, data: { k: n } }));
    const edges: Edge[] = k.kanten.map((e) => ({
      id: `${e.von}>${e.nach}`, source: e.von, target: e.nach, type: 'smoothstep', label: e.text,
      sourceHandle: art(e.nach) === 'warnung' ? 'links' : seitlich(e.nach) ? 'raus' : 'u', targetHandle: seitlich(e.von) ? 'rein' : 'o',
      style: { stroke: 'var(--leise)', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b93a7', width: 18, height: 18 },
      labelStyle: { fontWeight: 700, fontSize: 12, fill: 'var(--text)' }, labelBgStyle: { fill: 'var(--bg)' }, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6,
    }));
    return { nodes, edges };
  }, [k]);
  const gewaehlt = k.knoten.find((n) => n.id === wahl);

  return (
    <div className="flex h-full flex-col" data-testid="leitfaden">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rand px-4 py-3">
        <div className="min-w-0 basis-full sm:flex-1 sm:basis-0"><h1 className="text-xl font-extrabold tracking-tight">{k.titel}</h1><p className="hidden text-sm text-leise sm:block">{k.beschreibung}</p></div>
        <div className="flex rounded-xl border border-rand bg-flaeche2 p-1 text-sm font-semibold">
          <button className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${!liste ? 'bg-fach text-white' : ''}`} onClick={() => setListe(false)}><Workflow size={15} />Diagramm</button>
          <button className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${liste ? 'bg-fach text-white' : ''}`} onClick={() => setListe(true)}><ListOrdered size={15} />Schritt für Schritt</button>
        </div>
      </header>
      <p className="bg-amber-400/15 px-4 py-1.5 text-xs text-amber-800 dark:text-amber-200">Lern-Tool – keine Handlungsanweisung für echte Notfälle. Im Notfall: 112 wählen und den Anweisungen der Leitstelle folgen.</p>

      {liste ? (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-3 px-4 py-5 pb-24">
            {k.knoten.map((n) => <section key={n.id} className="karte p-4" style={{ borderLeft: `6px solid ${ART[n.art].farbe}` }}><Details k={n} /></section>)}
            <ZuPruefen punkte={k.zu_pruefen} />
            <details className="text-sm text-leise" open><summary className="cursor-pointer font-semibold">Quellen</summary><ul className="mt-2 list-disc space-y-1 pl-5">{k.quellen.map((q) => <li key={q}>{q}</li>)}</ul></details>
          </div>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <ReactFlow defaultNodes={nodes} defaultEdges={edges} nodeTypes={typen} fitView fitViewOptions={{ padding: 0.1, maxZoom: 1, nodes: nodes.filter((n) => n.position.y < 620) }}
            minZoom={0.15} maxZoom={2} nodesDraggable={false} nodesConnectable={false} onNodeClick={(_, n) => setWahl(n.id)} onPaneClick={() => setWahl(null)}>
            <Background gap={26} size={1.4} color="var(--rand)" />
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
          <div className="karte pointer-events-none absolute left-3 top-3 hidden space-y-1 p-3 text-xs sm:block">
            {(['schritt', 'entscheidung', 'massnahme', 'warnung'] as const).map((a) => (
              <div key={a} className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border-2" style={{ borderColor: ART[a].farbe, background: ART[a].voll ? ART[a].farbe : 'transparent' }} />{ART[a].name}</div>
            ))}
            <div className="pt-1 text-leise">Kasten antippen für Details.</div>
          </div>
          {gewaehlt && (
            <aside className="karte einblenden absolute inset-x-3 bottom-3 max-h-[55%] overflow-y-auto p-4 sm:inset-x-auto sm:right-3 sm:top-3 sm:bottom-auto sm:max-h-[calc(100%-1.5rem)] sm:w-96" data-testid="leitfaden-details">
              <button aria-label="Details schließen" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg hover:bg-flaeche2" onClick={() => setWahl(null)}><X size={16} /></button>
              <Details k={gewaehlt} />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
