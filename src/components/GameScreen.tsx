"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine, type GameSummary, type HudState } from "@/lib/game/engine";
import { BALANCE, getRank, romanTier } from "@/lib/game/data";
import { TIER_LABEL, tierForLevel } from "@/lib/game/math";
import { formatScore, updateSave, type Profile, type SaveData } from "@/lib/storage";
import { submitScore, type SubmitResult } from "@/lib/leaderboard";
import { play, playMusic, setSoundEnabled, stopMusic } from "@/lib/audio";
import { Avatar, GameButton, RankBadge } from "./ui";

interface Props {
  profile: Profile;
  save: SaveData;
  startLevel: number;
  onExit: () => void;
  onSaveChanged: (s: SaveData) => void;
  onOpenLeaderboard: () => void;
  onRestart: () => void;
}

interface Result {
  summary: GameSummary;
  improved: boolean;
  prevBest: number;
  oldRankIdx: number;
  newRankIdx: number;
  submit: SubmitResult | null;
  submitting: boolean;
}

export default function GameScreen({ profile, save, startLevel, onExit, onSaveChanged, onOpenLeaderboard, onRestart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showTutorial, setShowTutorial] = useState(!save.tutorialSeen);
  const [gfxOk, setGfxOk] = useState(true);
  const [picked, setPicked] = useState<number | null>(null);
  const [sound, setSound] = useState(save.sound);
  const profileRef = useRef(profile);
  const saveRef = useRef(save);
  const onSaveChangedRef = useRef(onSaveChanged);
  profileRef.current = profile;
  saveRef.current = save;
  onSaveChangedRef.current = onSaveChanged;

  const handleGameOver = useCallback(async (summary: GameSummary) => {
    const prev = saveRef.current;
    const improved = summary.score > prev.bestScore;
    const oldRankIdx = getRank(prev.bestScore).index;
    const next = updateSave((s) => ({
      ...s,
      bestScore: Math.max(s.bestScore, summary.score),
      bestLevel: Math.max(s.bestLevel, summary.level),
      games: s.games + 1,
      correct: s.correct + summary.correct,
      wrong: s.wrong + summary.wrong,
    }));
    onSaveChangedRef.current(next);
    const newRankIdx = getRank(next.bestScore).index;
    setResult({ summary, improved, prevBest: prev.bestScore, oldRankIdx, newRankIdx, submit: null, submitting: true });
    const p = profileRef.current;
    const res = await submitScore({
      id: p.id,
      name: p.name || "Pemain",
      photo: p.photo,
      score: summary.score,
      level: summary.level,
      rank: getRank(next.bestScore).name,
      correct: summary.correct,
      wrong: summary.wrong,
      durationSec: summary.elapsed,
    });
    setResult((r) => (r ? { ...r, submit: res, submitting: false } : r));
  }, []);

  // create engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    setSoundEnabled(saveRef.current.sound);
    if (saveRef.current.sound) playMusic("battle");
    const engine = new GameEngine(
      canvas,
      { startLevel, rankIndex: getRank(saveRef.current.bestScore).index },
      {
        onHud: (h) => setHud(h),
        onGameOver: (s) => void handleGameOver(s),
        onBossDefeated: (bossIndex, tier) => {
          const next = updateSave((s) => ({
            ...s,
            bosses: { ...s.bosses, [bossIndex]: Math.max(s.bosses[bossIndex] ?? 0, tier) },
          }));
          onSaveChangedRef.current(next);
        },
      },
    );
    engineRef.current = engine;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      engine.resize(r.width, r.height, Math.min(2, window.devicePixelRatio || 1));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    engine.start();
    if (!saveRef.current.tutorialSeen) engine.setPaused(true);
    const onVis = () => {
      if (document.hidden) engine.setPaused(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      engine.destroy();
      engineRef.current = null;
      stopMusic();
      if (saveRef.current.sound) playMusic("menu");
    };
  }, [startLevel, handleGameOver]);

  // musik bos saat bos mengamuk / level bos besar
  useEffect(() => {
    if (!hud || !saveRef.current.sound) return;
    if (hud.boss.enraged || hud.stage.isBoss || hud.level % 10 === 0) playMusic("boss");
    else if (hud.phase === "play") playMusic("battle");
  }, [hud?.boss.enraged, hud?.stage.isBoss, hud?.level, hud?.phase]);

  const startAfterTutorial = () => {
    const next = updateSave((s) => ({ ...s, tutorialSeen: true }));
    onSaveChangedRef.current(next);
    setShowTutorial(false);
    engineRef.current?.start();
    engineRef.current?.setPaused(false);
  };

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>, down: boolean) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    const rect = canvas.getBoundingClientRect();
    engine.setPointer(e.clientX - rect.left, down);
  };

  const answer = (choice: number) => {
    const engine = engineRef.current;
    if (!engine || !hud?.question) return;
    setPicked(choice);
    engine.answerQuestion(choice);
    setTimeout(() => setPicked(null), 50);
  };

  const toggleSound = () => {
    const v = !sound;
    setSound(v);
    setSoundEnabled(v);
    const next = updateSave((s) => ({ ...s, sound: v }));
    onSaveChangedRef.current(next);
  };

  const q = hud?.question ?? null;
  const hpRatio = hud ? hud.hp / hud.maxHp : 1;

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-slate-950 select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pointer(e, true);
          engineRef.current?.skipIntro();
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === "touch") pointer(e, true);
        }}
        onPointerUp={(e) => pointer(e, false)}
        onPointerCancel={(e) => pointer(e, false)}
      />
      {!gfxOk && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 text-center text-white">
          <div>
            <div className="text-3xl">🎮</div>
            <div className="mt-2 text-lg font-black">Grafis 3D tidak tersedia</div>
            <p className="mt-2 text-sm text-slate-300">Peramban ini tidak mendukung WebGL. Buka di Chrome / HP yang lebih baru, lalu install ke layar utama.</p>
          </div>
        </div>
      )}

      {/* ── HUD: logo + coin score, like the lane games ── */}
      {hud && (
        <div className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-[max(env(safe-area-inset-top),8px)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="game-logo text-[22px] leading-none">
                SURVIVAL
                <br />
                <span>MATEMATIC</span>
              </div>
              <div className="mt-1 w-fit rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">
                Lv.{hud.level} · {hud.mapName}
                {hud.boss.enraged ? " · MENGAMUK" : ""}
              </div>
              {/* progres stage: bos 1 → … → bos akhir */}
              <div className="mt-1 flex w-fit items-center gap-1 rounded-full bg-black/50 px-2 py-1 backdrop-blur">
                {Array.from({ length: hud.stage.total }).map((_, i) => {
                  const last = i === hud.stage.total - 1;
                  const done = i < hud.stage.index;
                  const active = i === hud.stage.index && hud.stage.mode === "champion";
                  return (
                    <span
                      key={i}
                      className={`flex items-center justify-center rounded-full font-black leading-none transition ${last ? "h-6 w-6 text-sm" : "h-5 w-5 text-[10px]"} ${
                        done ? "bg-emerald-500 text-white" : active ? "animate-pulse bg-rose-500 text-white ring-2 ring-white" : "bg-white/15 text-white/70"
                      }`}
                    >
                      {done ? "✓" : last ? "👑" : "👾"}
                    </span>
                  );
                })}
              </div>
              {/* status fase: gelombang pasukan / bos / habisi sisa pasukan */}
              <div className="mt-1 w-fit rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">
                {hud.stage.mode === "wave" &&
                  (hud.stage.index >= hud.stage.total - 1
                    ? `⚔️ Gelombang pasukan · BOS AKHIR datang ${Math.ceil(hud.stage.incoming)} dtk`
                    : `⚔️ Gelombang pasukan · Bos ${hud.stage.index + 1} datang ${Math.ceil(hud.stage.incoming)} dtk`)}
                {hud.stage.mode === "champion" && (hud.stage.isBoss ? "👑 BOS AKHIR + pasukannya!" : `👾 Bos ${hud.stage.index + 1}/${hud.stage.total} + pasukannya!`)}
                {hud.stage.mode === "mopup" && `🧹 Habisi sisa pasukan: ${hud.stage.enemiesLeft}`}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-full bg-black/55 py-1 pl-1 pr-2.5 backdrop-blur">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-[11px] font-black text-amber-950 shadow">★</span>
                <span className="text-sm font-black tabular-nums text-white">{formatScore(hud.score)}</span>
              </div>
              <div className="pointer-events-auto flex gap-1">
                <button onClick={toggleSound} className="btn-press h-8 w-8 rounded-full bg-black/45 text-sm text-white backdrop-blur" aria-label="Suara">
                  {sound ? "🔊" : "🔇"}
                </button>
                <button onClick={() => engineRef.current?.setPaused(true)} className="btn-press h-8 w-8 rounded-full bg-black/45 text-xs font-black text-white backdrop-blur" aria-label="Jeda">
                  ❚❚
                </button>
              </div>
            </div>
          </div>
          {hud.toast && (
            <div key={hud.toast.id} className={`toast-in mx-auto mt-2 w-fit rounded-full px-4 py-1.5 text-sm font-black text-white shadow-lg ${hud.toast.kind === "good" ? "bg-emerald-600" : hud.toast.kind === "bad" ? "bg-rose-600" : "bg-slate-800"}`}>
              {hud.toast.text}
            </div>
          )}
          {hud.frost && <div className="mx-auto mt-1 w-fit rounded-full bg-sky-200/90 px-3 py-0.5 text-xs font-black text-sky-900">❄️ Pasukan membeku!</div>}
        </div>
      )}

      {/* ── Math challenge button ───────────────────── */}
      {hud && hud.phase === "play" && !q && !hud.paused && (
        <div className="absolute bottom-[max(env(safe-area-inset-bottom),12px)] right-3 flex flex-col items-center gap-1">
          <button
            onClick={() => {
              if (engineRef.current?.requestQuestion()) play("click");
            }}
            disabled={hud.mathCooldown > 0}
            className="btn-press relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/80 bg-gradient-to-b from-fuchsia-500 to-purple-700 text-3xl shadow-[0_0_24px_rgba(217,70,239,.7)] disabled:opacity-60"
            aria-label="Minta soal"
          >
            🧮
            {hud.mathCooldown > 0 && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/60 text-xl font-black text-white">{Math.ceil(hud.mathCooldown)}</span>
            )}
          </button>
          <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black text-white">HITUNG · {Math.ceil(hud.autoQuestionIn)}s</span>
        </div>
      )}
      {hud && hud.phase === "play" && !q && !hud.paused && (
        <div className="pointer-events-none absolute bottom-[max(env(safe-area-inset-bottom),14px)] left-3 flex flex-col gap-1">
          <div className="w-36 rounded-full bg-black/50 px-2 py-1 backdrop-blur">
            <div className="flex items-center justify-between gap-1 text-[10px] font-black text-white">
              <span>🏰 {hud.hp}</span>
              <span style={{ color: hud.weapon.color }}>{hud.weapon.emoji} {hud.weapon.level}</span>
              {hud.streak > 0 && (
                <span className="rounded-full bg-orange-500 px-1.5 text-[10px] text-white">
                  🔥{hud.streak} ×{BALANCE.comboMul(hud.streak).toFixed(2).replace(/0$/, "")}
                </span>
              )}
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full" style={{ width: `${hpRatio * 100}%`, background: hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#f59e0b" : "#ef4444" }} />
            </div>
          </div>
          {hud.stats.elapsed < 7 && <div className="w-fit rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white">Geser jari · tembak gerbang terbesar</div>}
        </div>
      )}

      {/* ── Math question sheet ─────────────────────── */}
      {q && (
        <div className="absolute inset-x-0 bottom-0 z-20 sheet-in rounded-t-[28px] border-t-[6px] border-fuchsia-500 bg-white px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 text-slate-900 shadow-[0_-12px_40px_rgba(0,0,0,.45)]">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-[11px] font-black text-fuchsia-700">
              🎁 {q.reward.icon} {q.reward.label}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-black tabular-nums ${q.timeLeft < 3 ? "animate-pulse bg-red-600 text-white" : "bg-slate-100 text-slate-800"}`}>⏱ {Math.ceil(q.timeLeft)}s</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-[width] duration-100 ease-linear" style={{ width: `${(q.timeLeft / q.timeLimit) * 100}%` }} />
          </div>
          <div className="mt-2 text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{TIER_LABEL[q.question.tier] ?? TIER_LABEL[0]}</div>
            <div className="mt-1 text-5xl font-black tracking-wide text-slate-900 tabular-nums drop-shadow-sm">
              {q.question.text} <span className="text-fuchsia-600">= ?</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {q.question.choices.map((c, i) => (
              <button
                key={`${c}-${i}`}
                onClick={() => answer(c)}
                className={`btn-press rounded-2xl border-b-4 py-4 text-3xl font-black tabular-nums text-white transition active:translate-y-1 active:shadow-none ${
                  picked === c ? "border-emerald-900 bg-emerald-500" : "border-blue-900 bg-gradient-to-b from-sky-400 to-blue-600 shadow-[0_6px_0_#1e3a8a]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Reward feedback chip ────────────────────── */}
      {hud?.lastReward && !q && hud.phase === "play" && (
        <div key={hud.lastReward.id} className="reward-pop pointer-events-none absolute inset-x-0 top-[38%] mx-auto w-fit max-w-[90%]">
          <div className={`rounded-2xl border-2 px-4 py-2 text-center text-sm font-black shadow-2xl ${hud.lastReward.correct ? "border-emerald-300 bg-emerald-600 text-white" : "border-rose-300 bg-rose-700 text-white"}`}>
            {hud.lastReward.correct ? (
              <>
                <div className="text-2xl">{hud.lastReward.reward.icon}</div>
                {hud.lastReward.reward.label}
              </>
            ) : (
              <>
                <div className="text-2xl">💔</div>
                Hadiah hilang: {hud.lastReward.reward.label}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Level intro ─────────────────────────────── */}
      {hud && hud.phase === "intro" && !showTutorial && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="intro-pop mx-6 w-full max-w-sm rounded-3xl border border-white/20 bg-slate-950/70 p-4 text-center shadow-2xl backdrop-blur-sm">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-sky-300">Level {hud.level}</div>
            <div className="text-2xl font-black text-white">{hud.mapName}</div>
            <div className="mt-3 flex items-center justify-center gap-1 text-xl">
              <span className="text-base">⚔️</span>
              {Array.from({ length: hud.stage.total - 1 }).map((_, i) => (
                <span key={i}>👾</span>
              ))}
              <span className="text-white/50">→</span>
              <span className="text-5xl drop-shadow-[0_0_20px_rgba(255,255,255,.5)]">{hud.stage.bossEmoji}</span>
            </div>
            <div className="mt-1 text-[11px] font-bold text-amber-300">Tahan gelombang pasukan, kalahkan {hud.stage.total - 1} bos beserta pasukannya, lalu bos akhir. Stage selesai bila SEMUA lawan habis!</div>
            <div className="mt-1 text-lg font-black" style={{ color: hud.stage.bossColor }}>
              {hud.stage.bossName} <span className="text-white/60">· Tingkat {romanTier(hud.boss.tier)}</span>
            </div>
            <div className="text-xs text-slate-300">{hud.stage.bossTitle} · HP {formatScore(hud.stage.bossMaxHp)}</div>
            <div className="mt-2 text-[11px] text-slate-400">{hud.stage.bossDesc}</div>
            <div className="mt-3 text-[11px] font-bold text-fuchsia-300">Soal: {TIER_LABEL[tierForLevel(hud.level)]} · tidak makin sulit</div>
            <div className="mt-2 animate-pulse text-xs text-white/60">Sentuh layar untuk mulai</div>
          </div>
        </div>
      )}

      {/* ── Level clear ─────────────────────────────── */}
      {hud && hud.phase === "clear" && hud.levelClear && (
        <div className="absolute inset-0 flex items-center justify-center" onPointerDown={() => engineRef.current?.skipIntro()}>
          <div className="intro-pop mx-6 w-full max-w-sm rounded-3xl border-2 border-amber-400/60 bg-slate-950/90 p-5 text-center shadow-2xl">
            <div className="text-5xl">🏆</div>
            <div className="mt-1 text-2xl font-black text-amber-300">BOS DIKALAHKAN!</div>
            <div className="text-sm font-bold text-white">
              {hud.levelClear.bossName} · Level {hud.levelClear.level}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-left text-xs">
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-slate-400">Bonus Bos</div>
                <div className="text-lg font-black text-emerald-400">+{formatScore(hud.levelClear.bonus)}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-slate-400">Bonus Waktu</div>
                <div className="text-lg font-black text-sky-400">+{formatScore(hud.levelClear.timeBonus)}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-300">Benteng dipulihkan +40% · Musuh berikutnya lebih kuat!</div>
            <div className="mt-2 animate-pulse text-xs text-white/60">Sentuh untuk lanjut →</div>
          </div>
        </div>
      )}

      {/* ── Pause ───────────────────────────────────── */}
      {hud?.paused && !showTutorial && hud.phase !== "gameover" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-xs rounded-3xl border border-white/15 bg-slate-900 p-6 text-center">
            <div className="text-2xl font-black text-white">Jeda</div>
            <div className="mt-1 text-xs text-slate-400">
              Level {hud.level} · Skor {formatScore(hud.score)}
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <GameButton onClick={() => engineRef.current?.setPaused(false)}>▶ Lanjutkan</GameButton>
              <GameButton variant="danger" onClick={onExit}>
                Keluar ke Menu
              </GameButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Tutorial ────────────────────────────────── */}
      {showTutorial && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-slate-950/35 p-4 pb-8">
          <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-slate-900 p-5 text-white">
            <div className="text-center text-2xl font-black">Cara Bermain</div>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="text-2xl">👆</span>
                <span>
                  <b>Geser jari</b> kiri-kanan seperti game aslinya. Meriam menembak pasukan biru 3D yang berlari menerobos gerbang.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-2xl">🚪</span>
                <span>
                  Arahkan ke gerbang <b>×3 / ×4 / +</b> yang nilainya paling besar. Pasukan biru <b>berkelahi</b> (saling hantam) dengan kerumunan merah yang berjalan mendekat.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-2xl">🧮</span>
                <span>
                  <b>Jawab soal matematika</b> dengan benar untuk mendapat <b>senjata baru</b>, <b>pasukan berlipat</b>, atau <b>monster raksasa penghantam</b>. Jawab benar <b>berturut-turut = KOMBO</b>: kekuatan semua pasukan naik sampai <b>×2</b>. Salah = kombo putus + gelombang hukuman!
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-2xl">💥</span>
                <span>
                  Waspada! <b>Bos BERJALAN mendekatimu</b> memimpin hord-nya — tidak lagi diam di panggung! Saat muncul tanda ❗, bos akan <b>menghantam / menginjak</b> pasukanmu. Kalau bos sampai benteng, bentengmu digebuki terus! Habisi sebelum ia tiba!
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-2xl">🏰</span>
                <span>Jangan biarkan musuh merah mencapai benteng. Kalahkan bos untuk naik level — musuh akan makin kuat tanpa batas!</span>
              </li>
            </ul>
            <GameButton className="mt-5 w-full" variant="gold" onClick={startAfterTutorial}>
              Mengerti, Mulai!
            </GameButton>
          </div>
        </div>
      )}

      {/* ── Game over ───────────────────────────────── */}
      {result && (
        <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/90 p-4 backdrop-blur">
          <div className="intro-pop w-full max-w-sm rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900 to-slate-950 p-5 text-center text-white shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-rose-400">Benteng Runtuh</div>
            <div className="mt-1 text-3xl font-black">Permainan Selesai</div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Avatar photo={profile.photo} name={profile.name} size={56} />
              <div className="text-left">
                <div className="font-black">{profile.name || "Pemain"}</div>
                <RankBadge score={Math.max(save.bestScore, result.summary.score)} small />
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-white/5 p-3">
              <div className="text-xs text-slate-400">Skor Akhir</div>
              <div className="text-4xl font-black text-amber-300 tabular-nums">{formatScore(result.summary.score)}</div>
              {result.improved ? (
                <div className="mt-1 text-xs font-black text-emerald-400">🎉 Rekor baru! (sebelumnya {formatScore(result.prevBest)})</div>
              ) : (
                <div className="mt-1 text-xs text-slate-400">Rekor terbaik: {formatScore(result.prevBest)}</div>
              )}
              {result.newRankIdx > result.oldRankIdx && (
                <div className="mt-2 rounded-xl bg-amber-500/20 px-2 py-1 text-xs font-black text-amber-300">⬆️ Naik rank menjadi {getRank(Math.max(save.bestScore, result.summary.score)).name}!</div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Stat label="Level" value={`${result.summary.level}`} />
              <Stat label="Bos Kalah" value={`${result.summary.bossesDefeated}`} />
              <Stat label="Musuh" value={formatScore(result.summary.kills)} />
              <Stat label="Benar" value={`${result.summary.correct}`} good />
              <Stat label="Salah" value={`${result.summary.wrong}`} bad />
              <Stat label="Streak" value={`${result.summary.bestStreak}`} />
            </div>
            <div className="mt-3 text-[11px] text-slate-400">
              {result.submitting && "☁️ Menyimpan ke peringkat global…"}
              {!result.submitting && result.submit?.firestore === "improved" && "☁️ Skor tersimpan di peringkat global (Firestore)."}
              {!result.submitting && result.submit?.firestore === "kept" && "☁️ Skor tertinggimu di peringkat global tetap dipertahankan."}
              {!result.submitting && result.submit?.firestore === "failed" && (result.submit.server === "ok" ? "⚠️ Firestore tidak terjangkau, skor disimpan di server cadangan." : "⚠️ Gagal menyimpan skor online (offline?).")}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <GameButton variant="gold" onClick={onRestart}>
                🔁 Main Lagi
              </GameButton>
              <div className="grid grid-cols-2 gap-2">
                <GameButton variant="primary" onClick={onOpenLeaderboard}>
                  🏆 Peringkat
                </GameButton>
                <GameButton variant="secondary" onClick={onExit}>
                  Menu
                </GameButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="rounded-xl bg-white/5 p-2">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`text-base font-black tabular-nums ${good ? "text-emerald-400" : bad ? "text-rose-400" : "text-white"}`}>{value}</div>
    </div>
  );
}
