// ─────────────────────────────────────────────────────────────
//  Static game data: maps, bosses, weapons, ranks, balance curve
// ─────────────────────────────────────────────────────────────

export interface MapTheme {
  name: string;
  sky: [string, string];
  side: string;
  ground: string;
  stripe: string;
  fence: string;
  deco: string[];
  accent: string;
}

export const MAPS: MapTheme[] = [
  {
    name: "Gurun Pasir",
    sky: ["#f8c572", "#f29b4b"],
    side: "#d9a86a",
    ground: "#8d8d8d",
    stripe: "#9a9a9a",
    fence: "#7a4a1c",
    deco: ["🌵", "🪨", "🌴"],
    accent: "#f59e0b",
  },
  {
    name: "Hutan Rimba",
    sky: ["#7ddc8a", "#2f9e52"],
    side: "#3d8c3f",
    ground: "#6b6b63",
    stripe: "#787870",
    fence: "#4b3621",
    deco: ["🌲", "🌳", "🍄"],
    accent: "#22c55e",
  },
  {
    name: "Pegunungan Salju",
    sky: ["#dff3ff", "#8fc5ee"],
    side: "#e8f3fb",
    ground: "#8aa0b3",
    stripe: "#97adbf",
    fence: "#4b5563",
    deco: ["❄️", "🌨️", "⛄"],
    accent: "#38bdf8",
  },
  {
    name: "Gua Kristal",
    sky: ["#3b2a6b", "#1b1240"],
    side: "#2d1f57",
    ground: "#4b3f73",
    stripe: "#574a82",
    fence: "#7c3aed",
    deco: ["💎", "🔮", "✨"],
    accent: "#a855f7",
  },
  {
    name: "Gunung Berapi",
    sky: ["#ff7a3d", "#4a1010"],
    side: "#5a1c12",
    ground: "#3f3f3f",
    stripe: "#4d4d4d",
    fence: "#b91c1c",
    deco: ["🌋", "🔥", "🪨"],
    accent: "#f97316",
  },
  {
    name: "Kota Terbengkalai",
    sky: ["#9aa3ad", "#4a5460"],
    side: "#5b6670",
    ground: "#565c63",
    stripe: "#636a72",
    fence: "#2b3238",
    deco: ["🏚️", "🚧", "🛢️"],
    accent: "#94a3b8",
  },
  {
    name: "Kuil Emas",
    sky: ["#ffe29a", "#d08b1a"],
    side: "#b7791f",
    ground: "#7c6a4a",
    stripe: "#8a7756",
    fence: "#fbbf24",
    deco: ["🏯", "🪔", "🗿"],
    accent: "#fbbf24",
  },
  {
    name: "Dimensi Kegelapan",
    sky: ["#1e1b4b", "#020617"],
    side: "#0f0a2e",
    ground: "#1f1b3a",
    stripe: "#2a2550",
    fence: "#e11d48",
    deco: ["🌌", "🪐", "☄️"],
    accent: "#e11d48",
  },
];

export type BossSpecial = "frost" | "ambush" | "heads" | "elite" | "rush";

export interface BossDef {
  name: string;
  title: string;
  emoji: string;
  color: string;
  glow: string;
  hpMult: number;
  spawnMult: number;
  specials: BossSpecial[];
  desc: string;
}

// Ordered from the easiest to the hardest (boss ranking).
export const BOSSES: BossDef[] = [
  {
    name: "Goblin Pencuri",
    title: "Bos Pemula",
    emoji: "👺",
    color: "#22c55e",
    glow: "#86efac",
    hpMult: 1,
    spawnMult: 1,
    specials: [],
    desc: "Lemah tapi licik. Cocok untuk latihan hitung cepat.",
  },
  {
    name: "Kapten Bajak Laut",
    title: "Penguasa Lautan",
    emoji: "🏴‍☠️",
    color: "#94a3b8",
    glow: "#e2e8f0",
    hpMult: 1.15,
    spawnMult: 1.1,
    specials: ["rush"],
    desc: "Mengirim pelari cepat bertubi-tubi.",
  },
  {
    name: "Golem Batu",
    title: "Benteng Berjalan",
    emoji: "🗿",
    color: "#a16207",
    glow: "#fde68a",
    hpMult: 1.4,
    spawnMult: 0.9,
    specials: ["elite"],
    desc: "Pasukan raksasa berkulit batu yang sulit ditembus.",
  },
  {
    name: "Ratu Laba-laba",
    title: "Penenun Maut",
    emoji: "🕷️",
    color: "#7c3aed",
    glow: "#c4b5fd",
    hpMult: 1.3,
    spawnMult: 1.35,
    specials: ["ambush"],
    desc: "Anak laba-laba muncul dari tengah lapangan!",
  },
  {
    name: "Naga Es",
    title: "Nafas Beku",
    emoji: "🐉",
    color: "#0ea5e9",
    glow: "#bae6fd",
    hpMult: 1.5,
    spawnMult: 1.1,
    specials: ["frost"],
    desc: "Membekukan pasukanmu secara berkala.",
  },
  {
    name: "Raja Lava",
    title: "Amarah Gunung",
    emoji: "🔥",
    color: "#ea580c",
    glow: "#fed7aa",
    hpMult: 1.6,
    spawnMult: 1.2,
    specials: ["rush", "elite"],
    desc: "Pelari api dan prajurit lava datang bersamaan.",
  },
  {
    name: "Titan Emas",
    title: "Raksasa Legenda",
    emoji: "💪",
    color: "#f59e0b",
    glow: "#fef08a",
    hpMult: 1.85,
    spawnMult: 1.2,
    specials: ["elite", "heads"],
    desc: "Tubuh emasnya memanggil pasukan setiap kali terluka.",
  },
  {
    name: "Penyihir Bayangan",
    title: "Tuan Ilusi",
    emoji: "🧙",
    color: "#6d28d9",
    glow: "#ddd6fe",
    hpMult: 1.75,
    spawnMult: 1.4,
    specials: ["ambush", "frost"],
    desc: "Teleportasi pasukan dan sihir beku.",
  },
  {
    name: "Hydra Kristal",
    title: "Berkepala Sembilan",
    emoji: "🐍",
    color: "#06b6d4",
    glow: "#a5f3fc",
    hpMult: 2.1,
    spawnMult: 1.3,
    specials: ["heads", "rush"],
    desc: "Setiap kepala yang jatuh melahirkan gelombang baru.",
  },
  {
    name: "Dewa Kehancuran",
    title: "Akhir Segalanya",
    emoji: "💀",
    color: "#dc2626",
    glow: "#fecaca",
    hpMult: 2.6,
    spawnMult: 1.5,
    specials: ["frost", "ambush", "heads", "elite", "rush"],
    desc: "Menguasai semua kekuatan bos sebelumnya.",
  },
];

export interface WeaponDef {
  name: string;
  power: number;
  barrels: number;
  rate: number; // seconds between shots
  color: string;
  emoji: string;
}

const WEAPON_TABLE: WeaponDef[] = [
  { name: "Ketapel Kayu", power: 1, barrels: 1, rate: 0.5, color: "#a16207", emoji: "🪵" },
  { name: "Meriam Besi", power: 1, barrels: 1, rate: 0.4, color: "#64748b", emoji: "⚙️" },
  { name: "Meriam Ganda", power: 1, barrels: 2, rate: 0.4, color: "#2563eb", emoji: "🔩" },
  { name: "Meriam Api", power: 2, barrels: 2, rate: 0.38, color: "#f97316", emoji: "🔥" },
  { name: "Meriam Kristal", power: 2, barrels: 3, rate: 0.35, color: "#a855f7", emoji: "💎" },
  { name: "Meriam Plasma", power: 3, barrels: 3, rate: 0.3, color: "#06b6d4", emoji: "⚡" },
  { name: "Meriam Petir", power: 4, barrels: 3, rate: 0.27, color: "#facc15", emoji: "🌩️" },
  { name: "Meriam Naga", power: 5, barrels: 4, rate: 0.25, color: "#dc2626", emoji: "🐲" },
  { name: "Meriam Dewa", power: 7, barrels: 4, rate: 0.22, color: "#fbbf24", emoji: "👑" },
  { name: "Meriam Kosmik", power: 9, barrels: 5, rate: 0.2, color: "#e879f9", emoji: "🌌" },
];

export function getWeapon(level: number): WeaponDef & { level: number } {
  const idx = Math.max(1, Math.floor(level)) - 1;
  if (idx < WEAPON_TABLE.length) return { ...WEAPON_TABLE[idx], level };
  const extra = idx - WEAPON_TABLE.length + 1;
  const base = WEAPON_TABLE[WEAPON_TABLE.length - 1];
  return {
    ...base,
    name: `${base.name} +${extra}`,
    power: base.power + extra * 3,
    level,
  };
}

export interface RankDef {
  name: string;
  min: number;
  color: string;
  icon: string;
  weapon: number; // starting weapon level
  hp: number; // starting fortress HP
  startLevel: number; // highest checkpoint allowed by rank
}

export const RANKS: RankDef[] = [
  { name: "Perunggu", min: 0, color: "#cd7f32", icon: "🥉", weapon: 1, hp: 100, startLevel: 1 },
  { name: "Perak", min: 3500, color: "#c0c0c0", icon: "🥈", weapon: 3, hp: 110, startLevel: 4 },
  { name: "Emas", min: 13000, color: "#ffd700", icon: "🥇", weapon: 6, hp: 120, startLevel: 7 },
  { name: "Platinum", min: 30000, color: "#8fd3f4", icon: "💠", weapon: 8, hp: 135, startLevel: 10 },
  { name: "Berlian", min: 65000, color: "#60a5fa", icon: "💎", weapon: 10, hp: 150, startLevel: 13 },
  { name: "Master", min: 150000, color: "#a855f7", icon: "🔮", weapon: 13, hp: 170, startLevel: 16 },
  { name: "Grandmaster", min: 260000, color: "#ef4444", icon: "👑", weapon: 15, hp: 190, startLevel: 19 },
  { name: "Legenda", min: 400000, color: "#f59e0b", icon: "🌟", weapon: 18, hp: 220, startLevel: 22 },
];

export function getRankIndex(bestScore: number): number {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (bestScore >= RANKS[i].min) idx = i;
  return idx;
}

export function getRank(bestScore: number): RankDef & { index: number; next: RankDef | null; progress: number } {
  const index = getRankIndex(bestScore);
  const rank = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  const progress = next ? Math.min(1, (bestScore - rank.min) / (next.min - rank.min)) : 1;
  return { ...rank, index, next, progress };
}

// ── Level helpers ─────────────────────────────────────────────
export function mapForLevel(level: number): MapTheme {
  return MAPS[(level - 1) % MAPS.length];
}
export function bossIndexForLevel(level: number): number {
  return (level - 1) % BOSSES.length;
}
export function bossTierForLevel(level: number): number {
  return Math.floor((level - 1) / BOSSES.length) + 1;
}
export function romanTier(t: number): string {
  return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][t] ?? `${t}`;
}

// ── Balance curve (all difficulty tuning lives here) ──────────
//
//  FILOSOFI (revisi keseimbangan):
//   1. Tiap stage = GELOMBANG PASUKAN panjang → BOS 1 + pasukan besar di belakangnya →
//      gelombang lagi → BOS 2 + pasukan → … → BOS AKHIR + pasukan. Stage baru selesai
//      setelah SEMUA lawan habis.
//   2. Durasi stage dikendalikan WAKTU (lama gelombang & lama duel bos), bukan HP yang
//      meledak, sehingga makin tinggi level → makin panjang & seru, TANPA dinding mendadak.
//   3. Kekuatan lawan MENYESUAIKAN kekuatan pemain (adaptif), jadi tidak ada level yang
//      tiba-tiba mustahil; pemain yang rajin menjawab benar tetap unggul (kombo, raksasa,
//      pasukan berlipat).

/** Angka penyetel — diekspor agar bisa dikalibrasi lewat simulasi. */
export const TUNE = {
  /** damage efektif per 1 "raw dps" meriam (gerbang pengali + kerumunan) ≈ hasil ukur simulasi */
  effMul: 30,
  /** porsi senjata PEMAIN dalam level referensi lawan (sisanya level ideal) */
  adaptive: 0.9,
  /** pengali umum durasi duel bos */
  fightScale: 1,
  /** pengali tekanan pasukan */
  pressureScale: 2.5,
};

function rawDps(weaponLevel: number): number {
  const w = getWeapon(Math.max(1, Math.round(weaponLevel)));
  return (w.power * w.barrels) / w.rate;
}
function expectedWeaponOf(level: number): number {
  return 1 + Math.round(level * 0.8);
}
function expectedRawOf(level: number): number {
  return rawDps(expectedWeaponOf(level));
}

export const BALANCE = {
  /** Level senjata pemain "ideal" pada level ini. */
  expectedWeapon(level: number): number {
    return expectedWeaponOf(level);
  },
  /** Keluaran mentah meriam per detik untuk level senjata tertentu. */
  rawDps,
  /** Keluaran mentah yang diharapkan pada level ini. */
  expectedRaw(level: number): number {
    return expectedRawOf(level);
  },
  /**
   * Keluaran REFERENSI yang dipakai untuk mengukur kekuatan lawan. Bila senjata pemain
   * diketahui, referensi = campuran senjata ideal & senjata pemain → adaptif, tanpa dinding.
   */
  refRaw(level: number, weaponLevel?: number): number {
    if (weaponLevel === undefined) return BALANCE.expectedRaw(level);
    const e = BALANCE.expectedWeapon(level);
    return rawDps((1 - TUNE.adaptive) * e + TUNE.adaptive * weaponLevel);
  },

  // ── STRUKTUR STAGE ─────────────────────────────────────────
  /** Jumlah bos per stage (termasuk bos akhir): 2 di awal, bertambah tiap 4 level, maks 7. */
  bossCount(level: number): number {
    return Math.min(7, 2 + Math.floor((level - 1) / 4));
  },
  /** Lama gelombang pembuka sebelum bos pertama (detik). */
  openingWave(level: number): number {
    return Math.min(45, 18 + level * 0.8);
  },
  /** Lama gelombang di antara dua bos (detik). */
  betweenWave(level: number): number {
    return Math.min(30, 10 + level * 0.5);
  },
  /** Target lama duel melawan bos ke-k (detik, untuk pemain dengan senjata ideal). */
  fightSeconds(level: number, k: number, count: number): number {
    const final = k >= count - 1;
    const t = final ? Math.min(75, 30 + (level - 1) * 0.8) : Math.min(40, 14 + k * 1.5 + level * 0.3);
    return t * TUNE.fightScale;
  },
  /** HP bos ke-k. `raw` = keluaran referensi (lihat refRaw). */
  champHp(level: number, k: number, count: number, raw: number = expectedRawOf(level)): number {
    const final = k >= count - 1;
    const boss = BOSSES[bossIndexForLevel(level)];
    const identity = final ? 0.8 + 0.2 * boss.hpMult : 1; // tiap bos akhir punya ketebalan khas
    const tier = 1 + (bossTierForLevel(level) - 1) * 0.08;
    const rookie = [0.55, 0.65, 0.75, 0.85, 0.93][level - 1] ?? 1; // masa belajar level 1–5
    return Math.max(80, Math.round(raw * TUNE.effMul * BALANCE.fightSeconds(level, k, count) * identity * tier * rookie));
  },
  /** HP bos akhir dengan senjata ideal (ditampilkan di layar intro & galeri bos). */
  bossHp(level: number): number {
    const n = BALANCE.bossCount(level);
    return BALANCE.champHp(level, n - 1, n);
  },
  /** Perkiraan lama stage (detik) untuk pemain dengan senjata ideal. */
  parSeconds(level: number): number {
    const n = BALANCE.bossCount(level);
    let t = BALANCE.openingWave(level) + (n - 1) * BALANCE.betweenWave(level) + 6;
    for (let k = 0; k < n; k++) t += BALANCE.fightSeconds(level, k, n);
    return t;
  },

  /**
   * KOMBO: tiap jawaban benar berturut-turut menaikkan kekuatan SEMUA pasukan (maks ×2).
   * Inilah cara pemain yang cepat berhitung bisa menumbangkan bos tebal.
   */
  comboMul(streak: number): number {
    return 1 + Math.min(Math.max(0, streak), 20) * 0.05;
  },

  // ── PASUKAN LAWAN ──────────────────────────────────────────
  /** Tekanan pasukan relatif terhadap keluaran pemain — naik pelan, lalu mendatar. */
  pressureRatio(level: number): number {
    return Math.min(1.25, 0.42 + level * 0.018) * TUNE.pressureScale;
  },
  /** Anggaran total kekuatan satu gelombang (sebanding dengan kekuatan pemain). */
  waveBudget(level: number, raw: number = expectedRawOf(level)): number {
    return raw * BALANCE.pressureRatio(level) * BALANCE.spawnInterval(level);
  },
  /** Kekuatan rata-rata satu prajurit lawan. */
  gruntPower(level: number, raw: number = expectedRawOf(level)): number {
    const incoming = raw * BALANCE.pressureRatio(level);
    return Math.max(1, Math.round((incoming * BALANCE.spawnInterval(level)) / BALANCE.waveSize(level)));
  },
  spawnInterval(level: number): number {
    return Math.max(0.6, 1.5 - level * 0.03);
  },
  /** Banyak prajurit per gelombang — banyak & kecil supaya jalan terasa PENUH. */
  waveSize(level: number): number {
    return Math.min(26, 9 + Math.floor(level / 2));
  },
  enemySpeed(level: number): number {
    return Math.min(0.2, 0.1 + level * 0.003);
  },
  giantPower(level: number, weaponLevel: number, streak: number): number {
    const gear = Math.max(rawDps(weaponLevel), BALANCE.expectedRaw(level) * 0.5);
    return Math.max(10, Math.round(gear * 40 * (1 + Math.min(streak, 10) * 0.08)));
  },
  multiplyFactor(streak: number): number {
    return Math.min(5, 2 + Math.floor(streak / 3));
  },
  leakDamage(power: number): number {
    return Math.max(2, Math.round(power * 3));
  },

  // ── SKOR ──────────────────────────────────────────────────
  // Dari pencapaian (bukan damage): jawaban benar, musuh, bos, kecepatan.
  killScore(type: number): number {
    return [1, 1, 3, 8][type] ?? 1;
  },
  answerScore(level: number, streak: number): number {
    return Math.round((10 + 2 * level) * (1 + Math.min(streak, 15) * 0.08));
  },
  /** Bonus bos ke-k (bukan bos akhir). */
  guardScore(level: number, k: number): number {
    return 40 + 15 * level + 15 * k;
  },
  /** Bonus bos akhir. */
  bossScore(level: number): number {
    return 200 + 60 * level + 50 * bossTierForLevel(level);
  },
  /** Bonus waktu: selesai lebih cepat dari perkiraan → bonus. */
  timeBonus(level: number, seconds: number): number {
    return Math.max(0, Math.round((BALANCE.parSeconds(level) * 1.25 - seconds) * (1 + level * 0.15)));
  },
  /** Soal otomatis muncul tiap 8 detik di semua level (selain tombol 🧮). */
  questionInterval(_level: number): number {
    return 8;
  },
  manualCooldown: 4,
  maxPlayerUnits: 420,
  maxEnemyUnits: 260,
};
