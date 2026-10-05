// ─────────────────────────────────────────────────────────────
//  Basic-arithmetic question generator (difficulty scales by level)
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

export function tierForLevel(level: number): number {
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  if (level <= 7) return 3;
  if (level <= 11) return 4;
  if (level <= 16) return 5;
  return 6;
}

export const TIER_LABEL: Record<number, string> = {
  1: "Penjumlahan & Pengurangan Dasar",
  2: "Hitung Sampai 20 & Perkalian Kecil",
  3: "Perkalian & Pembagian",
  4: "Operasi Campuran",
  5: "Bilangan Dua Angka",
  6: "Hitung Cepat Tingkat Lanjut",
};

type Gen = () => { text: string; answer: number };

const gens: Record<number, Gen[]> = {
  1: [
    () => { const a = ri(1, 9), b = ri(1, 9); return { text: `${a} + ${b}`, answer: a + b }; },
    () => { const a = ri(2, 10), b = ri(1, a); return { text: `${a} − ${b}`, answer: a - b }; },
    () => { const a = ri(1, 9), b = ri(1, 9); return { text: `${a} + ${b}`, answer: a + b }; },
  ],
  2: [
    () => { const a = ri(5, 19), b = ri(1, 20 - a > 0 ? 20 - a : 1); return { text: `${a} + ${b}`, answer: a + b }; },
    () => { const a = ri(6, 20), b = ri(1, a - 1); return { text: `${a} − ${b}`, answer: a - b }; },
    () => { const a = ri(2, 5), b = ri(1, 9); return { text: `${a} × ${b}`, answer: a * b }; },
    () => { const a = ri(1, 9), b = ri(1, 9), c = ri(1, 9); return { text: `${a} + ${b} + ${c}`, answer: a + b + c }; },
  ],
  3: [
    () => { const a = ri(2, 9), b = ri(2, 9); return { text: `${a} × ${b}`, answer: a * b }; },
    () => { const b = ri(2, 9), q = ri(2, 9); return { text: `${b * q} ÷ ${b}`, answer: q }; },
    () => { const a = ri(10, 40), b = ri(10, 40); return { text: `${a} + ${b}`, answer: a + b }; },
    () => { const a = ri(20, 50), b = ri(1, a - 1); return { text: `${a} − ${b}`, answer: a - b }; },
  ],
  4: [
    () => { const a = ri(3, 12), b = ri(3, 12); return { text: `${a} × ${b}`, answer: a * b }; },
    () => { const b = ri(3, 12), q = ri(3, 12); return { text: `${b * q} ÷ ${b}`, answer: q }; },
    () => { const a = ri(10, 60), b = ri(10, 40), c = ri(1, 20); return { text: `${a} + ${b} − ${c}`, answer: a + b - c }; },
    () => { const a = ri(2, 9), b = ri(2, 9), c = ri(1, 15); return { text: `${a} × ${b} + ${c}`, answer: a * b + c }; },
    () => { const a = ri(25, 99), b = ri(10, a - 1); return { text: `${a} − ${b}`, answer: a - b }; },
  ],
  5: [
    () => { const a = ri(11, 25), b = ri(3, 9); return { text: `${a} × ${b}`, answer: a * b }; },
    () => { const b = ri(4, 12), q = ri(6, 15); return { text: `${b * q} ÷ ${b}`, answer: q }; },
    () => { const a = ri(50, 150), b = ri(20, 99); return { text: `${a} + ${b}`, answer: a + b }; },
    () => { const a = ri(2, 9), b = ri(2, 9), c = ri(2, 9); return { text: `${a} × ${b} − ${c}`, answer: a * b - c }; },
    () => { const a = ri(2, 6), b = ri(2, 6), c = ri(2, 5); return { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c }; },
    () => { const a = ri(100, 300), b = ri(10, 99); return { text: `${a} − ${b}`, answer: a - b }; },
  ],
  6: [
    () => { const a = ri(11, 19), b = ri(11, 19); return { text: `${a} × ${b}`, answer: a * b }; },
    () => { const b = ri(6, 12), q = ri(8, 25); return { text: `${b * q} ÷ ${b}`, answer: q }; },
    () => { const a = ri(2, 9), b = ri(2, 9), c = ri(2, 9); return { text: `${a} + ${b} × ${c}`, answer: a + b * c }; },
    () => { const a = ri(3, 9), b = ri(3, 9), c = ri(2, 9), d = ri(1, 9); return { text: `${a} × ${b} − ${c} × ${d}`, answer: a * b - c * d }; },
    () => { const a = ri(4, 15); return { text: `${a}²`, answer: a * a }; },
    () => { const a = ri(20, 50), b = ri(2, 4); return { text: `${a} × ${b} ÷ 2`, answer: (a * b) / 2 }; },
    () => { const a = ri(200, 999), b = ri(100, 199); return { text: `${a} − ${b}`, answer: a - b }; },
  ],
};

const TIME_LIMIT: Record<number, number> = { 1: 12, 2: 11, 3: 10, 4: 9, 5: 9, 6: 8 };

function distractors(answer: number, tier: number): number[] {
  const set = new Set<number>();
  const spread = tier <= 2 ? [1, 2, 3, -1, -2] : [1, 2, 10, -1, -2, -10, 5, -5, 3, -3];
  let guard = 0;
  while (set.size < 3 && guard++ < 60) {
    const d = pick(spread);
    let v = answer + d;
    if (guard > 20) v = answer + ri(-15, 15);
    if (tier >= 5 && Math.random() < 0.3) v = answer + ri(-30, 30);
    if (v !== answer && v >= 0) set.add(v);
  }
  // emergency fill
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
  // sprinkle in slightly easier questions for pacing
  if (tier > 1 && Math.random() < 0.2) tier -= 1;
  const gen = pick(gens[tier]);
  const { text, answer } = gen();
  const choices = [answer, ...distractors(answer, tier)];
  // shuffle
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { text, answer, choices, tier, timeLimit: TIME_LIMIT[tier] };
}

// Gate labels sometimes show small expressions (player must compute to choose well).
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
