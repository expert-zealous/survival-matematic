// ─────────────────────────────────────────────────────────────
//  Local persistence: player profile & progress (localStorage)
// ─────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  photo: string | null; // small base64 JPEG
}

export interface SaveData {
  bestScore: number;
  bestLevel: number;
  games: number;
  correct: number;
  wrong: number;
  bosses: Record<string, number>; // bossIndex -> highest tier defeated
  sound: boolean;
  tutorialSeen: boolean;
  lastSyncedScore: number;
  /** Versi rumus skor. Rumus berubah → skor lama tidak sebanding, jadi di-reset sekali. */
  scoreVersion: number;
}

/** 2 = skor berbasis pencapaian (ribuan–ratusan ribu); 1 = skor lama berbasis damage (jutaan). */
export const SCORE_VERSION = 2;

const PROFILE_KEY = "sm_profile_v1";
const SAVE_KEY = "sm_save_v1";

const isBrowser = () => typeof window !== "undefined";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "p-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadProfile(): Profile {
  if (!isBrowser()) return { id: "", name: "", photo: null };
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Profile;
      if (p.id) return p;
    }
  } catch {}
  const p: Profile = { id: uuid(), name: "", photo: null };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  return p;
}

export function saveProfile(p: Profile) {
  if (!isBrowser()) return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export const DEFAULT_SAVE: SaveData = {
  bestScore: 0,
  bestLevel: 1,
  games: 0,
  correct: 0,
  wrong: 0,
  bosses: {},
  sound: true,
  tutorialSeen: false,
  lastSyncedScore: 0,
  scoreVersion: SCORE_VERSION,
};

export function loadSave(): SaveData {
  if (!isBrowser()) return { ...DEFAULT_SAVE };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const merged: SaveData = { ...DEFAULT_SAVE, ...parsed };
      if ((parsed.scoreVersion ?? 1) < SCORE_VERSION) {
        // rumus skor baru: rekor & rank lama dihitung ulang dari nol (level tertinggi tetap disimpan)
        merged.bestScore = 0;
        merged.lastSyncedScore = 0;
        merged.scoreVersion = SCORE_VERSION;
        localStorage.setItem(SAVE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch {}
  return { ...DEFAULT_SAVE };
}

export function writeSave(s: SaveData) {
  if (!isBrowser()) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
}

export function updateSave(fn: (s: SaveData) => SaveData): SaveData {
  const next = fn(loadSave());
  writeSave(next);
  return next;
}

/** Resize an image file (from the phone gallery) to a small square JPEG data-URL. */
export function fileToAvatar(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d")!;
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca gambar"));
    };
    img.src = url;
  });
}

export function formatScore(n: number): string {
  return Math.round(n).toLocaleString("id-ID");
}
