// Baut public/models/bein-rechts.glb aus den Original-OBJ-Dateien von BodyParts3D.
// Aufruf:  node scripts/modell-bein.mjs <Ordner mit entpackten FJ*.obj-Dateien>
// Quelle:  https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html (isa_BP3D_4.0_obj_99.zip)
// Welche Strukturen ins Modell kommen, steht in content/.../untere-extremitaet/bein.szene.json.
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, simplify, quantize, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const objDir = process.argv[2];
if (!objDir) { console.error('Bitte Ordner mit den OBJ-Dateien angeben.'); process.exit(1); }
const SZENE = 'content/grundlagen/anatomie/untere-extremitaet/bein.szene.json';
const AUSGABE = 'public/models/bein-rechts.glb';
const szene = JSON.parse(fs.readFileSync(SZENE, 'utf8'));

// ---------- OBJ lesen (Koordinaten in mm; x<0 = rechts, y<0 = vorn, z = oben) ----------
function findeDatei(id) {
  const stack = [objDir];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) stack.push(path.join(d, e.name));
      else if (e.name === id + '.obj') return path.join(d, e.name);
    }
  }
  throw new Error('OBJ nicht gefunden: ' + id);
}
const cache = new Map();
function ladeObj(id) {
  if (cache.has(id)) return cache.get(id);
  const v = [], f = [];
  for (const z of fs.readFileSync(findeDatei(id), 'utf8').split('\n')) {
    if (z.startsWith('v ')) { const p = z.trim().split(/\s+/); v.push([+p[1], +p[2], +p[3]]); }
    else if (z.startsWith('f ')) {
      const p = z.trim().split(/\s+/).slice(1).map((s) => parseInt(s, 10) - 1);
      for (let i = 1; i + 1 < p.length; i++) f.push([p[0], p[i], p[i + 1]]);
    }
  }
  const m = { v, f };
  cache.set(id, m);
  return m;
}
function vereinen(netze) {
  const v = [], f = [];
  for (const n of netze) { const o = v.length; v.push(...n.v); for (const t of n.f) f.push([t[0] + o, t[1] + o, t[2] + o]); }
  return { v, f };
}

// ---------- Haut: rechtes Bein aus der Ganzkörper-Oberfläche ausschneiden ----------
function hautBein() {
  const { v, f } = ladeObj('FJ2810');
  const drin = f.filter((t) => t.every((i) => v[i][0] < -4 && v[i][2] < 968));
  // nur die zusammenhängende Fläche behalten, die den tiefsten Punkt (Fuß) enthält – so fällt die Hand weg
  const eltern = new Map();
  const finde = (a) => { while (eltern.get(a) !== a) { eltern.set(a, eltern.get(eltern.get(a))); a = eltern.get(a); } return a; };
  for (const t of drin) for (const i of t) if (!eltern.has(i)) eltern.set(i, i);
  for (const t of drin) { const a = finde(t[0]); eltern.set(finde(t[1]), a); eltern.set(finde(t[2]), a); }
  let tief = null;
  for (const i of eltern.keys()) if (tief === null || v[i][2] < v[tief][2]) tief = i;
  const wurzel = finde(tief);
  const behalten = drin.filter((t) => finde(t[0]) === wurzel);
  const neu = new Map(), nv = [];
  const nf = behalten.map((t) => t.map((i) => { if (!neu.has(i)) { neu.set(i, nv.length); nv.push(v[i]); } return neu.get(i); }));
  return { v: nv, f: nf };
}

// ---------- Nerven: schematische Verläufe (im Datensatz nicht enthalten) ----------
const idVon = (lat) => szene.strukturen.find((s) => s.lat === lat).dateien[0];
function schnitt(lat, z, breite = 10) {
  const { v } = ladeObj(idVon(lat));
  let n = 0, x = 0, y = 0;
  for (const p of v) if (Math.abs(p[2] - z) < breite) { x += p[0]; y += p[1]; n++; }
  if (!n) throw new Error(`Kein Schnitt durch ${lat} bei z=${z}`);
  return [x / n, y / n, z];
}
const plus = (p, dx, dy) => [p[0] + dx, p[1] + dy, p[2]];
const mix = (teile, z) => { const o = [0, 0, z]; for (const [p, w] of teile) { o[0] += p[0] * w; o[1] += p[1] * w; } return o; };
function nervenPfade() {
  const A = 'Arteria femoralis', V = 'Vena saphena magna';
  const femoralis = [
    mix([[schnitt('Musculus psoas major', 930), 0.5], [schnitt('Musculus iliacus', 930), 0.5]], 930),
    mix([[schnitt('Musculus psoas major', 880), 0.5], [schnitt('Musculus iliacus', 880), 0.5]], 880),
    plus(schnitt(A, 825), -13, 2), plus(schnitt(A, 790), -12, 0),
  ];
  const saphenus = [
    plus(schnitt(A, 790), -12, 0), plus(schnitt(A, 740), -8, -3),
    ...[680, 620, 560, 500].map((z) => plus(schnitt(A, z), -4, -4)),
    plus(schnitt(V, 420), 2, -3), ...[340, 260, 180, 100, 30].map((z) => plus(schnitt(V, z), 0, -4)),
  ];
  const hinten = (z) => mix([[schnitt('Musculus biceps femoris, Caput longum', z), 0.5], [schnitt('Musculus semimembranosus', z), 0.3], [schnitt('Musculus adductor magnus', z), 0.2]], z);
  const teilung = plus(schnitt('Vena poplitea', 485), -2, 9);
  const ischiadicus = [
    plus(schnitt('Musculus piriformis', 815), -6, 6), plus(schnitt('Musculus quadratus femoris', 765), 0, 14),
    ...[700, 650, 600, 550].map(hinten), teilung,
  ];
  const AT = 'Arteria tibialis posterior';
  const tibialis = [
    teilung, ...[440, 390, 340].map((z) => plus(schnitt('Vena poplitea', z), 0, 8)),
    ...[270, 200, 130, 60, 10, -20].map((z) => plus(schnitt(AT, z), 2, 5)),
  ];
  const F = 'Fibula', B = 'Musculus biceps femoris, Caput longum';
  const fibularis = [
    teilung, plus(schnitt(B, 430), 10, 8), plus(schnitt(B, 385), 6, 8),
    plus(schnitt(F, 350), 2, 13), plus(schnitt(F, 332), -11, 4), plus(schnitt(F, 316), -9, -9),
  ];
  return {
    NERV_femoralis: [femoralis, 3], NERV_saphenus: [saphenus, 1.4], NERV_ischiadicus: [ischiadicus, 4.5],
    NERV_tibialis: [tibialis, 3], NERV_fibularis: [fibularis, 2.4],
  };
}
function rohr(punkte, radius) {
  const kurve = new THREE.CatmullRomCurve3(punkte.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const g = new THREE.TubeGeometry(kurve, punkte.length * 12, radius, 10, false);
  const pos = g.getAttribute('position'), idx = g.getIndex();
  const v = [], f = [];
  for (let i = 0; i < pos.count; i++) v.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
  for (let i = 0; i < idx.count; i += 3) f.push([idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)]);
  return { v, f };
}

// ---------- GLB schreiben ----------
const nerven = nervenPfade();
const doc = new Document();
const puffer = doc.createBuffer();
const sz = doc.createScene('Bein');
const materialien = {};
// Verschiebung: Modell mittig, Fußsohle auf Höhe 0; Achsen für three.js (y = oben, z = vorn), Einheit Meter
const femur = ladeObj(idVon('Femur'));
const mitteX = femur.v.reduce((s, p) => s + p[0], 0) / femur.v.length;
const mitteY = femur.v.reduce((s, p) => s + p[1], 0) / femur.v.length;
const BODEN = -78;
const um = (p) => [(p[0] - mitteX) / 1000, (p[2] - BODEN) / 1000, -(p[1] - mitteY) / 1000];

for (const s of szene.strukturen) {
  let netz;
  if (s.id === 'HAUT') netz = hautBein();
  else if (s.id.startsWith('NERV_')) netz = rohr(...nerven[s.id]);
  else netz = vereinen(s.dateien.map(ladeObj));
  const pos = new Float32Array(netz.v.length * 3);
  netz.v.forEach((p, i) => pos.set(um(p), i * 3));
  const idx = new Uint32Array(netz.f.flat());
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  materialien[s.art] ??= doc.createMaterial(s.art).setRoughnessFactor(0.7).setMetallicFactor(0);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(puffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(geo.getAttribute('normal').array)).setBuffer(puffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(puffer))
    .setMaterial(materialien[s.art]);
  sz.addChild(doc.createNode(s.id).setMesh(doc.createMesh(s.id).addPrimitive(prim)));
}

await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
doc.createExtension(EXTMeshoptCompression).setRequired(true);
doc.createExtension(KHRMeshQuantization).setRequired(true);
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.45, error: 0.0008 }),
  prune(),
  quantize({ quantizePosition: 14, quantizeNormal: 8 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
await new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder }).write(AUSGABE, doc);
console.log(`${szene.strukturen.length} Strukturen → ${AUSGABE} (${(fs.statSync(AUSGABE).size / 1e6).toFixed(2)} MB)`);
