// Baut public/models/koerper-<schicht>.glb (eine Datei je Schicht) aus den OBJ-Dateien von BodyParts3D.
// Aufruf:  node scripts/modell-koerper.mjs <Ordner mit entpackten FJ*.obj-Dateien>
// Vorher:  python3 scripts/koerper/szene_erzeugen.py <Ordner>   (erzeugt die Szene mit allen Strukturen)
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, simplify, quantize, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const objDir = process.argv[2];
if (!objDir) { console.error('Bitte Ordner mit den OBJ-Dateien angeben.'); process.exit(1); }
const szene = JSON.parse(fs.readFileSync('content/grundlagen/anatomie/ganzkoerper.szene.json', 'utf8'));
// Wie stark vereinfacht wird (Anteil der Dreiecke, der bleibt) – dünne Gefäße und Knochen vertragen weniger.
const ANTEIL = { haut: 0.3, muskeln: 0.16, arterien: 0.3, venen: 0.3, nerven: 0.2, organe: 0.18, knochen: 0.4 };
// Größte erlaubte Abweichung von der Originalform (Anteil der Modellgröße).
const FEHLER = { haut: 0.004, muskeln: 0.005, arterien: 0.0025, venen: 0.0025, nerven: 0.004, organe: 0.005, knochen: 0.0025 };

const dateien = new Map();
(function suche(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) suche(path.join(d, e.name));
    else if (e.name.endsWith('.obj') && !dateien.has(e.name)) dateien.set(e.name, path.join(d, e.name));
  }
})(objDir);
function ladeObj(id) {
  const v = [], f = [];
  for (const z of fs.readFileSync(dateien.get(id + '.obj'), 'utf8').split('\n')) {
    if (z.startsWith('v ')) { const p = z.trim().split(/\s+/); v.push(+p[1], +p[2], +p[3]); }
    else if (z.startsWith('f ')) {
      const p = z.trim().split(/\s+/).slice(1).map((s) => parseInt(s, 10) - 1);
      for (let i = 1; i + 1 < p.length; i++) f.push(p[0], p[i], p[i + 1]);
    }
  }
  return { v, f };
}
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
let gesamt = 0;
for (const schicht of szene.schichten) {
  const doc = new Document(), puffer = doc.createBuffer(), sz = doc.createScene(schicht.id);
  const material = doc.createMaterial(schicht.id).setRoughnessFactor(0.7).setMetallicFactor(0);
  const teile = szene.strukturen.filter((s) => s.schicht === schicht.id);
  for (const s of teile) {
    const { v, f } = ladeObj(s.id);
    // BodyParts3D: mm, x<0 = rechts, y<0 = vorn, z = oben  →  three.js: Meter, y = oben, z = vorn, Füße auf Höhe 0
    const pos = new Float32Array(v.length);
    for (let i = 0; i < v.length; i += 3) { pos[i] = v[i] / 1000; pos[i + 1] = (v[i + 2] + 78) / 1000; pos[i + 2] = -(v[i + 1] + 100) / 1000; }
    const idx = new Uint32Array(f);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(puffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(geo.getAttribute('normal').array)).setBuffer(puffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(puffer))
      .setMaterial(material);
    sz.addChild(doc.createNode(s.id).setMesh(doc.createMesh(s.id).addPrimitive(prim)));
  }
  doc.createExtension(EXTMeshoptCompression).setRequired(true);
  doc.createExtension(KHRMeshQuantization).setRequired(true);
  await doc.transform(
    weld(), simplify({ simplifier: MeshoptSimplifier, ratio: ANTEIL[schicht.id] ?? 0.25, error: FEHLER[schicht.id] ?? 0.002 }), prune(),
    quantize({ quantizePosition: 14, quantizeNormal: 8 }), meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  const aus = 'public/' + schicht.datei;
  await new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder }).write(aus, doc);
  const ecken = doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives()[0].getAttribute('POSITION').getCount(), 0);
  gesamt += fs.statSync(aus).size;
  console.log(`${schicht.id.padEnd(9)} ${String(teile.length).padStart(4)} Strukturen  ${String(ecken).padStart(7)} Ecken  ${(fs.statSync(aus).size / 1e6).toFixed(2)} MB`);
}
console.log(`gesamt ${(gesamt / 1e6).toFixed(1)} MB`);
