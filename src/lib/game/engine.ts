// ─────────────────────────────────────────────────────────────
//  Survival Matematic – core game engine (Canvas 2D, pseudo-3D lane)
// ─────────────────────────────────────────────────────────────
import {
  BALANCE,
  BOSSES,
  RANKS,
  bossIndexForLevel,
  bossTierForLevel,
  getWeapon,
  mapForLevel,
  type BossDef,
  type MapTheme,
} from "./data";
import { gateExpression, generateQuestion, type Question } from "./math";
import { play } from "../audio";
import { Scene3D } from "./scene3d";
import { ENEMY_ENTRY_Y, PLAYABLE_MAX_Y, FORMATION_COLUMNS, ENTRY_ROW_INTERVAL, planFormation, type FormationMember } from "./battlefield";

export type RewardType = "weapon" | "multiply" | "monster" | "heal";
export interface Reward {
  type: RewardType;
  label: string;
  icon: string;
  value: number;
}
export interface ActiveQuestion {
  question: Question;
  reward: Reward;
  timeLeft: number;
  timeLimit: number;
}
export type Phase = "intro" | "play" | "clear" | "gameover";

export interface HudState {
  phase: Phase;
  paused: boolean;
  level: number;
  mapName: string;
  mapAccent: string;
  boss: {
    name: string;
    title: string;
    emoji: string;
    hp: number;
    maxHp: number;
    tier: number;
    color: string;
    enraged: boolean;
  };
  score: number;
  hp: number;
  maxHp: number;
  weapon: { level: number; name: string; color: string; emoji: string; power: number; barrels: number };
  streak: number;
  bestStreak: number;
  units: number;
  enemies: number;
  mathCooldown: number;
  autoQuestionIn: number;
  question: ActiveQuestion | null;
  toast: { id: number; text: string; kind: "good" | "bad" | "info" } | null;
  stats: { correct: number; wrong: number; kills: number; bossesDefeated: number; elapsed: number; levelTime: number };
  lastReward: { id: number; reward: Reward; correct: boolean; answer: number } | null;
  levelClear: { level: number; bossName: string; bonus: number; timeBonus: number } | null;
  frost: boolean;
  stage: {
    index: number; // monster ke- (0-based)
    total: number; // total monster termasuk bos
    isBoss: boolean;
    incoming: number; // detik sampai monster berikutnya datang (0 = sedang bertarung)
    mode: "wave" | "champion" | "mopup"; // gelombang pasukan / duel bos / habisi sisa pasukan
    enemiesLeft: number;
    bossName: string;
    bossTitle: string;
    bossEmoji: string;
    bossColor: string;
    bossMaxHp: number;
    bossDesc: string;
  };
}

export interface GameSummary {
  score: number;
  level: number;
  correct: number;
  wrong: number;
  kills: number;
  bossesDefeated: number;
  elapsed: number;
  bestStreak: number;
}

export interface EngineCallbacks {
  onHud: (h: HudState) => void;
  onGameOver: (s: GameSummary) => void;
  onBossDefeated: (bossIndex: number, tier: number, level: number) => void;
}

export interface EngineOptions {
  startLevel: number;
  rankIndex: number;
}

interface PUnit {
  x: number;
  y: number;
  vx: number;
  power: number;
  r: number;
  speed: number;
  giant: boolean;
  gated: number;
  seed: number;
  emoji: string;
  giantIndex: number;
  maxPower: number;
  attackId?: number;
  // ── combat ──
  attackT: number; // sisa waktu animasi serang (detik), >0 = sedang menghantam
  attackCd: number; // jeda antar serangan
  slamCd: number; // khusus giant: jeda hantaman AoE
  lunge: number; // -1..1 arah lunge visual (dihitung saat tabrakan)
}
type EType = 0 | 1 | 2 | 3; // grunt, runner, brute, elite
interface EUnit {
  x: number;
  y: number;
  power: number;
  r: number;
  speed: number;
  type: EType;
  seed: number;
  // ── combat ──
  attackT: number;
  attackCd: number;
  lunge: number;
}
interface Shockwave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  color: string;
}
interface Gate {
  row: number;
  x0: number;
  x1: number;
  y: number;
  kind: "add" | "mul";
  value: number;
  label: string;
  pulse: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}
interface FloatText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  size: number;
}
interface Deco {
  x: number;
  y: number;
  emoji: string;
  s: number;
}
interface BossState {
  id: number;
  actionId: number;
  def: BossDef;
  index: number;
  tier: number;
  hp: number;
  maxHp: number;
  enraged: boolean;
  hitFlash: number;
  // ── combat ──
  attackT: number; // animasi hantaman bos (0 = idle)
  attackCd: number; // jeda antar hantaman
  attackKind: "slam" | "stomp" | "roar";
  warnT: number; // telegraf serangan (tanda seru)
  // ── march: bos BERJALAN mendekati pemain (bukan diam di panggung) ──
  x: number; // posisi lateral 0..1
  y: number; // posisi maju 0 (benteng) .. 1.05 (ujung atas)
  speed: number; // kecepatan maju per detik (game-y)
  walkPhase: number; // fase animasi jalan
  siegeT: number; // timer gebukan benteng saat sudah di garis depan
  warnedClose: boolean;
  // ── stage: beberapa monster penjaga sebelum bos ──
  isBoss: boolean;
  scale: number; // ukuran visual (penjaga lebih kecil)
  dmgMul: number; // kekuatan serangan relatif bos
}

const ENEMY_COLORS = ["#ef4444", "#fb923c", "#991b1b", "#6d28d9"];
const ENEMY_DARK = ["#991b1b", "#c2410c", "#450a0a", "#3b0764"];
const GIANT_EMOJI = ["🦍", "🤖", "🐲", "👹", "🦖", "🐙"];
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private view: Scene3D | null = null;
  graphicsOk = false;
  private cb: EngineCallbacks;
  private W = 360;
  private H = 720;
  private A = 1.4; // lane height / lane width (for collision space)
  private raf = 0;
  private last = 0;
  private running = false;
  private destroyed = false;
  private renderFailed = false;

  // run state
  level: number;
  phase: Phase = "intro";
  paused = false;
  score = 0;
  hp: number;
  maxHp: number;
  weaponLevel: number;
  private readonly startWeapon: number;
  streak = 0;
  bestStreak = 0;

  private introTimer = 2.4;
  private clearTimer = 0;
  private units: PUnit[] = [];
  private enemies: EUnit[] = [];
  private enemyRows: FormationMember[][] = [];
  private gateTimerRow = 0;
  private gatePulse = 0;
  private entitySerial = 0;
  private actionSerial = 0;
  private animationTime = 0;
  private gates: Gate[] = [];
  private particles: Particle[] = [];
  private floats: FloatText[] = [];
  private shockwaves: Shockwave[] = [];
  private deco: Deco[] = [];
  private boss!: BossState;
  private map!: MapTheme;

  private cannonX = 0.5;
  private targetX = 0.5;
  private fireTimer = 0;
  private flash = 0;
  private spawnTimer = 1;
  private gateTimer = 14;
  private levelTime = 0;
  private elapsed = 0;
  private timeScale = 1;

  private question: ActiveQuestion | null = null;
  private autoQ = 5;
  private manualCd = 0;
  private rewardCounter = 0;
  private stats = { correct: 0, wrong: 0, kills: 0, bossesDefeated: 0 };
  private toast: HudState["toast"] = null;
  private toastId = 0;
  private toastTimer = 0;
  private lastReward: HudState["lastReward"] = null;
  private levelClearInfo: HudState["levelClear"] = null;
  private hudTimer = 0;
  private shake = 0;
  private dmgFlash = 0;
  private frostTimer = 9;
  private frostActive = 0;
  private ambushTimer = 8;
  private headsFired = 0;
  private giantCounter = 0;
  private stageIndex = 0;
  private stageTotal = 1;
  private champGap = 0; // (lama) tidak dipakai lagi; dipertahankan agar aman
  /** Alur stage: gelombang pasukan → bos (+pasukan) → … → bos akhir → habisi sisa pasukan */
  private stageMode: "wave" | "champion" | "mopup" = "wave";
  private waveTimer = 0;
  private mopTimer = 0;
  private champTime = 0;

  private gridCols = 20;
  private gridRows = 24;
  private grid: EUnit[][] = [];

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.cb = cb;
    if (typeof window !== "undefined") {
      try {
        this.view = new Scene3D(canvas);
        this.graphicsOk = true;
      } catch (err) {
        console.warn("WebGL tidak tersedia", err);
        this.view = null;
      }
    }
    const rank = RANKS[clamp(opts.rankIndex, 0, RANKS.length - 1)];
    this.level = Math.max(1, opts.startLevel);
    this.maxHp = rank.hp;
    this.hp = rank.hp;
    this.weaponLevel = rank.weapon;
    this.startWeapon = rank.weapon;
    for (let i = 0; i < this.gridCols * this.gridRows; i++) this.grid.push([]);
    this.setupLevel();
  }

  // ── lifecycle ────────────────────────────────────────────────
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (ts: number) => {
      if (this.destroyed) return;
      const dt = Math.min(0.05, (ts - this.last) / 1000);
      this.last = ts;
      this.update(dt);
      try {
        this.render();
      } catch (err) {
        if (!this.renderFailed) console.error(err);
        this.renderFailed = true;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.pushHud(true);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.view?.dispose();
    this.view = null;
  }

  resize(w: number, h: number, dpr: number) {
    this.W = w;
    this.H = h;
    this.view?.resize(w, h, dpr);
  }

  setPaused(p: boolean) {
    this.paused = p;
    this.pushHud(true);
  }

  setPointer(px: number, down: boolean) {
    if (!down || this.W <= 0) return;
    // Finger X maps straight onto the lane, like the original cannon drag.
    const pad = this.W * 0.08;
    const t = (px - pad) / Math.max(1, this.W - pad * 2);
    this.targetX = clamp(t, 0.06, 0.94);
  }

  skipIntro() {
    if (this.phase === "intro") this.introTimer = 0;
    else if (this.phase === "clear") this.clearTimer = 0;
  }

  // ── level setup ──────────────────────────────────────────────
  private setupLevel() {
    const L = this.level;
    this.map = mapForLevel(L);
    // stage = gelombang pasukan pembuka → bos 1 (+pasukan) → … → bos akhir (+pasukan)
    this.stageTotal = BALANCE.bossCount(L);
    this.stageIndex = 0;
    this.champGap = 0;
    this.stageMode = "wave";
    this.waveTimer = BALANCE.openingWave(L);
    this.mopTimer = 0;
    this.boss = this.makeChampion(0);
    this.boss.hp = 0; // bos belum masuk arena selama gelombang pembuka
    this.champTime = 0;
    this.units = [];
    this.enemies = [];
    this.enemyRows = [];
    this.gateTimerRow = 0;
    this.gatePulse = 0;
    this.particles = [];
    this.floats = [];
    this.shockwaves = [];
    this.levelTime = 0;
    this.spawnTimer = 0.15;
    this.headsFired = 0;
    this.frostTimer = 9;
    this.frostActive = 0;
    this.ambushTimer = 8;
    this.question = null;
    this.timeScale = 1;
    this.autoQ = 5;
    this.manualCd = 0;
    this.rollGates();
    this.gateTimer = 14;
    this.deco = [];
    for (let i = 0; i < 14; i++) {
      const left = i % 2 === 0;
      this.deco.push({
        x: left ? rnd(-0.42, -0.08) : rnd(1.08, 1.42),
        y: rnd(0.02, 0.98),
        emoji: this.map.deco[i % this.map.deco.length],
        s: rnd(0.8, 1.3),
      });
    }
    this.phase = "intro";
    this.introTimer = 2.4;
  }

  private rollGates() {
    const L = this.level;
    const mk = (row: number, x0: number, x1: number, kind: "add" | "mul", value: number): Gate => ({
      row,
      x0,
      x1,
      y: row === 0 ? 0.3 : 0.57,
      kind,
      value,
      label: (kind === "mul" ? "×" : "+") + gateExpression(value, L),
      pulse: 0,
    });
    const rowOptions = (row: number): [("add" | "mul"), number][] => {
      const r = Math.random();
      if (row === 0) {
        if (r < 0.18) return [["mul", 3], ["add", 3 + Math.floor(L / 2)]];
        if (r < 0.6) return [["mul", 2], ["add", 2 + Math.floor(L / 2)]];
        return [["mul", 2], ["add", 4 + L]];
      }
      if (L >= 5 && r < 0.06) return [["mul", 5], ["mul", 2]];
      if (r < 0.2) return [["mul", 4], ["mul", 2]];
      if (r < 0.6) return [["mul", 3], ["add", 6 + L]];
      return [["mul", 3], ["mul", 2]];
    };
    this.gates = [];
    for (let row = 0; row < 2; row++) {
      const opts = rowOptions(row);
      const swap = Math.random() < 0.5;
      const a = swap ? opts[1] : opts[0];
      const b = swap ? opts[0] : opts[1];
      this.gates.push(mk(row, 0.02, 0.48, a[0], a[1]));
      this.gates.push(mk(row, 0.52, 0.98, b[0], b[1]));
    }
  }

  // ── public: questions ────────────────────────────────────────
  canAskQuestion() {
    return this.phase === "play" && !this.question && this.manualCd <= 0 && !this.paused;
  }

  requestQuestion(): boolean {
    if (!this.canAskQuestion()) return false;
    this.openQuestion();
    return true;
  }

  private pickReward(): Reward {
    if (this.hp < this.maxHp * 0.45 && Math.random() < 0.5) {
      const v = Math.round(this.maxHp * 0.35);
      return { type: "heal", label: `Perbaiki Benteng +${v}`, icon: "🛡️", value: v };
    }
    // senjata naik 1× tiap 4 jawaban benar (sebelumnya 2×) supaya tidak melesat terlalu kuat
    const seq: RewardType[] = ["weapon", "multiply", "monster", "multiply"]; // hadiah pertama selalu senjata
    const type = seq[this.rewardCounter % seq.length];
    this.rewardCounter++;
    if (type === "weapon") {
      const next = getWeapon(this.weaponLevel + 1);
      return { type, label: `Senjata Baru: ${next.name}`, icon: next.emoji, value: 1 };
    }
    if (type === "multiply") {
      const k = BALANCE.multiplyFactor(this.streak);
      return { type, label: `Pasukan Berlipat ×${k}`, icon: "✖️", value: k };
    }
    const p = BALANCE.giantPower(this.level, this.weaponLevel, this.streak);
    return { type, label: `Monster Raksasa (kekuatan ${p})`, icon: GIANT_EMOJI[this.giantCounter % GIANT_EMOJI.length], value: p };
  }

  private openQuestion() {
    const q = generateQuestion(this.level);
    const reward = this.pickReward();
    this.question = { question: q, reward, timeLeft: q.timeLimit, timeLimit: q.timeLimit };
    this.timeScale = 0.12;
    this.autoQ = BALANCE.questionInterval(this.level);
    this.manualCd = BALANCE.manualCooldown;
    play("click");
    this.pushHud(true);
  }

  answerQuestion(choice: number | null) {
    const aq = this.question;
    if (!aq) return;
    const correct = choice === aq.question.answer;
    this.question = null;
    this.timeScale = 1;
    if (correct) {
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.stats.correct++;
      const pts = BALANCE.answerScore(this.level, this.streak);
      this.score += pts;
      this.applyReward(aq.reward);
      this.setToast(`✅ Benar! +${pts} poin`, "good");
      play("correct");
    } else {
      this.streak = 0;
      this.stats.wrong++;
      this.setToast(choice === null ? `⏰ Waktu habis! Jawaban: ${aq.question.answer}` : `❌ Salah! Jawaban: ${aq.question.answer}`, "bad");
      this.punish();
      play("wrong");
    }
    this.lastReward = { id: ++this.toastId, reward: aq.reward, correct, answer: aq.question.answer };
    this.pushHud(true);
  }

  private applyReward(r: Reward) {
    const w = getWeapon(this.weaponLevel);
    switch (r.type) {
      case "weapon":
        this.weaponLevel += r.value;
        this.addFloat(this.cannonX, 0.05, "SENJATA NAIK!", "#fbbf24", 20);
        play("levelup");
        break;
      case "multiply": {
        const K = r.value;
        const max = BALANCE.maxPlayerUnits;
        const snapshot = [...this.units];
        for (const u of snapshot) {
          if (u.giant) {
            u.power *= 1 + (K - 1) * 0.5;
            u.maxPower = Math.max(u.maxPower, u.power);
            continue;
          }
          let cloned = 0;
          while (cloned < K - 1 && this.units.length < max) {
            this.units.push({ ...u, x: clamp(u.x + rnd(-0.05, 0.05), 0.05, 0.95), y: u.y + rnd(-0.03, 0.03), vx: rnd(-0.1, 0.1), seed: Math.random() });
            cloned++;
          }
          u.power *= K - cloned;
        }
        const burst = 6 * K;
        for (let i = 0; i < burst; i++) this.spawnUnit(this.cannonX + rnd(-0.12, 0.12), rnd(0, 0.06), this.unitPower(w.power), 0);
        this.addFloat(0.5, 0.35, `PASUKAN ×${K}!`, "#c084fc", 26);
        break;
      }
      case "monster": {
        const gi = this.giantCounter % GIANT_EMOJI.length;
        const emoji = GIANT_EMOJI[gi];
        this.giantCounter++;
        this.units.push({
          x: this.cannonX, y: 0.02, vx: 0, power: r.value, maxPower: r.value, r: 0.08, speed: 0.12,
          giant: true, gated: 0, seed: Math.random(), emoji, giantIndex: gi,
          attackT: 0.6, attackCd: 0, slamCd: 0.5, lunge: 0,
        });
        this.spawnShockwave(this.cannonX, 0.06, "#f97316");
        this.addFloat(this.cannonX, 0.1, "MONSTER RAKSASA!", "#f97316", 22);
        this.shake = 0.5;
        play("giant");
        break;
      }
      case "heal":
        this.hp = Math.min(this.maxHp, this.hp + r.value);
        this.addFloat(0.5, 0.05, `+${r.value} HP`, "#4ade80", 22);
        break;
    }
  }

  private punish() {
    // Reinforcements always enter through the same gate, never appear in the player's lane.
    if (this.stageMode !== "mopup") this.spawnWave(2);
    this.addFloat(0.5, ENEMY_ENTRY_Y, "GELOMBANG HUKUMAN!", "#f87171", 22);
  }

  // ── spawning ─────────────────────────────────────────────────
  /** Kekuatan satu peluru = kekuatan senjata × kombo jawaban benar berturut-turut. */
  private unitPower(base: number) {
    return Math.max(1, Math.round(base * BALANCE.comboMul(this.streak)));
  }

  private spawnUnit(x: number, y: number, power: number, gated: number) {
    if (this.units.length >= BALANCE.maxPlayerUnits) {
      // stack power onto a random existing unit instead of exceeding the cap
      const u = this.units[Math.floor(Math.random() * this.units.length)];
      if (u) u.power += power;
      return;
    }
    this.units.push({
      x: clamp(x, 0.05, 0.95), y, vx: rnd(-0.08, 0.08), power, maxPower: power,
      r: 0.025, speed: 0.26, giant: false, gated, seed: Math.random(), emoji: "", giantIndex: 0,
      attackT: 0, attackCd: 0, slamCd: 0, lunge: 0,
    });
  }

  /** Jarak aman dari tepi jalan (0..1) supaya badan & tangan musuh tidak menembus pagar. */
  private edgeMargin(r: number) {
    return r * 1.4 + 0.035;
  }

  private spawnEnemy(x: number, y: number, type: EType, power: number) {
    const L = this.level;
    const s = BALANCE.enemySpeed(L);
    if (this.enemies.length >= BALANCE.maxEnemyUnits) {
      const e = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      if (e) e.power += power;
      return;
    }
    const spec = [
      { r: 0.026, speed: s },
      { r: 0.022, speed: s * 1.8 },
      { r: 0.04, speed: s * 0.65 },
      { r: 0.056, speed: s * 0.5 },
    ][type];
    const m = this.edgeMargin(spec.r);
    this.enemies.push({
      x: clamp(x, m, 1 - m), y, power, r: spec.r, speed: spec.speed, type, seed: Math.random(),
      attackT: 0, attackCd: rnd(0, 0.3), lunge: 0,
    });
  }

  private spawnShockwave(x: number, y: number, color: string, maxR = 0.22) {
    if (this.shockwaves.length > 12) this.shockwaves.shift();
    this.shockwaves.push({ x, y, r: 0.03, maxR, life: 0.55, maxLife: 0.55, color });
  }

  private spawnWave(mult = 1) {
    if (this.stageMode === "mopup") return;
    const L = this.level;
    const sp = this.boss.def.specials;
    const ref = BALANCE.refRaw(L, this.weaponLevel);
    const gp = this.gp();
    const fill = Math.min(1, BALANCE.waveBudget(L, ref) / (BALANCE.waveSize(L) * gp));
    const oldCount = Math.max(1, Math.round(BALANCE.waveSize(L) * mult * fill * (this.boss.hp > 0 && this.boss.enraged ? 1.5 : 1)));
    // More bodies, not more HP: divide the previous wave budget over complete rows.
    // At least three complete rows are visible at every level; HP budget is unchanged and divided over them.
    const members = planFormation(oldCount * gp, Math.max(FORMATION_COLUMNS * 3, oldCount * 2.5), {
      rush: sp.includes("rush"), elite: sp.includes("elite"), allowElite: L >= 6,
    });
    for (let i = 0; i < members.length; i += FORMATION_COLUMNS) {
      const row = members.slice(i, i + FORMATION_COLUMNS);
      if (this.enemyRows.length < 128) this.enemyRows.push(row);
      else {
        // Bounded queue. Extra strength stays at the gate, never teleports to a front-line soldier.
        const last = this.enemyRows[this.enemyRows.length - 1];
        row.forEach((member, index) => { last[index % last.length].power += member.power; });
      }
    }
  }

  private pendingEnemyCount() {
    return this.enemyRows.reduce((count, row) => count + row.length, 0);
  }

  private updateEnemyEntrance(wdt: number) {
    this.gatePulse = Math.max(0, this.gatePulse - wdt * 2);
    this.gateTimerRow -= wdt;
    if (this.gateTimerRow > 0 || this.enemyRows.length === 0) return;
    const room = BALANCE.maxEnemyUnits - this.enemies.length;
    if (room <= 0) { this.gateTimerRow = 0; return; }
    const row = this.enemyRows[0];
    const release = Math.min(room, row.length);
    const members = row.splice(0, release);
    for (const member of members) this.spawnEnemy(member.x, ENEMY_ENTRY_Y, member.type, member.power);
    if (row.length === 0) this.enemyRows.shift();
    this.gateTimerRow = ENTRY_ROW_INTERVAL;
    this.gatePulse = 1;
  }

  // ── update ───────────────────────────────────────────────────
  private update(dt: number) {
    if (this.paused) return;
    this.elapsed += dt;
    this.animationTime += this.phase === "play" ? dt * this.timeScale : dt;
    this.hudTimer -= dt;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast = null;
    }
    if (this.phase === "intro") {
      this.introTimer -= dt;
      this.cannonX += (this.targetX - this.cannonX) * Math.min(1, dt * 14);
      if (this.introTimer <= 0) {
        this.phase = "play";
        this.pushHud(true);
      }
    } else if (this.phase === "clear") {
      this.clearTimer -= dt;
      this.updateFx(dt);
      if (this.clearTimer <= 0) this.nextLevel();
    } else if (this.phase === "play") {
      const wdt = dt * this.timeScale;
      this.levelTime += wdt;
      if (this.question) {
        this.question.timeLeft -= dt;
        if (this.question.timeLeft <= 0) this.answerQuestion(null);
      } else {
        this.autoQ -= dt;
        this.manualCd -= dt;
        if (this.autoQ <= 0) this.openQuestion();
      }
      this.cannonX += (this.targetX - this.cannonX) * Math.min(1, dt * 14);
      this.updateFire(wdt);
      this.updateSpawns(wdt);
      this.updateEnemyEntrance(wdt);
      this.updateSpecials(wdt);
      this.updateStage(wdt);
      this.updateUnits(wdt);
      this.updateCollisions();
      this.updateFx(dt);
      this.gateTimer -= wdt;
      if (this.gateTimer <= 0) {
        this.gateTimer = 14;
        this.rollGates();
        for (const u of this.units) if (u.y < 0.3) u.gated = 0;
      }
    } else {
      this.updateFx(dt);
    }
    if (this.hudTimer <= 0) this.pushHud(false);
  }

  private updateFire(wdt: number) {
    const w = getWeapon(this.weaponLevel);
    this.fireTimer += wdt;
    this.flash = Math.max(0, this.flash - wdt * 6);
    while (this.fireTimer >= w.rate) {
      this.fireTimer -= w.rate;
      const n = w.barrels;
      for (let i = 0; i < n; i++) {
        const off = n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.04 * (n - 1);
        this.spawnUnit(this.cannonX + off, 0.01, this.unitPower(w.power), 0);
      }
      this.flash = 1;
      play("shoot");
    }
  }

  /** Kekuatan rata-rata prajurit lawan, menyesuaikan senjata pemain (tanpa dinding mendadak). */
  private gp() {
    return BALANCE.gruntPower(this.level, BALANCE.refRaw(this.level, this.weaponLevel));
  }

  private updateSpawns(wdt: number) {
    if (this.stageMode === "mopup") return; // bos akhir tumbang: tidak ada pasukan baru
    this.spawnTimer -= wdt;
    if (this.spawnTimer <= 0) {
      const L = this.level;
      // tekanan naik pelan selama satu fase, lalu reset ketika bos berikutnya masuk
      const pressure = Math.max(0.7, 1 - this.champTime * 0.004);
      const grace = L === 1 ? 1.6 : L === 2 ? 1.35 : L === 3 ? 1.15 : 1; // masa belajar level awal
      const duel = this.stageMode === "champion" ? 1.35 : 1; // saat bos ada, pasukan juga keluar dari belakangnya
      this.spawnTimer = (BALANCE.spawnInterval(L) / this.boss.def.spawnMult) * pressure * grace * duel * rnd(0.85, 1.15);
      this.spawnWave(this.stageMode === "champion" ? 1.05 : 1);
    }
  }

  private updateSpecials(wdt: number) {
    const sp = this.stageMode === "champion" && this.boss.hp > 0 ? this.boss.def.specials : [];
    if (this.stageMode === "champion" && (sp.includes("frost") || this.boss.tier >= 3)) {
      if (this.frostActive > 0) {
        this.frostActive -= wdt;
      } else {
        this.frostTimer -= wdt;
        if (this.frostTimer <= 0) {
          this.frostTimer = 11;
          this.frostActive = 2.6;
          this.addFloat(0.5, 0.5, "❄️ BEKU!", "#bae6fd", 26);
        }
      }
    }
    if (this.stageMode === "champion" && (sp.includes("ambush") || this.boss.tier >= 4)) {
      this.ambushTimer -= wdt;
      if (this.ambushTimer <= 0) {
        this.ambushTimer = 9;
        this.spawnWave(0.8);
        this.addFloat(0.5, ENEMY_ENTRY_Y, "⚠️ BALA BANTUAN!", "#fde68a", 20);
        this.burst(0.5, ENEMY_ENTRY_Y, "#a855f7", 20);
      }
    }
    if (this.boss.hitFlash > 0) this.boss.hitFlash -= wdt;
    this.updateBossCombat(wdt);
    this.updateGiantCombat(wdt);
  }

  // ── Boss march: bos BERJALAN dari atas ke arah benteng pemain ──
  private updateBossMarch(wdt: number) {
    const b = this.boss;
    if (this.phase !== "play" || b.hp <= 0) return;
    // berhenti menghantam sejenak (windup/slam) agar tidak meluncur saat mukul
    const rooted = b.attackT > 0.25 || b.warnT > 0;
    if (!rooted) {
      const march = b.speed * (b.enraged ? 1.45 : 1) * wdt;
      b.y -= march;
      b.walkPhase += wdt * (b.enraged ? 7 : 4.5); // monster raksasa melangkah lebih berat
      // Bos tetap di tengah jalur. Goyangan visual ditangani rig, bukan menggeser collider/sepatu melintasi pagar.
      b.x = 0.5;
      // bos berhenti di GARIS DEPAN lalu bertarung di sana (tidak menggebuki benteng);
      // ancaman ke benteng datang dari pasukan yang lolos — makin lama duel, makin deras
      const holdLine = b.isBoss ? 0.4 : 0.5;
      if (b.y < holdLine) b.y = holdLine;
      if (!b.warnedClose && b.y < 0.35) {
        b.warnedClose = true;
        this.addFloat(0.5, 0.3, b.isBoss ? "⚠️ BOS MENDEKAT!" : "⚠️ MONSTER MENDEKAT!", "#fca5a5", 24);
        this.setToast(b.isBoss ? "⚠️ Bos hampir sampai benteng!" : "⚠️ Monster hampir sampai benteng!", "bad");
        play("warning");
      }
    }
    // injak-injak: unit pemain yang tersentuh badan bos ikut terluka
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      const dx = Math.abs(u.x - b.x);
      const dy = Math.abs(u.y - b.y);
      if (dx < 0.1 + 0.12 * b.scale && dy < 0.06 + 0.04 * b.scale) {
        const trample = Math.max(1, Math.round(this.gp() * 0.8));
        if (u.giant) {
          u.power -= trample * 2;
          if (u.power <= 0) {
            this.burst(u.x, u.y, "#f97316", 14);
            this.units[i] = this.units[this.units.length - 1];
            this.units.pop();
          }
        } else {
          u.power -= trample;
          u.attackT = Math.max(u.attackT, 0.3);
          if (u.power <= 0) {
            this.burst(u.x, u.y, "#38bdf8", 4);
            this.units[i] = this.units[this.units.length - 1];
            this.units.pop();
          }
        }
      }
    }
    // gebukan benteng: kalau bos sudah di garis depan, benteng terkikis terus
    if (b.y <= 0.12) {
      b.siegeT += wdt;
      if (b.siegeT >= 1) {
        b.siegeT = 0;
        const dmg = Math.min(Math.round(this.maxHp * 0.12), Math.max(2, Math.round((3 + Math.min(40, this.level) * 0.35 + (b.enraged ? 2 : 0)) * b.dmgMul)));
        this.hp -= dmg;
        this.dmgFlash = 1;
        this.shake = Math.max(this.shake, 0.6);
        this.addFloat(b.x, 0.06, `-${dmg}`, "#f87171", 20);
        this.burst(b.x, 0.05, "#ef4444", 10);
        this.spawnShockwave(b.x, 0.1, b.def.color, 0.26);
        b.attackT = Math.max(b.attackT, 0.5);
        b.attackKind = "stomp";
        b.actionId = ++this.actionSerial;
        play("slam");
        if (this.hp <= 0) {
          this.hp = 0;
          this.gameOver();
          return;
        }
      }
    }
  }

  // ── Boss combat: telegraf → hantaman AoE ke pasukan pemain ──
  private updateBossCombat(wdt: number) {
    const b = this.boss;
    if (this.phase !== "play" || b.hp <= 0) return;
    this.updateBossMarch(wdt);
    if (b.attackT > 0) b.attackT -= wdt;
    if (b.warnT > 0) {
      b.warnT -= wdt;
      if (b.warnT <= 0) {
        // HANTAMAN! damage semua unit pemain di sekitar posisi bos saat ini
        b.attackT = 0.7;
        b.attackKind = Math.random() < 0.6 ? "slam" : "stomp";
        const zoneY = Math.max(0.1, b.y - 0.16);
        const zoneX = b.x;
        let hits = 0;
        for (let i = this.units.length - 1; i >= 0; i--) {
          const u = this.units[i];
          if (u.y < zoneY) continue;
          if (Math.abs(u.x - zoneX) > 0.3) continue;
          // damage proporsional: brute/elite boss makin sakit
          const dmg = Math.max(1, Math.round(this.gp() * (b.enraged ? 2.2 : 1.4) * b.dmgMul * (0.7 + Math.random() * 0.6)));
          if (u.giant) {
            u.power -= dmg * 3;
            u.attackT = Math.max(u.attackT, 0.4);
            if (u.power <= 0) {
              this.burst(u.x, u.y, "#f97316", 16);
              this.addFloat(u.x, u.y, "💥", "#fff", 22);
              this.units[i] = this.units[this.units.length - 1];
              this.units.pop();
            }
          } else {
            u.power -= dmg;
            u.attackT = Math.max(u.attackT, 0.3);
            u.lunge = -1;
            if (u.power <= 0) {
              this.burst(u.x, u.y, "#38bdf8", 5);
              this.units[i] = this.units[this.units.length - 1];
              this.units.pop();
            }
          }
          hits++;
          if (hits > 60) break;
        }
        this.spawnShockwave(b.x, Math.max(0.08, b.y - 0.04), b.def.color, 0.34);
        this.burst(b.x, Math.max(0.08, b.y - 0.02), b.def.glow, 18);
        this.shake = Math.max(this.shake, 0.7);
        this.addFloat(b.x, Math.min(0.95, b.y + 0.08), b.attackKind === "slam" ? "💥 HANTAMAN BOS!" : "🦶 INJAKAN BOS!", "#fca5a5", 22);
        play("slam");
        // jeda berikutnya — makin tinggi level makin sering
        // Walk → Attack → Walk repeats visibly throughout the fight (roughly every 4–6 s).
        const base = Math.max(3.2, 5 - Math.min(30, this.level) * 0.04 - (b.enraged ? 0.7 : 0));
        const minor = b.isBoss ? 1 : 1.1;
        b.attackCd = base * minor * rnd(0.9, 1.1);
      }
      return;
    }
    if (b.attackCd > 0) {
      b.attackCd -= wdt;
      if (b.attackCd <= 0) {
        // mulai telegraf: bos meraung, tanda seru, lalu hantam 0.8 dtk kemudian
        b.warnT = 0.8;
        b.actionId = ++this.actionSerial;
        b.attackKind = "roar";
        b.attackT = 0.8;
        this.addFloat(b.x, Math.min(1, b.y + 0.1), "❗", "#fbbf24", 30);
        play("roar");
        if (Math.random() < 0.5) play("warning");
      }
    }
  }

  // ── Giant combat: hantaman AoE otomatis ke kerumunan musuh ──
  private updateGiantCombat(wdt: number) {
    if (this.phase !== "play") return;
    for (const u of this.units) {
      if (!u.giant) continue;
      if (u.slamCd > 0) u.slamCd -= wdt; // attackT is decremented ONLY in updateUnits
      if (u.slamCd > 0) continue;
      // cari musuh dalam radius hantaman
      const R = 0.16;
      let victim: number[] = [];
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        const dx = u.x - e.x;
        const dy = (u.y - e.y) * this.A;
        if (dx * dx + dy * dy < R * R) victim.push(i);
        if (victim.length >= 14) break;
      }
      if (victim.length >= 2) {
        // SLAM!
        u.attackT = 0.65;
        u.attackId = ++this.actionSerial;
        u.slamCd = 1.1;
        u.lunge = 1;
        const slamDmg = Math.max(2, Math.round(u.power * 0.35));
        for (const vi of victim) {
          const e = this.enemies[vi];
          if (!e || e.power <= 0) continue;
          const m = Math.min(slamDmg, e.power);
          e.power -= m;
          e.attackT = Math.max(e.attackT, 0.35);
          e.lunge = -1;
          if (e.power <= 0) {
            this.stats.kills++;
            this.score += BALANCE.killScore(e.type);
            this.burst(e.x, e.y, ENEMY_COLORS[e.type], e.type >= 2 ? 10 : 6);
          }
        }
        // bersihkan yang mati
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          if (this.enemies[i].power <= 0) {
            this.enemies[i] = this.enemies[this.enemies.length - 1];
            this.enemies.pop();
          }
        }
        this.spawnShockwave(u.x, u.y, "#fdba74", 0.2);
        this.burst(u.x, u.y, "#fff7ed", 10);
        this.shake = Math.max(this.shake, 0.4);
        play("slam");
        this.addFloat(u.x, Math.min(0.95, u.y + 0.06), "💥 HANTAM!", "#fed7aa", 18);
      }
    }
  }

  private updateUnits(wdt: number) {
    const frost = this.frostActive > 0 ? 0.45 : 1;
    const units = this.units;
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if (u.attackT > 0) u.attackT -= wdt;
      if (u.attackCd > 0) u.attackCd -= wdt;
      u.lunge *= Math.max(0, 1 - wdt * 6);
      // giant berhenti sejenak saat menghantam (windup → slam)
      const slow = u.giant && u.attackT > 0.25 ? 0.15 : 1;
      u.y += u.speed * frost * slow * wdt;
      u.x += u.vx * wdt;
      u.vx *= 0.9;
      const lim = u.giant ? 0.15 : 0.05;
      if (u.x < lim) { u.x = lim; u.vx = Math.abs(u.vx); }
      if (u.x > 1 - lim) { u.x = 1 - lim; u.vx = -Math.abs(u.vx); }
      // gates
      for (let row = 0; row < 2; row++) {
        const bit = 1 << row;
        if (u.gated & bit) continue;
        const gy = row === 0 ? 0.3 : 0.57;
        if (u.y >= gy) {
          u.gated |= bit;
          for (const g of this.gates) {
            if (g.row === row && u.x >= g.x0 && u.x <= g.x1) {
              this.applyGate(g, u);
              break;
            }
          }
        }
      }
      // reach boss — bos kini BERJALAN, jadi tabrakan terjadi di badan bos
      // badan monster raksasa tebal: kontak terjadi di KAKI-DEPANnya, bukan di pusat badan
      const bossFront = Math.max(0.06, this.boss.y - (0.02 + 0.07 * this.boss.scale));
      if (u.y >= bossFront && this.boss.hp > 0) {
        // unit menabrak badan bos: menghantam lalu hilang
        u.attackT = Math.max(u.attackT, u.giant ? 0.5 : 0.32);
        u.lunge = 1;
        this.damageBoss(u.power, u.x);
        units[i] = units[units.length - 1];
        units.pop();
      } else if (u.y >= PLAYABLE_MAX_Y) {
        // pengaman: unit yang lolos dari bos tetap merusak bos
        this.damageBoss(u.power, u.x);
        units[i] = units[units.length - 1];
        units.pop();
      }
    }
    const en = this.enemies;
    for (let i = en.length - 1; i >= 0; i--) {
      const e = en[i];
      if (e.attackT > 0) e.attackT -= wdt;
      if (e.attackCd > 0) e.attackCd -= wdt;
      e.lunge *= Math.max(0, 1 - wdt * 6);
      // musuh melambat sejenak saat menghantam (agar terlihat "berantem", bukan lewat)
      const slow = e.attackT > 0 ? 0.25 : 1;
      e.y -= e.speed * slow * wdt;
      e.x += Math.sin(this.elapsed * 2 + e.seed * 10) * 0.02 * wdt;
      const em = this.edgeMargin(e.r);
      e.x = clamp(e.x, em, 1 - em); // tak pernah keluar dari jalan
      if (e.y <= 0) {
        // Preserve total wave threat when its HP budget is split across more visible bodies.
        const dmg = Math.min(this.maxHp * 0.5, Math.max(0.01, (e.power / this.gp()) * (0.9 + Math.min(40, this.level) * 0.05)));
        this.hp -= dmg;
        this.dmgFlash = 1;
        this.shake = 0.35;
        this.addFloat(e.x, 0.04, `-${dmg < 1 ? dmg.toFixed(1) : Math.round(dmg)}`, "#f87171", 18);
        this.burst(e.x, 0.01, "#ef4444", 8);
        play("hit");
        en[i] = en[en.length - 1];
        en.pop();
        if (this.hp <= 0) {
          this.hp = 0;
          this.gameOver();
          return;
        }
      }
    }
  }

  private applyGate(g: Gate, u: PUnit) {
    g.pulse = 0.35;
    const w = getWeapon(this.weaponLevel);
    if (u.giant) {
      if (g.kind === "mul") u.power = Math.round(u.power * (1 + (g.value - 1) * 0.5));
      else u.power += g.value * w.power;
      u.maxPower = Math.max(u.maxPower, u.power);
      this.addFloat(u.x, u.y, g.kind === "mul" ? `×${g.value}` : `+${g.value}`, "#fde68a", 18);
      return;
    }
    if (g.kind === "add") {
      for (let i = 0; i < g.value; i++) this.spawnUnit(u.x + rnd(-0.06, 0.06), u.y + rnd(-0.04, 0.02), this.unitPower(w.power), u.gated);
    } else {
      const K = g.value;
      let cloned = 0;
      while (cloned < K - 1 && this.units.length < BALANCE.maxPlayerUnits) {
        this.units.push({ ...u, x: clamp(u.x + rnd(-0.06, 0.06), 0.05, 0.95), y: u.y + rnd(-0.04, 0.02), vx: rnd(-0.15, 0.15), seed: Math.random() });
        cloned++;
      }
      if (cloned < K - 1) u.power *= K - cloned;
    }
    if (Math.random() < 0.08) play("gate");
  }

  private damageBoss(amount: number, x: number) {
    const b = this.boss;
    if (b.hp <= 0) return;
    b.hp -= amount;
    b.hitFlash = 0.15;
    // efek di badan bos yang sedang berjalan
    const by = Math.max(0.08, b.y - 0.02);
    this.burst(x, by, b.def.glow, Math.min(10, 3 + Math.floor(amount / 5)));
    if (amount >= 20) {
      this.addFloat(x, Math.min(1, by + 0.06), `-${Math.round(amount)}`, "#fff", 18);
      this.shake = Math.max(this.shake, 0.25);
    }
    const ratio = b.hp / b.maxHp;
    if (!b.enraged && ratio < 0.4) {
      b.enraged = true;
      b.attackT = 0.9;
      b.actionId = ++this.actionSerial;
      b.attackKind = "roar";
      this.addFloat(b.x, Math.min(1, b.y + 0.1), `${b.def.emoji} BOS MENGAMUK!`, "#fca5a5", 26);
      this.spawnShockwave(b.x, Math.max(0.08, b.y - 0.03), "#ef4444", 0.3);
      this.shake = 0.6;
      play("roar");
    }
    if (b.def.specials.includes("heads") || b.tier >= 2) {
      const thresholds = [0.75, 0.5, 0.25];
      while (this.headsFired < thresholds.length && ratio < thresholds[this.headsFired]) {
        this.headsFired++;
        this.spawnWave(2.2);
        this.addFloat(b.x, Math.min(1, b.y + 0.08), "GELOMBANG BARU!", "#fca5a5", 20);
      }
    }
    if (b.hp <= 0) {
      b.hp = 0;
      if (b.isBoss) this.finalBossDown();
      else this.championDefeated();
    }
  }

  private updateCollisions() {
    const cols = this.gridCols;
    const rows = this.gridRows;
    for (const cell of this.grid) cell.length = 0;
    const cellW = 1 / cols;
    const cellH = PLAYABLE_MAX_Y / rows;
    for (const e of this.enemies) {
      const cx = clamp(Math.floor(e.x / cellW), 0, cols - 1);
      const cy = clamp(Math.floor(e.y / cellH), 0, rows - 1);
      this.grid[cy * cols + cx].push(e);
    }
    const A = this.A;
    const units = this.units;
    let smashBudget = 3; // batasi suara smash per frame agar tidak pecah
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      const cx = clamp(Math.floor(u.x / cellW), 0, cols - 1);
      const cy = clamp(Math.floor(u.y / cellH), 0, rows - 1);
      const span = u.giant ? 2 : 1;
      for (let oy = -span; oy <= span && u.power > 0; oy++) {
        const yy = cy + oy;
        if (yy < 0 || yy >= rows) continue;
        for (let ox = -span; ox <= span && u.power > 0; ox++) {
          const xx = cx + ox;
          if (xx < 0 || xx >= cols) continue;
          const cell = this.grid[yy * cols + xx];
          for (let k = cell.length - 1; k >= 0 && u.power > 0; k--) {
            const e = cell[k];
            if (e.power <= 0) continue;
            const dx = u.x - e.x;
            const dy = (u.y - e.y) * A;
            const rr = u.r + e.r;
            if (dx * dx + dy * dy < rr * rr) {
              // ── PERKELAHIAN: kedua pihak menghantam ──
              if (u.attackCd <= 0) {
                u.attackT = u.giant ? 0.5 : 0.32;
                u.attackId = ++this.actionSerial;
                u.attackCd = u.giant ? 0.5 : 0.42;
                u.lunge = 1;
              }
              if (e.attackCd <= 0) {
                e.attackT = e.type >= 2 ? 0.45 : 0.32;
                e.attackCd = e.type >= 2 ? 0.55 : 0.42;
                e.lunge = 1;
                // brute & elite menghantam balik dengan dorongan kecil
                if (e.type >= 2) {
                  u.vx += (u.x < e.x ? -1 : 1) * 0.25;
                  u.y -= 0.008;
                }
              }
              const m = Math.min(u.power, e.power);
              u.power -= m;
              e.power -= m;
              // efek pukul: partikel + suara (di-budget)
              if (smashBudget > 0 && (u.giant || e.type >= 2 || Math.random() < 0.25)) {
                smashBudget--;
                const mx = (u.x + e.x) / 2;
                const my = (u.y + e.y) / 2;
                this.burst(mx, my, "#ffffff", 2);
                this.burst(mx, my, u.giant ? "#fdba74" : "#fef08a", 2);
                if (u.giant || e.type >= 2) {
                  play("smash");
                  this.shake = Math.max(this.shake, 0.18);
                } else {
                  play("hit");
                }
              }
              if (e.power <= 0) {
                this.stats.kills++;
                this.score += BALANCE.killScore(e.type);
                this.burst(e.x, e.y, ENEMY_COLORS[e.type], e.type >= 2 ? 10 : 4);
                if (e.type >= 2) {
                  this.addFloat(e.x, e.y, "💥", "#fff", 18);
                  this.spawnShockwave(e.x, e.y, ENEMY_COLORS[e.type], 0.12);
                  play("smash");
                }
              }
            }
          }
        }
      }
      if (u.power <= 0) {
        this.burst(u.x, u.y, u.giant ? "#f97316" : "#38bdf8", u.giant ? 18 : 3);
        if (u.giant) {
          this.spawnShockwave(u.x, u.y, "#f97316", 0.24);
          this.addFloat(u.x, u.y, "💥", "#fff", 24);
          this.shake = Math.max(this.shake, 0.5);
          play("slam");
        }
        units[i] = units[units.length - 1];
        units.pop();
      }
    }
    const en = this.enemies;
    for (let i = en.length - 1; i >= 0; i--) {
      if (en[i].power <= 0) {
        en[i] = en[en.length - 1];
        en.pop();
      }
    }
  }

  private updateFx(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 0.4 * dt;
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt;
      f.y += 0.05 * dt;
      if (f.life <= 0) {
        this.floats[i] = this.floats[this.floats.length - 1];
        this.floats.pop();
      }
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= dt;
      const k = 1 - Math.max(0, s.life) / s.maxLife;
      s.r = 0.03 + (s.maxR - 0.03) * (1 - (1 - k) * (1 - k)); // ease-out
      if (s.life <= 0) {
        this.shockwaves[i] = this.shockwaves[this.shockwaves.length - 1];
        this.shockwaves.pop();
      }
    }
    for (const g of this.gates) g.pulse = Math.max(0, g.pulse - dt);
    this.shake = Math.max(0, this.shake - dt * 2);
    this.dmgFlash = Math.max(0, this.dmgFlash - dt * 2.5);
  }

  private burst(x: number, y: number, color: string, n: number) {
    if (this.particles.length > 220) return;
    for (let i = 0; i < n; i++) {
      this.particles.push({ x, y, vx: rnd(-0.3, 0.3), vy: rnd(-0.1, 0.35), life: rnd(0.3, 0.6), max: 0.6, color, size: rnd(2, 5) });
    }
  }

  private addFloat(x: number, y: number, text: string, color: string, size: number) {
    if (this.floats.length > 24) this.floats.shift();
    this.floats.push({ x, y, text, life: 1.1, color, size });
  }

  private setToast(text: string, kind: "good" | "bad" | "info") {
    this.toast = { id: ++this.toastId, text, kind };
    this.toastTimer = 2.2;
  }

  // ── stage: penjaga → bos ─────────────────────────────────────
  private makeChampion(k: number): BossState {
    const L = this.level;
    const tier = bossTierForLevel(L);
    const bossIdx = bossIndexForLevel(L);
    const isBoss = k >= this.stageTotal - 1;
    // penjaga memakai wujud monster lain (lebih kecil), makin lama makin kuat
    const visIdx = isBoss ? bossIdx : (bossIdx + 3 + k * 3) % BOSSES.length === bossIdx ? (bossIdx + 1) % BOSSES.length : (bossIdx + 3 + k * 3) % BOSSES.length;
    // stage panjang: penjaga makin tangguh, bos jauh lebih tebal
    const hp = BALANCE.champHp(L, k, this.stageTotal, BALANCE.refRaw(L, this.weaponLevel));
    // bos berjalan pelan: butuh ±2,8× lama duel untuk sampai benteng → ada waktu berjuang
    const baseSpeed = 0.9 / (BALANCE.fightSeconds(L, k, this.stageTotal) * 2.8);
    return {
      id: ++this.entitySerial,
      actionId: ++this.actionSerial,
      def: BOSSES[visIdx],
      index: visIdx,
      tier,
      hp,
      maxHp: hp,
      enraged: false,
      hitFlash: 0,
      attackT: 0,
      attackCd: 1.25, // serangan pertama cepat agar gerak Attack selalu terlihat sebelum bos tumbang
      attackKind: "slam",
      warnT: 0,
      x: 0.5,
      y: 1.04,
      speed: baseSpeed,
      walkPhase: Math.random() * 10,
      siegeT: 0,
      warnedClose: false,
      isBoss,
      scale: isBoss ? 1 : Math.min(0.92, 0.66 + k * 0.05),
      dmgMul: isBoss ? 1 : 0.55 + k * 0.08,
    };
  }

  private championDefeated() {
    const b = this.boss;
    const bonus = BALANCE.guardScore(this.level, this.stageIndex);
    this.score += bonus;
    this.stats.kills += 1;
    const by = Math.max(0.1, b.y);
    this.burst(b.x, by, b.def.glow, 36);
    this.burst(b.x, by, "#fbbf24", 18);
    this.spawnShockwave(b.x, by, b.def.glow, 0.3);
    this.shake = Math.max(this.shake, 0.5);
    this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.12));
    this.addFloat(b.x, Math.min(1, by + 0.06), `+${bonus}`, "#fde68a", 22);
    const done = this.stageIndex + 1;
    const nextIsFinal = done >= this.stageTotal - 1;
    this.setToast(nextIsFinal ? `💥 Bos ${done} tumbang! Pasukan datang… BOS AKHIR menyusul!` : `💥 Bos ${done} tumbang! Gelombang pasukan datang!`, "good");
    play("levelup");
    // gelombang pasukan berikutnya, lalu bos selanjutnya masuk
    this.stageIndex = done;
    this.stageMode = "wave";
    this.waveTimer = BALANCE.betweenWave(this.level);
    this.champTime = 0;
    this.pushHud(true);
  }

  /** Bos akhir tumbang — stage BELUM selesai sampai semua pasukan lawan habis. */
  private finalBossDown() {
    const b = this.boss;
    const by = Math.max(0.1, b.y);
    this.burst(b.x, by, b.def.glow, 50);
    this.burst(b.x, by, "#fbbf24", 24);
    this.spawnShockwave(b.x, by, b.def.glow, 0.4);
    this.shake = Math.max(this.shake, 0.7);
    play("boss");
    this.stageMode = "mopup";
    this.mopTimer = 0;
    this.stageIndex = this.stageTotal; // semua bos selesai
    this.setToast(`👑 ${b.def.name} tumbang! Habisi semua sisa pasukan!`, "good");
    this.addFloat(0.5, 0.6, "HABISI SISA PASUKAN!", "#fde68a", 24);
    this.pushHud(true);
  }

  /** Bos ke-(stageIndex) masuk arena, diiringi pasukan besar di belakangnya. */
  private enterChampion() {
    this.headsFired = 0;
    this.boss = this.makeChampion(this.stageIndex);
    this.champTime = 0;
    this.stageMode = "champion";
    this.championEntrance();
    if (this.boss.isBoss) {
      this.addFloat(0.5, 0.75, `⚠️ BOS AKHIR: ${this.boss.def.name.toUpperCase()}!`, "#fca5a5", 26);
      this.setToast(`👑 ${this.boss.def.name} datang bersama pasukannya!`, "bad");
      this.shake = Math.max(this.shake, 0.6);
    } else {
      this.addFloat(0.5, 0.8, `👾 BOS ${this.stageIndex + 1}/${this.stageTotal} datang!`, "#fde68a", 22);
      this.setToast(`👾 Bos ${this.stageIndex + 1} datang bersama pasukannya!`, "bad");
    }
    play("roar");
    this.pushHud(true);
  }

  /** Monster masuk arena: raungan menyapu pasukan yang menumpuk di garis depan + gelombang pengawal. */
  private championEntrance() {
    const b = this.boss;
    const line = b.isBoss ? 0.72 : 2; // hanya bos akhir yang raungannya menyapu pasukan
    let swept = 0;
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (u.y < line) continue;
      if (u.giant) {
        u.power *= 0.7;
        u.attackT = Math.max(u.attackT, 0.4);
        continue;
      }
      if (swept % 4 === 0) this.burst(u.x, u.y, "#38bdf8", 2);
      swept++;
      this.units[i] = this.units[this.units.length - 1];
      this.units.pop();
    }
    b.attackT = 0.9;
    b.actionId = ++this.actionSerial;
    b.attackKind = "roar";
    this.spawnShockwave(0.5, 0.95, b.def.color, 0.5);
    this.shake = Math.max(this.shake, 0.5);
    if (swept > 0) this.addFloat(0.5, 0.86, `🔊 RAUNGAN! -${swept} pasukan`, "#fca5a5", 20);
    // pasukan pengiring berbaris di belakang bos (beberapa lapis)
    this.spawnWave(b.isBoss ? 3.6 : 2.1); // full-width escorts leave the far red gate
  }

  private updateStage(wdt: number) {
    this.champTime += wdt;
    if (this.stageMode === "wave") {
      this.waveTimer -= wdt;
      if (this.waveTimer <= 0) this.enterChampion();
    } else if (this.stageMode === "mopup") {
      this.mopTimer += wdt;
      // Pending gate rows count as enemies too. No timer may silently delete surviving soldiers.
      if (this.enemies.length === 0 && this.pendingEnemyCount() === 0) this.levelClear();
    }
  }

  // ── phase transitions ────────────────────────────────────────
  private levelClear() {
    if (this.phase !== "play") return;
    this.phase = "clear";
    this.question = null;
    this.timeScale = 1;
    const bonus = BALANCE.bossScore(this.level);
    const timeBonus = BALANCE.timeBonus(this.level, this.levelTime);
    this.score += bonus + timeBonus;
    this.stats.bossesDefeated++;
    this.levelClearInfo = { level: this.level, bossName: this.boss.def.name, bonus, timeBonus };
    this.clearTimer = 3.4;
    this.shake = 0.8;
    const bx = this.boss.x;
    const by = Math.max(0.1, this.boss.y);
    this.burst(bx, by, this.boss.def.glow, 60);
    this.burst(0.3, by, "#fbbf24", 30);
    this.burst(0.7, by, "#fbbf24", 30);
    this.spawnShockwave(bx, by, this.boss.def.glow, 0.4);
    this.spawnShockwave(bx, by, "#ffffff", 0.3);
    this.enemies = [];
    this.cb.onBossDefeated(this.boss.index, this.boss.tier, this.level);
    play("boss");
    this.pushHud(true);
  }

  private nextLevel() {
    this.level++;
    this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.4));
    this.levelClearInfo = null;
    this.setupLevel();
    this.pushHud(true);
  }

  private gameOver() {
    if (this.phase === "gameover") return;
    this.phase = "gameover";
    this.question = null;
    this.timeScale = 1;
    play("gameover");
    this.pushHud(true);
    this.cb.onGameOver(this.summary());
  }

  summary(): GameSummary {
    return {
      score: Math.round(this.score),
      level: this.level,
      correct: this.stats.correct,
      wrong: this.stats.wrong,
      kills: this.stats.kills,
      bossesDefeated: this.stats.bossesDefeated,
      elapsed: Math.round(this.elapsed),
      bestStreak: this.bestStreak,
    };
  }

  // ── HUD ──────────────────────────────────────────────────────
  private pushHud(force: boolean) {
    if (!force && this.hudTimer > 0) return;
    this.hudTimer = 0.12;
    const w = getWeapon(this.weaponLevel);
    this.cb.onHud({
      phase: this.phase,
      paused: this.paused,
      level: this.level,
      mapName: this.map.name,
      mapAccent: this.map.accent,
      boss: {
        name: this.boss.def.name,
        title: this.boss.def.title,
        emoji: this.boss.def.emoji,
        hp: Math.max(0, Math.round(this.boss.hp)),
        maxHp: this.boss.maxHp,
        tier: this.boss.tier,
        color: this.boss.def.color,
        enraged: this.boss.enraged,
      },
      score: Math.round(this.score),
      hp: Math.max(0, Math.round(this.hp)),
      maxHp: this.maxHp,
      weapon: { level: this.weaponLevel, name: w.name, color: w.color, emoji: w.emoji, power: w.power, barrels: w.barrels },
      streak: this.streak,
      bestStreak: this.bestStreak,
      units: this.units.length,
      enemies: this.enemies.length,
      mathCooldown: Math.max(0, this.manualCd),
      autoQuestionIn: Math.max(0, this.autoQ),
      question: this.question ? { ...this.question } : null,
      toast: this.toast,
      stats: { ...this.stats, elapsed: this.elapsed, levelTime: this.levelTime },
      lastReward: this.lastReward,
      levelClear: this.levelClearInfo,
      frost: this.frostActive > 0,
      stage: (() => {
        const fb = BOSSES[bossIndexForLevel(this.level)];
        return {
          index: this.stageIndex,
          total: this.stageTotal,
          isBoss: this.boss.isBoss && this.stageMode === "champion",
          incoming: this.stageMode === "wave" ? Math.max(0, this.waveTimer) : 0,
          mode: this.stageMode,
          enemiesLeft: this.enemies.length + this.pendingEnemyCount(),
          bossName: fb.name,
          bossTitle: fb.title,
          bossEmoji: fb.emoji,
          bossColor: fb.color,
          bossMaxHp: BALANCE.champHp(this.level, this.stageTotal - 1, this.stageTotal, BALANCE.refRaw(this.level, this.weaponLevel)),
          bossDesc: fb.desc,
        };
      })(),
    });
  }

  // ── render ───────────────────────────────────────────────────
  private render() {
    if (!this.view || !this.map || !this.boss) return;
    const w = getWeapon(this.weaponLevel);
    this.view.render({
      time: this.animationTime,
      shake: this.shake,
      frost: this.frostActive,
      flash: this.flash,
      dmg: this.dmgFlash,
      cannonX: this.cannonX,
      phase: this.phase,
      intro: this.introTimer,
      map: this.map,
      weaponLevel: this.weaponLevel,
      weaponColor: w.color,
      barrels: w.barrels,
      hpRatio: this.maxHp > 0 ? Math.max(0, this.hp) / this.maxHp : 0,
      units: this.units,
      enemies: this.enemies,
      gates: this.gates,
      bossIndex: this.boss.index,
      bossTier: this.boss.tier,
      bossHp: this.boss.hp,
      bossMax: this.boss.maxHp,
      bossColor: this.boss.def.color,
      enraged: this.boss.enraged,
      hitFlash: this.boss.hitFlash,
      bossAttackT: this.boss.attackT,
      bossEntityId: this.boss.id,
      bossActionId: this.boss.actionId,
      bossAction: this.boss.hp <= 0 ? "death" : this.boss.warnT > 0 || (this.boss.attackT > 0 && this.boss.attackKind !== "roar") ? "attack" : this.boss.attackT > 0 ? "roar" : "walk",
      gatePulse: this.gatePulse,
      bossAttackKind: this.boss.attackKind,
      bossWarn: this.boss.warnT,
      bossX: this.boss.x,
      bossY: this.boss.y,
      bossWalk: this.boss.walkPhase,
      champScale: this.boss.scale,
      particles: this.particles,
      floats: this.floats,
      shockwaves: this.shockwaves,
    });
  }
}
