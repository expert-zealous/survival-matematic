"use client";
import { useEffect } from "react";
import { BOSSES, RANKS, bossIndexForLevel, getRank, mapForLevel } from "@/lib/game/data";
import { formatScore, type Profile, type SaveData } from "@/lib/storage";
import { playMusic } from "@/lib/audio";
import { Avatar, GameButton, RankBadge } from "./ui";
import { STATIC_EXPORT, withBase } from "@/lib/base";
import { GameLogo, MenuBackground } from "./GameLogo";
import { BossIcon } from "./BossIcon";

interface Props {
  profile: Profile;
  save: SaveData;
  startLevel: number;
  onStartLevel: (l: number) => void;
  onPlay: () => void;
  onProfile: () => void;
  onLeaderboard: () => void;
  onBosses: () => void;
  canInstall: boolean;
  onInstall: () => void;
  isIos: boolean;
  installed: boolean;
}

export default function MainMenu({ profile, save, startLevel, onStartLevel, onPlay, onProfile, onLeaderboard, onBosses, canInstall, onInstall, isIos, installed }: Props) {
  const rank = getRank(save.bestScore);
  const checkpoints = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31].filter((cp) => cp <= Math.max(1, save.bestLevel) && cp <= rank.startLevel);
  const nextRank = rank.next;
  useEffect(() => {
    if (save.sound) playMusic("menu");
  }, [save.sound]);
  return (
    <div className="relative h-full w-full overflow-y-auto bg-slate-950">
      <MenuBackground />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/60 to-slate-950" />
      <div className="relative flex min-h-full flex-col px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-[max(env(safe-area-inset-top),20px)]">
        {/* logo */}
        <div className="mt-2 text-center">
          <div className="inline-block rounded-full bg-fuchsia-600/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-200 backdrop-blur">Pertempuran 3D · Kuasai hitung · Taklukkan bos</div>
          <GameLogo />
        </div>

        {/* player card */}
        <button onClick={onProfile} className="btn-press mt-6 flex items-center gap-3 rounded-3xl border border-white/15 bg-slate-900/70 p-3 text-left backdrop-blur-md">
          <Avatar photo={profile.photo} name={profile.name} size={56} ring={rank.color} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-black text-white">{profile.name || "Atur nama pemain →"}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <RankBadge score={save.bestScore} small />
              <span className="text-xs text-slate-300">Rekor {formatScore(save.bestScore)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${rank.progress * 100}%`, background: rank.color }} />
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">{nextRank ? `${formatScore(nextRank.min - save.bestScore)} poin lagi ke ${nextRank.icon} ${nextRank.name}` : "Rank tertinggi tercapai!"}</div>
          </div>
          <span className="text-xl text-white/60">⚙️</span>
        </button>

        {/* rank perks */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-2xl bg-slate-900/70 p-2 backdrop-blur">
            <div className="text-slate-400">Senjata Awal</div>
            <div className="font-black text-white">Lv.{rank.weapon}</div>
          </div>
          <div className="rounded-2xl bg-slate-900/70 p-2 backdrop-blur">
            <div className="text-slate-400">HP Benteng</div>
            <div className="font-black text-white">{rank.hp}</div>
          </div>
          <div className="rounded-2xl bg-slate-900/70 p-2 backdrop-blur">
            <div className="text-slate-400">Level Maks</div>
            <div className="font-black text-white">{save.bestLevel}</div>
          </div>
        </div>

        {/* start checkpoint */}
        <div className="mt-4 rounded-3xl border border-white/10 bg-slate-900/70 p-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black uppercase tracking-wider text-sky-300">Mulai dari level</div>
            <div className="text-[10px] text-slate-400">Terbuka oleh rank & progres</div>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {checkpoints.map((cp) => {
              const bi = bossIndexForLevel(cp);
              const boss = BOSSES[bi];
              const active = cp === startLevel;
              return (
                <button
                  key={cp}
                  onClick={() => onStartLevel(cp)}
                  className={`btn-press shrink-0 rounded-2xl border px-3 py-2 text-left ${active ? "border-amber-400 bg-amber-400/20" : "border-white/10 bg-white/5"}`}
                >
                  <div className="text-[10px] font-bold text-slate-300">Level {cp}</div>
                  <div className="flex items-center gap-1 text-sm font-black text-white">
                    <BossIcon index={bi} emoji={boss.emoji} size={22} /> {mapForLevel(cp).name}
                  </div>
                </button>
              );
            })}
            {(() => {
              const nextCp = [4, 7, 10, 13, 16, 19, 22, 25, 28, 31].find((cp) => !checkpoints.includes(cp));
              if (!nextCp) return null;
              const needRank = RANKS.find((r) => r.startLevel >= nextCp);
              return (
                <div className="shrink-0 rounded-2xl border border-dashed border-white/15 px-3 py-2 opacity-70">
                  <div className="text-[10px] font-bold text-slate-400">🔒 Level {nextCp}</div>
                  <div className="text-[10px] text-slate-400">
                    Capai level {nextCp}
                    {needRank && rank.startLevel < nextCp ? ` & rank ${needRank.icon} ${needRank.name}` : ""}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <GameButton variant="gold" className="py-4 text-xl" onClick={onPlay}>
            ▶ Main Sekarang
          </GameButton>
          <div className="grid grid-cols-2 gap-3">
            <GameButton variant="primary" onClick={onLeaderboard}>
              🏆 Peringkat
            </GameButton>
            <GameButton variant="secondary" onClick={onBosses}>
              👹 Galeri Bos
            </GameButton>
          </div>
          {canInstall && !installed && (
            <GameButton variant="ghost" onClick={onInstall}>
              📲 Install ke HP
            </GameButton>
          )}
          {isIos && !installed && !canInstall && (
            <div className="rounded-2xl bg-white/10 px-3 py-2 text-center text-[11px] text-slate-200 backdrop-blur">
              📲 Install di iPhone: tekan <b>Bagikan</b> lalu <b>Tambahkan ke Layar Utama</b>
            </div>
          )}
        </div>

        <a href={withBase(STATIC_EXPORT ? "/model-check.html" : "/model-check")} className="mt-5 block rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-center text-xs font-bold text-sky-300">🛠 Pemeriksa GLB · uji jalan & serang</a>
        <div className="mt-auto pt-6 text-center text-[10px] text-slate-500">
          {save.games} permainan · {save.correct} jawaban benar · akurasi {save.correct + save.wrong > 0 ? Math.round((save.correct / (save.correct + save.wrong)) * 100) : 0}%
        </div>
      </div>
    </div>
  );
}
