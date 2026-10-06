import { db } from "@/db";
import { gameSessions, players } from "@/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/scores → top 10 (highest score first, ties → earliest achiever first)
export async function GET() {
  // Ranking utama dibaca langsung dari Firestore oleh browser. Tanpa
  // PostgreSQL, endpoint mirror ini tetap valid dan mengembalikan data kosong.
  if (!db) {
    return Response.json({ ok: true, entries: [], source: "firestore-only" });
  }
  try {
    const database = db;
    const rows = await database
      .select({
        id: players.id,
        name: players.name,
        photo: players.photo,
        score: players.bestScore,
        level: players.bestLevel,
        rank: players.rank,
        achievedAt: players.achievedAt,
      })
      .from(players)
      .orderBy(desc(players.bestScore), asc(players.achievedAt))
      .limit(10);
    return Response.json({
      ok: true,
      entries: rows.map((r) => ({ ...r, achievedAt: r.achievedAt.getTime() })),
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

interface Body {
  playerId?: string;
  name?: string;
  photo?: string | null;
  score?: number;
  level?: number;
  rank?: string;
  correct?: number;
  wrong?: number;
  durationSec?: number;
}

// POST /api/scores → log the session and keep only the player's best score
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const playerId = String(body.playerId ?? "").slice(0, 64);
    if (!playerId) return Response.json({ ok: false, error: "playerId wajib" }, { status: 400 });
    const name = String(body.name || "Pemain").slice(0, 24);
    const photo = typeof body.photo === "string" && body.photo.length < 200_000 ? body.photo : null;
    const score = Math.max(0, Math.floor(Number(body.score) || 0));
    const level = Math.max(1, Math.floor(Number(body.level) || 1));
    const rank = String(body.rank ?? "Perunggu").slice(0, 24);

    // Skor global sudah dikirim paralel ke Firestore dari client. Bila
    // PostgreSQL tidak ada, anggap mirror dilewati—bukan sebuah kegagalan.
    if (!db) {
      return Response.json({ ok: true, improved: false, mirrored: false, source: "firestore-only" });
    }
    const database = db;

    await database.insert(gameSessions).values({
      playerId,
      name,
      score,
      level,
      correct: Math.max(0, Math.floor(Number(body.correct) || 0)),
      wrong: Math.max(0, Math.floor(Number(body.wrong) || 0)),
      durationSec: Math.max(0, Math.floor(Number(body.durationSec) || 0)),
    });

    const existing = await database.select().from(players).where(eq(players.id, playerId)).limit(1);
    let improved = false;
    if (existing.length === 0) {
      await database.insert(players).values({ id: playerId, name, photo, bestScore: score, bestLevel: level, rank });
      improved = true;
    } else if (score > existing[0].bestScore) {
      await db
        .update(players)
        .set({ name, photo, bestScore: score, bestLevel: level, rank, achievedAt: sql`now()`, updatedAt: sql`now()` })
        .where(eq(players.id, playerId));
      improved = true;
    } else {
      await database.update(players).set({ name, photo, rank, updatedAt: sql`now()` }).where(eq(players.id, playerId));
    }
    return Response.json({ ok: true, improved });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
