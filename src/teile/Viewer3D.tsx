// 3D-Ansicht einer Szene: drehen (1 Finger / linke Maustaste), zoomen (2 Finger / Mausrad), verschieben (2 Finger / rechte Maustaste).
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box3, Color, Mesh, Vector3, type BufferGeometry, type Matrix4, type PerspectiveCamera } from 'three';

const keinStrahl = () => null;
import type { OrbitControls as Steuerung } from 'three-stdlib';
import type { Struktur, Szene } from '../daten';

export type Sicht = 'an' | 'durch' | 'aus';
export interface Blick { richtung: [number, number, number]; n: number }
const FARBE: Record<string, string> = {
  knochen: '#e9e0c9', band: '#c9d3d6', muskel: '#b8473f', sehne: '#e3d6c2', arterie: '#d42a2a', vene: '#2f62d6', nerv: '#f4c62c', haut: '#e2ad8c',
};
export const MARKIERT = '#22d3ee';
const streu = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997; return h / 997 - 0.5; };

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

interface Teil { geo: BufferGeometry; lage: Matrix4; kasten: Box3 }
function Kamera({ geos, fokus, blick, ziel }: { geos: Map<string, Teil>; fokus: string[]; blick: Blick; ziel: React.MutableRefObject<{ pos: Vector3; mitte: Vector3 } | null> }) {
  const kamera = useThree((s) => s.camera) as PerspectiveCamera;
  const steuerung = useThree((s) => s.controls) as unknown as Steuerung | null;
  const invalidate = useThree((s) => s.invalidate);
  const letzterBlick = useRef(-1);
  const schluessel = fokus.join(',');
  useEffect(() => {
    if (!steuerung) return;
    const kasten = new Box3();
    for (const id of fokus.length ? fokus : geos.keys()) {
      const g = geos.get(id);
      if (g) kasten.union(g.kasten);
    }
    if (kasten.isEmpty()) return;
    const mitte = kasten.getCenter(new Vector3());
    const radius = Math.max(kasten.getSize(new Vector3()).length() / 2, 0.07);
    const eng = Math.min(1, kamera.aspect);
    const abstand = (radius / Math.sin((kamera.fov * Math.PI) / 360)) * (fokus.length ? 1.5 : 1.02) / Math.max(eng, 0.62);
    const neuerBlick = letzterBlick.current !== blick.n;
    letzterBlick.current = blick.n;
    const richtung = neuerBlick ? new Vector3(...blick.richtung) : kamera.position.clone().sub(steuerung.target);
    ziel.current = { mitte, pos: mitte.clone().add(richtung.normalize().multiplyScalar(abstand)) };
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel, blick.n, steuerung, geos]);
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

function Modell({ szene, sicht, gewaehlt, fokus, blick, onWaehle, ziel }: Props & { ziel: React.MutableRefObject<{ pos: Vector3; mitte: Vector3 } | null> }) {
  const gltf = useGLTF('./' + szene.modell, false, true);
  const [schwebt, setSchwebt] = useState<string | null>(null);
  const geos = useMemo(() => {
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
  const kamera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    // kleine Hilfe für automatische Tests: Bildschirmposition einer Struktur
    (window as unknown as Record<string, unknown>).__medatlasPunkt = (id: string) => {
      const g = geos.get(id); if (!g) return null;
      const p = g.kasten.getCenter(new Vector3()).project(kamera), r = gl.domElement.getBoundingClientRect();
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
    };
    gl.domElement.dataset.bereit = '1';
  }, [geos, kamera, gl]);
  useEffect(() => { document.body.style.cursor = schwebt && onWaehle ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [schwebt, onWaehle]);

  return (
    <>
      <Kamera geos={geos} fokus={fokus} blick={blick} ziel={ziel} />
      {szene.strukturen.map((s) => {
        const g = geos.get(s.id), wie = sicht(s);
        if (!g || wie === 'aus') return null;
        const an = gewaehlt.includes(s.id), geist = wie === 'durch' && !an;
        const farbe = new Color(an ? MARKIERT : FARBE[s.art] ?? '#999999');
        if (!an) farbe.offsetHSL(0, 0, streu(s.id) * (s.art === 'muskel' ? 0.11 : 0.04));
        const greifbar = !!onWaehle && !geist;
        return (
          <mesh key={s.id} name={s.id} geometry={g.geo} matrix={g.lage} matrixAutoUpdate={false} renderOrder={geist ? 2 : an ? 1 : 0} raycast={greifbar ? Mesh.prototype.raycast : keinStrahl}
            onClick={greifbar ? (e: ThreeEvent<MouseEvent>) => { if (e.delta > 6) return; e.stopPropagation(); onWaehle!(s.id); } : undefined}
            onPointerOver={greifbar ? (e) => { e.stopPropagation(); setSchwebt(s.id); } : undefined}
            onPointerOut={greifbar ? () => setSchwebt((v) => (v === s.id ? null : v)) : undefined}>
            <meshStandardMaterial color={farbe} roughness={s.art === 'knochen' ? 0.55 : 0.7} metalness={0}
              emissive={an ? MARKIERT : schwebt === s.id ? '#ffffff' : '#000000'} emissiveIntensity={an ? 0.35 : schwebt === s.id ? 0.16 : 0}
              transparent={geist} opacity={geist ? 0.14 : 1} depthWrite={!geist} />
          </mesh>
        );
      })}
    </>
  );
}

export default function Viewer3D(props: Props) {
  const ziel = useRef<{ pos: Vector3; mitte: Vector3 } | null>(null);
  return (
    <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: 35, near: 0.01, far: 20, position: [-1.4, 0.7, 2.6] }}
      onPointerMissed={(e) => { if (props.onWaehle && e.type === 'click') props.onWaehle(null); }} style={{ touchAction: 'none' }}>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#ffffff', '#3a4254', 0.9]} />
      <directionalLight position={[2, 3, 4]} intensity={1.5} />
      <directionalLight position={[-3, 1, -3]} intensity={0.7} />
      <Modell {...props} ziel={ziel} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={0.12} maxDistance={6} zoomSpeed={0.9} onStart={() => { ziel.current = null; }} />
    </Canvas>
  );
}
