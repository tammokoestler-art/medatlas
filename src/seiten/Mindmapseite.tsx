import {
  Background, BaseEdge, Controls, EdgeLabelRenderer, Handle, MarkerType, Position, ReactFlow, useInternalNode,
  type Edge, type EdgeProps, type InternalNode, type Node, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Check } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { link, type Mindmap } from '../daten';
import { useSpeicher } from '../speicher';

const ASTFARBEN = ['#e11d48', '#f97316', '#0ea5e9', '#22c55e', '#8b5cf6', '#d946ef', '#14b8a6', '#eab308'];
type Daten = { text: string; notiz?: string; einheit?: string; farbe: string; tiefe: number };

function Knoten({ data }: NodeProps<Node<Daten>>) {
  const gelernt = useSpeicher((s) => !!data.einheit && !!s.einheiten[data.einheit]?.gelernt);
  const stil = data.tiefe === 0
    ? { background: 'linear-gradient(135deg,#e11d48,#8b5cf6)', color: '#fff', borderColor: 'transparent' }
    : data.tiefe === 1 ? { background: data.farbe, color: '#fff', borderColor: 'transparent' }
      : { background: `color-mix(in srgb, ${data.farbe} 13%, var(--flaeche))`, borderColor: data.farbe };
  return (
    <div style={stil} title={data.einheit ? 'Lerneinheit öffnen' : undefined}
      className={`relative rounded-2xl border-2 text-center shadow-karte transition-transform ${data.einheit ? 'cursor-pointer hover:scale-105' : ''} ${data.tiefe === 0 ? 'px-6 py-4 text-xl font-extrabold' : data.tiefe === 1 ? 'px-5 py-2.5 text-base font-bold' : 'px-3.5 py-2 text-sm font-semibold'}`}>
      <Handle type="target" position={Position.Top} isConnectable={false} style={{ left: "50%", top: "50%", pointerEvents: "none" }} />
      <Handle type="source" position={Position.Top} isConnectable={false} style={{ left: "50%", top: "50%", pointerEvents: "none" }} />
      <div className="whitespace-pre-line leading-tight">{data.text}</div>
      {data.notiz && <div className="mt-0.5 text-[.7rem] font-normal opacity-75">{data.notiz}</div>}
      {gelernt && <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"><Check size={13} /></span>}
    </div>
  );
}
/** Punkt auf dem Rand des Knotens in Richtung des anderen Knotens. */
function rand(n: InternalNode, o: InternalNode): [number, number] {
  const w = (n.measured.width ?? 160) / 2, h = (n.measured.height ?? 44) / 2;
  const cx = n.internals.positionAbsolute.x + w, cy = n.internals.positionAbsolute.y + h;
  const dx = o.internals.positionAbsolute.x + (o.measured.width ?? 160) / 2 - cx, dy = o.internals.positionAbsolute.y + (o.measured.height ?? 44) / 2 - cy;
  const f = Math.min(dx ? (w + 4) / Math.abs(dx) : Infinity, dy ? (h + 4) / Math.abs(dy) : Infinity);
  return Number.isFinite(f) ? [cx + dx * f, cy + dy * f] : [cx, cy];
}
function Kante({ id, source, target, markerEnd, style, label, data }: EdgeProps) {
  const a = useInternalNode(source), b = useInternalNode(target);
  if (!a || !b) return null;
  const [sx, sy] = rand(a, b), [tx, ty] = rand(b, a);
  const bogen = data?.quer ? 0.16 : 0;
  const kx = (sx + tx) / 2 - (ty - sy) * bogen, ky = (sy + ty) / 2 + (tx - sx) * bogen;
  return (
    <>
      <BaseEdge id={id} path={`M ${sx} ${sy} Q ${kx} ${ky} ${tx} ${ty}`} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div className="pointer-events-none absolute rounded-md border border-rand bg-flaeche px-1.5 py-0.5 text-[.68rem] font-medium text-leise"
            style={{ transform: `translate(-50%,-50%) translate(${(sx + 2 * kx + tx) / 4}px,${(sy + 2 * ky + ty) / 4}px)` }}>{label}</div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
const knotenTypen = { mm: Knoten }, kantenTypen = { frei: Kante };

function ordne(k: Mindmap) {
  const kinder = (id: string) => k.knoten.filter((n) => n.unter === id);
  const blaetter = (id: string): number => { const u = kinder(id); return u.length ? u.reduce((s, n) => s + blaetter(n.id), 0) : 1; };
  const wurzel = k.knoten.find((n) => !n.unter)!;
  const nodes: Node<Daten>[] = [], edges: Edge[] = [];
  const RADIEN = [[0, 0], [330, 215], [700, 455], [1000, 650]];
  const setze = (id: string, tiefe: number, von: number, bis: number, farbe: string) => {
    const n = k.knoten.find((x) => x.id === id)!, winkel = (von + bis) / 2, [rx, ry] = RADIEN[Math.min(tiefe, 3)];
    nodes.push({ id, type: 'mm', position: { x: Math.cos(winkel) * rx, y: Math.sin(winkel) * ry }, data: { text: n.text, notiz: n.notiz, einheit: n.einheit, farbe, tiefe } });
    let start = von;
    const gesamt = blaetter(id);
    kinder(id).forEach((u, i) => {
      const anteil = ((bis - von) * blaetter(u.id)) / gesamt, f = tiefe === 0 ? ASTFARBEN[i % ASTFARBEN.length] : farbe;
      setze(u.id, tiefe + 1, start, start + anteil, f);
      edges.push({ id: `${id}>${u.id}`, source: id, target: u.id, type: 'frei', style: { stroke: f, strokeWidth: tiefe === 0 ? 3.5 : 2.2 }, markerEnd: { type: MarkerType.ArrowClosed, color: f, width: 16, height: 16 } });
      start += anteil;
    });
  };
  setze(wurzel.id, 0, -Math.PI / 2 - 0.5, (3 * Math.PI) / 2 - 0.5, '#64748b');
  for (const v of k.verbindungen) edges.push({
    id: `${v.von}~${v.nach}`, source: v.von, target: v.nach, type: 'frei', label: v.text, data: { quer: true },
    style: { stroke: 'var(--leise)', strokeWidth: 1.6, strokeDasharray: '6 5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b93a7', width: 18, height: 18 },
  });
  return { nodes, edges };
}

export default function Mindmapseite({ k }: { k: Mindmap }) {
  const nav = useNavigate();
  const { nodes, edges } = useMemo(() => ordne(k), [k]);
  return (
    <div className="relative h-full" data-testid="mindmap">
      <ReactFlow defaultNodes={nodes} defaultEdges={edges} nodeTypes={knotenTypen} edgeTypes={kantenTypen} nodeOrigin={[0.5, 0.5]}
        fitView fitViewOptions={{ padding: 0.08 }} minZoom={0.15} maxZoom={2.5} nodesConnectable={false} elementsSelectable={false}
        onNodeClick={(_, n) => { const e = (n.data as Daten).einheit; if (e) nav(link(e)); }} proOptions={{ hideAttribution: false }}>
        <Background gap={26} size={1.4} color="var(--rand)" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
      <div className="karte pointer-events-none absolute left-3 top-3 max-w-[17rem] p-3 text-xs leading-snug text-leise">
        <div className="text-sm font-bold text-text">{k.titel}</div>
        <div className="mt-1 flex items-center gap-2"><span className="h-0.5 w-6 bg-fach" />gehört zu</div>
        <div className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed border-leise" />Zusammenhang</div>
        <div className="mt-1">Knoten antippen öffnet die Lerneinheit. Ziehen verschiebt, Mausrad oder zwei Finger zoomen.</div>
      </div>
    </div>
  );
}
