// 3D battlefield in the style of crowd-control lane games (Mob Control):
// high rear camera, gray lane, multiplier gates, blue mobs running away,
// red mobs marching toward the player, a champion with a huge number,
// and a packed horde behind the boss. Math rewards stay the unique twist.
//
// MONSTER 3D SUNGGUH: model berupa sendi (rig) yang mulus — bukan hasil
// pikselisasi PNG. Bila pemain menyediakan file .glb di public/assets/models/,
// file itu yang dipakai sebagai model asli (lihat src/lib/game/models.ts).
import * as THREE from "three";
import type { MapTheme } from "./data";
import { buildScenery, type Scenery } from "./scenery";
import { buildBossRig, buildGiantRig, loadGlb, wrapGlb, type MonsterRig } from "./models";
import { MODEL_FILES } from "./assets";

const LANE_W = 6.4;
const LANE_LEN = 20.5;
// Jalan diperpanjang jauh melewati posisi awal monster supaya SEMUA musuh & horde
// selalu berdiri di atas aspal (sebelumnya jalan berhenti di z≈-18).
// Ukuran monster (pengali dari ukuran dasar). Bos menjulang jauh lebih tinggi dari pasukan.
const MONSTER_SIZE = 2.2; // bos & penjaga
const GIANT_SIZE = 1.6; // raksasa milik pemain
const LANE_FRONT_Z = 10; // ujung dekat pemain
const LANE_END_Z = -34; // ujung jauh (belakang horde)
const Z0 = 5.6; // world z of game-y = 0 (player line)

export function worldOf(x: number, y: number) {
  return { x: (x - 0.5) * LANE_W, z: Z0 - y * LANE_LEN };
}

const CAM = { x: 0, y: 11.4, z: 15.4, lookY: 0.05, lookZ: -6.2 };

const MAX_MOBS = 480;
const MAX_ENEMIES = 280;
const MAX_CROWD = 560;
const MAX_SHADOWS = MAX_MOBS + MAX_ENEMIES;
const MAX_PARTICLES = 220;
const MAX_FLOATS = 16;

const PLAYER_TINTS = [0x38bdf8, 0x3b82f6, 0x2563eb, 0x7c3aed, 0xea580c, 0xf59e0b, 0xfacc15, 0xe879f9];

export interface FrameUnit {
  x: number;
  y: number;
  power: number;
  giant: boolean;
  seed: number;
  emoji: string;
  giantIndex: number;
  maxPower: number;
  attackT: number;
  lunge: number;
}
export interface FrameEnemy {
  x: number;
  y: number;
  power: number;
  type: number;
  seed: number;
  attackT: number;
  lunge: number;
}
export interface FrameShockwave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  color: string;
}
export interface FrameGate {
  x0: number;
  x1: number;
  y: number;
  kind: "add" | "mul";
  value: number;
  label: string;
  pulse: number;
}
export interface FrameParticle {
  x: number;
  y: number;
  life: number;
  max: number;
  color: string;
  size: number;
}
export interface FrameFloat {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  size: number;
}
export interface RenderFrame {
  time: number;
  shake: number;
  frost: number;
  flash: number;
  dmg: number;
  cannonX: number;
  phase: string;
  intro: number;
  map: MapTheme;
  weaponLevel: number;
  weaponColor: string;
  barrels: number;
  hpRatio: number;
  units: FrameUnit[];
  enemies: FrameEnemy[];
  gates: FrameGate[];
  bossIndex: number;
  bossTier: number;
  bossHp: number;
  bossMax: number;
  bossColor: string;
  enraged: boolean;
  hitFlash: number;
  bossAttackT: number;
  bossAttackKind: string;
  bossWarn: number;
  bossX: number;
  bossY: number;
  bossWalk: number;
  champScale: number;
  particles: FrameParticle[];
  floats: FrameFloat[];
  shockwaves: FrameShockwave[];
}

function stdMat(color: number, metal = 0.08, rough = 0.45, emi = 0x000000, emiI = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: metal,
    roughness: rough,
    emissive: emi,
    emissiveIntensity: emiI,
  });
}

function makeTextTexture(text: string, fill: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  if (!g) return new THREE.CanvasTexture(c);
  g.clearRect(0, 0, 512, 256);
  const fontPx = text.length > 7 ? 92 : text.length > 5 ? 118 : 148;
  g.font = `900 ${fontPx}px "Arial Black", Impact, "Noto Sans", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.fillStyle = "rgba(0,0,0,0.9)";
  g.fillText(text, 262, 142);
  g.lineWidth = 22;
  g.strokeStyle = "#141414";
  g.strokeText(text, 256, 128);
  g.fillStyle = fill;
  g.fillText(text, 256, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function noiseTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c8c8c8";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2800; i++) {
    const v = 110 + Math.random() * 90;
    g.fillStyle = `rgba(${v},${v},${v},0.4)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roadTex() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8e939a";
  g.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    g.fillRect(Math.random() * 256, Math.random() * 1024, 2, 2);
  }
  g.fillStyle = "#f4f6f8";
  g.fillRect(6, 0, 12, 1024);
  g.fillRect(238, 0, 12, 1024);
  for (let y = 20; y < 1024; y += 78) {
    g.fillRect(118, y, 20, 40);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  // one repeat along the lane so dashes stay large
  t.repeat.set(1, 1);
  return t;
}

function shadowTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, "rgba(0,0,0,0.5)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function skyDome(top: string, bottom: string) {
  const geo = new THREE.SphereGeometry(70, 20, 12);
  const pos = geo.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const c1 = new THREE.Color(top);
  const c2 = new THREE.Color(bottom);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const k = THREE.MathUtils.clamp((y + 8) / 36, 0, 1);
    tmp.copy(c2).lerp(c1, k);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
}

// ── shared character geometry (faces -Z, so enemies rotated 180° look at the camera) ──
function addPart(parts: THREE.BufferGeometry[], geo: THREE.BufferGeometry, x: number, y: number, z: number, sx = 1, sy = sx, sz = sx) {
  geo.scale(sx, sy, sz);
  geo.translate(x, y, z);
  parts.push(geo);
}

function buildMobGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  addPart(parts, new THREE.SphereGeometry(1, 14, 12), 0, 0.46, 0, 0.3, 0.34, 0.26);
  addPart(parts, new THREE.SphereGeometry(1, 14, 12), 0, 0.86, -0.02, 0.24, 0.24, 0.22);
  addPart(parts, new THREE.CapsuleGeometry(0.07, 0.18, 3, 6), -0.34, 0.5, 0);
  addPart(parts, new THREE.CapsuleGeometry(0.07, 0.18, 3, 6), 0.34, 0.5, 0);
  addPart(parts, new THREE.CapsuleGeometry(0.08, 0.12, 3, 6), -0.12, 0.12, 0);
  addPart(parts, new THREE.CapsuleGeometry(0.08, 0.12, 3, 6), 0.12, 0.12, 0);
  const merged = mergeGeos(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

function buildEyeGeometry(pupil: boolean) {
  const parts: THREE.BufferGeometry[] = [];
  if (!pupil) {
    addPart(parts, new THREE.SphereGeometry(1, 8, 6), -0.08, 0.9, -0.2, 0.07, 0.075, 0.05);
    addPart(parts, new THREE.SphereGeometry(1, 8, 6), 0.08, 0.9, -0.2, 0.07, 0.075, 0.05);
  } else {
    addPart(parts, new THREE.SphereGeometry(1, 6, 5), -0.08, 0.9, -0.245, 0.032, 0.036, 0.028);
    addPart(parts, new THREE.SphereGeometry(1, 6, 5), 0.08, 0.9, -0.245, 0.032, 0.036, 0.028);
  }
  const merged = mergeGeos(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

function mergeGeos(geos: THREE.BufferGeometry[]) {
  let verts = 0;
  let indexes = 0;
  for (const g of geos) {
    const pos = g.getAttribute("position");
    verts += pos.count;
    indexes += g.getIndex()?.count ?? pos.count;
  }
  const positions = new Float32Array(verts * 3);
  const normals = new Float32Array(verts * 3);
  const indices = new Uint32Array(indexes);
  let vOff = 0;
  let iOff = 0;
  for (const g of geos) {
    const pos = g.getAttribute("position");
    const nor = g.getAttribute("normal");
    positions.set(pos.array as Float32Array, vOff * 3);
    if (nor) normals.set(nor.array as Float32Array, vOff * 3);
    const idx = g.getIndex();
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices[iOff + i] = idx.getX(i) + vOff;
      iOff += idx.count;
    } else {
      for (let i = 0; i < pos.count; i++) indices[iOff + i] = i + vOff;
      iOff += pos.count;
    }
    vOff += pos.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
}

const GEO = {
  ball: new THREE.SphereGeometry(1, 16, 12),
  ballS: new THREE.SphereGeometry(1, 10, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cap: new THREE.CapsuleGeometry(0.5, 0.6, 4, 8),
};

function part(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = sx,
  sz = sx,
  rot?: [number, number, number],
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function addEyes(g: THREE.Group, x: number, y: number, z: number, s = 0.08, white = 0xffffff, pupil = 0x111111) {
  part(g, GEO.ballS, stdMat(white, 0, 0.3), x - s * 1.3, y, z, s, s, s * 0.7);
  part(g, GEO.ballS, stdMat(white, 0, 0.3), x + s * 1.3, y, z, s, s, s * 0.7);
  part(g, GEO.ballS, stdMat(pupil, 0, 0.4), x - s * 1.3, y, z - s * 0.7, s * 0.45);
  part(g, GEO.ballS, stdMat(pupil, 0, 0.4), x + s * 1.3, y, z - s * 0.7, s * 0.45);
}

interface BossRig {
  group: THREE.Group;
  arms: THREE.Object3D[];
  wings: THREE.Object3D[];
  heads: THREE.Object3D[];
}

function makeBoss(index: number): BossRig {
  const g = new THREE.Group();
  const arms: THREE.Object3D[] = [];
  const wings: THREE.Object3D[] = [];
  const heads: THREE.Object3D[] = [];
  const rig = { group: g, arms, wings, heads };
  const finish = () => {
    g.userData.baseScale = g.scale.x || 1;
    return rig;
  };

  if (index === 1) {
    // silver robot champion (the plated fighter from the reference)
    const metal = stdMat(0xd5dde8, 0.62, 0.28, 0x1e293b, 0.25);
    const dark = stdMat(0x334155, 0.4, 0.45);
    part(g, GEO.box, metal, 0, 0.95, 0, 0.85, 0.7, 0.5);
    part(g, GEO.box, metal, 0, 1.55, 0, 0.55, 0.42, 0.48);
    part(g, GEO.box, stdMat(0x22d3ee, 0.2, 0.25, 0x06b6d4, 0.8), 0, 1.55, -0.25, 0.36, 0.12, 0.06);
    part(g, GEO.box, metal, -0.62, 1.15, 0, 0.32, 0.22, 0.32);
    part(g, GEO.box, metal, 0.62, 1.15, 0, 0.32, 0.22, 0.32);
    const la = part(g, GEO.box, metal, -0.72, 0.7, 0, 0.22, 0.55, 0.22);
    const ra = part(g, GEO.box, metal, 0.72, 0.7, 0, 0.22, 0.55, 0.22);
    arms.push(la, ra);
    part(g, GEO.box, dark, -0.22, 0.32, 0, 0.24, 0.4, 0.24);
    part(g, GEO.box, dark, 0.22, 0.32, 0, 0.24, 0.4, 0.24);
    part(g, GEO.box, stdMat(0xfbbf24, 0.5, 0.3, 0xf59e0b, 0.4), 0, 1.02, -0.26, 0.16, 0.16, 0.04);
    return finish();
  }

  if (index === 3) {
    const body = stdMat(0x6d28d9, 0.15, 0.4, 0x3b0764, 0.3);
    part(g, GEO.ball, body, 0, 0.55, 0.15, 0.55, 0.4, 0.7);
    const head = new THREE.Group();
    part(head, GEO.ball, body, 0, 0, 0, 0.32);
    addEyes(head, 0, 0.05, -0.22, 0.07, 0xfef08a, 0x111111);
    head.position.set(0, 0.7, -0.55);
    g.add(head);
    heads.push(head);
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const k = i % 4;
      const leg = part(g, GEO.cyl, stdMat(0x4c1d95, 0.1, 0.5), side * (0.25 + k * 0.12), 0.35, 0.1 - k * 0.18, 0.045, 0.55, 0.045, [0.9, 0, side * (0.5 + k * 0.25)]);
      arms.push(leg);
    }
    return finish();
  }

  if (index === 4 || index === 8) {
    const col = index === 8 ? 0x22d3ee : 0x16a34a;
    const emi = index === 8 ? 0x0e7490 : 0x14532d;
    const skin = stdMat(col, 0.2, 0.4, emi, 0.35);
    part(g, GEO.cap, skin, 0, 0.7, 0.2, 0.7, 0.55, 1.1, [Math.PI / 2, 0, 0]);
    const necks = index === 8 ? 3 : 1;
    for (let i = 0; i < necks; i++) {
      const head = new THREE.Group();
      const ox = (i - (necks - 1) / 2) * 0.55;
      part(head, GEO.cyl, skin, 0, -0.25, 0, 0.1, 0.4, 0.1);
      part(head, GEO.ball, skin, 0, 0.15, -0.05, 0.28, 0.24, 0.36);
      part(head, GEO.cone, stdMat(0xfef08a, 0.3, 0.4), -0.12, 0.35, 0, 0.08, 0.28, 0.08);
      part(head, GEO.cone, stdMat(0xfef08a, 0.3, 0.4), 0.12, 0.35, 0, 0.08, 0.28, 0.08);
      addEyes(head, 0, 0.18, -0.28, 0.06, 0xfef9c3, 0x7f1d1d);
      head.position.set(ox, 1.35, -0.7);
      g.add(head);
      heads.push(head);
    }
    const wingL = part(g, GEO.box, stdMat(col, 0.1, 0.5, emi, 0.2), -0.9, 1.05, 0.1, 0.9, 0.08, 0.45, [0.2, 0.3, 0.5]);
    const wingR = part(g, GEO.box, stdMat(col, 0.1, 0.5, emi, 0.2), 0.9, 1.05, 0.1, 0.9, 0.08, 0.45, [0.2, -0.3, -0.5]);
    wings.push(wingL, wingR);
    part(g, GEO.cone, skin, 0, 0.55, 1.1, 0.18, 0.7, 0.18, [Math.PI / 2.2, 0, 0]);
    return finish();
  }

  // humanoid champions
  const specs: Record<number, { color: number; metal: number; emi: number; emiI: number; shoulder: number; scale: number; horn: boolean; hat?: string }> = {
    0: { color: 0x22c55e, metal: 0.05, emi: 0x14532d, emiI: 0.25, shoulder: 0.28, scale: 0.9, horn: true },
    2: { color: 0xa8a29e, metal: 0.18, emi: 0x44403c, emiI: 0.15, shoulder: 0.42, scale: 1.15, horn: false },
    5: { color: 0xf97316, metal: 0.25, emi: 0xea580c, emiI: 0.65, shoulder: 0.36, scale: 1.12, horn: true },
    6: { color: 0xf5c542, metal: 0.58, emi: 0xb45309, emiI: 0.4, shoulder: 0.48, scale: 1.28, horn: false },
    7: { color: 0x7c3aed, metal: 0.1, emi: 0x4c1d95, emiI: 0.3, shoulder: 0.26, scale: 1.02, horn: false, hat: "wizard" },
    9: { color: 0x7f1d1d, metal: 0.3, emi: 0xdc2626, emiI: 0.55, shoulder: 0.44, scale: 1.34, horn: true },
  };
  const s = specs[index] ?? specs[0];
  const skin = stdMat(s.color, s.metal, 0.38, s.emi, s.emiI);
  const dark = stdMat(0x1f2937, 0.2, 0.55);
  g.scale.setScalar(s.scale);
  part(g, GEO.cap, skin, -0.16, 0.38, 0, 0.34, 0.55, 0.34);
  part(g, GEO.cap, skin, 0.16, 0.38, 0, 0.34, 0.55, 0.34);
  part(g, GEO.ball, skin, 0, 1.05, 0, 0.42, 0.5, 0.32);
  part(g, GEO.ball, skin, -s.shoulder, 1.25, 0, s.shoulder, s.shoulder, s.shoulder);
  part(g, GEO.ball, skin, s.shoulder, 1.25, 0, s.shoulder, s.shoulder, s.shoulder);
  const la = new THREE.Group();
  part(la, GEO.cap, skin, 0, -0.28, 0, 0.28, 0.55, 0.28);
  la.position.set(-s.shoulder - 0.12, 1.15, 0);
  g.add(la);
  const ra = new THREE.Group();
  part(ra, GEO.cap, skin, 0, -0.28, 0, 0.28, 0.55, 0.28);
  ra.position.set(s.shoulder + 0.12, 1.15, 0);
  g.add(ra);
  arms.push(la, ra);
  const head = new THREE.Group();
  part(head, GEO.ball, skin, 0, 0, 0, 0.32, 0.34, 0.3);
  addEyes(head, 0, 0.04, -0.24, 0.07, 0xfff7ed, 0x111827);
  if (s.horn) {
    part(head, GEO.cone, stdMat(0xfef3c7, 0.3, 0.4), -0.16, 0.28, 0, 0.08, 0.32, 0.08, [0, 0, 0.4]);
    part(head, GEO.cone, stdMat(0xfef3c7, 0.3, 0.4), 0.16, 0.28, 0, 0.08, 0.32, 0.08, [0, 0, -0.4]);
  }
  if (index === 6) {
    // spiky gold hair
    for (let i = -2; i <= 2; i++) part(head, GEO.cone, stdMat(0xfde047, 0.4, 0.35, 0xf59e0b, 0.3), i * 0.08, 0.32, 0.02, 0.06, 0.26, 0.06, [0.2, 0, i * 0.15]);
  }
  if (index === 0) {
    part(head, GEO.ball, skin, -0.32, 0, 0, 0.1, 0.14, 0.06);
    part(head, GEO.ball, skin, 0.32, 0, 0, 0.1, 0.14, 0.06);
  }
  if (s.hat === "wizard") {
    part(head, GEO.cone, stdMat(0x4c1d95, 0.1, 0.5), 0, 0.55, 0, 0.26, 0.7, 0.26);
    part(head, GEO.cyl, stdMat(0xfbbf24, 0.4, 0.4), 0, 0.22, 0, 0.3, 0.06, 0.3);
  }
  if (index === 9) {
    const cape = part(g, GEO.box, stdMat(0x450a0a, 0.1, 0.7, 0x7f1d1d, 0.2), 0, 1.0, 0.28, 0.7, 0.9, 0.06);
    wings.push(cape);
  }
  head.position.set(0, 1.62, -0.02);
  g.add(head);
  heads.push(head);
  if (index === 7) {
    const staff = part(g, GEO.cyl, dark, 0.7, 0.9, -0.1, 0.05, 1.3, 0.05);
    part(g, GEO.ball, stdMat(0x22d3ee, 0.2, 0.3, 0x06b6d4, 0.9), 0.7, 1.6, -0.1, 0.12);
    void staff;
  }
  if (index === 2) {
    // stone cracks as darker boxes
    part(g, GEO.box, stdMat(0x78716c, 0.15, 0.7), 0, 1.1, -0.3, 0.5, 0.08, 0.06);
  }
  return finish();
}

function makeGiant(emoji: string): { group: THREE.Group; wings: THREE.Object3D[]; extras: THREE.Object3D[] } {
  const g = new THREE.Group();
  const wings: THREE.Object3D[] = [];
  const extras: THREE.Object3D[] = [];
  if (emoji === "🤖") {
    const m = stdMat(0xe2e8f0, 0.65, 0.25, 0x334155, 0.3);
    part(g, GEO.box, m, 0, 0.7, 0, 0.7, 0.55, 0.45);
    part(g, GEO.box, m, 0, 1.25, 0, 0.42, 0.36, 0.4);
    part(g, GEO.box, stdMat(0x22d3ee, 0.2, 0.2, 0x06b6d4, 0.9), 0, 1.26, -0.22, 0.28, 0.08, 0.05);
    part(g, GEO.box, m, -0.5, 0.55, 0, 0.16, 0.45, 0.16);
    part(g, GEO.box, m, 0.5, 0.55, 0, 0.16, 0.45, 0.16);
    part(g, GEO.box, stdMat(0x1e293b, 0.3, 0.5), -0.18, 0.18, 0, 0.16, 0.28, 0.16);
    part(g, GEO.box, stdMat(0x1e293b, 0.3, 0.5), 0.18, 0.18, 0, 0.16, 0.28, 0.16);
  } else if (emoji === "🐲") {
    const skin = stdMat(0x16a34a, 0.15, 0.4, 0x14532d, 0.35);
    part(g, GEO.cap, skin, 0, 0.55, 0.1, 0.55, 0.4, 0.9, [Math.PI / 2, 0, 0]);
    part(g, GEO.ball, skin, 0, 0.85, -0.7, 0.32, 0.28, 0.4);
    part(g, GEO.cone, stdMat(0xfde047, 0.3, 0.4), -0.12, 1.15, -0.65, 0.07, 0.28, 0.07);
    part(g, GEO.cone, stdMat(0xfde047, 0.3, 0.4), 0.12, 1.15, -0.65, 0.07, 0.28, 0.07);
    addEyes(g, 0, 0.9, -0.95, 0.06, 0xfef08a, 0x7f1d1d);
    const wl = part(g, GEO.box, stdMat(0x4ade80, 0.05, 0.5, 0x166534, 0.2), -0.75, 0.9, 0, 0.7, 0.06, 0.35, [0.2, 0.2, 0.6]);
    const wr = part(g, GEO.box, stdMat(0x4ade80, 0.05, 0.5, 0x166534, 0.2), 0.75, 0.9, 0, 0.7, 0.06, 0.35, [0.2, -0.2, -0.6]);
    wings.push(wl, wr);
    part(g, GEO.cone, skin, 0, 0.45, 0.95, 0.12, 0.55, 0.12, [Math.PI / 2.1, 0, 0]);
  } else if (emoji === "🦖") {
    const skin = stdMat(0x65a30d, 0.05, 0.5, 0x365314, 0.2);
    part(g, GEO.ball, skin, 0, 0.7, 0.1, 0.45, 0.55, 0.4);
    part(g, GEO.ball, skin, 0, 1.25, -0.25, 0.38, 0.32, 0.42);
    addEyes(g, 0, 1.32, -0.52, 0.06, 0xecfccb, 0x111827);
    part(g, GEO.cone, skin, 0, 0.4, 0.7, 0.12, 0.6, 0.14, [Math.PI / 2.4, 0, 0]);
    part(g, GEO.cap, skin, -0.2, 0.22, 0, 0.16, 0.3, 0.16);
    part(g, GEO.cap, skin, 0.2, 0.22, 0, 0.16, 0.3, 0.16);
  } else if (emoji === "🐙") {
    const skin = stdMat(0xa855f7, 0.1, 0.4, 0x6b21a8, 0.35);
    part(g, GEO.ball, skin, 0, 0.85, 0, 0.48, 0.42, 0.42);
    addEyes(g, 0, 0.9, -0.32, 0.1, 0xfaf5ff, 0x111827);
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1;
      const k = i % 3;
      const t = part(g, GEO.cap, skin, side * (0.18 + k * 0.14), 0.35, 0.05 - k * 0.08, 0.1, 0.45, 0.1, [0.8, 0, side * 0.5]);
      extras.push(t);
    }
  } else if (emoji === "👹") {
    const skin = stdMat(0xdc2626, 0.1, 0.42, 0x7f1d1d, 0.4);
    part(g, GEO.cap, skin, -0.16, 0.4, 0, 0.3, 0.5, 0.3);
    part(g, GEO.cap, skin, 0.16, 0.4, 0, 0.3, 0.5, 0.3);
    part(g, GEO.ball, skin, 0, 1.0, 0, 0.5, 0.48, 0.36);
    part(g, GEO.ball, skin, 0, 1.55, 0, 0.36);
    part(g, GEO.cone, stdMat(0xfef3c7, 0.3, 0.4), -0.16, 1.9, 0, 0.08, 0.36, 0.08, [0, 0, 0.3]);
    part(g, GEO.cone, stdMat(0xfef3c7, 0.3, 0.4), 0.16, 1.9, 0, 0.08, 0.36, 0.08, [0, 0, -0.3]);
    addEyes(g, 0, 1.58, -0.28, 0.07, 0xfef9c3, 0x111827);
    const club = part(g, GEO.cyl, stdMat(0x78350f, 0.1, 0.7), 0.62, 0.85, -0.1, 0.1, 0.7, 0.1);
    extras.push(club);
  } else {
    // ape
    const skin = stdMat(0x92400e, 0.05, 0.55, 0x451a03, 0.15);
    part(g, GEO.cap, skin, -0.16, 0.35, 0, 0.28, 0.45, 0.28);
    part(g, GEO.cap, skin, 0.16, 0.35, 0, 0.28, 0.45, 0.28);
    part(g, GEO.ball, skin, 0, 0.95, 0, 0.5, 0.48, 0.38);
    const la = part(g, GEO.cap, skin, -0.62, 0.7, 0, 0.2, 0.55, 0.2);
    const ra = part(g, GEO.cap, skin, 0.62, 0.7, 0, 0.2, 0.55, 0.2);
    extras.push(la, ra);
    part(g, GEO.ball, skin, 0, 1.5, 0, 0.32);
    addEyes(g, 0, 1.54, -0.24, 0.07, 0xfff7ed, 0x111827);
    part(g, GEO.ball, skin, 0, 1.38, -0.22, 0.1, 0.07, 0.08);
  }
  return { group: g, wings, extras };
}

export class Scene3D {
  readonly ok = true;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, 0.5, 0.1, 160);
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private white = new THREE.Color("#f8fafc");

  private mobGeo = buildMobGeometry();
  private eyeGeo = buildEyeGeometry(false);
  private pupilGeo = buildEyeGeometry(true);
  private bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  private eyeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  private pupilMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
  private playerMesh: THREE.InstancedMesh;
  private playerEyes: THREE.InstancedMesh;
  private playerPupils: THREE.InstancedMesh;
  private enemyMesh: THREE.InstancedMesh;
  private enemyEyes: THREE.InstancedMesh;
  private enemyPupils: THREE.InstancedMesh;
  private crowdMesh: THREE.InstancedMesh;
  private crowdEyes: THREE.InstancedMesh;
  private crowdPupils: THREE.InstancedMesh;
  private shadowMesh: THREE.InstancedMesh;

  private sandMat: THREE.MeshLambertMaterial;
  private sand!: THREE.Mesh;
  private sky: THREE.Mesh;
  private hemi!: THREE.HemisphereLight;
  private sun!: THREE.DirectionalLight;
  private scenery: Scenery | null = null;
  private lastTime = 0;
  private fog: THREE.Fog;
  private themeName = "";

  private gateGroup = new THREE.Group();
  private gateSig = "";
  private gatePulse: { mesh: THREE.Object3D; sprite: THREE.Sprite; base: number }[] = [];

  private bosses: BossRig[] = [];
  private slab: THREE.Mesh;
  private bossBar: THREE.Mesh;
  private bossBarMat: THREE.MeshStandardMaterial;
  private bossSprite: THREE.Sprite;
  private bossSpriteMat: THREE.SpriteMaterial;
  private bossText = "";
  private bossCanvas: HTMLCanvasElement;
  private bossTex: THREE.CanvasTexture;

  private cannon = new THREE.Group();
  private barrelPivot = new THREE.Group();
  private barrelSig = "";
  private flashSprite: THREE.Sprite;
  private muzzle: THREE.PointLight;
  private aim: THREE.Mesh;

  private playerWallMat = stdMat(0x22c55e, 0.05, 0.5, 0x16a34a, 0.2);
  private enemyGlow: THREE.PointLight;
  private hitLight: THREE.PointLight;

  private giantSlots: {
    emoji: string;
    giantIndex: number;
    group: THREE.Group;
    wings: THREE.Object3D[];
    extras: THREE.Object3D[];
    label: THREE.Sprite;
    rig: MonsterRig | null;
    modelIdx: number;
    holder: THREE.Group | null;
  }[] = [];
  private floatPool: THREE.Sprite[] = [];
  private texCache = new Map<string, THREE.Texture>();
  private particleMesh: THREE.InstancedMesh;
  private crowdShadow: THREE.Mesh;
  private vignette: THREE.Mesh;
  private vignetteMat: THREE.MeshBasicMaterial;
  private fenceMat = stdMat(0x7a4a1c, 0.05, 0.75);
  private propMat = stdMat(0x65a30d, 0.02, 0.7);
  // ── boss 3D (rig ber-sendi / file .glb) + telegraf serangan ──
  private bossPng: THREE.Sprite;
  private bossModel: MonsterRig | null = null;
  private bossModelIdx = -1;
  private bossHolder: THREE.Group | null = null;
  private bossRigs = new Map<number, MonsterRig>();
  private bossWarn: THREE.Sprite;
  private bossRing: THREE.Mesh;
  private bossRingMat: THREE.MeshBasicMaterial;
  // ── shockwave rings (hantaman) ──
  private shockPool: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.fog = new THREE.Fog("#f0c48a", 26, 58);
    this.scene.fog = this.fog;
    this.sky = skyDome("#f8d7a4", "#e7b56d");
    this.scene.add(this.sky);

    const hemi = new THREE.HemisphereLight(0xfff6e4, 0xc4a574, 0.95);
    this.hemi = hemi;
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1d0, 1.45);
    this.sun = sun;
    sun.position.set(9, 16, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 42;
    sun.shadow.bias = -0.0006;
    sun.target.position.set(0, 0, -4);
    this.scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xc7ddff, 0.4);
    fill.position.set(-7, 6, 8);
    this.scene.add(fill);

    this.sandMat = new THREE.MeshLambertMaterial({ map: noiseTex(), color: 0xe6c48a });
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), this.sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = -0.02;
    sand.receiveShadow = true;
    sand.visible = false; // diganti medan 3D pemandangan
    this.sand = sand;
    this.scene.add(sand);

    const roadLen = LANE_FRONT_Z - LANE_END_Z;
    const roadTexture = roadTex();
    roadTexture.repeat.set(1, roadLen / (LANE_LEN + 8)); // garis putus-putus tetap berukuran sama
    const road = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W, roadLen), new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.9, metalness: 0 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, (LANE_FRONT_Z + LANE_END_Z) / 2);
    road.receiveShadow = true;
    this.scene.add(road);

    this.playerMesh = this.makeCrowd(this.mobGeo, this.bodyMat, MAX_MOBS, true);
    this.playerEyes = this.makeCrowd(this.eyeGeo, this.eyeMat, MAX_MOBS, false);
    this.playerPupils = this.makeCrowd(this.pupilGeo, this.pupilMat, MAX_MOBS, false);
    this.enemyMesh = this.makeCrowd(this.mobGeo, this.bodyMat, MAX_ENEMIES, true);
    this.enemyEyes = this.makeCrowd(this.eyeGeo, this.eyeMat, MAX_ENEMIES, false);
    this.enemyPupils = this.makeCrowd(this.pupilGeo, this.pupilMat, MAX_ENEMIES, false);
    this.crowdMesh = this.makeCrowd(this.mobGeo, this.bodyMat, MAX_CROWD, true);
    this.crowdEyes = this.makeCrowd(this.eyeGeo, this.eyeMat, MAX_CROWD, false);
    this.crowdPupils = this.makeCrowd(this.pupilGeo, this.pupilMat, MAX_CROWD, false);
    this.scene.add(
      this.playerMesh, this.playerEyes, this.playerPupils,
      this.enemyMesh, this.enemyEyes, this.enemyPupils,
      this.crowdMesh, this.crowdEyes, this.crowdPupils,
    );

    const shGeo = new THREE.PlaneGeometry(0.55, 0.55);
    this.shadowMesh = new THREE.InstancedMesh(shGeo, new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, color: 0x000000 }), MAX_SHADOWS);
    this.shadowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shadowMesh.frustumCulled = false;
    this.shadowMesh.renderOrder = 1;
    this.scene.add(this.shadowMesh);

    this.crowdShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(LANE_W - 0.4, 9),
      new THREE.MeshBasicMaterial({ color: 0x3f0a0a, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    this.crowdShadow.rotation.x = -Math.PI / 2;
    this.crowdShadow.position.set(0, 0.015, -18.5);
    this.scene.add(this.crowdShadow);

    this.buildFences();
    this.buildBases();
    this.scene.add(this.gateGroup);

    this.bosses = Array.from({ length: 10 }, (_, i) => {
      const b = makeBoss(i);
      b.group.visible = false;
      b.group.position.set(0, 0, -15.35);
      this.scene.add(b.group);
      return b;
    });

    this.slab = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.24, 1.55), stdMat(0xf8fafc, 0.15, 0.35));
    this.slab.position.set(0, 0.14, -14.15);
    this.slab.castShadow = true;
    this.slab.receiveShadow = true;
    this.scene.add(this.slab);
    this.bossBarMat = stdMat(0x22c55e, 0.1, 0.4, 0x16a34a, 0.3);
    this.bossBar = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.2, 0.2), this.bossBarMat);
    this.bossBar.position.set(0, 0.32, -13.55);
    this.scene.add(this.bossBar);

    this.bossCanvas = document.createElement("canvas");
    this.bossCanvas.width = 512;
    this.bossCanvas.height = 256;
    this.bossTex = new THREE.CanvasTexture(this.bossCanvas);
    this.bossTex.colorSpace = THREE.SRGBColorSpace;
    this.bossSpriteMat = new THREE.SpriteMaterial({ map: this.bossTex, transparent: true, depthTest: false });
    this.bossSprite = new THREE.Sprite(this.bossSpriteMat);
    this.bossSprite.position.set(0, 0.78, -13.45);
    this.bossSprite.scale.set(3.1, 1.45, 1);
    this.bossSprite.renderOrder = 6;
    this.scene.add(this.bossSprite);

    // ── boss PNG kustom (billboard 2.5D, opsional) ──
    this.bossPng = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    this.bossPng.visible = false;
    this.bossPng.position.set(0, 1.9, -15.35);
    this.bossPng.scale.set(3.4, 3.4, 1);
    this.bossPng.renderOrder = 4;
    this.scene.add(this.bossPng);
    // ── tanda seru telegraf serangan bos ──
    this.bossWarn = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.cachedText("❗", "#fff"), transparent: true, depthTest: false }));
    this.bossWarn.visible = false;
    this.bossWarn.position.set(0, 4.4, -14.2);
    this.bossWarn.scale.set(1.1, 1.1, 1);
    this.bossWarn.renderOrder = 7;
    this.scene.add(this.bossWarn);
    // ── ring telegraf zona hantaman bos ──
    this.bossRingMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.bossRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), this.bossRingMat);
    this.bossRing.rotation.x = -Math.PI / 2;
    this.bossRing.position.set(0, 0.04, -13.2);
    this.bossRing.scale.set(2.2, 1.6, 1);
    this.scene.add(this.bossRing);
    // ── pool shockwave (hantaman) ──
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 40), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.scene.add(mesh);
      this.shockPool.push({ mesh, mat });
    }

    this.cannon.add(this.barrelPivot);
    this.buildCannonBody();
    this.scene.add(this.cannon);
    this.flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.9, depthWrite: false }));
    this.flashSprite.visible = false;
    this.scene.add(this.flashSprite);
    this.muzzle = new THREE.PointLight(0xfff1a8, 0, 7, 2);
    this.scene.add(this.muzzle);

    this.aim = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, LANE_LEN * 0.72),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, depthWrite: false }),
    );
    this.aim.rotation.x = -Math.PI / 2;
    this.aim.position.set(0, 0.03, Z0 - LANE_LEN * 0.32);
    this.scene.add(this.aim);

    this.enemyGlow = new THREE.PointLight(0xff2a2a, 4, 14, 1.5);
    this.enemyGlow.position.set(0, 2.2, -16.5);
    this.scene.add(this.enemyGlow);
    this.hitLight = new THREE.PointLight(0xffffff, 0, 6, 2);
    this.hitLight.position.set(0, 1.6, -14.6);
    this.scene.add(this.hitLight);
    const cannonGlow = new THREE.PointLight(0x38bdf8, 1.6, 6, 2);
    cannonGlow.position.set(0, 0.6, 7.2);
    this.scene.add(cannonGlow);

    this.particleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_PARTICLES);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.count = 0;
    this.scene.add(this.particleMesh);

    for (let i = 0; i < MAX_FLOATS; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
      s.visible = false;
      s.renderOrder = 8;
      this.scene.add(s);
      this.floatPool.push(s);
    }

    this.vignetteMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0, depthTest: false, side: THREE.DoubleSide });
    this.vignette = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), this.vignetteMat);
    this.vignette.position.z = -0.6;
    this.vignette.renderOrder = 20;
    this.camera.add(this.vignette);
    this.scene.add(this.camera);
    this.camera.position.set(CAM.x, CAM.y, CAM.z);
    this.camera.lookAt(CAM.x, CAM.lookY, CAM.lookZ);
  }

  private makeCrowd(geo: THREE.BufferGeometry, mat: THREE.Material, n: number, colored: boolean) {
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.count = 0;
    if (colored) {
      const c = new THREE.Color(0xffffff);
      for (let i = 0; i < n; i++) mesh.setColorAt(i, c);
    }
    return mesh;
  }

  private buildFences() {
    const step = 1.35;
    const postCount = Math.floor((8.2 - LANE_END_Z) / step) + 1;
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.72, 0.12), this.fenceMat, postCount * 2);
    const railMat = this.fenceMat;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < postCount; i++) {
      const z = 8.2 - i * step;
      for (const side of [-1, 1]) {
        dummy.position.set(side * (LANE_W / 2 + 0.15), 0.36, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        posts.setMatrixAt(i * 2 + (side < 0 ? 0 : 1), dummy.matrix);
      }
    }
    this.scene.add(posts);
    for (const side of [-1, 1]) {
      const railLen = 8.4 - LANE_END_Z;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, railLen), railMat);
      rail.position.set(side * (LANE_W / 2 + 0.15), 0.62, (8.4 + LANE_END_Z) / 2);
      rail.castShadow = true;
      this.scene.add(rail);
    }
  }

  private buildProps() {
    const rng = (i: number) => ((i * 97) % 100) / 100;
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = 7 - (i % 8) * 2.6;
      const x = side * (LANE_W / 2 + 1.3 + rng(i) * 2.4);
      const h = 0.5 + rng(i + 3) * 1.1;
      const prop = i % 3 === 0
        ? part(this.scene, GEO.ball, this.propMat, x, h * 0.35, z, 0.35 + rng(i) * 0.3)
        : part(this.scene, GEO.cone, this.propMat, x, h * 0.5, z, 0.28, h, 0.28);
      prop.castShadow = true;
    }
  }

  private buildBases() {
    // player fortress just behind the cannon
    const blue = stdMat(0x2563eb, 0.15, 0.4, 0x1d4ed8, 0.25);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(LANE_W + 0.2, 0.22, 0.28), this.playerWallMat);
    wall.position.set(0, 0.12, 8.85);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    for (const x of [-2.4, 2.4]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.15, 0.7), blue);
      tower.position.set(x, 0.58, 9.25);
      tower.castShadow = true;
      this.scene.add(tower);
      part(this.scene, GEO.cone, stdMat(0xbfdbfe, 0.1, 0.4), x, 1.3, 9.25, 0.28, 0.38, 0.28);
    }
    // enemy fortress behind the horde
    const red = stdMat(0xb91c1c, 0.12, 0.45, 0x7f1d1d, 0.3);
    const ewall = new THREE.Mesh(new THREE.BoxGeometry(LANE_W + 1.6, 1.1, 0.45), red);
    ewall.position.set(0, 0.55, LANE_END_Z + 2.4);
    ewall.castShadow = true;
    this.scene.add(ewall);
    for (const x of [-3.1, 3.1]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.9), red);
      tower.position.set(x, 1.05, LANE_END_Z + 2.3);
      tower.castShadow = true;
      this.scene.add(tower);
    }
  }

  private buildCannonBody() {
    const body = stdMat(0x2563eb, 0.25, 0.35, 0x1d4ed8, 0.25);
    const dark = stdMat(0x111827, 0.4, 0.45);
    part(this.cannon, GEO.cyl, dark, -0.28, 0.16, 0, 0.14, 0.1, 0.14, [0, 0, Math.PI / 2]);
    part(this.cannon, GEO.cyl, dark, 0.28, 0.16, 0, 0.14, 0.1, 0.14, [0, 0, Math.PI / 2]);
    part(this.cannon, GEO.box, dark, 0, 0.28, 0.05, 0.55, 0.22, 0.4);
    part(this.cannon, GEO.ball, body, 0, 0.42, 0.05, 0.28, 0.22, 0.26);
    this.barrelPivot.position.set(0, 0.48, -0.05);
  }

  private rebuildBarrels(n: number, color: string) {
    for (const child of [...this.barrelPivot.children]) {
      this.barrelPivot.remove(child);
      const mesh = child as THREE.Mesh;
      if (mesh.geometry && mesh.geometry !== GEO.cyl) mesh.geometry.dispose();
      if (mesh.material && !Array.isArray(mesh.material)) {
        const mat = mesh.material as THREE.Material;
        if (mat !== this.bodyMat) mat.dispose();
      }
    }
    const mat = stdMat(new THREE.Color(color).getHex(), 0.35, 0.32, new THREE.Color(color).getHex(), 0.35);
    const count = Math.max(1, Math.min(5, n));
    for (let i = 0; i < count; i++) {
      const off = count === 1 ? 0 : (i / (count - 1) - 0.5) * 0.16 * (count - 1);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.42, 8), mat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(off, 0, -0.18);
      barrel.castShadow = true;
      this.barrelPivot.add(barrel);
    }
  }

  resize(w: number, h: number, dpr: number) {
    const aspect = Math.max(0.35, w / Math.max(1, h));
    const cannonZ = worldOf(0.5, -0.05).z;
    const dist = Math.hypot(CAM.y - 0.3, CAM.z - cannonZ);
    const needed = (LANE_W / 2 + 0.85) / dist;
    const tanV = needed / aspect;
    const fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(Math.atan(tanV) * 2), 48, 76);
    this.camera.fov = fov;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(1.5, dpr || 1));
    this.renderer.setSize(w, h, false);
  }

  render(f: RenderFrame) {
    this.applyTheme(f.map);
    const dt = Math.min(0.1, Math.max(0, f.time - this.lastTime));
    this.lastTime = f.time;
    this.scenery?.update(dt, f.time);
    const introK = f.phase === "intro" ? THREE.MathUtils.clamp(f.intro / 2.4, 0, 1) : 0;
    const sx = f.shake > 0 ? (Math.random() - 0.5) * f.shake * 0.35 : 0;
    const sy = f.shake > 0 ? (Math.random() - 0.5) * f.shake * 0.2 : 0;
    this.camera.position.set(CAM.x + sx, CAM.y + introK * 2.4 + sy, CAM.z + introK * 3.2);
    this.camera.lookAt(sx * 0.3, CAM.lookY, CAM.lookZ + introK * 1.5);

    this.syncMobs(this.playerMesh, f.units.filter((u) => !u.giant), f, true);
    this.syncEnemies(f);
    this.syncCrowd(f);
    this.syncGiants(f);
    this.syncGates(f);
    this.syncBoss(f);
    this.syncCannon(f);
    this.syncParticles(f);
    this.syncFloats(f);
    this.syncShockwaves(f);

    this.playerWallMat.color.set(f.hpRatio > 0.5 ? 0x22c55e : f.hpRatio > 0.25 ? 0xf59e0b : 0xef4444);
    this.playerWallMat.emissive.set(f.hpRatio > 0.5 ? 0x166534 : f.hpRatio > 0.25 ? 0xb45309 : 0x991b1b);
    this.vignetteMat.opacity = Math.max(f.dmg * 0.38, f.frost > 0 ? 0.16 : 0);
    this.vignetteMat.color.set(f.dmg > 0.05 ? 0xef4444 : 0xbae6fd);

    this.renderer.render(this.scene, this.camera);
  }

  private applyTheme(map: MapTheme) {
    if (this.themeName === map.name) return;
    this.themeName = map.name;
    // ── pemandangan 3D khas stage ──
    if (this.scenery) {
      this.scene.remove(this.scenery.group);
      this.scenery.dispose();
      this.scenery = null;
    }
    let skyTop = map.sky[0];
    let skyBottom = map.sky[1];
    try {
      const sc = buildScenery(map.name);
      this.scenery = sc;
      this.scene.add(sc.group);
      const L = sc.look;
      skyTop = L.skyTop;
      skyBottom = L.skyBottom;
      this.fog.color.set(L.fog);
      this.fog.near = L.fogNear;
      this.fog.far = L.fogFar;
      this.sun.color.set(L.sun);
      this.sun.intensity = L.sunIntensity;
      this.hemi.color.set(L.hemiSky);
      this.hemi.groundColor.set(L.hemiGround);
      this.hemi.intensity = L.hemiIntensity;
      this.renderer.toneMappingExposure = L.exposure;
      this.sand.visible = false;
    } catch (err) {
      console.warn("Pemandangan gagal dibuat", err);
      this.sand.visible = true;
      this.sandMat.color.set(map.side);
      this.fog.color.set(map.sky[1]);
    }
    this.scene.remove(this.sky);
    (this.sky.material as THREE.Material).dispose();
    this.sky.geometry.dispose();
    this.sky = skyDome(skyTop, skyBottom);
    this.sky.renderOrder = -10;
    (this.sky.material as THREE.Material).depthTest = false;
    this.scene.add(this.sky);
    this.fenceMat.color.set(map.fence);
    this.propMat.color.set(map.accent);
    this.renderer.setClearColor(skyBottom);
  }

  private placeMob(
    mesh: THREE.InstancedMesh,
    eyes: THREE.InstancedMesh,
    pupils: THREE.InstancedMesh,
    i: number,
    x: number,
    y: number,
    seed: number,
    scale: number,
    yaw: number,
    time: number,
    tint: number,
    attackT = 0,
    lunge = 0,
  ) {
    const p = worldOf(x, y);
    // ── GERAK SERANG: lunge ke depan + lompat pukul + condong badan ──
    const atk = Math.max(0, Math.min(1, attackT / 0.32));
    const punch = Math.sin(atk * Math.PI); // 0→1→0
    const bob = Math.abs(Math.sin(time * 13 + seed * 9)) * 0.045;
    const jump = punch * 0.16;
    const forward = yaw === 0 ? -1 : 1; // player maju ke -Z, musuh ke +Z
    const lungeZ = lunge * punch * 0.35 * forward;
    this.dummy.position.set(p.x, bob + jump, p.z + lungeZ);
    const lean = (yaw === 0 ? 0.18 : -0.18) + punch * 0.55 * (yaw === 0 ? 1 : -1);
    this.dummy.rotation.set(lean, yaw + Math.sin(time * 13 + seed * 9) * 0.06, Math.sin(time * 13 + seed * 9) * 0.1 + punch * lunge * 0.2);
    // squash & stretch saat menghantam: membesar lalu memadat
    const squash = 1 + punch * 0.28;
    this.dummy.scale.set(scale * (2 - squash) * 0.5 + scale * 0.5, scale * squash, scale);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(i, this.dummy.matrix);
    eyes.setMatrixAt(i, this.dummy.matrix);
    pupils.setMatrixAt(i, this.dummy.matrix);
    this.color.setHex(tint);
    this.color.offsetHSL(0, 0, (seed - 0.5) * 0.08);
    // kilau putih saat menghantam
    if (atk > 0.3) this.color.lerp(this.white, punch * 0.35);
    mesh.setColorAt(i, this.color);
    return p;
  }

  private finishCrowd(mesh: THREE.InstancedMesh, eyes: THREE.InstancedMesh, pupils: THREE.InstancedMesh, n: number) {
    mesh.count = n;
    eyes.count = n;
    pupils.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    eyes.instanceMatrix.needsUpdate = true;
    pupils.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private syncMobs(mesh: THREE.InstancedMesh, units: FrameUnit[], f: RenderFrame, player: boolean) {
    const n = Math.min(units.length, mesh.instanceMatrix.count ? MAX_MOBS : MAX_MOBS);
    const tintBase = player
      ? f.frost > 0
        ? 0xbae6fd
        : PLAYER_TINTS[Math.min(PLAYER_TINTS.length - 1, Math.floor((f.weaponLevel - 1) / 2))]
      : 0xff3b3b;
    let shadowI = 0;
    for (let i = 0; i < n; i++) {
      const u = units[i];
      const pop = u.y < 0.05 ? 1.25 : 1;
      const s = 0.58 * pop * (u.power > 30 ? 1.2 : u.power > 8 ? 1.08 : 1);
      const p = this.placeMob(mesh, player ? this.playerEyes : this.enemyEyes, player ? this.playerPupils : this.enemyPupils, i, u.x, u.y, u.seed, s, player ? 0 : Math.PI, f.time, tintBase, u.attackT ?? 0, u.lunge ?? 0);
      if (player && shadowI < MAX_SHADOWS) {
        this.dummy.position.set(p.x, 0.025, p.z);
        this.dummy.rotation.set(-Math.PI / 2, 0, 0);
        this.dummy.scale.set(s * 1.3, s * 1.3, 1);
        this.dummy.updateMatrix();
        this.shadowMesh.setMatrixAt(shadowI++, this.dummy.matrix);
      }
    }
    this.finishCrowd(mesh, player ? this.playerEyes : this.enemyEyes, player ? this.playerPupils : this.enemyPupils, n);
    return shadowI;
  }

  private syncEnemies(f: RenderFrame) {
    const list = f.enemies;
    const n = Math.min(list.length, MAX_ENEMIES);
    const tints = [0xef4444, 0xfb923c, 0xb91c1c, 0x7c3aed];
    const scales = [0.58, 0.48, 0.95, 1.3];
    let shadowBase = Math.min(f.units.filter((u) => !u.giant).length, MAX_MOBS);
    // recompute player shadows already written; continue from player count
    const playerN = Math.min(f.units.filter((u) => !u.giant).length, MAX_MOBS);
    shadowBase = playerN;
    for (let i = 0; i < n; i++) {
      const e = list[i];
      const tint = f.enraged ? 0xff5a2a : tints[e.type] ?? 0xef4444;
      const p = this.placeMob(this.enemyMesh, this.enemyEyes, this.enemyPupils, i, e.x, e.y, e.seed, scales[e.type] ?? 0.56, Math.PI, f.time, tint, e.attackT ?? 0, e.lunge ?? 0);
      if (shadowBase + i < MAX_SHADOWS) {
        const s = scales[e.type] ?? 0.56;
        this.dummy.position.set(p.x, 0.025, p.z);
        this.dummy.rotation.set(-Math.PI / 2, 0, 0);
        this.dummy.scale.set(s * 1.35, s * 1.35, 1);
        this.dummy.updateMatrix();
        this.shadowMesh.setMatrixAt(shadowBase + i, this.dummy.matrix);
      }
    }
    this.finishCrowd(this.enemyMesh, this.enemyEyes, this.enemyPupils, n);
    this.shadowMesh.count = Math.min(MAX_SHADOWS, playerN + n);
    this.shadowMesh.instanceMatrix.needsUpdate = true;
  }

  private syncCrowd(f: RenderFrame) {
    const ratio = f.bossMax > 0 ? Math.max(0, f.bossHp) / f.bossMax : 0;
    const count = f.bossHp <= 0 ? 0 : Math.floor(70 + (MAX_CROWD - 70) * ratio);
    // ── HORDE MENGIKUTI BOS yang berjalan (bukan diam di ujung) ──
    const bossBp = worldOf(f.bossX ?? 0.5, THREE.MathUtils.clamp(f.bossY ?? 1, 0.05, 1.1));
    // Horde TIDAK boleh keluar dari aspal: lebar = lebar jalan dikurangi margin pagar.
    const cols = 18;
    const spanX = LANE_W - 1.1;
    const depth = 6.5;
    const rows = Math.max(1, Math.ceil(count / cols));
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const jitter = ((i * 13) % 10) / 10 - 0.5;
      const x = THREE.MathUtils.clamp(-spanX / 2 + (c + 0.5) * (spanX / cols) + jitter * 0.18, -spanX / 2, spanX / 2);
      const z = Math.max(LANE_END_Z + 0.6, bossBp.z - (1.2 + 2.2 * (f.champScale ?? 1)) - r * (depth / rows) - Math.abs(jitter) * 0.15);
      const bob = Math.abs(Math.sin(f.time * (f.enraged ? 16 : 9) + i * 0.7)) * 0.04;
      this.dummy.position.set(x, bob, z);
      this.dummy.rotation.set(0.12, Math.PI + jitter * 0.4, Math.sin(f.time * 8 + i) * 0.08);
      const s = 0.4 + (i % 5) * 0.025;
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.crowdMesh.setMatrixAt(i, this.dummy.matrix);
      this.crowdEyes.setMatrixAt(i, this.dummy.matrix);
      this.crowdPupils.setMatrixAt(i, this.dummy.matrix);
      this.color.setHex(f.enraged ? 0xff5a2a : 0xe11d48);
      this.color.offsetHSL(0, 0, ((i % 7) - 3) * 0.012);
      this.crowdMesh.setColorAt(i, this.color);
    }
    this.finishCrowd(this.crowdMesh, this.crowdEyes, this.crowdPupils, count);
    this.crowdShadow.position.set(0, 0.015, bossBp.z - (2.4 + 2.2 * (f.champScale ?? 1)) - 1);
    (this.crowdShadow.material as THREE.MeshBasicMaterial).opacity = 0.08 + ratio * 0.2;
    this.enemyGlow.intensity = 2 + ratio * 5 + (f.enraged ? 3 : 0);
  }

  /**
   * Ambil monster 3D: bila ada file .glb di public/assets/models gunakan itu (model asli),
   * bila tidak pakai rig prosedural ber-sendi (mulus, bukan hasil pikselisasi PNG).
   */
  private requestModel(glbUrl: string | null, fallback: () => MonsterRig, cb: (rig: MonsterRig) => void) {
    if (!glbUrl) {
      cb(fallback());
      return;
    }
    void loadGlb(glbUrl).then((data) => cb(data ? wrapGlb(data, 1, 1) : fallback()));
  }

  /** Ambil rig bos dari cache (untuk dipakai bergantian) atau buat baru. */
  private makeBossRig(idx: number, size: number): MonsterRig {
    const cached = this.bossRigs.get(idx);
    if (cached) {
      this.bossRigs.delete(idx);
      return cached;
    }
    return buildBossRig(idx, size);
  }

  private syncGiants(f: RenderFrame) {
    const giants = f.units.filter((u) => u.giant);
    while (this.giantSlots.length < giants.length) {
      const gu = giants[this.giantSlots.length];
      const made = makeGiant(gu.emoji);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
      label.renderOrder = 7;
      this.scene.add(made.group, label);
      this.giantSlots.push({
        emoji: gu.emoji, giantIndex: gu.giantIndex ?? 0,
        group: made.group, wings: made.wings, extras: made.extras, label,
        rig: null, modelIdx: -1, holder: null,
      });
      const slot = this.giantSlots[this.giantSlots.length - 1];
      slot.modelIdx = slot.giantIndex;
      // monster pemain berdiri dalam wadah yang MENGHADAP -Z → jalannya selalu ke depan
      const holder = new THREE.Group();
      holder.rotation.y = 0;
      holder.visible = false;
      this.scene.add(holder);
      slot.holder = holder;
      slot.rig = buildGiantRig(slot.giantIndex, GIANT_SIZE);
      holder.add(slot.rig.group);
      const glb = MODEL_FILES.giant(slot.giantIndex);
      if (glb) {
        this.requestModel(glb, () => buildGiantRig(slot.giantIndex, GIANT_SIZE), (rig) => {
          if (slot.modelIdx !== slot.giantIndex || !slot.holder) return;
          holder.remove(slot.rig!.group);
          slot.rig!.dispose();
          slot.rig = rig;
          holder.add(slot.rig.group);
        });
      }
    }
    for (let i = 0; i < this.giantSlots.length; i++) {
      const slot = this.giantSlots[i];
      const u = giants[i];
      const hasRig = !!slot.rig;
      slot.group.visible = !!u && !hasRig;
      slot.label.visible = !!u;
      if (slot.holder) slot.holder.visible = !!u && hasRig;
      if (!u) continue;
      if (slot.emoji !== u.emoji || slot.giantIndex !== (u.giantIndex ?? 0)) {
        // ganti model prosedural bila jenis monster berganti
        this.scene.remove(slot.group);
        const made = makeGiant(u.emoji);
        this.scene.add(made.group);
        slot.group = made.group;
        slot.wings = made.wings;
        slot.extras = made.extras;
        slot.emoji = u.emoji;
        const newIdx = u.giantIndex ?? 0;
        if (newIdx !== slot.giantIndex) {
          slot.giantIndex = newIdx;
          if (slot.rig) {
            slot.holder!.remove(slot.rig.group);
            slot.rig.dispose();
            slot.rig = null;
          }
          slot.modelIdx = newIdx;
          slot.rig = buildGiantRig(newIdx, GIANT_SIZE);
          slot.holder!.add(slot.rig.group);
          const glb2 = MODEL_FILES.giant(newIdx);
          if (glb2) {
            this.requestModel(glb2, () => buildGiantRig(newIdx, GIANT_SIZE), (rig2) => {
              if (slot.modelIdx !== newIdx || !slot.holder) return;
              slot.holder.remove(slot.rig!.group);
              slot.rig!.dispose();
              slot.rig = rig2;
              slot.holder.add(slot.rig.group);
            });
          }
        }
      }
      const p = worldOf(u.x, u.y);
      // ── ANIMASI BERJALAN + HANTAMAN ──
      const atk = Math.max(0, Math.min(1, (u.attackT ?? 0) / 0.65));
      const windup = atk > 0.5 ? (atk - 0.5) * 2 : 0;
      const slam = atk > 0 && atk <= 0.5 ? 1 - atk * 2 : 0;
      const punch = Math.sin(atk * Math.PI);
      const step = Math.sin(f.time * 9 + u.seed * 7);
      const bob = Math.abs(Math.sin(f.time * 6 + u.seed * 5)) * 0.08;
      const crouch = windup * 0.22;
      const lungeZ = slam * -0.7 + (u.lunge ?? 0) * punch * -0.25;
      const walkSway = step * 0.07;
      const walkBob = Math.abs(step) * 0.09;
      if (slot.rig) {
        // ── MONSTER 3D BER-SENDI: wadah hanya diposisikan, sendi dianimasikan rig ──
        slot.holder!.position.set(p.x, Math.max(0, walkBob * 0.5 - crouch * 0.4), p.z + lungeZ);
        slot.holder!.rotation.set(0, 0, walkSway * 0.12);
        slot.rig.animate({
          time: f.time,
          walk: f.time * 8.5 + u.seed * 7,
          stride: atk > 0 ? 0.35 : 1,
          windup,
          slam,
          hit: f.hitFlash > 0 ? 1 : 0,
          enraged: f.enraged,
        });
      } else {
        slot.group.position.set(p.x, Math.max(0, bob + walkBob * 0.5 - crouch + slam * 0.1), p.z + lungeZ);
        slot.group.rotation.y = Math.sin(f.time * 2 + u.seed) * 0.08 + walkSway * 0.3;
        slot.group.rotation.x = windup * -0.18 + slam * 0.32;
        slot.group.rotation.z = walkSway * 0.4;
        const baseS = 1.65 * GIANT_SIZE;
        slot.group.scale.set(baseS * (1 + slam * 0.18), baseS * (1 - windup * 0.12 - slam * 0.22), baseS * (1 + slam * 0.18));
        for (const w of slot.wings) w.rotation.z = Math.sin(f.time * 7 + u.seed) * 0.45 * Math.sign(w.position.x || 1) + windup * 0.9;
        for (const ex of slot.extras) ex.rotation.x = Math.sin(f.time * 5 + ex.position.x) * 0.3 - windup * 1.4 + slam * 1.8;
      }
      const text = `${Math.max(1, Math.round(u.power))}`;
      const mat = slot.label.material as THREE.SpriteMaterial;
      mat.map = this.cachedText(text, "#fff");
      mat.opacity = 1;
      const giantTop = (hasRig && slot.rig ? slot.rig.height : 2.5 * GIANT_SIZE) + 0.8;
      slot.label.position.set(p.x, giantTop - crouch, p.z);
      slot.label.scale.set((1.5 + punch * 0.3) * 1.3, (0.75 + punch * 0.15) * 1.3, 1);
    }
  }

  private syncGates(f: RenderFrame) {
    const sig = f.gates.map((g) => `${g.y.toFixed(2)}|${g.x0.toFixed(2)}|${g.x1.toFixed(2)}|${g.label}|${g.kind}|${g.value}`).join(";");
    if (sig !== this.gateSig) {
      this.gateSig = sig;
      this.rebuildGates(f.gates);
    }
    for (let i = 0; i < this.gatePulse.length; i++) {
      const g = f.gates[i];
      if (!g) continue;
      const pulse = 1 + g.pulse * 0.18;
      this.gatePulse[i].mesh.scale.y = pulse;
      this.gatePulse[i].sprite.position.y = 1.85 + g.pulse * 0.2;
    }
  }

  private rebuildGates(gates: FrameGate[]) {
    for (const child of [...this.gateGroup.children]) {
      this.gateGroup.remove(child);
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (mat && !Array.isArray(mat) && mat !== this.bodyMat) mat.dispose();
    }
    this.gatePulse = [];
    for (const g of gates) {
      const w = Math.max(0.8, (g.x1 - g.x0) * LANE_W * 0.94);
      const gold = g.kind === "mul" && g.value >= 4;
      const color = g.kind === "add" ? 0x3b82f6 : gold ? 0xf5b301 : 0xa855f7;
      const mat = stdMat(color, 0.18, 0.32, color, 0.22);
      const p = worldOf((g.x0 + g.x1) / 2, g.y);
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, 0.38), mat);
      block.position.set(p.x, 0.62, p.z);
      block.castShadow = true;
      block.receiveShadow = true;
      this.gateGroup.add(block);
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(w, 1.5),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false }),
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(p.x, 0.025, p.z);
      this.gateGroup.add(strip);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.cachedText(g.label, "#ffffff"), transparent: true, depthTest: false }));
      const sw = Math.max(1.5, g.label.length * 0.46);
      sprite.scale.set(sw, sw * 0.5, 1);
      sprite.position.set(p.x, 1.85, p.z + 0.15);
      sprite.renderOrder = 5;
      this.gateGroup.add(sprite);
      this.gatePulse.push({ mesh: block, sprite, base: 1.85 });
    }
  }

  private syncBoss(f: RenderFrame) {
    const idx = THREE.MathUtils.clamp(f.bossIndex, 0, this.bosses.length - 1);
    const alive = f.bossHp > 0 || f.phase === "clear";
    // ── POSISI BERJALAN: bos tidak lagi di panggung, melainkan di jalur ──
    const bp = worldOf(f.bossX ?? 0.5, THREE.MathUtils.clamp(f.bossY ?? 1, 0.05, 1.1));
    // ── monster 3D (rig ber-sendi, atau file .glb bila pemain menyediakannya) ──
    if (idx !== this.bossModelIdx) {
      this.bossModelIdx = idx;
      if (this.bossModel) {
        this.scene.remove(this.bossModel.group);
        this.bossModel.dispose();
        this.bossModel = null;
      }
      if (this.bossHolder) {
        this.scene.remove(this.bossHolder);
        this.bossHolder = null;
      }
      // bos menghadap +Z (ke arah pemain/kamera)
      const holder = new THREE.Group();
      holder.rotation.y = Math.PI;
      this.scene.add(holder);
      this.bossHolder = holder;
      this.bossModel = this.makeBossRig(idx, MONSTER_SIZE);
      holder.add(this.bossModel.group);
      const glb = MODEL_FILES.boss(idx);
      if (glb) {
        this.requestModel(glb, () => this.makeBossRig(idx, MONSTER_SIZE), (rig) => {
          if (this.bossModelIdx !== idx || !this.bossHolder) return;
          this.bossHolder.remove(this.bossModel!.group);
          this.bossModel!.dispose();
          this.bossModel = rig;
          this.bossHolder.add(this.bossModel.group);
        });
      }
    }
    const useRig = !!this.bossModel;
    for (let i = 0; i < this.bosses.length; i++) this.bosses[i].group.visible = i === idx && alive && !useRig;
    if (this.bossHolder) this.bossHolder.visible = alive;
    this.bossPng.visible = false;
    const rig = this.bosses[idx];
    const tierScale = 1 + (f.bossTier - 1) * 0.1;
    const champScale = f.champScale ?? 1;
    // ── ANIMASI JALAN + SERANG BOS ──
    const atk = Math.max(0, Math.min(1, (f.bossAttackT ?? 0) / 0.8));
    const kind = f.bossAttackKind ?? "slam";
    const warning = (f.bossWarn ?? 0) > 0;
    const windup = atk > 0.45 && !warning ? (atk - 0.45) / 0.55 : warning ? 1 : 0;
    const slam = atk > 0 && atk <= 0.45 ? 1 - atk / 0.45 : 0;
    const roarShake = kind === "roar" && atk > 0 ? Math.sin(f.time * 40) * 0.05 : 0;
    const walk = f.bossWalk ?? 0;
    const stepL = Math.sin(walk);
    const stepR = Math.sin(walk + Math.PI);
    const walkBob = Math.abs(Math.sin(walk)) * 0.12;
    const idleBob = Math.sin(f.time * (f.enraged ? 8 : 3)) * (f.enraged ? 0.06 : 0.03);
    const crouch = windup * 0.3;
    const lungeZ = slam * 0.9; // menghantam ke arah pemain (+Z)
    const baseScale = Number(rig.group.userData.baseScale ?? 1);
    // tinggi badan monster → tanda seru, bar HP, dan angka HP melayang tepat di atas kepala
    const bodyH =
      useRig && this.bossModel
        ? this.bossModel.height * tierScale * champScale
        : 2.4 * baseScale * 1.45 * MONSTER_SIZE * tierScale * champScale;
    const headY = bodyH + 0.9;
    const labelK = 0.9 + 0.5 * champScale; // label bos lebih besar daripada label penjaga
    if (this.bossModel && this.bossHolder) {
      // wadah (sudah menghadap pemain) hanya diposisikan; sendi dianimasikan rig → mulus
      this.bossHolder.position.set(bp.x + roarShake, Math.max(0, walkBob * 0.55 + idleBob - crouch * 0.35), bp.z + lungeZ * 0.5);
      this.bossHolder.rotation.set(0, Math.PI, stepL * 0.04);
      this.bossModel.animate({
        time: f.time,
        walk,
        stride: atk > 0 ? 0.25 : 1,
        windup,
        slam,
        hit: f.hitFlash > 0 ? 1 : 0,
        enraged: f.enraged,
      });
    } else {
      rig.group.position.set(
        bp.x + roarShake,
        walkBob + idleBob - crouch + slam * 0.12 + (f.bossHp <= 0 ? -0.4 : 0),
        bp.z + lungeZ * 0.5,
      );
      // model prosedural menghadap -Z (punggung ke kamera) → putar ke pemain
      rig.group.rotation.y = Math.PI + Math.sin(f.time * 1.2) * 0.05;
      const sXZ = baseScale * 1.45 * MONSTER_SIZE * tierScale * champScale * (1 + f.hitFlash * 0.05 + slam * 0.15 + (warning ? Math.sin(f.time * 20) * 0.02 : 0));
      const sY = baseScale * 1.45 * MONSTER_SIZE * tierScale * champScale * (1 - windup * 0.14 - slam * 0.2);
      rig.group.scale.set(sXZ, sY, sXZ);
      if (f.bossHp <= 0) rig.group.rotation.x = THREE.MathUtils.lerp(rig.group.rotation.x, 1.25, 0.08);
      else rig.group.rotation.x = THREE.MathUtils.lerp(rig.group.rotation.x, windup * -0.22 + slam * 0.4 + stepL * 0.04, 0.25);
      rig.group.rotation.z = stepL * 0.05;
      const swing = Math.sin(f.time * (f.enraged ? 8 : 3.2));
      rig.arms.forEach((a, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        // ayunan jalan + angkat saat windup + hantam saat slam
        const walkSwing = (i % 2 === 0 ? stepL : stepR) * 0.55;
        a.rotation.x = swing * 0.2 * dir + walkSwing - windup * 1.6 + slam * 2.1;
        a.rotation.z = dir * (windup * 0.4 + 0.08);
      });
      rig.wings.forEach((w) => {
        w.rotation.z = Math.sin(f.time * 5) * 0.35 * Math.sign(w.position.x || 1) + windup * 0.8 + slam * -0.4;
      });
      rig.heads.forEach((h, i) => {
        h.rotation.y = Math.sin(f.time * 2 + i) * 0.15 + roarShake * 2;
        h.rotation.x = windup * -0.35 + slam * 0.3;
        h.position.y = (h.userData.baseY ?? h.position.y);
      });
    }
    // ── telegraf mengikuti bos yang berjalan ──
    this.bossWarn.visible = warning && f.bossHp > 0;
    if (warning) {
      const pulse = 1 + Math.sin(f.time * 18) * 0.15;
      this.bossWarn.scale.set(1.1 * labelK * pulse, 1.1 * labelK * pulse, 1);
      this.bossWarn.position.set(bp.x, headY + 1.3 + Math.sin(f.time * 10) * 0.12, bp.z + 0.6);
    }
    this.bossRing.position.set(bp.x, 0.05, bp.z + 0.4);
    this.bossRingMat.opacity = warning ? 0.35 + Math.sin(f.time * 18) * 0.2 : slam > 0 ? slam * 0.5 : 0;
    if (warning || slam > 0) {
      const rs = (2.2 + (warning ? Math.sin(f.time * 18) * 0.1 : slam * 0.8)) * (0.9 + 0.9 * champScale);
      this.bossRing.scale.set(rs, rs * 0.72, 1);
    }
    this.hitLight.position.set(bp.x, 1.8, bp.z + 0.8);
    this.hitLight.intensity = f.hitFlash * 6;
    this.enemyGlow.position.set(bp.x, 2.2, bp.z - 1.2);
    // ── TANPA PANGGUNG: bar HP + angka melayang di atas kepala bos ──
    this.slab.visible = false;
    const ratio = f.bossMax > 0 ? Math.max(0, f.bossHp) / f.bossMax : 0;
    const barW = 3.1 * labelK;
    this.bossBar.scale.set(Math.max(0.04, ratio) * labelK, labelK, labelK);
    this.bossBar.position.set(bp.x + (ratio - 1) * (barW / 2), headY, bp.z + 0.4);
    this.bossBar.rotation.set(0, 0, 0);
    this.bossBarMat.color.set(ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xf59e0b : 0xef4444);
    const text = `${Math.max(0, Math.round(f.bossHp))}`;
    if (text !== this.bossText) {
      this.bossText = text;
      const g = this.bossCanvas.getContext("2d");
      if (g) {
        g.clearRect(0, 0, 512, 256);
        const fontPx = text.length > 6 ? 96 : text.length > 4 ? 124 : 156;
        g.font = `900 ${fontPx}px "Arial Black", Impact, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.lineJoin = "round";
        g.fillStyle = "rgba(0,0,0,0.9)";
        g.fillText(text, 264, 146);
        g.lineWidth = 24;
        g.strokeStyle = "#111";
        g.strokeText(text, 256, 128);
        g.fillStyle = "#ffffff";
        g.fillText(text, 256, 128);
        this.bossTex.needsUpdate = true;
      }
    }
    const punch = 1 + f.hitFlash * 0.08;
    const bw = Math.min(3.2, Math.max(2, text.length * 0.46)) * punch * labelK;
    this.bossSprite.scale.set(bw, bw * 0.46, 1);
    this.bossSprite.position.set(bp.x, headY - 0.7 * labelK, bp.z + 0.4);
    this.bossSprite.visible = f.bossHp > 0;
    this.bossBar.visible = f.bossHp > 0;
  }

  private syncCannon(f: RenderFrame) {
    const p = worldOf(f.cannonX, -0.06);
    this.cannon.position.set(p.x, 0, p.z);
    const sig = `${f.barrels}|${f.weaponColor}`;
    if (sig !== this.barrelSig) {
      this.barrelSig = sig;
      this.rebuildBarrels(f.barrels, f.weaponColor);
    }
    this.barrelPivot.rotation.x = -0.12 + Math.sin(f.time * 20) * f.flash * 0.04;
    this.flashSprite.visible = f.flash > 0.08;
    this.flashSprite.position.set(p.x, 0.62, p.z - 0.55);
    this.flashSprite.scale.setScalar(0.35 + f.flash * 0.9);
    (this.flashSprite.material as THREE.SpriteMaterial).opacity = f.flash;
    this.muzzle.position.set(p.x, 0.6, p.z - 0.5);
    this.muzzle.intensity = f.flash * 7;
    this.aim.position.x = p.x;
    (this.aim.material as THREE.MeshBasicMaterial).color.set(f.weaponColor || "#ffffff");
  }

  private syncParticles(f: RenderFrame) {
    const n = Math.min(f.particles.length, MAX_PARTICLES);
    for (let i = 0; i < n; i++) {
      const p = f.particles[i];
      const w = worldOf(p.x, p.y);
      this.dummy.position.set(w.x, 0.3 + (1 - p.life / p.max) * 0.8, w.z);
      this.dummy.rotation.set(0, 0, 0);
      const s = (p.size / 4) * Math.max(0.2, p.life / p.max);
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);
      this.color.set(p.color);
      this.particleMesh.setColorAt(i, this.color);
    }
    this.particleMesh.count = n;
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
  }

  private syncFloats(f: RenderFrame) {
    const n = Math.min(f.floats.length, MAX_FLOATS);
    for (let i = 0; i < this.floatPool.length; i++) {
      const s = this.floatPool[i];
      const fl = f.floats[i];
      if (!fl || i >= n) {
        s.visible = false;
        continue;
      }
      s.visible = true;
      const w = worldOf(fl.x, fl.y);
      s.position.set(w.x, 1.3 + (1.1 - fl.life) * 0.8, w.z);
      const mat = s.material as THREE.SpriteMaterial;
      mat.map = this.cachedText(fl.text, fl.color);
      mat.opacity = Math.max(0, Math.min(1, fl.life));
      const sc = Math.max(0.8, fl.size / 16);
      s.scale.set(sc * Math.max(1.1, fl.text.length * 0.22), sc * 0.55, 1);
    }
  }

  private syncShockwaves(f: RenderFrame) {
    const list = f.shockwaves ?? [];
    for (let i = 0; i < this.shockPool.length; i++) {
      const slot = this.shockPool[i];
      const s = list[i];
      if (!s) {
        slot.mesh.visible = false;
        continue;
      }
      slot.mesh.visible = true;
      const w = worldOf(s.x, s.y);
      slot.mesh.position.set(w.x, 0.06, w.z);
      // konversi radius game (0..1) ke dunia: lebar lane 6.4
      const wr = Math.max(0.2, s.r * 6.4 * 2.2);
      slot.mesh.scale.set(wr, wr * 0.8, 1);
      slot.mat.color.set(s.color);
      slot.mat.opacity = Math.max(0, (s.life / s.maxLife) * 0.85);
    }
  }

  private cachedText(text: string, fill: string) {
    const key = fill + "|" + text;
    let tex = this.texCache.get(key);
    if (!tex) {
      tex = makeTextTexture(text, fill);
      this.texCache.set(key, tex);
      if (this.texCache.size > 48) {
        const first = this.texCache.keys().next().value;
        if (first) {
          this.texCache.get(first)?.dispose();
          this.texCache.delete(first);
        }
      }
    }
    return tex;
  }

  dispose() {
    if (this.scenery) {
      this.scene.remove(this.scenery.group);
      this.scenery.dispose();
      this.scenery = null;
    }
    if (this.bossModel) {
      this.scene.remove(this.bossModel.group);
      this.bossModel.dispose();
      this.bossModel = null;
    }
    if (this.bossHolder) {
      this.scene.remove(this.bossHolder);
      this.bossHolder = null;
    }
    for (const slot of this.giantSlots) {
      if (slot.rig) {
        this.scene.remove(slot.rig.group);
        slot.rig.dispose();
        slot.rig = null;
      }
    }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
