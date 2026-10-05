"use client";
import { BALANCE, BOSSES, RANKS, romanTier } from "@/lib/game/data";
import { formatScore, type SaveData } from "@/lib/storage";
import { Panel, TopBar } from "./ui";
import { BossIcon } from "./BossIcon";

interface Props {
  save: SaveData;
  onBack: () => void;
}

const DIFF = ["Sangat Mudah", "Mudah", "Normal", "Normal", "Menantang", "Sulit", "Sulit", "Sangat Sulit", "Ekstrem", "Mustahil?"];

export default function BossGallery({ save, onBack }: Props) {
  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-b from-rose-950 via-slate-950 to-slate-950">
      <TopBar title="Peringkat Bos" onBack={onBack} />
      <div className="px-4 pb-10">
        <div className="text-center text-[11px] text-slate-400">
          10 bos berurutan dari yang termudah hingga tersulit. Setelah bos ke-10, siklus berulang dengan <b className="text-white">Tingkat II, III, …</b> yang jauh lebih kuat — tanpa akhir!
        </div>
        <div className="mt-4 space-y-3">
          {BOSSES.map((b, i) => {
            const level = i + 1;
            const beaten = save.bosses[i] ?? 0;
            const unlockRank = RANKS.filter((r) => r.startLevel <= level).pop() ?? RANKS[0];
            return (
              <Panel key={b.name} className={`relative overflow-hidden ${beaten ? "" : "opacity-90"}`}>
                <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-25 blur-2xl" style={{ background: b.color }} />
                <div className="relative flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-4xl" style={{ background: `${b.color}33`, boxShadow: `0 0 18px ${b.glow}66` }}>
                    {beaten ? <BossIcon index={i} emoji={b.emoji} size={56} /> : <span className="grayscale"><BossIcon index={i} emoji={b.emoji} size={56} /></span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-white/10 px-1.5 text-[10px] font-black text-white">#{i + 1}</span>
                      <span className="truncate text-base font-black text-white">{b.name}</span>
                    </div>
                    <div className="text-[11px] font-bold" style={{ color: b.color }}>
                      {b.title} · {DIFF[i]}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-300">{b.desc}</div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200">Level {level}, {level + 10}, {level + 20}…</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200">HP awal {formatScore(BALANCE.bossHp(level))}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200">
                        Rank mulai: {unlockRank.icon} {unlockRank.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {beaten ? (
                      <>
                        <div className="text-[10px] text-emerald-300">Ditaklukkan</div>
                        <div className="text-lg font-black text-emerald-400">Tk. {romanTier(beaten)}</div>
                      </>
                    ) : (
                      <div className="text-2xl">🔒</div>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
