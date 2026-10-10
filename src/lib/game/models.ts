// ─────────────────────────────────────────────────────────────
//  MONSTER 3D SUNGGUH — model berupa sendi (rig), bukan gambar.
//
//  Semua model DIBUAT dari geometri mulus (bola, kapsul, kerucut)
//  dengan sendi sungguhan: pinggul, lutut, bahu, siku, leher, ekor,
//  sayap. Karena itu geraknya halus dan TIDAK patah-patah.
//
//  ARAH HADAP: setiap model menghadap -Z (standar three.js).
//    • monster pemain  → yaw 0   (berjalan ke -Z, menjauhi kamera) ✔ tidak mundur
//    • monster lawan   → yaw PI  (berjalan ke +Z, menghadap pemain)
//
//  DUKUNGAN FILE 3D ASLI (.glb / .gltf):
//    Taruh file di public/assets/models/ dengan nama:
//      boss_00_goblin.glb … boss_09_doom.glb
//      giant_00_ape.glb … giant_05_octopus.glb
//    Bila ada, file itu yang dipakai (dengan animasi bawaan bila ada).
//    Bila tidak ada, model prosedural di bawah yang dipakai.
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export interface RigPose {
  time: number;
  /** fase langkah (radian) — terus bertambah saat monster berjalan */
  walk: number;
  /** 0..1 besar langkah (0 = berhenti) */
  stride: number;
  /** 0..1 menyiapkan serangan (mengangkat tangan / menunduk) */
  windup: number;
  /** 0..1 menghantam */
  slam: number;
  /** 0..1 kedipan saat kena serangan */
  hit: number;
  enraged?: boolean;
}

export interface MonsterRig {
  group: THREE.Group;
  /** tinggi badan kira-kira (dipakai untuk posisi bar HP & label) */
  height: number;
  animate(p: RigPose): void;
  dispose(): void;
}

// ── material & util ────────────────────────────────────────
function stdMat(color: number, rough = 0.55, metal = 0.05, emissive = 0x000000, emi = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive: emissive, emissiveIntensity: emi });
}

const GEO = {
  ball: new THREE.SphereGeometry(1, 24, 18),
  ballLow: new THREE.SphereGeometry(1, 14, 12),
  cap: new THREE.CapsuleGeometry(0.5, 1, 12, 20),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cone: new THREE.ConeGeometry(1, 1, 20),
  box: new THREE.BoxGeometry(1, 1, 1),
  torus: new THREE.TorusGeometry(1, 0.22, 12, 28),
  ring: new THREE.RingGeometry(0.9, 1, 26),
};

type G = keyof typeof GEO;
function add(parent: THREE.Object3D, geo: G, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, rot?: [number, number, number]) {
  const m = new THREE.Mesh(GEO[geo], mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Sendi: pivot di titik siku/bahu; bagian di bawahnya mengikuti rotasi pivot. */
function joint(parent: THREE.Object3D, x: number, y: number, z: number) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function eyes(parent: THREE.Object3D, y: number, z: number, spread: number, size: number, sclera = 0xf8fafc, pupil = 0x0b1020) {
  for (const s of [-1, 1]) {
    add(parent, "ball", stdMat(sclera, 0.25, 0), s * spread, y, z, size, size * 1.05, size * 0.7);
    add(parent, "ball", stdMat(pupil, 0.3, 0), s * spread, y, z - size * 0.62, size * 0.45);
  }
}

/** Tanduk / duri kerucut. */
function horn(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, len: number, tiltX = -0.3, tiltZ = 0) {
  const m = add(parent, "cone", mat, x, y + len * 0.3, z, len * 0.22, len, len * 0.22, [tiltX, 0, tiltZ]);
  return m;
}

function disposeTree(root: THREE.Object3D) {
  const mats = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry?.dispose?.();
      const mt = m.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mt)) mt.forEach((x) => mats.add(x));
      else if (mt) mats.add(mt);
    }
  });
  mats.forEach((m) => m.dispose());
}

// ── MANUSIA / RAKSASA BERTUBUH MANUSIA ─────────────────────
interface HumanOpts {
  h: number; // tinggi total
  skin: number;
  cloth: number;
  accent: number;
  metal?: number;
  rough?: number;
  bulk?: number; // 1 normal, >1 kekar
  headScale?: number;
  horns?: 0 | 1 | 2 | 4;
  hairSpikes?: boolean;
  crown?: boolean;
  hat?: "pirate" | "wizard" | "hood";
  pegLeg?: boolean;
  hook?: boolean;
  club?: boolean;
  staff?: boolean;
  eyeGlow?: number;
  spikes?: boolean;
  cracks?: number; // warna emissive retakan (lava/golem)
  shoulderSpikes?: boolean;
  cape?: number;
}

function buildHumanoid(o: HumanOpts): MonsterRig {
  const group = new THREE.Group();
  const H = o.h;
  const bulk = o.bulk ?? 1;
  const skin = stdMat(o.skin, o.rough ?? 0.5, o.metal ?? 0.05);
  const cloth = stdMat(o.cloth, 0.7, 0.02);
  const acc = stdMat(o.accent, 0.35, o.metal ?? 0.15, o.eyeGlow ?? 0x000000, o.eyeGlow ? 0.9 : 0);
  const crack = o.cracks ? stdMat(o.cracks, 0.4, 0, o.cracks, 1.1) : null;

  const legLen = H * 0.42;
  const torsoLen = H * 0.34;
  const headR = H * 0.13 * (o.headScale ?? 1);

  // ── pinggul ──
  const hips = joint(group, 0, legLen, 0);
  add(hips, "ball", cloth, 0, 0, 0, H * 0.16 * bulk, H * 0.1, H * 0.12 * bulk);

  // ── kaki: paha → lutut → betis → kaki ──
  const legs: { hip: THREE.Group; knee: THREE.Group; peg?: boolean }[] = [];
  for (const s of [-1, 1]) {
    const hip = joint(hips, s * H * 0.085 * bulk, -H * 0.02, 0);
    add(hip, "cap", cloth, 0, -legLen * 0.24, 0, H * 0.062 * bulk, legLen * 0.44, H * 0.062 * bulk);
    const knee = joint(hip, 0, -legLen * 0.46, 0);
    add(knee, "ball", skin, 0, 0, 0, H * 0.058 * bulk);
    add(knee, "cap", skin, 0, -legLen * 0.22, 0, H * 0.05 * bulk, legLen * 0.4, H * 0.05 * bulk);
    const peg = o.pegLeg && s === 1;
    if (peg) {
      add(knee, "cyl", stdMat(0x8a5a2b, 0.8), 0, -legLen * 0.42, 0, H * 0.03, legLen * 0.42, H * 0.03);
      add(knee, "cyl", stdMat(0x6b4423, 0.85), 0, -legLen * 0.62, 0, H * 0.045, H * 0.03, H * 0.045);
    } else {
      add(knee, "box", stdMat(o.cloth, 0.8), 0, -legLen * 0.47, -H * 0.02, H * 0.08 * bulk, H * 0.035, H * 0.15);
    }
    legs.push({ hip, knee, peg });
  }

  // ── badan ──
  const torso = joint(hips, 0, H * 0.02, 0);
  add(torso, "cap", skin, 0, torsoLen * 0.5, 0, H * 0.16 * bulk, torsoLen * 0.62, H * 0.12 * bulk);
  if (crack) for (let i = 0; i < 4; i++) add(torso, "box", crack, (i - 1.5) * H * 0.05, torsoLen * (0.3 + i * 0.15), -H * 0.115 * bulk, H * 0.012, torsoLen * 0.16, H * 0.012);
  // dada / rompi
  add(torso, "box", cloth, 0, torsoLen * 0.55, -H * 0.075 * bulk, H * 0.26 * bulk, torsoLen * 0.5, H * 0.09);
  if (o.shoulderSpikes) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) horn(torso, acc, s * (H * 0.15 * bulk + i * H * 0.02), torsoLen * 0.86, -H * 0.02 + i * H * 0.03, H * 0.11, -0.5, s * 0.5);

  // ── kepala ──
  const neck = joint(torso, 0, torsoLen * 0.98, 0);
  add(neck, "cyl", skin, 0, H * 0.03, 0, H * 0.045, H * 0.06, H * 0.045);
  const head = joint(neck, 0, H * 0.09, 0);
  add(head, "ball", skin, 0, 0, 0, headR, headR * 1.1, headR * 0.95);
  eyes(head, headR * 0.1, -headR * 0.78, headR * 0.38, headR * 0.19, 0xf8fafc, o.eyeGlow ? o.eyeGlow : 0x0b1020);
  // mulut
  add(head, "box", stdMat(0x3f1d2b, 0.7), 0, -headR * 0.45, -headR * 0.7, headR * 0.42, headR * 0.12, headR * 0.1);
  if (o.horns) {
    const n = o.horns;
    for (let i = 0; i < n; i++) {
      const s = n === 1 ? 0 : i < n / 2 ? -1 : 1;
      const k = n > 2 ? (i % 2) : 0;
      horn(head, acc, s * headR * (0.75 + k * 0.25), headR * (0.7 - k * 0.35), headR * (k ? 0.25 : 0), H * (0.1 + k * 0.05), -0.35 - k * 0.5, s * 0.45);
    }
  }
  if (o.hairSpikes) for (let i = -2; i <= 2; i++) horn(head, acc, i * headR * 0.3, headR * 0.95, headR * 0.1, H * 0.14 - Math.abs(i) * H * 0.015, -0.25, i * 0.22);
  if (o.crown) {
    const c = stdMat(0xfbbf24, 0.25, 0.85, 0xf59e0b, 0.35);
    add(head, "cyl", c, 0, headR * 0.95, 0, headR * 0.72, headR * 0.16, headR * 0.72);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      horn(head, c, Math.cos(a) * headR * 0.66, headR * 1.05, Math.sin(a) * headR * 0.66, H * 0.08, 0, 0);
    }
  }
  if (o.hat === "pirate") {
    const hm = stdMat(0x1f2937, 0.8);
    add(head, "cyl", hm, 0, headR * 0.85, headR * 0.15, headR * 0.95, headR * 0.5, headR * 0.95, [0.25, 0, 0]);
    add(head, "cyl", hm, 0, headR * 1.12, headR * 0.32, headR * 1.7, headR * 0.07, headR * 1.7, [0.25, 0, 0]);
    add(head, "ball", stdMat(0x0b1020, 0.4), headR * 0.34, headR * 0.1, -headR * 0.72, headR * 0.26, headR * 0.2, headR * 0.12);
  } else if (o.hat === "wizard" || o.hat === "hood") {
    const hm = stdMat(o.hat === "wizard" ? 0x4c1d95 : 0x1e1b4b, 0.75);
    add(head, "cone", hm, 0, headR * 1.5, headR * 0.05, headR * 1.15, headR * 2.6, headR * 1.15, [-0.12, 0, 0]);
    add(head, "torus", hm, 0, headR * 0.5, 0, headR * 0.95, headR * 0.9, headR * 0.95, [Math.PI / 2, 0, 0]);
    if (o.hat === "hood") add(head, "ball", stdMat(0x050816, 0.9), 0, headR * 0.05, -headR * 0.35, headR * 0.9, headR * 0.85, headR * 0.6);
  }

  // ── lengan: bahu → siku → telapak ──
  const armLen = H * 0.38;
  const arms: { sh: THREE.Group; el: THREE.Group; side: number }[] = [];
  for (const s of [-1, 1]) {
    const sh = joint(torso, s * H * 0.17 * bulk, torsoLen * 0.86, 0);
    add(sh, "ball", skin, s * H * 0.012, 0, 0, H * 0.075 * bulk);
    add(sh, "cap", skin, 0, -armLen * 0.24, 0, H * 0.05 * bulk, armLen * 0.42, H * 0.05 * bulk);
    const el = joint(sh, 0, -armLen * 0.46, 0);
    add(el, "cap", skin, 0, -armLen * 0.2, 0, H * 0.042 * bulk, armLen * 0.36, H * 0.042 * bulk);
    if (o.hook && s === 1) {
      add(el, "torus", stdMat(0xd1d5db, 0.3, 0.9), 0, -armLen * 0.42, 0, H * 0.05, H * 0.05, H * 0.05, [Math.PI / 2, 0, 0]);
    } else {
      add(el, "ball", skin, 0, -armLen * 0.44, 0, H * 0.055 * bulk);
    }
    if (o.club && s === 1) {
      const c = stdMat(0x6b4423, 0.85);
      add(el, "cyl", c, 0, -armLen * 0.62, 0, H * 0.022, armLen * 0.4, H * 0.022);
      add(el, "ball", c, 0, -armLen * 0.85, 0, H * 0.085, H * 0.11, H * 0.085);
      for (let i = 0; i < 5; i++) horn(el, stdMat(0x9ca3af, 0.6), Math.sin(i * 2.1) * H * 0.06, -armLen * 0.85, Math.cos(i * 2.1) * H * 0.06, H * 0.06, Math.PI, 0);
    }
    if (o.staff && s === 1) {
      const c = stdMat(0x3f2a1a, 0.85);
      add(el, "cyl", c, 0, -armLen * 0.55, 0, H * 0.016, armLen * 1.1, H * 0.016);
      add(el, "ball", stdMat(0x22d3ee, 0.2, 0, 0x06b6d4, 1.4), 0, armLen * 0.02, 0, H * 0.055);
      for (let i = 0; i < 3; i++) horn(el, c, Math.sin(i * 2) * H * 0.035, armLen * 0.02 - H * 0.05, Math.cos(i * 2) * H * 0.035, H * 0.07, Math.PI, 0);
    }
    arms.push({ sh, el, side: s });
  }

  // ── jubah ──
  let cape: THREE.Mesh | null = null;
  if (o.cape) {
    cape = add(torso, "cone", stdMat(o.cape, 0.85, 0, o.cape, 0.15), 0, torsoLen * 0.2, H * 0.1, H * 0.24, H * 0.55, H * 0.08, [0.35, 0, 0]);
  }

  let disposed = false;
  return {
    group,
    height: H,
    animate(p) {
      if (disposed) return;
      const sw = Math.sin(p.walk) * p.stride;
      const sw2 = Math.sin(p.walk + Math.PI) * p.stride;
      const bob = Math.abs(Math.sin(p.walk)) * p.stride * H * 0.022;
      // kaki: paha ayun, lutut menekuk hanya saat mengayun ke depan
      legs.forEach((l, i) => {
        const a = i === 0 ? sw : sw2;
        l.hip.rotation.x = a * 0.62;
        l.knee.rotation.x = Math.max(0, -a) * 0.95 - 0.06;
      });
      // napas idle
      const breath = Math.sin(p.time * 2.1) * 0.02;
      // serangan: angkat (windup) → hantam (slam)
      const atk = -2.3 * p.windup + 1.9 * p.slam;
      arms.forEach((a, i) => {
        const base = (i === 0 ? sw2 : sw) * 0.5;
        a.sh.rotation.x = base * (1 - Math.max(p.windup, p.slam)) + atk;
        a.sh.rotation.z = a.side * (0.1 + 0.32 * p.windup);
        a.el.rotation.x = -0.25 - Math.max(0, -base) * 0.5 - 1.5 * p.windup + 0.7 * p.slam;
      });
      torso.rotation.x = -0.1 * p.windup + 0.3 * p.slam + breath * 0.5;
      torso.rotation.z = sw * 0.03;
      head.rotation.x = 0.12 * p.windup - 0.2 * p.slam;
      head.rotation.z = -sw * 0.04;
      hips.position.y = legLen + bob - 0.14 * H * p.windup + 0.1 * H * p.slam;
      hips.rotation.y = sw * 0.07;
      if (cape) cape.rotation.x = 0.35 + p.windup * 0.25 + p.stride * 0.12 * Math.sin(p.walk * 2);
      // kedipan kena serangan
      const flash = p.hit > 0 ? 0.6 + Math.sin(p.time * 40) * 0.4 : 0;
      [skin, cloth, acc].forEach((m) => {
        const mm = m as THREE.MeshStandardMaterial;
        mm.emissiveIntensity = (o.eyeGlow ? 0.9 : 0) + flash;
        if (flash > 0) mm.emissive.setHex(0xff4444);
        else if (!o.eyeGlow) mm.emissive.setHex(0x000000);
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeTree(group);
    },
  };
}

// ── KERA RAKSASA ───────────────────────────────────────────
function buildApe(h: number, skinColor = 0x6b4423): MonsterRig {
  const group = new THREE.Group();
  const skin = stdMat(skinColor, 0.75);
  const dark = stdMat(0x3f2a1a, 0.8);
  const legLen = h * 0.26, torsoLen = h * 0.36;
  const hips = joint(group, 0, legLen, 0);
  add(hips, "ball", dark, 0, 0, 0, h * 0.2, h * 0.13, h * 0.16);
  const legs: { hip: THREE.Group; knee: THREE.Group }[] = [];
  for (const s of [-1, 1]) {
    const hip = joint(hips, s * h * 0.11, 0, 0);
    add(hip, "cap", skin, 0, -legLen * 0.3, 0, h * 0.08, legLen * 0.5, h * 0.08);
    const knee = joint(hip, 0, -legLen * 0.55, 0);
    add(knee, "cap", skin, 0, -legLen * 0.2, 0, h * 0.07, legLen * 0.36, h * 0.07);
    add(knee, "box", dark, 0, -legLen * 0.4, -h * 0.03, h * 0.1, h * 0.04, h * 0.17);
    legs.push({ hip, knee });
  }
  const torso = joint(hips, 0, h * 0.02, 0);
  add(torso, "ball", skin, 0, torsoLen * 0.55, 0, h * 0.26, torsoLen * 0.62, h * 0.21);
  add(torso, "ball", stdMat(0x8a6a45, 0.8), 0, torsoLen * 0.5, -h * 0.13, h * 0.16, torsoLen * 0.42, h * 0.1); // dada
  const head = joint(torso, 0, torsoLen * 1.05, -h * 0.02);
  add(head, "ball", skin, 0, 0, 0, h * 0.15, h * 0.14, h * 0.14);
  add(head, "ball", skin, 0, h * 0.06, -h * 0.08, h * 0.1, h * 0.06, h * 0.07); // alis menonjol
  eyes(head, h * 0.02, -h * 0.12, h * 0.055, h * 0.028);
  add(head, "box", stdMat(0x2b1a10, 0.8), 0, -h * 0.05, -h * 0.11, h * 0.09, h * 0.03, h * 0.04);
  const armLen = h * 0.5;
  const arms: { sh: THREE.Group; el: THREE.Group; side: number }[] = [];
  for (const s of [-1, 1]) {
    const sh = joint(torso, s * h * 0.24, torsoLen * 0.82, 0);
    add(sh, "ball", skin, s * h * 0.01, 0, 0, h * 0.095);
    add(sh, "cap", skin, 0, -armLen * 0.26, 0, h * 0.07, armLen * 0.46, h * 0.07);
    const el = joint(sh, 0, -armLen * 0.5, 0);
    add(el, "cap", skin, 0, -armLen * 0.2, 0, h * 0.06, armLen * 0.38, h * 0.06);
    add(el, "ball", dark, 0, -armLen * 0.44, 0, h * 0.075);
    arms.push({ sh, el, side: s });
  }
  let disposed = false;
  return {
    group, height: h,
    animate(p) {
      if (disposed) return;
      const sw = Math.sin(p.walk) * p.stride, sw2 = Math.sin(p.walk + Math.PI) * p.stride;
      const atk = -2.1 * p.windup + 2.0 * p.slam;
      legs.forEach((l, i) => { const a = i === 0 ? sw : sw2; l.hip.rotation.x = a * 0.5; l.knee.rotation.x = Math.max(0, -a) * 0.8; });
      arms.forEach((a, i) => {
        const base = (i === 0 ? sw2 : sw) * 0.45;
        a.sh.rotation.x = base * (1 - Math.max(p.windup, p.slam)) + atk;
        a.sh.rotation.z = a.side * (0.28 + 0.3 * p.windup);
        a.el.rotation.x = -0.5 - 1.2 * p.windup + 0.9 * p.slam;
      });
      torso.rotation.x = -0.12 * p.windup + 0.34 * p.slam + 0.22; // bungkuk khas kera
      head.rotation.x = -0.15 - 0.1 * p.windup + 0.2 * p.slam;
      hips.position.y = legLen + Math.abs(Math.sin(p.walk)) * p.stride * h * 0.02 - 0.1 * h * p.windup;
      const flash = p.hit > 0 ? 0.6 : 0;
      [skin, dark].forEach((m) => { const mm = m as THREE.MeshStandardMaterial; mm.emissive.setHex(flash ? 0xff4444 : 0x000000); mm.emissiveIntensity = flash; });
    },
    dispose() { if (!disposed) { disposed = true; disposeTree(group); } },
  };
}

// ── ROBOT ──────────────────────────────────────────────────
function buildRobot(h: number): MonsterRig {
  const group = new THREE.Group();
  const body = stdMat(0xdfe7f2, 0.3, 0.85);
  const dark = stdMat(0x2b3444, 0.45, 0.7);
  const glow = stdMat(0x22d3ee, 0.2, 0.1, 0x06b6d4, 1.6);
  const legLen = h * 0.44, torsoLen = h * 0.32;
  const hips = joint(group, 0, legLen, 0);
  add(hips, "box", dark, 0, 0, 0, h * 0.2, h * 0.09, h * 0.13);
  const legs: { hip: THREE.Group; knee: THREE.Group }[] = [];
  for (const s of [-1, 1]) {
    const hip = joint(hips, s * h * 0.08, -h * 0.01, 0);
    add(hip, "box", body, 0, -legLen * 0.22, 0, h * 0.055, legLen * 0.42, h * 0.055);
    const knee = joint(hip, 0, -legLen * 0.45, 0);
    add(knee, "ball", dark, 0, 0, 0, h * 0.045);
    add(knee, "cyl", body, 0, -legLen * 0.2, 0, h * 0.038, legLen * 0.36, h * 0.038);
    add(knee, "box", dark, 0, -legLen * 0.42, -h * 0.02, h * 0.075, h * 0.03, h * 0.13);
    legs.push({ hip, knee });
  }
  const torso = joint(hips, 0, h * 0.02, 0);
  add(torso, "box", body, 0, torsoLen * 0.5, 0, h * 0.23, torsoLen * 0.7, h * 0.15);
  add(torso, "box", glow, 0, torsoLen * 0.55, -h * 0.078, h * 0.1, h * 0.055, h * 0.01);
  add(torso, "box", dark, 0, torsoLen * 0.28, -h * 0.075, h * 0.16, h * 0.03, h * 0.01);
  for (const s of [-1, 1]) add(torso, "box", dark, s * h * 0.14, torsoLen * 0.78, 0, h * 0.07, h * 0.07, h * 0.12); // bahu
  const neck = joint(torso, 0, torsoLen * 0.92, 0);
  add(neck, "cyl", dark, 0, h * 0.02, 0, h * 0.035, h * 0.05, h * 0.035);
  const head = joint(neck, 0, h * 0.07, 0);
  add(head, "box", body, 0, 0, 0, h * 0.11, h * 0.095, h * 0.1);
  add(head, "box", glow, 0, h * 0.005, -h * 0.052, h * 0.075, h * 0.022, h * 0.008); // visor
  add(head, "cyl", dark, 0, h * 0.07, h * 0.03, h * 0.006, h * 0.05, h * 0.006);
  add(head, "ball", glow, 0, h * 0.1, h * 0.03, h * 0.018);
  const armLen = h * 0.4;
  const arms: { sh: THREE.Group; el: THREE.Group; side: number }[] = [];
  for (const s of [-1, 1]) {
    const sh = joint(torso, s * h * 0.16, torsoLen * 0.78, 0);
    add(sh, "cyl", dark, 0, -armLen * 0.2, 0, h * 0.032, armLen * 0.38, h * 0.032);
    const el = joint(sh, 0, -armLen * 0.42, 0);
    add(el, "cyl", body, 0, -armLen * 0.18, 0, h * 0.028, armLen * 0.34, h * 0.028);
    add(el, "ball", dark, 0, -armLen * 0.38, 0, h * 0.04);
    arms.push({ sh, el, side: s });
  }
  let disposed = false;
  return {
    group, height: h,
    animate(p) {
      if (disposed) return;
      const sw = Math.sin(p.walk) * p.stride, sw2 = Math.sin(p.walk + Math.PI) * p.stride;
      const atk = -2.2 * p.windup + 2.0 * p.slam;
      legs.forEach((l, i) => { const a = i === 0 ? sw : sw2; l.hip.rotation.x = a * 0.55; l.knee.rotation.x = Math.max(0, -a) * 0.85; });
      arms.forEach((a, i) => {
        const base = (i === 0 ? sw2 : sw) * 0.4;
        a.sh.rotation.x = base * (1 - Math.max(p.windup, p.slam)) + atk;
        a.sh.rotation.z = a.side * (0.12 + 0.3 * p.windup);
        a.el.rotation.x = -0.2 - 1.4 * p.windup + 0.8 * p.slam;
      });
      torso.rotation.x = -0.08 * p.windup + 0.28 * p.slam;
      head.rotation.y = Math.sin(p.time * 1.5) * 0.2;
      hips.position.y = legLen + Math.abs(Math.sin(p.walk)) * p.stride * h * 0.015 - 0.12 * h * p.windup;
      const flash = p.hit > 0 ? 2.4 : 1.6;
      (glow as THREE.MeshStandardMaterial).emissiveIntensity = flash + Math.sin(p.time * 6) * 0.3;
    },
    dispose() { if (!disposed) { disposed = true; disposeTree(group); } },
  };
}

// ── NAGA (bisa banyak kepala) ──────────────────────────────
interface DragonOpts { h: number; skin: number; belly: number; wing: number; glow: number; heads: number; spikes?: boolean; icy?: boolean }
function buildDragon(o: DragonOpts): MonsterRig {
  const group = new THREE.Group();
  const skin = stdMat(o.skin, 0.55, 0.1);
  const belly = stdMat(o.belly, 0.6);
  const wingM = stdMat(o.wing, 0.5, 0.05, o.glow, 0.25);
  const glowM = stdMat(o.glow, 0.3, 0, o.glow, 1.2);
  const bone = stdMat(o.icy ? 0xe0f2fe : 0xf5f0dc, 0.4, 0.05);
  const legLen = o.h * 0.3, torsoLen = o.h * 0.34;
  const hips = joint(group, 0, legLen, 0);
  add(hips, "ball", skin, 0, torsoLen * 0.1, o.h * 0.12, o.h * 0.19, o.h * 0.16, o.h * 0.3);
  add(hips, "cap", belly, 0, torsoLen * 0.02, o.h * 0.1, o.h * 0.12, o.h * 0.2, o.h * 0.2, [Math.PI / 2, 0, 0]);
  // ekor bersegmen
  const tail: THREE.Group[] = [];
  let tp = joint(hips, 0, torsoLen * 0.1, o.h * 0.32);
  for (let i = 0; i < 5; i++) {
    const seg = joint(tp, 0, 0, o.h * 0.075);
    add(seg, "ball", skin, 0, 0, 0, o.h * (0.075 - i * 0.011), o.h * (0.07 - i * 0.01), o.h * 0.055);
    if (o.spikes && i % 2 === 0) horn(seg, glowM, 0, o.h * 0.05, 0, o.h * 0.05, Math.PI / 2.2, 0);
    tail.push(seg);
    tp = seg;
  }
  add(tp, "cone", skin, 0, 0, o.h * 0.02, o.h * 0.035, o.h * 0.09, o.h * 0.035, [Math.PI / 2, 0, 0]);
  // kaki 4
  const legs: { hip: THREE.Group; knee: THREE.Group }[] = [];
  for (const s of [-1, 1]) for (const front of [true, false]) {
    const z = front ? -o.h * 0.16 : o.h * 0.18;
    const len = front ? legLen : legLen * 0.85;
    const hip = joint(hips, s * o.h * 0.15, front ? torsoLen * 0.1 : -legLen * 0.15, z);
    add(hip, "cap", skin, 0, -len * 0.25, 0, o.h * 0.05, len * 0.45, o.h * 0.05);
    const knee = joint(hip, 0, -len * 0.48, 0);
    add(knee, "cap", skin, 0, -len * 0.18, 0, o.h * 0.04, len * 0.34, o.h * 0.04);
    add(knee, "box", belly, 0, -len * 0.38, -o.h * 0.02, o.h * 0.07, o.h * 0.025, o.h * 0.11);
    legs.push({ hip, knee });
  }
  // leher + kepala
  const necks: THREE.Group[][] = [];
  const headTop = { y: 0 };
  for (let n = 0; n < o.heads; n++) {
    const off = o.heads === 1 ? 0 : (n - (o.heads - 1) / 2) * o.h * 0.2;
    const base = joint(hips, off, torsoLen * 0.28, -o.h * 0.3);
    let np = base;
    const segs: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) {
      const seg = joint(np, 0, i === 0 ? 0 : o.h * 0.09, -o.h * 0.035);
      add(seg, "ball", skin, 0, 0, 0, o.h * (0.085 - i * 0.008), o.h * (0.08 - i * 0.007), o.h * (0.08 - i * 0.008));
      if (o.spikes && i < 3) horn(seg, glowM, 0, o.h * 0.06, 0, o.h * 0.05, -0.4, 0);
      segs.push(seg);
      np = seg;
    }
    const head = joint(np, 0, o.h * 0.05, -o.h * 0.03);
    add(head, "ball", skin, 0, 0, 0, o.h * 0.075, o.h * 0.062, o.h * 0.1);
    add(head, "cone", skin, 0, -o.h * 0.005, -o.h * 0.12, o.h * 0.045, o.h * 0.12, o.h * 0.045, [-Math.PI / 2, 0, 0]); // moncong
    add(head, "box", glowM, 0, -o.h * 0.022, -o.h * 0.1, o.h * 0.05, o.h * 0.008, o.h * 0.05); // mulut menyala
    eyes(head, o.h * 0.022, -o.h * 0.06, o.h * 0.032, o.h * 0.016, 0xfff7cf, o.glow);
    for (const s of [-1, 1]) horn(head, bone, s * o.h * 0.04, o.h * 0.05, o.h * 0.02, o.h * 0.09, -0.5, s * 0.4);
    necks.push([...segs, head]);
    headTop.y = Math.max(headTop.y, torsoLen * 0.28 + o.h * 0.09 * 3 + o.h * 0.12);
  }
  // sayap
  const wings: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const w = joint(hips, s * o.h * 0.16, torsoLen * 0.5, -o.h * 0.02);
    const boneM = skin;
    for (let i = 0; i < 3; i++) {
      add(w, "cyl", boneM, s * (o.h * 0.14 + i * o.h * 0.11), o.h * (0.07 - i * 0.02), o.h * (0.02 + i * 0.03), o.h * 0.012, o.h * (0.3 + i * 0.06), o.h * 0.012, [0, 0, s * (0.5 + i * 0.28)]);
    }
    add(w, "ring", wingM, s * o.h * 0.3, o.h * 0.02, o.h * 0.06, o.h * 0.34, o.h * 0.22, 1, [-Math.PI / 2 + s * 0.1, s * 0.5, 0]);
    wings.push(w);
  }
  let disposed = false;
  return {
    group, height: headTop.y + o.h * 0.1,
    animate(p) {
      if (disposed) return;
      const sw = Math.sin(p.walk) * p.stride;
      legs.forEach((l, i) => {
        const a = Math.sin(p.walk + (i % 2) * Math.PI + Math.floor(i / 2) * 1.7) * p.stride;
        l.hip.rotation.x = a * 0.5;
        l.knee.rotation.x = Math.max(0, -a) * 0.7 - 0.15;
      });
      tail.forEach((t, i) => { t.rotation.y = Math.sin(p.time * 2 + i * 0.7) * 0.16; t.rotation.x = 0.04 + Math.sin(p.walk - i * 0.5) * 0.05 * p.stride; });
      necks.forEach((segs, n) => {
        const ph = p.time * 1.6 + n * 2.1;
        segs.forEach((s, i) => {
          const last = i === segs.length - 1;
          s.rotation.y = Math.sin(ph + i * 0.6) * (last ? 0.2 : 0.1);
          s.rotation.x = (last ? -0.25 * p.windup + 0.5 * p.slam : 0) + Math.sin(ph * 0.8 + i) * 0.05 - 0.12;
        });
      });
      const flap = Math.sin(p.time * (p.enraged ? 7 : 3.4));
      wings.forEach((w, i) => { const s = i === 0 ? -1 : 1; w.rotation.z = s * (0.25 + flap * 0.28 + p.windup * 0.4 - p.slam * 0.35); w.rotation.x = flap * 0.1; });
      hips.position.y = legLen + Math.abs(Math.sin(p.walk)) * p.stride * o.h * 0.02 - 0.08 * o.h * p.windup;
      hips.rotation.z = sw * 0.04;
      const flash = p.hit > 0 ? 0.8 : 0;
      [skin, belly, wingM].forEach((m) => { const mm = m as THREE.MeshStandardMaterial; mm.emissive.setHex(flash ? 0xff4444 : o.glow); mm.emissiveIntensity = flash || (m === wingM ? 0.25 : 0); });
    },
    dispose() { if (!disposed) { disposed = true; disposeTree(group); } },
  };
}

// ── LABA-LABA ──────────────────────────────────────────────
function buildSpider(h: number, skinColor = 0x4c1d95, glowColor = 0xc4b5fd): MonsterRig {
  const group = new THREE.Group();
  const skin = stdMat(skinColor, 0.5, 0.1);
  const glow = stdMat(glowColor, 0.3, 0, glowColor, 1.1);
  const bodyY = h * 0.52;
  const body = joint(group, 0, bodyY, 0);
  add(body, "ball", skin, 0, 0, h * 0.06, h * 0.2, h * 0.17, h * 0.24); // perut
  add(body, "ball", skin, 0, h * 0.02, -h * 0.16, h * 0.14, h * 0.13, h * 0.15); // kepala dada
  eyes(body, h * 0.03, -h * 0.26, h * 0.05, h * 0.028, 0xfef3c7, 0x1a0033);
  for (let i = 0; i < 3; i++) add(body, "ball", glow, (i - 1) * h * 0.022, h * 0.055, -h * 0.25, h * 0.012);
  // 8 kaki: pangkal → lutut naik → betis turun
  const legs: { hip: THREE.Group; knee: THREE.Group }[] = [];
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const z = -h * 0.1 + i * h * 0.075;
    const hip = joint(body, s * h * 0.16, h * 0.02, z);
    add(hip, "cap", skin, s * h * 0.09, h * 0.07, 0, h * 0.022, h * 0.2, h * 0.022, [0, 0, s * 1.15]);
    const knee = joint(hip, s * h * 0.18, h * 0.14, 0);
    add(knee, "cap", skin, s * h * 0.1, -h * 0.1, 0, h * 0.018, h * 0.22, h * 0.018, [0, 0, s * -1.5]);
    add(knee, "cap", skin, s * h * 0.2, -h * 0.24, 0, h * 0.014, h * 0.16, h * 0.014, [0, 0, s * 0.35]);
    legs.push({ hip, knee });
  }
  // sepasang taring depan
  for (const s of [-1, 1]) {
    const f = joint(body, s * h * 0.05, -h * 0.02, -h * 0.24);
    add(f, "cap", skin, 0, -h * 0.04, -h * 0.02, h * 0.016, h * 0.09, h * 0.016, [-0.5, 0, 0]);
  }
  let disposed = false;
  return {
    group, height: bodyY + h * 0.2,
    animate(p) {
      if (disposed) return;
      const t = p.time * (p.enraged ? 9 : 6);
      legs.forEach((l, i) => {
        const ph = t + i * 0.9 + (i % 2) * Math.PI;
        l.hip.rotation.x = Math.sin(ph) * 0.22 * p.stride;
        l.knee.rotation.z = (i % 2 === 0 ? -1 : 1) * (0.15 + Math.sin(ph + 1) * 0.14 * p.stride);
      });
      body.position.y = bodyY + Math.sin(t) * 0.015 * h * p.stride;
      body.rotation.x = -0.16 * p.windup + 0.4 * p.slam;
      body.rotation.z = Math.sin(t * 0.5) * 0.04;
      const flash = p.hit > 0 ? 1.6 : 1.1;
      (glow as THREE.MeshStandardMaterial).emissiveIntensity = flash;
    },
    dispose() { if (!disposed) { disposed = true; disposeTree(group); } },
  };
}

// ── DINO / T-REX ───────────────────────────────────────────
function buildDino(h: number, skinColor = 0x65a30d, bellyColor = 0xd9f99d): MonsterRig {
  const group = new THREE.Group();
  const skin = stdMat(skinColor, 0.6);
  const belly = stdMat(bellyColor, 0.7);
  const legLen = h * 0.34, torsoLen = h * 0.36;
  const hips = joint(group, 0, legLen, 0);
  add(hips, "ball", skin, 0, torsoLen * 0.15, h * 0.08, h * 0.19, h * 0.18, h * 0.26);
  add(hips, "cap", belly, 0, torsoLen * 0.05, h * 0.04, h * 0.12, h * 0.2, h * 0.16, [Math.PI / 2, 0, 0]);
  // ekor besar
  let tp = joint(hips, 0, torsoLen * 0.15, h * 0.28);
  for (let i = 0; i < 6; i++) {
    const seg = joint(tp, 0, 0, h * 0.07);
    add(seg, "ball", skin, 0, 0, 0, h * (0.07 - i * 0.01), h * (0.065 - i * 0.009), h * 0.05);
    tp = seg;
  }
  const legs: { hip: THREE.Group; knee: THREE.Group }[] = [];
  for (const s of [-1, 1]) {
    const hip = joint(hips, s * h * 0.13, 0, h * 0.06);
    add(hip, "cap", skin, 0, -legLen * 0.25, 0, h * 0.06, legLen * 0.45, h * 0.06);
    const knee = joint(hip, 0, -legLen * 0.48, 0);
    add(knee, "cap", skin, 0, -legLen * 0.2, 0, h * 0.05, legLen * 0.36, h * 0.05);
    add(knee, "box", belly, 0, -legLen * 0.42, -h * 0.04, h * 0.09, h * 0.035, h * 0.16);
    for (let i = 0; i < 3; i++) add(knee, "cone", stdMat(0xf5f5f4, 0.5), (i - 1) * h * 0.025, -legLen * 0.42, -h * 0.11, h * 0.012, h * 0.035, h * 0.012, [-Math.PI / 2, 0, 0]);
    legs.push({ hip, knee });
  }
  // badan condong ke depan + leher
  const chest = joint(hips, 0, torsoLen * 0.3, -h * 0.14);
  chest.rotation.x = -0.55;
  add(chest, "ball", skin, 0, torsoLen * 0.2, 0, h * 0.16, h * 0.19, h * 0.15);
  add(chest, "cap", belly, 0, torsoLen * 0.08, -h * 0.09, h * 0.1, h * 0.16, h * 0.08, [0, 0, 0]);
  const neck = joint(chest, 0, torsoLen * 0.42, -h * 0.02);
  add(neck, "cap", skin, 0, h * 0.05, 0, h * 0.05, h * 0.14, h * 0.05);
  const head = joint(neck, 0, h * 0.13, 0);
  add(head, "ball", skin, 0, 0, -h * 0.01, h * 0.075, h * 0.062, h * 0.095);
  add(head, "box", skin, 0, -h * 0.012, -h * 0.11, h * 0.06, h * 0.05, h * 0.11); // rahang
  eyes(head, h * 0.022, -h * 0.075, h * 0.03, h * 0.016, 0xfef08a, 0x1a2e05);
  for (let i = 0; i < 6; i++) add(head, "cone", stdMat(0xf5f5f4, 0.5), (i % 3 - 1) * h * 0.02, -h * 0.03, -h * (0.08 + Math.floor(i / 3) * 0.03), h * 0.008, h * 0.022, h * 0.008, [-Math.PI / 2, 0, 0]);
  // lengan kecil
  for (const s of [-1, 1]) {
    const sh = joint(chest, s * h * 0.13, torsoLen * 0.16, -h * 0.08);
    add(sh, "cap", skin, 0, -h * 0.04, 0, h * 0.022, h * 0.09, h * 0.022, [-0.5, 0, 0]);
  }
  let disposed = false;
  return {
    group, height: legLen + torsoLen * 0.3 + h * 0.3,
    animate(p) {
      if (disposed) return;
      const sw = Math.sin(p.walk) * p.stride, sw2 = Math.sin(p.walk + Math.PI) * p.stride;
      const atk = -1.6 * p.windup + 1.4 * p.slam;
      legs.forEach((l, i) => { const a = i === 0 ? sw : sw2; l.hip.rotation.x = a * 0.55; l.knee.rotation.x = Math.max(0, -a) * 0.8 - 0.1; });
      let tp2: THREE.Group | null = null;
      group.traverse(() => {}); void tp2;
      hips.rotation.y = sw * 0.06;
      chest.rotation.x = -0.55 - 0.12 * p.windup + 0.2 * p.slam;
      head.rotation.x = 0.1 * p.windup - 0.25 * p.slam + Math.sin(p.time * 2) * 0.05;
      hips.position.y = legLen + Math.abs(Math.sin(p.walk)) * p.stride * h * 0.02 - 0.07 * h * p.windup;
      const flash = p.hit > 0 ? 0.7 : 0;
      [skin, belly].forEach((m) => { const mm = m as THREE.MeshStandardMaterial; mm.emissive.setHex(flash ? 0xff4444 : 0x000000); mm.emissiveIntensity = flash; });
      void atk;
    },
    dispose() { if (!disposed) { disposed = true; disposeTree(group); } },
  };
}

// ── GURITA ─────────────────────────────────────────────────
function buildOctopus(h: number, skinColor = 0xa855f7, glowColor = 0xf0abfc): MonsterRig {
  const group = new THREE.Group();
  const skin = stdMat(skinColor, 0.45, 0.05);
  const glow = stdMat(glowColor, 0.3, 0, glowColor, 0.9);
  const headY = h * 0.68;
  const head = joint(group, 0, headY, 0);
  add(head, "ball", skin, 0, 0, 0, h * 0.24, h * 0.21, h * 0.22);
  add(head, "ball", glow, 0, h * 0.05, -h * 0.1, h * 0.1, h * 0.06, h * 0.08);
  eyes(head, -h * 0.01, -h * 0.19, h * 0.075, h * 0.035, 0xfaf5ff, 0x2e1065);
  const tentacles: THREE.Group[][] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const base = joint(group, Math.cos(a) * h * 0.15, h * 0.3, Math.sin(a) * h * 0.14);
    let seg = base;
    const chain: THREE.Group[] = [];
    for (let k = 0; k < 4; k++) {
      const nx = joint(seg, 0, -h * 0.075, 0);
      add(nx, "cap", skin, 0, 0, 0, h * (0.036 - k * 0.006), h * 0.08, h * (0.036 - k * 0.006), [0, 0, 0]);
      chain.push(nx);
      seg = nx;
    }
    add(seg, "cone", skin, 0, -h * 0.05, 0, h * 0.016, h * 0.05, h * 0.016, [Math.PI, 0, 0]);
    tentacles.push(chain);
  }
  let disposed = false;
  return {
    group, height: headY + h * 0.22,
    animate(p) {
      if (disposed) return;
      const t = p.time * (p.enraged ? 5 : 3);
      tentacles.forEach((chain, i) => {
        const a = (i / 7) * Math.PI * 2;
        const swing = Math.sin(t + i * 0.8) * 0.28 * p.stride + Math.sin(p.walk + i) * 0.2 * p.stride;
        chain.forEach((seg, k) => {
          seg.rotation.x = Math.cos(a) * (swing * (1 - k * 0.15) + 0.1);
          seg.rotation.z = -Math.sin(a) * (swing * (1 - k * 0.15) + 0.1);
        });
      });
      head.position.y = headY + Math.sin(t * 1.4) * h * 0.015;
      head.rotation.x = -0.15 * p.windup + 0.35 * p.slam;
      head.rotation.z = Math.sin(t * 0.7) * 0.06;
      const flash = p.hit > 0 ? 1.8 : 0.9;
      (glow as THREE.MeshStandardMaterial).emissiveIntensity = flash + Math.sin(t * 3) * 0.15;
    },
    dispose() { if (!disposed) { disposed = true; disposeTree(group); } },
  };
}

// ── GOLEM BATU ─────────────────────────────────────────────
function buildGolem(_h = 1): MonsterRig {
  return buildHumanoid({
    h: 1, skin: 0x8d8d86, cloth: 0x6b6b64, accent: 0x57534e, rough: 0.9, bulk: 1.35,
    headScale: 0.85, eyeGlow: 0xfbbf24, shoulderSpikes: true, cracks: 0x78716c,
  });
}

// ── definisi tiap monster ──────────────────────────────────
type Builder = () => MonsterRig;

/** 10 bos (urutan sama dengan BOSSES di data.ts). */
export const BOSS_BUILDERS: Builder[] = [
  () => buildHumanoid({ h: 1, skin: 0x4ade80, cloth: 0x166534, accent: 0x86efac, bulk: 0.95, headScale: 1.2, horns: 2, eyeGlow: 0xfef08a }), // Goblin Pencuri
  () => buildHumanoid({ h: 1, skin: 0xcbbeac, cloth: 0x1f2937, accent: 0xd1d5db, hat: "pirate", pegLeg: true, hook: true, cape: 0x7f1d1d }), // Kapten Bajak Laut
  () => buildGolem(), // Golem Batu
  () => buildSpider(1, 0x4c1d95, 0xc4b5fd), // Ratu Laba-laba
  () => buildDragon({ h: 1, skin: 0x0ea5e9, belly: 0xe0f2fe, wing: 0x7dd3fc, glow: 0x67e8f9, heads: 1, spikes: true, icy: true }), // Naga Es
  () => buildHumanoid({ h: 1, skin: 0xc2410c, cloth: 0x450a0a, accent: 0xf97316, bulk: 1.25, horns: 2, crown: true, cracks: 0xf97316, eyeGlow: 0xfde047, shoulderSpikes: true }), // Raja Lava
  () => buildHumanoid({ h: 1, skin: 0xf5c542, cloth: 0xb45309, accent: 0xfde047, metal: 0.85, rough: 0.3, bulk: 1.45, hairSpikes: true, eyeGlow: 0xfef9c3 }), // Titan Emas
  () => buildHumanoid({ h: 1, skin: 0x6d28d9, cloth: 0x1e1b4b, accent: 0xc4b5fd, hat: "wizard", staff: true, cape: 0x312e81, eyeGlow: 0x67e8f9 }), // Penyihir Bayangan
  () => buildDragon({ h: 1, skin: 0x0891b2, belly: 0xa5f3fc, wing: 0x67e8f9, glow: 0x22d3ee, heads: 3, spikes: true, icy: true }), // Hydra Kristal
  () => buildHumanoid({ h: 1, skin: 0x7f1d1d, cloth: 0x1c0505, accent: 0xef4444, metal: 0.3, bulk: 1.4, horns: 4, crown: true, cape: 0x450a0a, shoulderSpikes: true, eyeGlow: 0xfca5a5 }), // Dewa Kehancuran
];

/** 6 monster raksasa milik pemain (urutan sama dengan GIANT_ASSET_IDS). */
export const GIANT_BUILDERS: Builder[] = [
  () => buildApe(1, 0x6b4423), // Kera
  () => buildRobot(1), // Robot
  () => buildDragon({ h: 1, skin: 0x16a34a, belly: 0xd9f99d, wing: 0x4ade80, glow: 0xbbf7d0, heads: 1, spikes: true }), // Naga
  () => buildHumanoid({ h: 1, skin: 0xdc2626, cloth: 0x7f1d1d, accent: 0xfef3c7, bulk: 1.3, horns: 2, club: true, eyeGlow: 0xfde047, hairSpikes: true }), // Oni
  () => buildDino(1), // Dino
  () => buildOctopus(1), // Gurita
];

const cache = new Map<string, MonsterRig>();

/** Model prosedural untuk bos index i (0–9). */
export function buildBossRig(index: number, size: number): MonsterRig {
  const key = `b${index}`;
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key); // jangan dipakai dua kali bersamaan
    const fresh = (BOSS_BUILDERS[index] ?? BOSS_BUILDERS[0])();
    return scaleRig(fresh, size);
  }
  return scaleRig((BOSS_BUILDERS[index] ?? BOSS_BUILDERS[0])(), size);
}

/** Model prosedural untuk monster raksasa pemain index i (0–5). */
export function buildGiantRig(index: number, size: number): MonsterRig {
  return scaleRig((GIANT_BUILDERS[index] ?? GIANT_BUILDERS[0])(), size);
}

function scaleRig(rig: MonsterRig, size: number): MonsterRig {
  rig.group.scale.setScalar(size);
  rig.height *= size;
  const old = rig.animate.bind(rig);
  rig.animate = (p) => old(p);
  return rig;
}

// ── FILE 3D ASLI (.glb / .gltf) ────────────────────────────
let gltfLoaderInstance: GLTFLoader | null = null;

function getLoader(): GLTFLoader | null {
  if (typeof window === "undefined") return null;
  if (gltfLoaderInstance) return gltfLoaderInstance;
  gltfLoaderInstance = new GLTFLoader();
  try {
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    gltfLoaderInstance.setDRACOLoader(draco);
  } catch {}
  try {
    gltfLoaderInstance.setMeshoptDecoder(MeshoptDecoder);
  } catch {}
  return gltfLoaderInstance;
}

export interface GlbTemplate {
  url: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  rawHeight: number;
  center: THREE.Vector3;
  minY: number;
}

const glbCache = new Map<string, Promise<GlbTemplate | null>>();

/** Muat file .glb/.gltf; hasilnya di-cache. Kembalikan null bila gagal/tidak ada. */
export function loadGlb(url: string): Promise<GlbTemplate | null> {
  const ldr = getLoader();
  if (!ldr) return Promise.resolve(null);
  let p = glbCache.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      fetch(url, { method: "HEAD" })
        .then((res) => {
          const type = res.headers.get("content-type") ?? "";
          if (!res.ok || type.includes("text/html")) {
            resolve(null);
            return;
          }
          ldr.load(
            url,
            (gltf: GLTF) => {
              const scene = gltf.scene;
              scene.updateMatrixWorld(true);
              const box = new THREE.Box3().setFromObject(scene);
              const size = box.getSize(new THREE.Vector3());
              const center = box.getCenter(new THREE.Vector3());
              const rawHeight = Math.max(0.001, size.y);
              // Setup material & shadows
              scene.traverse((o) => {
                const m = o as THREE.Mesh;
                if (m.isMesh) {
                  m.castShadow = true;
                  m.receiveShadow = true;
                  m.frustumCulled = false;
                  const mats = Array.isArray(m.material) ? m.material : [m.material];
                  for (const mat of mats) {
                    const sm = mat as THREE.MeshStandardMaterial;
                    if (sm.map) sm.map.colorSpace = THREE.SRGBColorSpace;
                    if ("emissiveMap" in sm && sm.emissiveMap) sm.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                  }
                }
              });
              resolve({
                url,
                scene,
                animations: gltf.animations ?? [],
                rawHeight,
                center,
                minY: box.min.y,
              });
            },
            undefined,
            () => resolve(null),
          );
        })
        .catch(() => resolve(null));
    });
    glbCache.set(url, p);
  }
  return p;
}

/** Bungkus hasil .glb agar berukuran raksasa dan beranimasi penuh. */
export function wrapGlb(
  data: GlbTemplate,
  targetSize: number,
): MonsterRig {
  const group = new THREE.Group();
  const inner = new THREE.Group();

  // Clone menggunakan cloneSkeleton agar aman bila ada beberapa monster menggunakan model sama:
  const clone = cloneSkeleton(data.scene) as THREE.Group;

  // Skala ke ukuran target (monster berukuran raksasa gagah):
  const k = targetSize / data.rawHeight;

  // Pusatkan di x=0, z=0 dan letakkan telapak kaki tepat di tanah y=0:
  // Catatan: glTF standar menghadap +Z. Kita putar Math.PI agar depan menghadap -Z (sesuai rig internal game).
  inner.position.set(-data.center.x * k, -data.minY * k, -data.center.z * k);
  inner.scale.setScalar(k);
  inner.rotation.y = Math.PI;
  inner.add(clone);
  group.add(inner);

  const mixer = data.animations.length ? new THREE.AnimationMixer(clone) : null;
  const attackClip = data.animations.find((a) => /attack|hit|punch|slam|strike|bite|smash|swipe/i.test(a.name));
  const walkClip = data.animations.find((a) => /walk|run|move|locomot|stomp|march/i.test(a.name));
  const roarClip = data.animations.find((a) => /roar|taunt|rage|scream|intro/i.test(a.name));
  const idleClip = data.animations.find((a) => /idle|stand|breath|wait/i.test(a.name));

  const attackAction = mixer && attackClip ? mixer.clipAction(attackClip) : null;
  const walkAction = mixer && walkClip ? mixer.clipAction(walkClip) : (mixer && data.animations.length ? mixer.clipAction(data.animations[0]) : null);
  const roarAction = mixer && roarClip ? mixer.clipAction(roarClip) : attackAction;
  const idleAction = mixer && idleClip ? mixer.clipAction(idleClip) : walkAction;

  let lastTime = 0;
  let disposed = false;
  let activeAction: THREE.AnimationAction | null = null;
  let oneShotRunning = false;

  const playAction = (act: THREE.AnimationAction | null, once = false) => {
    if (!act) return;
    if (activeAction === act) {
      if (once && !act.isRunning()) {
        act.reset().play();
      }
      return;
    }
    if (activeAction) activeAction.fadeOut(0.2);
    act.reset().fadeIn(0.15);
    if (once) {
      act.setLoop(THREE.LoopOnce, 1);
      act.clampWhenFinished = true;
      oneShotRunning = true;
      const onFinished = () => {
        oneShotRunning = false;
        mixer?.removeEventListener("finished", onFinished);
        if (walkAction) playAction(walkAction);
      };
      mixer?.addEventListener("finished", onFinished);
    } else {
      act.setLoop(THREE.LoopRepeat, Infinity);
    }
    act.play();
    activeAction = act;
  };

  if (walkAction) playAction(walkAction);

  return {
    group,
    height: targetSize,
    animate(p: RigPose) {
      if (disposed) return;
      const dt = Math.max(0, Math.min(0.1, p.time - lastTime));
      lastTime = p.time;

      if (mixer && data.animations.length) {
        mixer.update(dt);
        if (p.slam > 0 || p.windup > 0) {
          if (!oneShotRunning && attackAction) playAction(attackAction, true);
        } else if (p.enraged && roarAction && !oneShotRunning) {
          playAction(roarAction, true);
        } else if (!oneShotRunning && walkAction) {
          playAction(walkAction);
        }
      } else {
        // ── ANIMASI PROSEDURAL DINAMIS UNTUK MODEL 3D GLB STATIS (TANPA SKELETON) ──
        const h = targetSize;
        const stride = p.stride;
        const walk = p.walk;
        const windup = p.windup;
        const slam = p.slam;
        const hit = p.hit;

        // 1. Langkah Kaki / Berjalan (Stomp Bounce & Body Swagger):
        // Hentakan kaki berat ke tanah:
        const stomp = Math.abs(Math.sin(walk * 1.5)) * (h * 0.08) * stride;
        // Goyang badan kiri-kanan (roll) saat melangkah:
        const rollSway = Math.sin(walk * 1.5) * 0.12 * stride;
        // Ayunan bahu kiri-kanan (yaw):
        const yawSway = Math.cos(walk * 0.75) * 0.08 * stride;
        // Condong maju saat berjalan:
        const forwardLean = 0.09 * stride;

        // 2. Serangan / Hantaman (Windup Angkat Badan & Slam Terjun):
        // Windup: menarik badan ke belakang & meregangkan tubuh ke atas bersiap menghantam:
        const windupPitch = -0.45 * windup;
        const windupLift = (h * 0.14) * windup;
        const windupStretchY = 1 + 0.18 * windup;
        const windupThinXZ = 1 - 0.08 * windup;

        // Slam: terjun menghantam ke depan dengan dahsyat!
        const slamPitch = 0.75 * slam;
        const slamLungeZ = -(h * 0.28) * slam; // lunge ke depan (-Z di lokal rig)
        const slamDrop = -(h * 0.06) * slam;
        const slamSquashY = 1 - 0.22 * slam;
        const slamExpandXZ = 1 + 0.2 * slam;

        // 3. Efek getaran saat meraung / marah:
        const roarShake = p.enraged ? Math.sin(p.time * 40) * (h * 0.015) : 0;

        // 4. Efek kena serangan (Flinch mundur):
        const hitRecoilZ = (h * 0.12) * hit;
        const hitPitch = -0.25 * hit;

        // Posisi & rotasi wadah model GLB:
        inner.position.x = -data.center.x * k + roarShake;
        inner.position.y = -data.minY * k + stomp + windupLift + slamDrop;
        inner.position.z = -data.center.z * k + slamLungeZ + hitRecoilZ;

        inner.rotation.x = forwardLean + windupPitch + slamPitch + hitPitch;
        inner.rotation.y = Math.PI + yawSway; // Math.PI memutar GLB (+Z depan) ke -Z depan!
        inner.rotation.z = rollSway + (Math.sin(p.time * 2) * 0.015);

        // Squash & Stretch:
        inner.scale.set(
          k * windupThinXZ * slamExpandXZ,
          k * windupStretchY * slamSquashY,
          k * windupThinXZ * slamExpandXZ
        );
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer?.stopAllAction();
      disposeTree(group);
    },
  };
}
