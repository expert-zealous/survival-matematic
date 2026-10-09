// ─────────────────────────────────────────────────────────────
//  Generator soal hitung dasar
//
//  ATURAN (berlaku di SEMUA level — soal TIDAK makin sulit):
//   • Hanya dua tingkat: MUDAH (±60%) dan SEDANG (±40%).
//   • Semua angka di soal DAN jawabannya bernilai 0–100.
//   • Perkalian: salah satu faktor selalu satu digit (2–9), hasil ≤ 100.
//   • Pembagian: selalu habis dibagi, pembagi satu digit, dividen ≤ 100.
//   • Tidak ada hasil negatif maupun desimal.
//  Tantangan permainan datang dari pasukan & bos, bukan dari soal yang rumit,
//  supaya pemain tetap menikmati belajar sambil bermain.
// ─────────────────────────────────────────────────────────────

export interface Question {
  text: string;
  answer: number;
  choices: number[];
  tier: number; // 1 = mudah, 2 = sedang
  timeLimit: number;
}

const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const MAX_NUMBER = 100;
export const MAX_TIER = 2;

/** Soal tidak dipengaruhi level: selalu campuran mudah & sedang. */
export function tierForLevel(_level: number): number {
  return 0;
}

export const TIER_LABEL: Record<number, string> = {
  0: "Mudah & Sedang (angka ≤ 100)",
  1: "Soal Mudah",
  2: "Soal Sedang",
};

type Gen = () => { text: string; answer: number };

/** Perkalian: faktor satu digit × faktor lain, hasil dijamin ≤ 100. */
function mul(single: number, maxOther: number): { text: string; answer: number } {
  const other = ri(2, Math.max(2, Math.min(maxOther, Math.floor(MAX_NUMBER / single))));
  const flip = Math.random() < 0.5;
  return { text: flip ? `${single} × ${other}` : `${other} × ${single}`, answer: single * other };
}

/** Pembagian habis: dividen = pembagi × hasil (≤ 100). */
function div(divisor: number, maxQuotient: number): { text: string; answer: number } {
  const q = ri(2, Math.max(2, Math.min(maxQuotient, Math.floor(MAX_NUMBER / divisor))));
  return { text: `${divisor * q} ÷ ${divisor}`, answer: q };
}

const EASY: Gen[] = [
  () => { const a = ri(2, 20), b = ri(1, 20); return { text: `${a} + ${b}`, answer: a + b }; },
  () => { const a = ri(5, 30), b = ri(1, a); return { text: `${a} − ${b}`, answer: a - b }; },
  () => { const a = ri(10, 50), b = ri(1, 9); return { text: `${a} + ${b}`, answer: a + b }; },
  () => mul(ri(2, 5), 10),
  () => div(ri(2, 5), 10),
  () => { const a = ri(1, 9) * 10, b = ri(1, 9); return { text: `${a} + ${b}`, answer: a + b }; },
];

const MEDIUM: Gen[] = [
  () => { const a = ri(15, 60), b = ri(10, MAX_NUMBER - a); return { text: `${a} + ${b}`, answer: a + b }; },
  () => { const a = ri(30, 100), b = ri(10, a - 5); return { text: `${a} − ${b}`, answer: a - b }; },
  () => mul(ri(2, 9), 12),
  () => div(ri(2, 9), 12),
  () => { const a = ri(2, 9), b = ri(2, Math.min(9, Math.floor(90 / a))), c = ri(1, 9); return { text: `${a} × ${b} + ${c}`, answer: a * b + c }; },
  () => { const a = ri(2, 9), b = ri(2, 9), c = ri(1, Math.min(9, a * b - 1)); return { text: `${a} × ${b} − ${c}`, answer: a * b - c }; },
  () => { const a = ri(10, 40), b = ri(10, 30), c = ri(1, Math.min(20, a + b - 1)); return { text: `${a} + ${b} − ${c}`, answer: a + b - c }; },
];

const TIME_LIMIT: Record<number, number> = { 1: 12, 2: 14 };

/** Semua angka dalam teks soal dan jawabannya ≤ 100. */
function withinLimit(text: string, answer: number) {
  if (answer < 0 || answer > MAX_NUMBER || !Number.isInteger(answer)) return false;
  return (text.match(/\d+/g) ?? []).every((n) => Number(n) <= MAX_NUMBER);
}

function distractors(answer: number, tier: number): number[] {
  const set = new Set<number>();
  const spread = tier <= 1 ? [1, 2, 3, -1, -2, -3, 10, -10] : [1, 2, 10, -1, -2, -10, 5, -5, 3, -3];
  let guard = 0;
  while (set.size < 3 && guard++ < 80) {
    let v = answer + pick(spread);
    if (guard > 30) v = answer + ri(-12, 12);
    if (v !== answer && v >= 0 && v <= MAX_NUMBER) set.add(v);
  }
  let k = 1;
  while (set.size < 3) {
    const v = (answer + k * 7) % (MAX_NUMBER + 1);
    if (v !== answer) set.add(v);
    k++;
  }
  return [...set];
}

/** `_level` sengaja diabaikan: tingkat soal tetap sama di semua level. */
export function generateQuestion(_level: number): Question {
  const tier = Math.random() < 0.6 ? 1 : 2;
  let q = pick(tier === 1 ? EASY : MEDIUM)();
  for (let i = 0; i < 20 && !withinLimit(q.text, q.answer); i++) q = pick(tier === 1 ? EASY : MEDIUM)();
  if (!withinLimit(q.text, q.answer)) {
    const a = ri(2, 40), b = ri(1, 40);
    q = { text: `${a} + ${b}`, answer: a + b };
  }
  const choices = [q.answer, ...distractors(q.answer, tier)];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { text: q.text, answer: q.answer, choices, tier, timeLimit: TIME_LIMIT[tier] };
}

// Label gerbang kadang berupa ekspresi kecil (pemain harus menghitung untuk memilih).
export function gateExpression(value: number, level: number): string {
  if (level < 3 || Math.random() < 0.5) return `${value}`;
  const forms: (() => string | null)[] = [
    () => { const a = ri(1, value - 1); return value - a > 0 ? `${a}+${value - a}` : null; },
    () => { const a = ri(1, 9); return `${value + a}−${a}`; },
    () => {
      for (let d = 2; d <= 5; d++) if (value % d === 0 && value / d > 1) return `${d}×${value / d}`;
      return null;
    },
  ];
  for (let i = 0; i < 5; i++) {
    const r = pick(forms)();
    if (r) return r;
  }
  return `${value}`;
}
