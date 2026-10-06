// ─────────────────────────────────────────────────────────────
//  Asset manifest & loader — public/assets/*.png + *.mp3
//
//  Semua file di bawah ini OPSIONAL. Kalau file PNG/MP3 tersedia,
//  game otomatis memakainya. Kalau tidak ada, game memakai
//  model 3D prosedural + suara synth bawaan (fallback).
//
//  Cara pakai (untuk pemilik game):
//  1. Taruh file PNG transparan di public/assets/
//  2. Taruh file MP3 di public/assets/audio/
//  3. Taruh logo di public/assets/logo.png
//  4. Restart / rebuild — tidak perlu ubah kode.
//
//  Daftar nama file resmi ada di bawah (ASSET_FILES).
// ─────────────────────────────────────────────────────────────

import { BASE_PATH } from "../base";

// Ikut base path situs (mis. "/nama-repo/assets" di GitHub Pages).
export const ASSET_BASE = `${BASE_PATH}/assets`;

// ── PNG: boss (10) ────────────────────────────────────────────
// boss_00..boss_09 — urutan sama dengan BOSSES di data.ts
export const BOSS_ASSET_IDS = [
  "goblin",
  "pirate",
  "golem",
  "spider",
  "dragon",
  "lava",
  "titan",
  "wizard",
  "hydra",
  "doom",
] as const;

export function bossAssetUrl(index: number): string {
  const id = BOSS_ASSET_IDS[index] ?? `boss${index}`;
  return `${ASSET_BASE}/boss_${String(index).padStart(2, "0")}_${id}.png`;
}

// ── PNG: monster raksasa milik pemain (6) ─────────────────────
export const GIANT_ASSET_IDS = ["ape", "robot", "dragon", "ogre", "dino", "octopus"] as const;

export function giantAssetUrl(giantIndex: number): string {
  const id = GIANT_ASSET_IDS[giantIndex % GIANT_ASSET_IDS.length];
  return `${ASSET_BASE}/giant_${String(giantIndex % GIANT_ASSET_IDS.length).padStart(2, "0")}_${id}.png`;
}

/** Mapping emoji giant lama -> index aset (agar kompatibel). */
export function giantEmojiToIndex(emoji: string): number {
  const map: Record<string, number> = { "🦍": 0, "🤖": 1, "🐲": 2, "👹": 3, "🦖": 4, "🐙": 5 };
  return map[emoji] ?? 0;
}

// ── PNG: unit kecil ───────────────────────────────────────────
export const UNIT_ASSET_URLS = {
  player: `${ASSET_BASE}/unit_player.png`,
  grunt: `${ASSET_BASE}/unit_grunt.png`,
  runner: `${ASSET_BASE}/unit_runner.png`,
  brute: `${ASSET_BASE}/unit_brute.png`,
  elite: `${ASSET_BASE}/unit_elite.png`,
} as const;

// ── PNG: lain-lain ────────────────────────────────────────────
export const LOGO_URL = `${ASSET_BASE}/logo.png`;
export const MENU_BG_URL = `${ASSET_BASE}/menu_bg.png`;
export const CANNON_URL = `${ASSET_BASE}/cannon.png`;
export const GATE_MUL_URL = `${ASSET_BASE}/gate_mul.png`;
export const GATE_ADD_URL = `${ASSET_BASE}/gate_add.png`;

// ── MP3: efek suara ───────────────────────────────────────────
export const SFX_FILES = {
  shoot: "sfx_shoot.mp3",
  hit: "sfx_hit.mp3",
  smash: "sfx_smash.mp3", // pukulan / hantaman monster
  slam: "sfx_slam.mp3", // hantaman raksasa / bos (ground slam)
  roar: "sfx_roar.mp3", // raungan bos / monster muncul
  gate: "sfx_gate.mp3",
  correct: "sfx_correct.mp3",
  wrong: "sfx_wrong.mp3",
  boss: "sfx_boss_down.mp3",
  levelup: "sfx_levelup.mp3",
  gameover: "sfx_gameover.mp3",
  giant: "sfx_giant.mp3",
  click: "sfx_click.mp3",
  warning: "sfx_warning.mp3",
} as const;

export type SfxKey = keyof typeof SFX_FILES;

export function sfxUrl(key: SfxKey): string {
  return `${ASSET_BASE}/audio/${SFX_FILES[key]}`;
}

// ── MP3: musik latar (loop) ───────────────────────────────────
export const MUSIC_FILES = {
  menu: "music_menu.mp3",
  battle: "music_battle.mp3",
  boss: "music_boss.mp3",
} as const;

export type MusicKey = keyof typeof MUSIC_FILES;

export function musicUrl(key: MusicKey): string {
  return `${ASSET_BASE}/audio/${MUSIC_FILES[key]}`;
}

// ── Daftar lengkap untuk dokumentasi / preload ────────────────
export const ASSET_FILES: string[] = [
  "logo.png",
  "menu_bg.png",
  "cannon.png",
  "gate_mul.png",
  "gate_add.png",
  ...Array.from({ length: 10 }, (_, i) => bossAssetUrl(i).replace(`${ASSET_BASE}/`, "")),
  ...Array.from({ length: 6 }, (_, i) => giantAssetUrl(i).replace(`${ASSET_BASE}/`, "")),
  "unit_player.png",
  "unit_grunt.png",
  "unit_runner.png",
  "unit_brute.png",
  "unit_elite.png",
  ...Object.values(SFX_FILES).map((f) => `audio/${f}`),
  ...Object.values(MUSIC_FILES).map((f) => `audio/${f}`),
];

// ── Existence cache (HEAD request, di-cache per sesi) ─────────
const existsCache = new Map<string, Promise<boolean>>();

export function assetExists(url: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  let p = existsCache.get(url);
  if (!p) {
    p = fetch(url, { method: "HEAD" })
      // Sebagian hosting membalas 200 + halaman HTML untuk file yang tidak ada;
      // anggap itu "tidak ada" supaya game memakai aset bawaan.
      .then((r) => r.ok && !(r.headers.get("content-type") ?? "").includes("text/html"))
      .catch(() => false);
    existsCache.set(url, p);
  }
  return p;
}

/** Preload daftar aset gambar (dipakai saat boot agar tidak kedip). */
export function preloadImages(urls: string[]): void {
  if (typeof window === "undefined") return;
  for (const u of urls) {
    const img = new Image();
    img.src = u;
  }
}
