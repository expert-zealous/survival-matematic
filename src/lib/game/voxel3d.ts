// ─────────────────────────────────────────────────────────────
//  PNG/JPG → monster 3D (voxel bervolume dengan tangan & kaki).
//
//  1. HAPUS LATAR otomatis: warna latar dideteksi dari tepi gambar
//     (putih, abu, atau warna polos lain), lalu flood-fill dari tepi
//     sehingga hanya tubuh monster yang tersisa. Jadi gambar JPEG
//     berlatar putih pun TIDAK lagi menjadi kotak putih.
//  2. BADAN MENGGEMBUNG: ketebalan setiap piksel dihitung dari jarak
//     ke tepi siluet (distance transform) → tengah badan tebal,
//     pinggir tipis → bentuk bulat seperti patung 3D, bukan lempeng.
//  3. RANGKA: piksel dipisah menjadi kaki kiri/kanan, lengan kiri/kanan
//     dan badan, masing-masing dengan sendi (pinggul/bahu) sehingga
//     monster bisa MELANGKAH, MENGAYUN TANGAN, dan MENGHANTAM.
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";

export interface VoxelCell {
  dx: number; // -0.5..0.5 relatif lebar siluet
  dy: number; // 0 = telapak kaki .. 1 = ubun-ubun
  t: number; // ketebalan relatif 0..1
  r: number;
  g: number;
  b: number;
}

export interface VoxelData {
  cells: VoxelCell[];
  cols: number;
  rows: number;
  aspect: number; // cols / rows
}

export type LimbName = "body" | "legL" | "legR" | "armL" | "armR";

const dataCache = new Map<string, Promise<VoxelData | null>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img load fail"));
    img.src = url;
  });
}

/** Warna latar = warna terbanyak (dikuantisasi) di sepanjang tepi gambar. */
function detectBackground(px: Uint8ClampedArray, w: number, h: number): [number, number, number] | null {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let opaque = 0;
  let total = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    total++;
    if (px[i + 3] < 40) return;
    opaque++;
    const key = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    b.n++;
    b.r += px[i];
    b.g += px[i + 1];
    b.b += px[i + 2];
    buckets.set(key, b);
  };
  for (let x = 0; x < w; x++) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    sample(0, y);
    sample(w - 1, y);
  }
  // tepi mayoritas transparan → PNG sudah bersih, tak perlu hapus latar
  if (opaque < total * 0.5) return null;
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
  if (!best) return null;
  return [best.r / best.n, best.g / best.n, best.b / best.n];
}

/**
 * Ubah gambar menjadi data voxel 3D. Hasil di-cache per URL.
 * @param res resolusi kerja maksimum (sisi terpanjang, piksel)
 */
export function fetchVoxelData(url: string, res = 64): Promise<VoxelData | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  let p = dataCache.get(url);
  if (!p) {
    p = (async (): Promise<VoxelData | null> => {
      try {
        const img = await loadImage(url);
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        if (!iw || !ih) return null;
        const scale = Math.min(1, res / Math.max(iw, ih));
        const w = Math.max(12, Math.round(iw * scale));
        const h = Math.max(12, Math.round(ih * scale));
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return null;
        g.imageSmoothingQuality = "high";
        g.drawImage(img, 0, 0, w, h);
        const px = g.getImageData(0, 0, w, h).data;
        const n = w * h;

        // ── 1. mask foreground ──
        const fg = new Uint8Array(n);
        for (let i = 0; i < n; i++) fg[i] = px[i * 4 + 3] >= 40 ? 1 : 0;
        const bg = detectBackground(px, w, h);
        if (bg) {
          const dist = (i: number) => {
            const dr = px[i * 4] - bg[0];
            const dg = px[i * 4 + 1] - bg[1];
            const db = px[i * 4 + 2] - bg[2];
            return Math.sqrt(dr * dr + dg * dg + db * db);
          };
          const T = 58;
          const seen = new Uint8Array(n);
          const queue = new Int32Array(n);
          let qh = 0;
          let qt = 0;
          const push = (i: number) => {
            if (seen[i]) return;
            seen[i] = 1;
            if (fg[i] && dist(i) > T) return;
            fg[i] = 0;
            queue[qt++] = i;
          };
          for (let x = 0; x < w; x++) {
            push(x);
            push((h - 1) * w + x);
          }
          for (let y = 0; y < h; y++) {
            push(y * w);
            push(y * w + w - 1);
          }
          while (qh < qt) {
            const i = queue[qh++];
            const x = i % w;
            const y = (i - x) / w;
            if (x > 0) push(i - 1);
            if (x < w - 1) push(i + 1);
            if (y > 0) push(i - w);
            if (y < h - 1) push(i + w);
          }
          // halo anti-alias: piksel tepi yang masih mirip latar ikut dibuang
          const halo: number[] = [];
          for (let i = 0; i < n; i++) {
            if (!fg[i]) continue;
            const x = i % w;
            const y = (i - x) / w;
            const edge = (x > 0 && !fg[i - 1]) || (x < w - 1 && !fg[i + 1]) || (y > 0 && !fg[i - w]) || (y < h - 1 && !fg[i + w]);
            if (edge && dist(i) < T * 1.7) halo.push(i);
          }
          for (const i of halo) fg[i] = 0;
        }

        // ── 2. simpan komponen terbesar saja (buang bintik/teks/bayangan lepas) ──
        const label = new Int32Array(n).fill(-1);
        let bestLabel = -1;
        let bestSize = 0;
        const stack = new Int32Array(n);
        let lab = 0;
        for (let s = 0; s < n; s++) {
          if (!fg[s] || label[s] !== -1) continue;
          let sp = 0;
          let size = 0;
          stack[sp++] = s;
          label[s] = lab;
          while (sp > 0) {
            const i = stack[--sp];
            size++;
            const x = i % w;
            const y = (i - x) / w;
            const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
            for (const j of nb) {
              if (j >= 0 && fg[j] && label[j] === -1) {
                label[j] = lab;
                stack[sp++] = j;
              }
            }
          }
          if (size > bestSize) {
            bestSize = size;
            bestLabel = lab;
          }
          lab++;
        }
        if (bestLabel < 0 || bestSize < n * 0.02) return null;
        for (let i = 0; i < n; i++) fg[i] = label[i] === bestLabel ? 1 : 0;

        // ── 3. distance transform (chamfer 3-4) → ketebalan bulat ──
        const INF = 1e9;
        const d = new Float32Array(n);
        for (let i = 0; i < n; i++) d[i] = fg[i] ? INF : 0;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (!d[i]) continue;
            let v = d[i];
            v = Math.min(v, x > 0 ? d[i - 1] + 3 : 3, y > 0 ? d[i - w] + 3 : 3);
            v = Math.min(v, x > 0 && y > 0 ? d[i - w - 1] + 4 : 4, x < w - 1 && y > 0 ? d[i - w + 1] + 4 : 4);
            d[i] = v;
          }
        for (let y = h - 1; y >= 0; y--)
          for (let x = w - 1; x >= 0; x--) {
            const i = y * w + x;
            if (!d[i]) continue;
            let v = d[i];
            v = Math.min(v, x < w - 1 ? d[i + 1] + 3 : 3, y < h - 1 ? d[i + w] + 3 : 3);
            v = Math.min(v, x < w - 1 && y < h - 1 ? d[i + w + 1] + 4 : 4, x > 0 && y < h - 1 ? d[i + w - 1] + 4 : 4);
            d[i] = v;
          }
        let minX = w, maxX = -1, minY = h, maxY = -1, maxD = 1;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (!fg[i]) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            if (d[i] > maxD) maxD = d[i];
          }
        const cols = maxX - minX + 1;
        const rows = maxY - minY + 1;
        const cells: VoxelCell[] = [];
        for (let y = minY; y <= maxY; y++)
          for (let x = minX; x <= maxX; x++) {
            const i = y * w + x;
            if (!fg[i]) continue;
            const a = px[i * 4 + 3] / 255;
            cells.push({
              dx: (x - minX + 0.5) / cols - 0.5,
              dy: 1 - (y - minY + 0.5) / rows,
              t: Math.sqrt(Math.min(1, d[i] / maxD)),
              r: Math.round(px[i * 4] * a + 128 * (1 - a)),
              g: Math.round(px[i * 4 + 1] * a + 128 * (1 - a)),
              b: Math.round(px[i * 4 + 2] * a + 128 * (1 - a)),
            });
          }
        if (cells.length === 0) return null;
        return { cells, cols, rows, aspect: cols / rows };
      } catch {
        return null;
      }
    })();
    dataCache.set(url, p);
  }
  return p;
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);

export interface VoxelMeshOptions {
  /** tinggi dunia (satuan three) */
  height: number;
  /** ketebalan maksimum badan relatif terhadap lebar (0.3–0.85), bawaan 0.55 */
  depth?: number;
  /** batas lebar; bila siluet terlalu lebar, tinggi ikut diperkecil agar proporsi tetap */
  maxWidth?: number;
}

function limbOf(c: VoxelCell): LimbName {
  if (c.dy < 0.3) return c.dx < 0 ? "legL" : "legR";
  if (c.dy < 0.8 && Math.abs(c.dx) > 0.26) return c.dx < 0 ? "armL" : "armR";
  return "body";
}

/**
 * Bangun monster 3D dari data voxel. Grup berdiri di y=0, wajah gambar
 * menghadap +Z. Sendi tersimpan di `group.userData.limbs`.
 */
export function buildVoxelGroup(data: VoxelData, opts: VoxelMeshOptions): THREE.Group {
  const root = new THREE.Group();
  const depthRatio = Math.min(0.85, Math.max(0.3, opts.depth ?? 0.55));
  let height = opts.height;
  let width = height * data.aspect;
  if (opts.maxWidth && width > opts.maxWidth) {
    height *= opts.maxWidth / width;
    width = opts.maxWidth;
  }
  const voxel = height / data.rows;
  const maxThick = Math.max(voxel * 2, width * depthRatio);
  const pivots: Record<LimbName, THREE.Vector3> = {
    body: new THREE.Vector3(0, 0, 0),
    legL: new THREE.Vector3(-0.13 * width, 0.3 * height, 0),
    legR: new THREE.Vector3(0.13 * width, 0.3 * height, 0),
    armL: new THREE.Vector3(-0.26 * width, 0.78 * height, 0),
    armR: new THREE.Vector3(0.26 * width, 0.78 * height, 0),
  };
  const groups: Partial<Record<LimbName, VoxelCell[]>> = {};
  for (const c of data.cells) (groups[limbOf(c)] ??= []).push(c);
  // kalau kaki/lengan terlalu kecil (pose aneh), gabungkan ke badan
  for (const k of ["legL", "legR", "armL", "armR"] as LimbName[]) {
    const list = groups[k];
    if (list && list.length < data.cells.length * 0.025) {
      (groups.body ??= []).push(...list);
      delete groups[k];
    }
  }
  const limbs: Partial<Record<LimbName, THREE.Group>> = {};
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.68, metalness: 0.06 });
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  for (const name of Object.keys(groups) as LimbName[]) {
    const list = groups[name]!;
    const pivot = new THREE.Group();
    pivot.position.copy(pivots[name]);
    const mesh = new THREE.InstancedMesh(boxGeo, mat, list.length);
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      const thick = Math.max(voxel * 1.6, maxThick * v.t);
      dummy.position.set(v.dx * width - pivots[name].x, v.dy * height - pivots[name].y, 0);
      dummy.scale.set(voxel * 1.04, voxel * 1.04, thick);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      col.setRGB(v.r / 255, v.g / 255, v.b / 255, THREE.SRGBColorSpace);
      // pinggir sedikit lebih gelap → kesan membulat
      col.multiplyScalar(0.72 + 0.28 * v.t);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    pivot.add(mesh);
    root.add(pivot);
    limbs[name] = pivot;
  }
  root.userData.limbs = limbs;
  root.userData.voxelHeight = height;
  return root;
}

export interface VoxelPose {
  walk: number; // fase langkah (radian, terus bertambah)
  stride: number; // 0..1 besar langkah
  windup: number; // 0..1 angkat tangan
  slam: number; // 0..1 hantam
}

/** Gerakkan sendi: kaki melangkah bergantian, tangan mengayun, lalu menghantam. */
export function poseVoxelGroup(group: THREE.Group, pose: VoxelPose) {
  const limbs = group.userData.limbs as Partial<Record<LimbName, THREE.Group>> | undefined;
  if (!limbs) return;
  const s = Math.sin(pose.walk) * pose.stride;
  const attacking = Math.max(pose.windup, pose.slam);
  if (limbs.legL) limbs.legL.rotation.x = s * 0.55;
  if (limbs.legR) limbs.legR.rotation.x = -s * 0.55;
  // ayunan normal → angkat tinggi (windup) → pukul ke depan-bawah (slam)
  const armBase = (1 - attacking) * 0.45;
  const armAtk = -2.6 * pose.windup - 0.9 * pose.slam;
  if (limbs.armL) {
    limbs.armL.rotation.x = -s * armBase + armAtk;
    limbs.armL.rotation.z = -0.25 * pose.windup;
  }
  if (limbs.armR) {
    limbs.armR.rotation.x = s * armBase + armAtk;
    limbs.armR.rotation.z = 0.25 * pose.windup;
  }
  if (limbs.body) {
    limbs.body.rotation.x = -0.12 * pose.windup + 0.22 * pose.slam;
    limbs.body.position.y = Math.abs(s) * 0.04;
  }
}

/** Buang mesh voxel beserta materialnya. */
export function disposeVoxelGroup(group: THREE.Group) {
  const mats = new Set<THREE.Material>();
  group.traverse((o) => {
    const m = o as THREE.InstancedMesh;
    if (m.isInstancedMesh) {
      m.dispose();
      const mt = m.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mt)) mt.forEach((x) => mats.add(x));
      else mats.add(mt);
    }
  });
  mats.forEach((m) => m.dispose());
}
