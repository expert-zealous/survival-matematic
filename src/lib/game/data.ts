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
  { name: "Perak", min: 5000, color: "#c0c0c0", icon: "🥈", weapon: 3, hp: 110, startLevel: 4 },
  { name: "Emas", min: 15000, color: "#ffd700", icon: "🥇", weapon: 6, hp: 120, startLevel: 7 },
  { name: "Platinum", min: 40000, color: "#8fd3f4", icon: "💠", weapon: 8, hp: 135, startLevel: 10 },
  { name: "Berlian", min: 120000, color: "#60a5fa", icon: "💎", weapon: 10, hp: 150, startLevel: 13 },
  { name: "Master", min: 400000, color: "#a855f7", icon: "🔮", weapon: 13, hp: 170, startLevel: 16 },
  { name: "Grandmaster", min: 900000, color: "#ef4444", icon: "👑", weapon: 15, hp: 190, startLevel: 19 },
  { name: "Legenda", min: 1600000, color: "#f59e0b", icon: "🌟", weapon: 18, hp: 220, startLevel: 22 },
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
function rawDps(weaponLevel: number): number {
  const w = getWeapon(weaponLevel);
  return (w.power * w.barrels) / w.rate;
}

export const BALANCE = {
  /** Weapon level a skilled player is expected to have at this level (~0.8 upgrade per level). */
  expectedWeapon(level: number): number {
    return 1 + Math.round(level * 0.8);
  },
  /** Raw cannon output per second for a weapon level (before gate multiplication). */
  rawDps,
  /** Expected raw output at this level for a skilled player. */
  expectedRaw(level: number): number {
    return rawDps(BALANCE.expectedWeapon(level));
  },
  /** Boss HP ≈ 30 s of half the *effective* output (gates multiply the crowd ~×10 at the top). */
  bossHp(level: number): number {
    const boss = BOSSES[bossIndexForLevel(level)];
    const tier = bossTierForLevel(level);
    const identity = 0.6 + 0.4 * boss.hpMult; // 1.0 … 1.64
    return Math.max(60, Math.round(BALANCE.expectedRaw(level) * 250 * identity * (1 + (tier - 1) * 0.15)));
  },
  /** Enemy pressure relative to raw output – grows forever (the endless wall ≈ level 50+). */
  pressureRatio(level: number): number {
    return 0.4 + level * 0.012;
  },
  /** Average power per enemy spawned (composition is normalised in the engine). */
  gruntPower(level: number): number {
    const incoming = BALANCE.expectedRaw(level) * BALANCE.pressureRatio(level);
    return Math.max(1, Math.round((incoming * BALANCE.spawnInterval(level)) / BALANCE.waveSize(level)));
  },
  spawnInterval(level: number): number {
    return Math.max(0.5, 1.5 - level * 0.04);
  },
  waveSize(level: number): number {
    return Math.min(12, 2 + Math.floor(level / 3));
  },
  enemySpeed(level: number): number {
    return Math.min(0.2, 0.1 + level * 0.003);
  },
  giantPower(level: number, weaponLevel: number, streak: number): number {
    // ≈ 20 % of a boss at matching gear; scales with the player's actual weapon
    const gear = Math.max(rawDps(weaponLevel), BALANCE.expectedRaw(level) * 0.5);
    return Math.max(10, Math.round(gear * 40 * (1 + Math.min(streak, 10) * 0.08)));
  },
  multiplyFactor(streak: number): number {
    return Math.min(5, 2 + Math.floor(streak / 3));
  },
  leakDamage(power: number): number {
    return Math.max(2, Math.round(power * 3));
  },
  answerScore(level: number, streak: number): number {
    return Math.round(40 * level * (1 + Math.min(streak, 12) * 0.2));
  },
  bossScore(level: number): number {
    return 450 * level + 150 * bossTierForLevel(level);
  },
  timeBonus(level: number, seconds: number): number {
    return Math.max(0, Math.round((75 - seconds) * 4 * level));
  },
  questionInterval(level: number): number {
    return Math.max(7, 12 - level * 0.1);
  },
  manualCooldown: 4,
  maxPlayerUnits: 420,
  maxEnemyUnits: 260,
};
