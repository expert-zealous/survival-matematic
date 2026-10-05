"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchTop10, type LeaderboardEntry } from "@/lib/leaderboard";
import { formatScore, type Profile, type SaveData } from "@/lib/storage";
import { Avatar, GameButton, Panel, RankBadge, TopBar } from "./ui";

interface Props {
  profile: Profile;
  save: SaveData;
  onBack: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardScreen({ profile, save, onBack }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [source, setSource] = useState<"firestore" | "server" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchTop10();
      setEntries(r.entries);
      setSource(r.source);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat peringkat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const myIndex = entries?.findIndex((e) => e.id === profile.id) ?? -1;

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-b from-amber-950 via-slate-950 to-slate-950">
      <TopBar
        title="Peringkat Global"
        onBack={onBack}
        right={
          <button onClick={() => void load()} disabled={loading} className="btn-press rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
            {loading ? "…" : "⟳ Muat ulang"}
          </button>
        }
      />
      <div className="px-4 pb-10">
        <div className="text-center text-[11px] text-slate-400">
          Top 10 skor tertinggi dunia · skor sama → yang lebih dulu mencapainya di atas
          {source && <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-300">{source === "firestore" ? "Firestore" : "Server cadangan"}</span>}
        </div>

        {/* podium */}
        {entries && entries.length > 0 && (
          <div className="mt-4 flex items-end justify-center gap-2">
            {[1, 0, 2].map((pos) => {
              const e = entries[pos];
              if (!e) return <div key={pos} className="w-24" />;
              const h = pos === 0 ? "h-28" : pos === 1 ? "h-20" : "h-16";
              return (
                <div key={e.id} className="flex w-24 flex-col items-center">
                  <Avatar photo={e.photo} name={e.name} size={pos === 0 ? 64 : 52} ring={pos === 0 ? "#fbbf24" : pos === 1 ? "#cbd5e1" : "#d97706"} />
                  <div className="mt-1 w-full truncate text-center text-xs font-black text-white">{e.name}</div>
                  <div className="text-[10px] font-bold text-amber-300 tabular-nums">{formatScore(e.score)}</div>
                  <div className={`mt-1 flex w-full items-start justify-center rounded-t-2xl bg-gradient-to-b ${pos === 0 ? "from-amber-400 to-amber-600" : pos === 1 ? "from-slate-300 to-slate-500" : "from-orange-600 to-orange-800"} ${h} pt-2 text-2xl`}>
                    {MEDALS[pos]}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Panel className="mt-3">
          {loading && !entries && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          )}
          {error && (
            <div className="text-center">
              <div className="text-sm font-bold text-rose-300">⚠️ {error}</div>
              <div className="mt-1 text-[11px] text-slate-400">Pastikan koneksi internet aktif dan aturan Firestore mengizinkan baca/tulis koleksi “leaderboard”.</div>
              <GameButton className="mt-3" variant="secondary" onClick={() => void load()}>
                Coba lagi
              </GameButton>
            </div>
          )}
          {entries && entries.length === 0 && <div className="py-6 text-center text-sm text-slate-300">Belum ada skor. Jadilah yang pertama! 🚀</div>}
          {entries && entries.length > 0 && (
            <ol className="space-y-2">
              {entries.map((e, i) => {
                const me = e.id === profile.id;
                return (
                  <li key={e.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${me ? "border border-sky-400/60 bg-sky-500/15" : "bg-white/5"}`}>
                    <div className="w-7 text-center text-lg font-black text-white">{i < 3 ? MEDALS[i] : i + 1}</div>
                    <Avatar photo={e.photo} name={e.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-white">
                        {e.name} {me && <span className="text-[10px] text-sky-300">(kamu)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <RankBadge name={e.rank} small />
                        <span className="text-[10px] text-slate-400">Lv.{e.level}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-amber-300 tabular-nums">{formatScore(e.score)}</div>
                      <div className="text-[9px] text-slate-500">{new Date(e.achievedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <Panel className="mt-3 flex items-center gap-3">
          <Avatar photo={profile.photo} name={profile.name} size={44} />
          <div className="flex-1">
            <div className="text-sm font-black text-white">{profile.name || "Kamu"}</div>
            <div className="text-[11px] text-slate-400">{myIndex >= 0 ? `Peringkat global #${myIndex + 1}` : "Belum masuk Top 10 — terus berlatih hitung!"}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Rekor</div>
            <div className="font-black text-amber-300 tabular-nums">{formatScore(save.bestScore)}</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
