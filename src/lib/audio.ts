// Audio: MP3 dari public/assets/audio/*.mp3 (utama) + synth WebAudio (fallback).
// Musik latar: music_menu / music_battle / music_boss (loop, crossfade sederhana).
import { musicUrl, sfxUrl, type MusicKey, type SfxKey } from "./game/assets";

export type SoundKind =
  | SfxKey
  | "shoot"
  | "hit"
  | "gate"
  | "correct"
  | "wrong"
  | "boss"
  | "levelup"
  | "gameover"
  | "giant"
  | "click";

let ctx: AudioContext | null = null;
let enabled = true;
let lastShoot = 0;
let lastSmash = 0;
let lastHit = 0;

// cache elemen <audio> per SFX — dibuat malas (lazy) saat pertama dipakai
const sfxPool = new Map<string, HTMLAudioElement[]>();
const sfxMissing = new Set<string>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
  if (!v) {
    stopMusic();
  }
}

export function isSoundEnabled() {
  return enabled;
}

// ── MP3 SFX ───────────────────────────────────────────────────
function playMp3(key: string, url: string, volume: number): boolean {
  if (typeof window === "undefined") return false;
  if (sfxMissing.has(url)) return false;
  try {
    let pool = sfxPool.get(url);
    if (!pool) {
      pool = [];
      sfxPool.set(url, pool);
    }
    let el = pool.find((a) => a.paused || a.ended);
    if (!el) {
      if (pool.length >= 4) return true; // terlalu ramai, anggap sudah bunyi
      el = new Audio(url);
      el.preload = "auto";
      pool.push(el);
    }
    el.volume = volume;
    el.currentTime = 0;
    const pr = el.play();
    if (pr) {
      pr.catch(() => {
        // file tidak ada / belum boleh autoplay → tandai missing agar fallback synth
        // tapi hanya jika error 404-ish; untuk aman, biarkan fallback hanya sekali
      });
    }
    // deteksi 404 via error event sekali
    el.onerror = () => {
      sfxMissing.add(url);
    };
    void key;
    return true;
  } catch {
    return false;
  }
}

// Cek cepat: apakah file MP3 kemungkinan ada? Kita coba PUTAR dulu,
// kalau gagal (missing), synth fallback ikut bunyi. Untuk menghindari
// suara ganda, strategi: selalu coba MP3; synth hanya bunyi jika MP3 missing.
async function tryMp3First(key: SfxKey, volume: number, fallback: () => void) {
  if (sfxMissing.has(sfxUrl(key))) {
    fallback();
    return;
  }
  // probe HEAD sekali per file (di-cache browser)
  try {
    const res = await fetch(sfxUrl(key), { method: "HEAD" });
    if (!res.ok) {
      sfxMissing.add(sfxUrl(key));
      fallback();
      return;
    }
    playMp3(key, sfxUrl(key), volume);
  } catch {
    fallback();
  }
}

// ── Synth fallback (asli, dipertahankan) ──────────────────────
function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t = c.currentTime + delay;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseBurst(dur: number, vol: number, lowpass: number, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = lowpass;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(c.destination);
  src.start(c.currentTime + delay);
}

function synth(kind: SoundKind) {
  switch (kind) {
    case "shoot":
      tone(420, 0.08, "square", 0.03, -200);
      break;
    case "hit":
      tone(160, 0.06, "sawtooth", 0.025, -80);
      break;
    case "smash":
      noiseBurst(0.18, 0.5, 900);
      tone(120, 0.16, "square", 0.12, -60);
      break;
    case "slam":
      noiseBurst(0.4, 0.7, 400);
      tone(60, 0.4, "sine", 0.25, -20);
      break;
    case "roar":
      tone(90, 0.5, "sawtooth", 0.14, 60);
      tone(70, 0.6, "sawtooth", 0.12, 40, 0.1);
      noiseBurst(0.5, 0.25, 600);
      break;
    case "warning":
      tone(660, 0.12, "square", 0.08);
      tone(660, 0.12, "square", 0.08, 0, 0.16);
      break;
    case "gate":
      tone(660, 0.1, "triangle", 0.05, 300);
      break;
    case "correct":
      tone(523, 0.12, "triangle", 0.12);
      tone(659, 0.12, "triangle", 0.12, 0, 0.1);
      tone(784, 0.2, "triangle", 0.12, 0, 0.2);
      break;
    case "wrong":
      tone(220, 0.25, "sawtooth", 0.1, -120);
      tone(160, 0.3, "sawtooth", 0.08, -80, 0.15);
      break;
    case "boss":
      tone(130, 0.5, "sawtooth", 0.12, -60);
      tone(392, 0.15, "square", 0.08, 0, 0.3);
      tone(523, 0.15, "square", 0.08, 0, 0.45);
      tone(784, 0.4, "square", 0.08, 0, 0.6);
      break;
    case "levelup":
      tone(440, 0.1, "triangle", 0.1);
      tone(554, 0.1, "triangle", 0.1, 0, 0.1);
      tone(659, 0.1, "triangle", 0.1, 0, 0.2);
      tone(880, 0.3, "triangle", 0.1, 0, 0.3);
      break;
    case "gameover":
      tone(330, 0.3, "sawtooth", 0.1, -100);
      tone(262, 0.3, "sawtooth", 0.1, -100, 0.3);
      tone(196, 0.6, "sawtooth", 0.1, -100, 0.6);
      break;
    case "giant":
      tone(80, 0.5, "sawtooth", 0.15, 40);
      tone(60, 0.4, "square", 0.1, 0, 0.3);
      break;
    case "click":
      tone(600, 0.05, "square", 0.04);
      break;
  }
}

const SFX_VOLUME: Record<string, number> = {
  shoot: 0.5,
  hit: 0.6,
  smash: 0.9,
  slam: 1,
  roar: 0.9,
  gate: 0.6,
  correct: 0.8,
  wrong: 0.8,
  boss: 0.9,
  levelup: 0.8,
  gameover: 0.9,
  giant: 0.9,
  click: 0.5,
  warning: 0.7,
};

export function play(kind: SoundKind) {
  if (!enabled) return;
  const now = performance.now();
  if (kind === "shoot") {
    if (now - lastShoot < 90) return;
    lastShoot = now;
  }
  if (kind === "hit") {
    if (now - lastHit < 120) return;
    lastHit = now;
  }
  if (kind === "smash") {
    if (now - lastSmash < 150) return;
    lastSmash = now;
  }
  // slam & roar tidak di-throttle agresif (momen penting)
  void tryMp3First(kind as SfxKey, SFX_VOLUME[kind] ?? 0.7, () => synth(kind));
}

// ── Musik latar ───────────────────────────────────────────────
let musicEl: HTMLAudioElement | null = null;
let musicKey: MusicKey | null = null;
let musicMissing = new Set<string>();

export function playMusic(key: MusicKey, volume = 0.35) {
  if (typeof window === "undefined") return;
  if (!enabled) return;
  if (musicKey === key && musicEl && !musicEl.paused) return;
  stopMusic(300);
  const url = musicUrl(key);
  if (musicMissing.has(url)) return;
  const el = new Audio(url);
  el.loop = true;
  el.volume = 0;
  el.preload = "auto";
  el.onerror = () => {
    musicMissing.add(url);
  };
  el.play()
    .then(() => {
      // fade in
      const step = volume / 20;
      let v = 0;
      const iv = setInterval(() => {
        v += step;
        if (v >= volume || el.paused) {
          el.volume = volume;
          clearInterval(iv);
        } else el.volume = v;
      }, 50);
    })
    .catch(() => {
      /* autoplay ditolak — user perlu sentuh layar dulu */
    });
  musicEl = el;
  musicKey = key;
}

export function stopMusic(fadeMs = 0) {
  if (!musicEl) {
    musicKey = null;
    return;
  }
  const el = musicEl;
  musicEl = null;
  musicKey = null;
  if (fadeMs <= 0) {
    el.pause();
    return;
  }
  const startVol = el.volume;
  const steps = 10;
  let i = 0;
  const iv = setInterval(() => {
    i++;
    el.volume = Math.max(0, startVol * (1 - i / steps));
    if (i >= steps) {
      clearInterval(iv);
      el.pause();
    }
  }, fadeMs / steps);
}

export function currentMusic(): MusicKey | null {
  return musicKey;
}
