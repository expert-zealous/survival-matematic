"use client";
import { fetchTop10FromFirestore, submitScoreToFirestore, type LeaderboardEntry, type ScoreSubmission } from "./firebase";

export type { LeaderboardEntry };

export interface SubmitResult {
  firestore: "improved" | "kept" | "failed";
  server: "ok" | "failed";
}

/** Submit a finished run: Firestore (global ranking) + PostgreSQL mirror (history). */
export async function submitScore(
  sub: ScoreSubmission & { correct: number; wrong: number; durationSec: number },
): Promise<SubmitResult> {
  const result: SubmitResult = { firestore: "failed", server: "failed" };
  const [fs, srv] = await Promise.allSettled([
    submitScoreToFirestore(sub),
    fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: sub.id,
        name: sub.name,
        photo: sub.photo,
        score: sub.score,
        level: sub.level,
        rank: sub.rank,
        correct: sub.correct,
        wrong: sub.wrong,
        durationSec: sub.durationSec,
      }),
    }),
  ]);
  if (fs.status === "fulfilled") result.firestore = fs.value.improved ? "improved" : "kept";
  else console.warn("Firestore submit gagal:", fs.reason);
  if (srv.status === "fulfilled" && srv.value.ok) result.server = "ok";
  return result;
}

export async function fetchTop10(): Promise<{ entries: LeaderboardEntry[]; source: "firestore" | "server" }> {
  try {
    const entries = await fetchTop10FromFirestore();
    return { entries, source: "firestore" };
  } catch (e) {
    console.warn("Firestore fetch gagal, memakai server:", e);
    const res = await fetch("/api/scores", { cache: "no-store" });
    const data = (await res.json()) as { ok: boolean; entries: LeaderboardEntry[] };
    if (!data.ok) throw new Error("Server leaderboard gagal");
    return { entries: data.entries, source: "server" };
  }
}
