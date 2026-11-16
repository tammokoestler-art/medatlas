// 3D-Ansicht einer Szene: drehen (1 Finger / linke Maustaste), zoomen (2 Finger / Mausrad), verschieben (2 Finger / rechte Maustaste).
// Eine Szene besteht aus einer Modelldatei oder aus einer Datei je Schicht; Schichten werden erst geladen, wenn sie sichtbar sind.
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box3, Color, Mesh, Vector3, type BufferGeometry, type Matrix4, type MeshStandardMaterial, type PerspectiveCamera } from 'three';
import type { OrbitControls as Steuerung } from 'three-stdlib';
import type { Struktur, Szene } from '../daten';

export type Sicht = 'an' | 'durch' | 'aus';
export interface Blick { richtung: [number, number, number]; n: number }
const FARBE: Record<string, string> = {
  knochen: '#e9e0c9', band: '#c9d3d6', knorpel: '#bfd6e2', zahn: '#f6f2e8', muskel: '#b8473f', sehne: '#e3d6c2', arterie: '#d42a2a', vene: '#2f62d6',
  nerv: '#f4c62c', zns: '#e7b3bd', organ: '#c77d6a', haut: '#e2ad8c',
};
export const MARKIERT = '#22d3ee';
const keinStrahl = () => null;
const streu = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997; return h / 997 - 0.5; };
const BREIT: Record<string, number> = { muskel: 0.11, organ: 0.16, zns: 0.1 };

interface Teil { geo: BufferGeometry; lage: Matrix4; kasten: Box3 }
type Ziel = React.MutableRefObject<{ pos: Vector3; mitte: Vector3 } | null>;
interface Props {
  szene: Szene;
  /** Sichtbarkeit je Struktur. */
  sicht: (s: Struktur) => Sicht;
  gewaehlt: string[];
  /** Strukturen, auf die die Kamera fährt (leer = ganzes Modell). */
  fokus: string[];
  blick: Blick;
  onWaehle?: (id: string | null) => void;
}

function Kamera({ teile, rahmen, fokus, blick, ziel }: { teile: Map<string, Teil>; rahmen?: number[][]; fokus: string[]; blick: Blick; ziel: Ziel }) {
  const kamera = useThree((s) => s.camera) as PerspectiveCamera;
  const steuerung = useThree((s) => s.controls) as unknown as Steuerung | null;
  const invalidate = useThree((s) => s.invalidate);
  const letzterBlick = useRef(-1);
  const schluessel = fokus.join(',');
  const geladen = fokus.filter((id) => teile.has(id)).length;
  const ganzes = fokus.length ? 0 : rahmen ? 1 : teile.size;
  useEffect(() => {
    if (!steuerung) return;
    const kasten = new Box3();
    if (fokus.length) { for (const id of fokus) { const t = teile.get(id); if (t) kasten.union(t.kasten); } }
    else if (rahmen) kasten.set(new Vector3(...rahmen[0]), new Vector3(...rahmen[1]));
    else for (const t of teile.values()) kasten.union(t.kasten);
    if (kasten.isEmpty()) return;
    const mitte = kasten.getCenter(new Vector3());
    const radius = Math.max(kasten.getSize(new Vector3()).length() / 2, 0.07);
    const abstand = (radius / Math.sin((kamera.fov * Math.PI) / 360)) * (fokus.length ? 1.5 : 1.02) / Math.max(Math.min(1, kamera.aspect), 0.62);
    const neuerBlick = letzterBlick.current !== blick.n;
    letzterBlick.current = blick.n;
    const richtung = neuerBlick ? new Vector3(...blick.richtung) : kamera.position.clone().sub(steuerung.target);
    ziel.current = { mitte, pos: mitte.clone().add(richtung.normalize().multiplyScalar(abstand)) };
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel, geladen, ganzes, blick.n, steuerung]);
  useFrame(() => {
    const z = ziel.current;
    if (!z || !steuerung) return;
    kamera.position.lerp(z.pos, 0.16);
    steuerung.target.lerp(z.mitte, 0.16);
    steuerung.update();
    if (kamera.position.distanceTo(z.pos) < 0.003) ziel.current = null; else invalidate();
  });
  return null;
}

/** Ein einzelnes Netz. Neu gezeichnet wird nur, wenn sich für genau diese Struktur etwas ändert. */
const Netz = memo(function Netz({ s, teil, wie, an, greifbar, onWaehle }: { s: Struktur; teil: Teil; wie: Sicht; an: boolean; greifbar: boolean; onWaehle?: (id: string | null) => void }) {
  const invalidate = useThree((st) => st.invalidate);
  const geist = wie === 'durch' && !an;
  const farbe = useMemo(() => {
    const f = new Color(an ? MARKIERT : FARBE[s.art] ?? '#999999');
    if (!an) f.offsetHSL(s.art === 'organ' ? streu(s.id) * 0.06 : 0, 0, streu(s.id) * (BREIT[s.art] ?? 0.04));
    return f;
  }, [an, s.art, s.id]);
  const schweben = (e: ThreeEvent<PointerEvent>, hell: boolean) => {
    if (hell) e.stopPropagation();
    const m = (e.object as Mesh).material as MeshStandardMaterial;
    if (!an) { m.emissive.set(hell ? '#ffffff' : '#000000'); m.emissiveIntensity = hell ? 0.18 : 0; }
    document.body.style.cursor = hell ? 'pointer' : '';
    invalidate();
  };
  return (
    <mesh name={s.id} geometry={teil.geo} matrix={teil.lage} matrixAutoUpdate={false} renderOrder={geist ? 2 : an ? 1 : 0}
      raycast={greifbar && !geist ? Mesh.prototype.raycast : keinStrahl}
      onClick={greifbar && !geist ? (e: ThreeEvent<MouseEvent>) => { if (e.delta > 6) return; e.stopPropagation(); onWaehle!(s.id); } : undefined}
      onPointerOver={greifbar && !geist ? (e) => schweben(e, true) : undefined}
      onPointerOut={greifbar && !geist ? (e) => schweben(e, false) : undefined}>
      <meshStandardMaterial color={farbe} roughness={s.art === 'knochen' ? 0.55 : 0.7} metalness={0}
        emissive={an ? MARKIERT : '#000000'} emissiveIntensity={an ? 0.35 : 0}
        transparent={geist} opacity={geist ? (s.art === 'haut' ? 0.2 : 0.14) : 1} depthWrite={!geist} />
    </mesh>
  );
});

/** Lädt eine Modelldatei und zeichnet die sichtbaren Strukturen daraus. */
function Datei({ url, strukturen, sicht, gewaehlt, onWaehle, melde }: { url: string; strukturen: Struktur[]; melde: (t: Map<string, Teil>) => void } & Pick<Props, 'sicht' | 'gewaehlt' | 'onWaehle'>) {
  const gltf = useGLTF('./' + url, false, true);
  const teile = useMemo(() => {
    // Die komprimierten Netze tragen Lage und Maßstab im Knoten – beides wird hier mit übernommen.
    const m = new Map<string, Teil>();
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => {
      const netz = o as Mesh;
      if (!netz.isMesh) return;
      if (!netz.geometry.boundingBox) netz.geometry.computeBoundingBox();
      m.set(o.name, { geo: netz.geometry, lage: netz.matrixWorld.clone(), kasten: netz.geometry.boundingBox!.clone().applyMatrix4(netz.matrixWorld) });
    });
    return m;
  }, [gltf]);
  useEffect(() => melde(teile), [teile, melde]);
  return (
    <>
      {strukturen.map((s) => {
        const teil = teile.get(s.id), wie = sicht(s);
        if (!teil || wie === 'aus') return null;
        return <Netz key={s.id} s={s} teil={teil} wie={wie} an={gewaehlt.includes(s.id)} greifbar={!!onWaehle} onWaehle={onWaehle} />;
      })}
    </>
  );
}

function Modell({ szene, sicht, gewaehlt, fokus, blick, onWaehle, ziel, setLaedt }: Props & { ziel: Ziel; setLaedt: (n: number) => void }) {
  const [teile, setTeile] = useState(() => new Map<string, Teil>());
  const melde = useCallback((neu: Map<string, Teil>) => setTeile((alt) => new Map([...alt, ...neu])), []);
  const kamera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  // Strukturen nach Modelldatei gruppieren; geladen wird eine Datei erst, wenn etwas daraus sichtbar ist
  const gruppen = useMemo(() => {
    const m = new Map<string, Struktur[]>();
    for (const s of szene.strukturen) {
      const url = szene.schichten.find((x) => x.id === s.schicht)?.datei ?? szene.modell;
      if (url) m.set(url, [...(m.get(url) ?? []), s]);
    }
    return [...m];
  }, [szene]);
  const noetig = gruppen.filter(([, liste]) => liste.some((s) => sicht(s) !== 'aus'));
  const offen = noetig.filter(([, liste]) => !teile.has(liste[0].id)).length;
  useEffect(() => { setLaedt(offen); invalidate(); }, [offen, setLaedt, invalidate, teile]);
  useEffect(() => {
    // kleine Hilfe für automatische Tests: Bildschirmposition einer Struktur
    (window as unknown as Record<string, unknown>).__medatlasPunkt = (id: string) => {
      const t = teile.get(id); if (!t) return null;
      const p = t.kasten.getCenter(new Vector3()).project(kamera), r = gl.domElement.getBoundingClientRect();
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
    };
    if (teile.size && !offen) gl.domElement.dataset.bereit = String(teile.size); else delete gl.domElement.dataset.bereit;
  }, [teile, kamera, gl, offen]);
  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  return (
    <>
      <Kamera teile={teile} rahmen={szene.rahmen} fokus={fokus} blick={blick} ziel={ziel} />
      {noetig.map(([url, liste]) => (
        <Suspense key={url} fallback={null}>
          <Datei url={url} strukturen={liste} sicht={sicht} gewaehlt={gewaehlt} onWaehle={onWaehle} melde={melde} />
        </Suspense>
      ))}
    </>
  );
}

export default function Viewer3D(props: Props) {
  const ziel = useRef<{ pos: Vector3; mitte: Vector3 } | null>(null);
  const [laedt, setLaedt] = useState(1);
  return (
    <div className="relative h-full w-full">
      <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: 35, near: 0.01, far: 30, position: [-1.4, 0.9, 3.4] }}
        onPointerMissed={(e) => { if (props.onWaehle && e.type === 'click') props.onWaehle(null); }} style={{ touchAction: 'none' }}>
        <ambientLight intensity={0.75} />
        <hemisphereLight args={['#ffffff', '#3a4254', 0.9]} />
        <directionalLight position={[2, 3, 4]} intensity={1.5} />
        <directionalLight position={[-3, 1, -3]} intensity={0.7} />
        <Modell {...props} ziel={ziel} setLaedt={setLaedt} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={0.1} maxDistance={9} zoomSpeed={0.9} onStart={() => { ziel.current = null; }} />
      </Canvas>
      {laedt > 0 && <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rand bg-flaeche/90 px-4 py-2 text-sm font-semibold shadow-karte">3D-Modell lädt …</div>}
    </div>
  );
}
