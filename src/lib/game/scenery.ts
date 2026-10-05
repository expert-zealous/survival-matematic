// ─────────────────────────────────────────────────────────────
//  Pemandangan 3D di luar jalur pertempuran — berbeda tiap stage.
//
//  • Medan berbukit low-poly (lembah datar untuk jalur)
//  • Pegunungan di kejauhan (salju di puncak, gunung berapi, dll.)
//  • Properti khas tiap dunia: kaktus & piramida, pinus & sungai,
//    pinus bersalju & manusia salju, kristal bercahaya, kolam lava,
//    gedung runtuh & lampu jalan, pagoda & lampion, batu melayang.
//  • Awan bergerak, planet, partikel salju / bara / debu / kilau.
//
//  Semua objek statis digabung menjadi 2 mesh (bercahaya & tidak)
//  agar ringan di HP.
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";

const LANE_HALF = 3.2; // setengah lebar jalur (LANE_W / 2)

type Layer = "lit" | "glow";
type Kind = "desert" | "forest" | "snow" | "crystal" | "volcano" | "city" | "temple" | "dark";

export interface SceneryLook {
  skyTop: string;
  skyBottom: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  sun: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  exposure: number;
}

interface ThemeDef extends SceneryLook {
  groundA: string;
  groundB: string;
  shoulder: string;
  amp: number;
  mountain: string;
  mountainCap: string | null;
  capLevel: number;
  clouds: number;
  cloudColor: string;
  particles: null | { color: string; count: number; vy: number; vx: number; size: number; twinkle?: boolean };
}

const THEMES: Record<Kind, ThemeDef> = {
  desert: {
    skyTop: "#4aa8ec", skyBottom: "#ffe2ad", fog: "#f2d4a2", fogNear: 34, fogFar: 115,
    sun: "#fff0cc", sunIntensity: 1.55, hemiSky: "#fff4dc", hemiGround: "#c99a5c", hemiIntensity: 0.95, exposure: 1.1,
    groundA: "#ecc67f", groundB: "#d6a25c", shoulder: "#caa070", amp: 1.7,
    mountain: "#c98a4b", mountainCap: null, capLevel: 1, clouds: 5, cloudColor: "#ffffff",
    particles: { color: "#f6deb0", count: 140, vy: -0.05, vx: 0.9, size: 0.09 },
  },
  forest: {
    skyTop: "#4fb2ff", skyBottom: "#dcf4ff", fog: "#c4e6d6", fogNear: 32, fogFar: 110,
    sun: "#fff6dc", sunIntensity: 1.5, hemiSky: "#e9fbff", hemiGround: "#3f7a2c", hemiIntensity: 0.9, exposure: 1.08,
    groundA: "#5aa83f", groundB: "#3e8a2e", shoulder: "#7d6a45", amp: 1.3,
    mountain: "#4f7f5c", mountainCap: "#f4f8fb", capLevel: 0.72, clouds: 9, cloudColor: "#ffffff",
    particles: { color: "#fef08a", count: 70, vy: 0.05, vx: 0.1, size: 0.1, twinkle: true },
  },
  snow: {
    skyTop: "#7fbcff", skyBottom: "#eef7ff", fog: "#e3eefa", fogNear: 28, fogFar: 100,
    sun: "#ffffff", sunIntensity: 1.35, hemiSky: "#f2f8ff", hemiGround: "#a9c1d8", hemiIntensity: 1.0, exposure: 1.05,
    groundA: "#f7fbff", groundB: "#dbe8f4", shoulder: "#b9cadb", amp: 1.5,
    mountain: "#9fb6cf", mountainCap: "#ffffff", capLevel: 0.45, clouds: 7, cloudColor: "#ffffff",
    particles: { color: "#ffffff", count: 420, vy: -1.4, vx: 0.35, size: 0.12 },
  },
  crystal: {
    skyTop: "#1a0f3d", skyBottom: "#5a3aa6", fog: "#2f1d60", fogNear: 22, fogFar: 85,
    sun: "#d8c8ff", sunIntensity: 0.9, hemiSky: "#b79cff", hemiGround: "#1b1038", hemiIntensity: 0.85, exposure: 1.15,
    groundA: "#3d2c72", groundB: "#271b52", shoulder: "#4a3a80", amp: 1.9,
    mountain: "#24174a", mountainCap: "#8b5cf6", capLevel: 0.82, clouds: 0, cloudColor: "#ffffff",
    particles: { color: "#e9d5ff", count: 180, vy: 0.25, vx: 0.05, size: 0.1, twinkle: true },
  },
  volcano: {
    skyTop: "#2a0808", skyBottom: "#ff6a2a", fog: "#5c1f12", fogNear: 24, fogFar: 95,
    sun: "#ffb27a", sunIntensity: 1.25, hemiSky: "#ff9a66", hemiGround: "#2a1410", hemiIntensity: 0.8, exposure: 1.1,
    groundA: "#3f2c27", groundB: "#2a1c19", shoulder: "#4b3029", amp: 1.7,
    mountain: "#2b1a16", mountainCap: "#ff5a1f", capLevel: 0.9, clouds: 6, cloudColor: "#4b3b38",
    particles: { color: "#ff8a3d", count: 220, vy: 1.1, vx: 0.15, size: 0.11, twinkle: true },
  },
  city: {
    skyTop: "#8aa4bd", skyBottom: "#efdcc3", fog: "#bdb3a4", fogNear: 28, fogFar: 100,
    sun: "#ffe7c4", sunIntensity: 1.25, hemiSky: "#e9e2d6", hemiGround: "#5e5a52", hemiIntensity: 0.95, exposure: 1.05,
    groundA: "#6f6b63", groundB: "#5a5750", shoulder: "#7d786e", amp: 0.35,
    mountain: "#7a7f88", mountainCap: null, capLevel: 1, clouds: 6, cloudColor: "#e5e7eb",
    particles: { color: "#d6cfc2", count: 110, vy: -0.08, vx: 0.6, size: 0.08 },
  },
  temple: {
    skyTop: "#ffb35c", skyBottom: "#fff0c4", fog: "#f4d9a2", fogNear: 32, fogFar: 110,
    sun: "#ffe0a0", sunIntensity: 1.5, hemiSky: "#fff3d6", hemiGround: "#7d8a3a", hemiIntensity: 0.95, exposure: 1.1,
    groundA: "#9fb24a", groundB: "#7f963a", shoulder: "#b48a4a", amp: 1.0,
    mountain: "#7d8f52", mountainCap: "#f3e3b5", capLevel: 0.78, clouds: 7, cloudColor: "#fff7e6",
    particles: { color: "#fbcfe8", count: 160, vy: -0.45, vx: 0.45, size: 0.11 },
  },
  dark: {
    skyTop: "#03020c", skyBottom: "#3a0f4d", fog: "#140a2a", fogNear: 22, fogFar: 85,
    sun: "#c9a2ff", sunIntensity: 0.85, hemiSky: "#a77bff", hemiGround: "#12081f", hemiIntensity: 0.75, exposure: 1.15,
    groundA: "#1d1434", groundB: "#120c24", shoulder: "#2a1d45", amp: 1.2,
    mountain: "#130b23", mountainCap: "#e11d48", capLevel: 0.88, clouds: 0, cloudColor: "#ffffff",
    particles: { color: "#f0abfc", count: 220, vy: 0.2, vx: 0.05, size: 0.1, twinkle: true },
  },
};

export function sceneryKind(mapName: string): Kind {
  const n = mapName.toLowerCase();
  if (n.includes("gurun")) return "desert";
  if (n.includes("hutan")) return "forest";
  if (n.includes("salju")) return "snow";
  if (n.includes("kristal")) return "crystal";
  if (n.includes("berapi")) return "volcano";
  if (n.includes("kota")) return "city";
  if (n.includes("kuil")) return "temple";
  if (n.includes("gelap")) return "dark";
  return "desert";
}

// ── utilitas ───────────────────────────────────────────────
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise2(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x: number, y: number) {
  return noise2(x, y) * 0.6 + noise2(x * 2.1, y * 2.1) * 0.28 + noise2(x * 4.3, y * 4.3) * 0.12;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Tinggi medan di (x,z) — jalur selalu datar (lembah). */
export function terrainHeight(x: number, z: number, amp: number) {
  const cx = Math.max(0, Math.abs(x) - (LANE_HALF + 1.5));
  const ramp = smooth(0, 7, cx);
  const n = fbm(x * 0.07 + 13, z * 0.07 - 7) * 0.5 + 0.5;
  return ramp * (n * amp * 2.4 + cx * 0.05 * amp);
}

// ── pengumpul geometri berwarna (digabung jadi 1 mesh per layer) ──
class Builder {
  parts: Record<Layer, { pos: number[]; nor: number[]; col: number[] }> = {
    lit: { pos: [], nor: [], col: [] },
    glow: { pos: [], nor: [], col: [] },
  };
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private c = new THREE.Color();

  add(
    geo: THREE.BufferGeometry,
    color: string | ((y: number) => string),
    pos: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
    rot: [number, number, number] = [0, 0, 0],
    layer: Layer = "lit",
  ) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()) as THREE.BufferGeometry;
    this.e.set(rot[0], rot[1], rot[2]);
    this.q.setFromEuler(this.e);
    this.m.compose(new THREE.Vector3(...pos), this.q, new THREE.Vector3(...scale));
    g.applyMatrix4(this.m);
    g.computeVertexNormals();
    const P = g.getAttribute("position");
    const N = g.getAttribute("normal");
    const out = this.parts[layer];
    const fixed = typeof color === "string" ? this.c.set(color).clone() : null;
    for (let i = 0; i < P.count; i++) {
      out.pos.push(P.getX(i), P.getY(i), P.getZ(i));
      out.nor.push(N.getX(i), N.getY(i), N.getZ(i));
      const cc = fixed ?? this.c.set((color as (y: number) => string)(P.getY(i)));
      out.col.push(cc.r, cc.g, cc.b);
    }
    g.dispose();
  }

  build(layer: Layer, mat: THREE.Material): THREE.Mesh | null {
    const p = this.parts[layer];
    if (p.pos.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(p.pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(p.nor, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(p.col, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    return mesh;
  }
}

// geometri dasar (dipakai ulang)
const G = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 7),
  cone7: new THREE.ConeGeometry(1, 1, 7),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  ico0: new THREE.IcosahedronGeometry(1, 0),
  ico1: new THREE.IcosahedronGeometry(1, 1),
  dode: new THREE.DodecahedronGeometry(1, 0),
  octa: new THREE.OctahedronGeometry(1, 0),
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 10, 8),
  circle: new THREE.CircleGeometry(1, 18),
};

function jitterGeo(src: THREE.BufferGeometry, amt: number, seed: number) {
  const g = src.clone();
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const h = hash2(x * 9.1 + seed, z * 7.3 + y * 3.7);
    const k = 1 + (h - 0.5) * amt;
    p.setXYZ(i, x * k, y * (1 + (hash2(y + seed, x) - 0.5) * amt * 0.4), z * k);
  }
  g.computeVertexNormals();
  return g;
}

function shade(hex: string, l: number) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, l);
  return "#" + c.getHexString();
}

// ── properti ──────────────────────────────────────────────
type Prop = (b: Builder, x: number, y: number, z: number, s: number, r: () => number) => void;

const pine = (snowy: boolean): Prop => (b, x, y, z, s, r) => {
  const leaf = snowy ? "#2f6b4a" : r() < 0.5 ? "#2f7d3a" : "#3c8f3f";
  b.add(G.cyl, "#6b4a2b", [x, y + 0.45 * s, z], [0.13 * s, 0.9 * s, 0.13 * s]);
  const tiers: [number, number, number][] = [[1.0, 1.4, 1.2], [0.78, 1.2, 1.85], [0.52, 1.0, 2.45]];
  tiers.forEach(([rad, h, yy], i) => {
    const col = snowy && i === 2 ? "#f4f9ff" : shade(leaf, i * 0.03);
    b.add(G.cone7, col, [x, y + yy * s, z], [rad * s, h * s, rad * s], [0, r() * 3, 0]);
    if (snowy && i < 2) b.add(G.cone7, "#f1f7ff", [x, y + (yy + h * 0.32) * s, z], [rad * 0.55 * s, h * 0.38 * s, rad * 0.55 * s]);
  });
};
const roundTree = (canopy: string): Prop => (b, x, y, z, s, r) => {
  b.add(G.cyl, "#6b4a2b", [x, y + 0.6 * s, z], [0.14 * s, 1.2 * s, 0.14 * s]);
  b.add(G.ico1, shade(canopy, (r() - 0.5) * 0.08), [x, y + 1.65 * s, z], [0.95 * s, 0.85 * s, 0.95 * s], [r(), r(), 0]);
  b.add(G.ico1, shade(canopy, 0.05), [x + 0.45 * s, y + 1.35 * s, z + 0.2 * s], [0.55 * s, 0.5 * s, 0.55 * s]);
};
const bush: Prop = (b, x, y, z, s, r) => {
  b.add(G.ico0, r() < 0.5 ? "#3f8f35" : "#4ea33d", [x, y + 0.28 * s, z], [0.55 * s, 0.42 * s, 0.5 * s], [r(), r(), r()]);
};
const rock = (col: string): Prop => (b, x, y, z, s, r) => {
  b.add(G.dode, shade(col, (r() - 0.5) * 0.08), [x, y + 0.25 * s, z], [0.6 * s, 0.45 * s, 0.55 * s], [r() * 3, r() * 3, r() * 3]);
};
const cactus: Prop = (b, x, y, z, s, r) => {
  const c = "#4f9a3a";
  b.add(G.cyl, c, [x, y + 0.8 * s, z], [0.2 * s, 1.6 * s, 0.2 * s]);
  b.add(G.sphere, c, [x, y + 1.6 * s, z], [0.2 * s, 0.2 * s, 0.2 * s]);
  const side = r() < 0.5 ? 1 : -1;
  b.add(G.cyl, c, [x + side * 0.32 * s, y + 0.85 * s, z], [0.12 * s, 0.45 * s, 0.12 * s], [0, 0, Math.PI / 2]);
  b.add(G.cyl, c, [x + side * 0.52 * s, y + 1.15 * s, z], [0.12 * s, 0.6 * s, 0.12 * s]);
  b.add(G.cyl, c, [x - side * 0.3 * s, y + 0.6 * s, z], [0.1 * s, 0.4 * s, 0.1 * s], [0, 0, Math.PI / 2]);
  b.add(G.cyl, c, [x - side * 0.46 * s, y + 0.82 * s, z], [0.1 * s, 0.45 * s, 0.1 * s]);
};
const palm: Prop = (b, x, y, z, s, r) => {
  const lean = (r() - 0.5) * 0.5;
  for (let i = 0; i < 5; i++) b.add(G.cyl, i % 2 ? "#9a6b3a" : "#8a5c2f", [x + lean * i * 0.25 * s, y + (0.35 + i * 0.6) * s, z], [0.14 * s, 0.62 * s, 0.14 * s], [0, 0, -lean * 0.4]);
  const tx = x + lean * 1.25 * s, ty = y + 3.1 * s;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.add(G.cone4, i % 2 ? "#3f9b3a" : "#2f8a32", [tx + Math.cos(a) * 0.7 * s, ty - 0.15 * s, z + Math.sin(a) * 0.7 * s], [0.22 * s, 1.6 * s, 0.06 * s], [Math.sin(a) * 1.25, -a, -Math.cos(a) * 1.25]);
  }
};
const deadTree = (col: string): Prop => (b, x, y, z, s, r) => {
  b.add(G.cyl, col, [x, y + 0.9 * s, z], [0.12 * s, 1.8 * s, 0.12 * s]);
  for (let i = 0; i < 3; i++) {
    const a = r() * Math.PI * 2;
    b.add(G.cyl, col, [x + Math.cos(a) * 0.3 * s, y + (1.2 + i * 0.3) * s, z + Math.sin(a) * 0.3 * s], [0.06 * s, 0.8 * s, 0.06 * s], [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8]);
  }
};
const crystal = (palette: string[]): Prop => (b, x, y, z, s, r) => {
  const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const col = palette[Math.floor(r() * palette.length)];
    const h = (0.9 + r() * 1.4) * s;
    b.add(G.octa, col, [x + (r() - 0.5) * 0.8 * s, y + h * 0.45, z + (r() - 0.5) * 0.8 * s], [0.28 * s, h, 0.28 * s], [(r() - 0.5) * 0.7, r() * 3, (r() - 0.5) * 0.7], "glow");
  }
  b.add(G.dode, "#2a1d52", [x, y + 0.12 * s, z], [0.7 * s, 0.25 * s, 0.7 * s]);
};
const mushroom: Prop = (b, x, y, z, s, r) => {
  b.add(G.cyl, "#e9d5ff", [x, y + 0.35 * s, z], [0.08 * s, 0.7 * s, 0.08 * s]);
  b.add(G.sphere, r() < 0.5 ? "#22d3ee" : "#f472b6", [x, y + 0.72 * s, z], [0.36 * s, 0.18 * s, 0.36 * s], [0, 0, 0], "glow");
};
const snowman: Prop = (b, x, y, z, s) => {
  b.add(G.sphere, "#ffffff", [x, y + 0.45 * s, z], [0.5 * s, 0.48 * s, 0.5 * s]);
  b.add(G.sphere, "#ffffff", [x, y + 1.12 * s, z], [0.36 * s, 0.34 * s, 0.36 * s]);
  b.add(G.sphere, "#ffffff", [x, y + 1.62 * s, z], [0.26 * s, 0.25 * s, 0.26 * s]);
  b.add(G.cone7, "#f97316", [x, y + 1.62 * s, z + 0.3 * s], [0.05 * s, 0.3 * s, 0.05 * s], [Math.PI / 2, 0, 0]);
  b.add(G.cyl, "#1f2937", [x, y + 1.92 * s, z], [0.2 * s, 0.25 * s, 0.2 * s]);
  b.add(G.cyl, "#dc2626", [x, y + 1.38 * s, z], [0.3 * s, 0.08 * s, 0.3 * s]);
};
const lavaPool: Prop = (b, x, y, z, s, r) => {
  b.add(G.circle, "#ff6a00", [x, y + 0.04, z], [1.1 * s, 1.1 * s, 1], [-Math.PI / 2, 0, 0], "glow");
  b.add(G.circle, "#ffd23a", [x, y + 0.05, z], [0.5 * s, 0.5 * s, 1], [-Math.PI / 2, 0, 0], "glow");
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r();
    b.add(G.dode, "#1c1210", [x + Math.cos(a) * 1.15 * s, y + 0.1 * s, z + Math.sin(a) * 1.15 * s], [0.3 * s, 0.22 * s, 0.3 * s], [r(), r(), r()]);
  }
};
const building = (facing: number): Prop => (b, x, y, z, s, r) => {
  const w = (1.6 + r() * 1.4) * s, d = (1.6 + r() * 1.2) * s, h = (2.5 + r() * 5.5) * s;
  const base = ["#7c7f86", "#8d8577", "#6b6f78", "#9a8f80"][Math.floor(r() * 4)];
  b.add(G.box, base, [x, y + h / 2, z], [w, h, d]);
  b.add(G.box, shade(base, -0.12), [x, y + h + 0.08 * s, z], [w * 1.04, 0.16 * s, d * 1.04]);
  // jendela menghadap jalur (sebagian menyala)
  const rows = Math.max(2, Math.floor(h / (0.9 * s)));
  for (let ry = 0; ry < rows; ry++)
    for (let cx = 0; cx < 2; cx++) {
      const lit = r() < 0.35;
      b.add(G.box, lit ? "#fde68a" : "#1f2937", [x + facing * (w / 2 + 0.02), y + (0.7 + ry * 0.9) * s, z + (cx - 0.5) * d * 0.45], [0.04, 0.45 * s, 0.38 * s], [0, 0, 0], lit ? "glow" : "lit");
    }
};
const car: Prop = (b, x, y, z, s, r) => {
  const col = ["#b45309", "#7f1d1d", "#1e3a8a", "#57534e"][Math.floor(r() * 4)];
  const rot = r() * Math.PI;
  b.add(G.box, col, [x, y + 0.35 * s, z], [1.8 * s, 0.5 * s, 0.9 * s], [0, rot, 0.08]);
  b.add(G.box, shade(col, -0.1), [x, y + 0.75 * s, z], [1.0 * s, 0.4 * s, 0.82 * s], [0, rot, 0.08]);
};
const lamp: Prop = (b, x, y, z, s) => {
  b.add(G.cyl, "#27272a", [x, y + 1.3 * s, z], [0.06 * s, 2.6 * s, 0.06 * s]);
  b.add(G.sphere, "#fff3b0", [x, y + 2.65 * s, z], [0.2 * s, 0.2 * s, 0.2 * s], [0, 0, 0], "glow");
};
const pagoda: Prop = (b, x, y, z, s) => {
  let yy = y;
  for (let i = 0; i < 3; i++) {
    const w = (2.2 - i * 0.5) * s;
    b.add(G.box, "#b91c1c", [x, yy + 0.55 * s, z], [w * 0.8, 1.1 * s, w * 0.8]);
    b.add(G.cone4, i === 2 ? "#f59e0b" : "#14532d", [x, yy + 1.35 * s, z], [w * 0.95, 0.65 * s, w * 0.95], [0, Math.PI / 4, 0]);
    yy += 1.45 * s;
  }
  b.add(G.cone7, "#fbbf24", [x, yy + 0.3 * s, z], [0.08 * s, 0.9 * s, 0.08 * s]);
};
const statue: Prop = (b, x, y, z, s) => {
  b.add(G.box, "#9ca3af", [x, y + 0.4 * s, z], [1.0 * s, 0.8 * s, 1.0 * s]);
  b.add(G.cyl, "#e8b931", [x, y + 1.35 * s, z], [0.32 * s, 1.1 * s, 0.32 * s]);
  b.add(G.sphere, "#f2c94c", [x, y + 2.1 * s, z], [0.28 * s, 0.28 * s, 0.28 * s]);
  b.add(G.cone7, "#f2c94c", [x, y + 2.45 * s, z], [0.12 * s, 0.35 * s, 0.12 * s]);
};
const lantern: Prop = (b, x, y, z, s) => {
  b.add(G.cyl, "#3f2a1a", [x, y + 0.9 * s, z], [0.05 * s, 1.8 * s, 0.05 * s]);
  b.add(G.box, "#ff7a3d", [x, y + 1.85 * s, z], [0.32 * s, 0.4 * s, 0.32 * s], [0, 0, 0], "glow");
  b.add(G.cone4, "#7f1d1d", [x, y + 2.15 * s, z], [0.3 * s, 0.25 * s, 0.3 * s], [0, Math.PI / 4, 0]);
};
const pyramid: Prop = (b, x, y, z, s) => {
  b.add(G.cone4, (yy) => (yy > y + 7.8 * s ? "#f5d38a" : "#d9a95f"), [x, y + 4.5 * s, z], [6 * s, 9 * s, 6 * s], [0, Math.PI / 4, 0]);
};
const obelisk: Prop = (b, x, y, z, s) => {
  b.add(G.box, "#2a1d45", [x, y + 2 * s, z], [0.6 * s, 4 * s, 0.6 * s]);
  b.add(G.cone4, "#e11d48", [x, y + 4.3 * s, z], [0.45 * s, 0.6 * s, 0.45 * s], [0, Math.PI / 4, 0], "glow");
};

interface PropSpec {
  fn: Prop;
  count: number;
  scale: [number, number];
  near?: number; // jarak minimum dari tepi jalur
  far?: number;
}

function themeProps(kind: Kind): PropSpec[] {
  switch (kind) {
    case "desert":
      return [
        { fn: cactus, count: 34, scale: [0.8, 1.4] },
        { fn: rock("#b07a45"), count: 26, scale: [0.6, 1.8] },
        { fn: palm, count: 10, scale: [0.9, 1.2], near: 4 },
        { fn: deadTree("#7a5230"), count: 6, scale: [0.8, 1.1] },
      ];
    case "forest":
      return [
        { fn: pine(false), count: 60, scale: [0.9, 1.7] },
        { fn: roundTree("#4caf50"), count: 32, scale: [0.9, 1.5] },
        { fn: bush, count: 40, scale: [0.7, 1.4], near: 0.6 },
        { fn: rock("#8a8f86"), count: 14, scale: [0.6, 1.4] },
      ];
    case "snow":
      return [
        { fn: pine(true), count: 58, scale: [0.9, 1.7] },
        { fn: rock("#b8c7d6"), count: 18, scale: [0.6, 1.6] },
        { fn: snowman, count: 5, scale: [0.9, 1.1], near: 1, far: 9 },
        { fn: crystal(["#bae6fd", "#e0f2fe", "#7dd3fc"]), count: 8, scale: [0.6, 1.0] },
      ];
    case "crystal":
      return [
        { fn: crystal(["#c084fc", "#22d3ee", "#f472b6", "#a78bfa"]), count: 52, scale: [0.8, 1.9] },
        { fn: rock("#3b2a6b"), count: 26, scale: [0.6, 1.8] },
        { fn: mushroom, count: 22, scale: [0.8, 1.6], near: 0.6 },
      ];
    case "volcano":
      return [
        { fn: rock("#1f1512"), count: 40, scale: [0.6, 2.0] },
        { fn: lavaPool, count: 14, scale: [0.8, 1.8], near: 2 },
        { fn: deadTree("#2a1a14"), count: 16, scale: [0.8, 1.3] },
      ];
    case "city":
      return [
        { fn: rock("#8a857b"), count: 24, scale: [0.5, 1.3], near: 0.6 },
        { fn: car, count: 12, scale: [0.9, 1.1], near: 0.8, far: 8 },
        { fn: lamp, count: 14, scale: [1, 1], near: 0.4, far: 2.5 },
        { fn: deadTree("#4a3b2e"), count: 8, scale: [0.8, 1.2] },
      ];
    case "temple":
      return [
        { fn: roundTree("#f9a8d4"), count: 30, scale: [0.9, 1.4] },
        { fn: roundTree("#65a30d"), count: 16, scale: [0.9, 1.4] },
        { fn: lantern, count: 16, scale: [1, 1.2], near: 0.4, far: 3 },
        { fn: statue, count: 8, scale: [0.9, 1.3], near: 2, far: 10 },
        { fn: rock("#a3a3a3"), count: 10, scale: [0.6, 1.3] },
      ];
    case "dark":
      return [
        { fn: crystal(["#e11d48", "#f43f5e", "#a855f7"]), count: 30, scale: [0.8, 1.8] },
        { fn: deadTree("#1a1026"), count: 22, scale: [0.9, 1.5] },
        { fn: obelisk, count: 8, scale: [0.8, 1.3], near: 3 },
        { fn: rock("#241a3a"), count: 22, scale: [0.6, 1.7] },
      ];
  }
}

export interface Scenery {
  group: THREE.Group;
  look: SceneryLook;
  update(dt: number, time: number): void;
  dispose(): void;
}

export function buildScenery(mapName: string): Scenery {
  const kind = sceneryKind(mapName);
  const T = THEMES[kind];
  const seed = Array.from(mapName).reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const r = mulberry(seed);
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const H = (x: number, z: number) => terrainHeight(x, z, T.amp);

  // ── 1. medan berbukit ──
  const tGeo = new THREE.PlaneGeometry(150, 150, 96, 96);
  tGeo.rotateX(-Math.PI / 2);
  tGeo.translate(0, 0, -28);
  const tp = tGeo.getAttribute("position");
  const tcol = new Float32Array(tp.count * 3);
  const cA = new THREE.Color(T.groundA), cB = new THREE.Color(T.groundB), cS = new THREE.Color(T.shoulder);
  const capC = new THREE.Color(T.mountainCap ?? T.groundA);
  const tmp = new THREE.Color();
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i);
    const h = H(x, z);
    tp.setY(i, h - 0.04);
    const n = fbm(x * 0.18 + 3, z * 0.18) * 0.5 + 0.5;
    tmp.copy(cA).lerp(cB, n);
    const cx = Math.abs(x) - LANE_HALF;
    if (cx < 1.6) tmp.lerp(cS, smooth(1.6, 0.2, cx) * 0.85);
    if (kind === "snow" || kind === "forest") if (h > T.amp * 2.2) tmp.lerp(capC, kind === "snow" ? 0.6 : 0.25);
    tcol[i * 3] = tmp.r;
    tcol[i * 3 + 1] = tmp.g;
    tcol[i * 3 + 2] = tmp.b;
  }
  tGeo.setAttribute("color", new THREE.BufferAttribute(tcol, 3));
  tGeo.computeVertexNormals();
  const tMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 });
  const terrain = new THREE.Mesh(tGeo, tMat);
  terrain.receiveShadow = true;
  group.add(terrain);
  disposables.push(tGeo, tMat);

  const b = new Builder();

  // ── 2. pegunungan di kejauhan ──
  const mountainColor = (base: number, height: number) => (y: number) =>
    T.mountainCap && y > base + height * T.capLevel ? T.mountainCap : shade(T.mountain, (y - base) / height * 0.08 - 0.03);
  const ring: [number, number][] = [];
  for (let i = 0; i < 16; i++) ring.push([(i / 15 - 0.5) * 150, -60 - r() * 18]); // barisan belakang
  for (let i = 0; i < 8; i++) {
    ring.push([-(34 + r() * 22), 6 - i * 11]);
    ring.push([34 + r() * 22, 6 - i * 11]);
  }
  ring.forEach(([mx, mz], i) => {
    const h = kind === "city" ? 0 : 12 + r() * 20;
    if (kind === "city") return;
    const rad = 9 + r() * 10;
    const geo = jitterGeo(new THREE.ConeGeometry(1, 1, 7, 4), 0.35, i * 3.1);
    const base = H(mx, mz) - 1;
    b.add(geo, mountainColor(base, h), [mx, base + h / 2, mz], [rad, h, rad * (0.8 + r() * 0.4)], [0, r() * 3, 0]);
    geo.dispose();
  });
  if (kind === "city") {
    // cakrawala gedung pencakar langit di kejauhan
    for (let i = 0; i < 40; i++) {
      const x = (r() - 0.5) * 160;
      const z = -70 - r() * 30;
      const h = 8 + r() * 26;
      const w = 3 + r() * 6;
      b.add(G.box, shade("#6b7280", (r() - 0.5) * 0.1), [x, h / 2 - 1, z], [w, h, w]);
      for (let k = 0; k < 4; k++) if (r() < 0.6) b.add(G.box, "#fde68a", [x + (r() - 0.5) * w * 0.7, 2 + r() * (h - 3), z + w / 2 + 0.05], [0.6, 0.5, 0.1], [0, 0, 0], "glow");
    }
  }
  if (kind === "volcano") {
    // gunung berapi besar dengan kawah lava
    const vx = 18, vz = -62, vh = 24;
    const vg = jitterGeo(new THREE.CylinderGeometry(4, 18, 1, 10, 4), 0.2, 5);
    b.add(vg, (y) => (y > vh - 4 ? "#3a1d14" : shade("#2b1a16", y / vh * 0.06)), [vx, vh / 2 - 1, vz], [1, vh, 1]);
    vg.dispose();
    b.add(G.circle, "#ff5a1f", [vx, vh - 0.6, vz], [3.8, 3.8, 1], [-Math.PI / 2, 0, 0], "glow");
    for (let i = 0; i < 5; i++) {
      const a = -0.6 + i * 0.3;
      b.add(G.box, "#ff7a1f", [vx + Math.sin(a) * 8, vh * 0.55, vz + Math.cos(a) * 8], [0.7, vh * 0.55, 0.3], [Math.cos(a) * 0.55, a, -Math.sin(a) * 0.55], "glow");
    }
  }
  if (kind === "desert") {
    pyramid(b, -26, H(-26, -55), -55, 1.4, r);
    pyramid(b, -14, H(-14, -66), -66, 1.0, r);
    pyramid(b, 24, H(24, -60), -60, 1.2, r);
  }
  if (kind === "temple") {
    pagoda(b, -12, H(-12, -34), -34, 1.5, r);
    pagoda(b, 13, H(13, -40), -40, 1.7, r);
    pagoda(b, -20, H(-20, -12), -12, 1.2, r);
    pagoda(b, 21, H(21, -6), -6, 1.1, r);
  }

  // ── 3. properti khas dunia ──
  const occupied: [number, number, number][] = [];
  for (const spec of themeProps(kind)) {
    let placed = 0;
    let guard = 0;
    while (placed < spec.count && guard++ < spec.count * 30) {
      const side = r() < 0.5 ? -1 : 1;
      const near = spec.near ?? 1.4;
      const far = spec.far ?? 26;
      const off = near + Math.pow(r(), 1.3) * (far - near);
      const x = side * (LANE_HALF + 0.9 + off);
      const z = 14 - r() * 82;
      // jangan menutupi benteng pemain di depan kamera
      if (z > 6 && Math.abs(x) < LANE_HALF + 3.5) continue;
      const s = spec.scale[0] + r() * (spec.scale[1] - spec.scale[0]);
      if (occupied.some(([ox, oz, os]) => (ox - x) ** 2 + (oz - z) ** 2 < (0.9 * (os + s)) ** 2)) continue;
      occupied.push([x, z, s]);
      spec.fn(b, x, H(x, z), z, s, r);
      placed++;
    }
  }
  if (kind === "city") {
    // gedung runtuh berjajar di kedua sisi
    for (let i = 0; i < 26; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (LANE_HALF + 5 + r() * 14);
      const z = 10 - Math.floor(i / 2) * 6.4 - r() * 2;
      building(-side)(b, x, H(x, z), z, 1 + r() * 0.3, r);
    }
  }

  const litMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0.05 });
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const lit = b.build("lit", litMat);
  const glow = b.build("glow", glowMat);
  if (lit) {
    lit.castShadow = true;
    lit.receiveShadow = true;
    group.add(lit);
    disposables.push(lit.geometry);
  }
  if (glow) {
    group.add(glow);
    disposables.push(glow.geometry);
  }
  disposables.push(litMat, glowMat);

  // ── 4. air: sungai (hutan), oasis (gurun), danau es (salju) ──
  let water: THREE.Mesh | null = null;
  if (kind === "forest" || kind === "desert" || kind === "snow" || kind === "temple") {
    const spot: Record<string, [number, number, number, number]> = {
      forest: [-13, -24, 7, 1.8],
      desert: [10.5, -16, 4, 1.2],
      snow: [-13, -26, 6, 1.3],
      temple: [11, -22, 5, 1.4],
    };
    const [wx, wz, wr, stretch] = spot[kind];
    // tinggi air = sedikit di atas titik terendah → garis pantai mengikuti bukit
    let minH = Infinity;
    let sum = 0;
    let cnt = 0;
    for (let a = 0; a < 16; a++)
      for (const k of [0.3, 0.7, 1]) {
        const h = H(wx + Math.cos(a / 16 * Math.PI * 2) * wr * k, wz + Math.sin(a / 16 * Math.PI * 2) * wr * stretch * k);
        minH = Math.min(minH, h);
        sum += h;
        cnt++;
      }
    const wy = minH * 0.55 + (sum / cnt) * 0.45 + 0.05;
    const wGeo = new THREE.CircleGeometry(wr, 28);
    const wMat = new THREE.MeshStandardMaterial({
      color: kind === "snow" ? "#bfe6ff" : kind === "temple" ? "#5eb8d6" : "#3aa0d8",
      roughness: kind === "snow" ? 0.15 : 0.08,
      metalness: 0.2,
      transparent: true,
      opacity: kind === "snow" ? 0.92 : 0.82,
    });
    water = new THREE.Mesh(wGeo, wMat);
    water.rotation.x = -Math.PI / 2;
    water.scale.set(1, stretch, 1);
    water.position.set(wx, wy, wz);
    group.add(water);
    disposables.push(wGeo, wMat);
  }

  // ── 5. awan bergerak ──
  const clouds: THREE.Group[] = [];
  if (T.clouds > 0) {
    const cMat = new THREE.MeshLambertMaterial({ color: T.cloudColor, emissive: T.cloudColor, emissiveIntensity: kind === "volcano" ? 0.05 : 0.35, flatShading: true });
    disposables.push(cMat);
    for (let i = 0; i < T.clouds; i++) {
      const cg = new THREE.Group();
      const puffs = 4 + Math.floor(r() * 3);
      for (let k = 0; k < puffs; k++) {
        const m = new THREE.Mesh(G.ico1, cMat);
        const s = 1.4 + r() * 1.6;
        m.position.set((k - puffs / 2) * 1.5 + r(), r() * 0.8, r() * 1.2);
        m.scale.set(s * 1.3, s * 0.8, s);
        cg.add(m);
      }
      cg.position.set((r() - 0.5) * 90, 16 + r() * 10, -30 - r() * 55);
      cg.userData.speed = 0.6 + r() * 0.9;
      group.add(cg);
      clouds.push(cg);
    }
  }

  // ── 6. objek melayang: batu (dimensi gelap), planet, asap gunung ──
  const floaters: THREE.Object3D[] = [];
  if (kind === "dark" || kind === "crystal") {
    const rockMat = new THREE.MeshStandardMaterial({ color: kind === "dark" ? "#2a1d45" : "#3b2a6b", flatShading: true, roughness: 0.9 });
    const topMat = new THREE.MeshBasicMaterial({ color: kind === "dark" ? "#e11d48" : "#22d3ee", toneMapped: false });
    disposables.push(rockMat, topMat);
    for (let i = 0; i < 12; i++) {
      const fg = new THREE.Group();
      const bottom = new THREE.Mesh(G.cone7, rockMat);
      bottom.rotation.x = Math.PI;
      bottom.scale.set(1.4, 2.2, 1.4);
      const top = new THREE.Mesh(G.octa, topMat);
      top.position.y = 1.4;
      top.scale.set(0.35, 0.9, 0.35);
      fg.add(bottom, top);
      const side = i % 2 === 0 ? -1 : 1;
      const s = 0.6 + r() * 1.1;
      fg.scale.setScalar(s);
      fg.position.set(side * (LANE_HALF + 6 + r() * 18), 5 + r() * 9, 8 - r() * 70);
      fg.userData.baseY = fg.position.y;
      fg.userData.phase = r() * 6;
      group.add(fg);
      floaters.push(fg);
    }
  }
  if (kind === "dark" || kind === "crystal") {
    const planetMat = new THREE.MeshBasicMaterial({ color: kind === "dark" ? "#7c3aed" : "#f0abfc", toneMapped: false, fog: false });
    const ringMat = new THREE.MeshBasicMaterial({ color: "#fda4af", toneMapped: false, fog: false, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    disposables.push(planetMat, ringMat);
    const planet = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), planetMat);
    planet.position.set(-30, 34, -95);
    const pr = new THREE.Mesh(new THREE.RingGeometry(9, 12, 40), ringMat);
    pr.rotation.x = -1.2;
    planet.add(pr);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 12), new THREE.MeshBasicMaterial({ color: "#fef3c7", fog: false, toneMapped: false }));
    moon.position.set(32, 40, -100);
    group.add(planet, moon);
    disposables.push(planet.geometry, pr.geometry, moon.geometry, moon.material as THREE.Material);
    floaters.push(planet);
  }
  const smoke: THREE.Mesh[] = [];
  if (kind === "volcano") {
    const sMat = new THREE.MeshLambertMaterial({ color: "#3b302e", transparent: true, opacity: 0.6, flatShading: true });
    disposables.push(sMat);
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(G.ico1, sMat);
      m.userData.t = i / 10;
      group.add(m);
      smoke.push(m);
    }
  }

  // ── 7. partikel cuaca ──
  let points: THREE.Points | null = null;
  let pVel: Float32Array | null = null;
  if (T.particles) {
    const P = T.particles;
    const pos = new Float32Array(P.count * 3);
    pVel = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) {
      pos[i * 3] = (r() - 0.5) * 40;
      pos[i * 3 + 1] = r() * 14;
      pos[i * 3 + 2] = 14 - r() * 60;
      pVel[i] = 0.6 + r() * 0.8;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: P.color, size: P.size, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
    points = new THREE.Points(pGeo, pMat);
    points.frustumCulled = false;
    group.add(points);
    disposables.push(pGeo, pMat);
  }

  return {
    group,
    look: T,
    update(dt: number, time: number) {
      for (const c of clouds) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 55) c.position.x = -55;
      }
      for (const f of floaters) {
        if (f.userData.baseY !== undefined) {
          f.position.y = f.userData.baseY + Math.sin(time * 0.8 + f.userData.phase) * 0.6;
          f.rotation.y += dt * 0.25;
        } else {
          f.rotation.y += dt * 0.05;
        }
      }
      for (const m of smoke) {
        const t = (m.userData.t + time * 0.06) % 1;
        m.position.set(18 + Math.sin(t * 6 + m.userData.t * 9) * 2 + t * 6, 24 + t * 22, -62 - t * 4);
        const s = 1.5 + t * 5;
        m.scale.set(s, s * 0.8, s);
        (m.material as THREE.MeshLambertMaterial).opacity = 0.55;
      }
      // cahaya berdenyut: lava, kristal, jendela
      glowMat.color.setScalar(0.85 + Math.sin(time * 2.2) * 0.15);
      if (water) (water.material as THREE.MeshStandardMaterial).opacity = (kind === "snow" ? 0.9 : 0.78) + Math.sin(time * 1.5) * 0.04;
      if (points && pVel && T.particles) {
        const P = T.particles;
        const arr = (points.geometry.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < P.count; i++) {
          const v = pVel[i];
          arr[i * 3] += (P.vx * v + Math.sin(time + i) * 0.15) * dt;
          arr[i * 3 + 1] += P.vy * v * dt;
          if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] += 14;
          if (arr[i * 3 + 1] > 14) arr[i * 3 + 1] -= 14;
          if (arr[i * 3] > 20) arr[i * 3] -= 40;
          if (arr[i * 3] < -20) arr[i * 3] += 40;
        }
        points.geometry.getAttribute("position").needsUpdate = true;
        if (P.twinkle) (points.material as THREE.PointsMaterial).opacity = 0.65 + Math.sin(time * 3) * 0.25;
      }
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
