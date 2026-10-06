// ─────────────────────────────────────────────────────────────
//  Basic-arithmetic question generator
//
//  ATURAN KETAT (agar semua soal bisa dihitung di kepala dengan cepat):
//   • PERKALIAN  : salah satu faktor SELALU satu digit (1–9).
//   • PEMBAGIAN  : SELALU habis dibagi (hasil bilangan bulat, tanpa desimal),
//                  pembaginya satu digit.
//   • Hasil tidak pernah negatif atau desimal.
//   • Kesulitan berhenti naik di tingkat 5 (mulai level 15), jadi pemain tidak
//     dibebani soal yang makin rumit — yang makin kuat adalah monsternya.
// ─────────────────────────────────────────────────────────────

export interface Question {
  text: string;
  answer: number;
  choices: number[];
  tier: number;
  timeLimit: number;
}

const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const MAX_TIER = 5;

export function tierForLevel(level: number): number {
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 14) return 4;
  return MAX_TIER;
}

export const TIER_LABEL: Record<number, string> = {
  1: "Tambah & Kurang Dasar",
  2: "Sampai 20 & Perkalian Kecil",
  3: "Perkalian & Pembagian",
  4: "Perkalian Satu Digit & Campuran",
  5: "Hitung Cepat Satu Digit",
};

type Gen = () => { text: string; answer: number };

/** Perkalian dengan satu faktor satu digit; urutan faktor diacak. */
function mul(single: number, other: number): { text: string; answer: number } {
  const flip = Math.random() < 0.5;
  return { text: flip ? `${single} × ${other}` : `${other} × ${single}`, answer: single * other };
}

/** Pembagian habis: dividen = pembagi × hasil. */
function div(divisor: number, quotient: number): { text: string; answer: number } {
  return { text: `${divisor * quotient} ÷ ${divisor}`, answer: quotient };
}

const gens: Record<number, Gen[]> = {
  1: [
    () => { const a = ri(1, 9), b = ri(1, 9); return { text: `${a} + ${b}`, answer: a + b }; },
    () => { const a = ri(2, 10), b = ri(1, a); return { text: `${a} − ${b}`, answer: a - b }; },
    () => { const a = ri(1, 9), b = ri(1, 9); return { text: `${a} + ${b}`, answer: a + b }; },
  ],
  2: [
    () => { const a = ri(5, 15), b = ri(1, 20 - a); return { text: `${a} + ${b}`, answer: a + b }; },
    () => { const a = ri(6, 20), b = ri(1, a - 1); return { text: `${a} − ${b}`, answer: a - b }; },
    () => mul(ri(2, 5), ri(2, 9)),
    () => { const a = ri(1, 9), b = ri(1, 9), c = ri(1, 9); return { text: `${a} + ${b} + ${c}`, answer: a + b + c }; },
  ],
  3: [
    () => mul(ri(2, 9), ri(2, 9)),
    () => div(ri(2, 9), ri(2, 9)),
    () => { const a = ri(10, 40), b = ri(10, 40); return { text: `${a} + ${b}`, answer: a + b }; },
    () => { const a = ri(20, 60), b = ri(1, Math.min(40, a - 1)); return { text: `${a} − ${b}`, answer: a - b }; },
  ],
  4: [
    () => mul(ri(2, 9), ri(2, 15)),
    () => div(ri(2, 9), ri(2, 15)),
    () => { const a = ri(10, 60), b = ri(10, 40), c = ri(1, 20); return { text: `${a} + ${b} − ${c}`, answer: a + b - c }; },
    () => { const a = ri(2, 9), b = ri(2, 9), c = ri(1, 15); return { text: `${a} × ${b} + ${c}`, answer: a * b + c }; },
    () => { const a = ri(25, 99), b = ri(10, a - 1); return { text: `${a} − ${b}`, answer: a - b }; },
  ],
  5: [
    () => mul(ri(2, 9), ri(11, 30)),
    () => div(ri(2, 9), ri(6, 30)),
    () => { const a = ri(50, 99), b = ri(20, 99); return { text: `${a} + ${b}`, answer: a + b }; },
    () => { const a = ri(2, 9), b = ri(2, 9), c = ri(1, Math.min(9, a * b - 1)); return { text: `${a} × ${b} − ${c}`, answer: a * b - c }; },
    () => { const a = ri(2, 9), b = ri(2, 9), c = ri(2, 9); return { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c }; },
    () => { const a = ri(2, 9), b = ri(2, 9), c = ri(2, 9); return { text: `${a} + ${b} × ${c}`, answer: a + b * c }; },
    () => {
      let a = ri(3, 9), b = ri(3, 9), c = ri(2, 9), d = ri(2, 9);
      if (a * b <= c * d) { [a, c] = [c, a]; [b, d] = [d, b]; }
      if (a * b === c * d) a += 1;
      return { text: `${a} × ${b} − ${c} × ${d}`, answer: a * b - c * d };
    },
    () => { const a = ri(80, 150), b = ri(15, 79); return { text: `${a} − ${b}`, answer: a - b }; },
  ],
};

const TIME_LIMIT: Record<number, number> = { 1: 12, 2: 11, 3: 10, 4: 10, 5: 10 };

function distractors(answer: number, tier: number): number[] {
  const set = new Set<number>();
  const spread = tier <= 2 ? [1, 2, 3, -1, -2] : [1, 2, 10, -1, -2, -10, 5, -5, 3, -3];
  let guard = 0;
  while (set.size < 3 && guard++ < 60) {
    const d = pick(spread);
    let v = answer + d;
    if (guard > 20) v = answer + ri(-15, 15);
    if (tier >= 4 && Math.random() < 0.3) v = answer + ri(-20, 20);
    if (v !== answer && v >= 0) set.add(v);
  }
  let k = 1;
  while (set.size < 3) {
    const v = answer + k * 4;
    if (v !== answer) set.add(v);
    k++;
  }
  return [...set];
}

export function generateQuestion(level: number): Question {
  let tier = tierForLevel(level);
  // sesekali soal sedikit lebih mudah supaya ritme tidak melelahkan
  if (tier > 1 && Math.random() < 0.2) tier -= 1;
  const gen = pick(gens[tier]);
  const { text, answer } = gen();
  const choices = [answer, ...distractors(answer, tier)];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { text, answer, choices, tier, timeLimit: TIME_LIMIT[tier] };
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
