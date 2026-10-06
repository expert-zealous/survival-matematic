import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  // Firestore-only adalah konfigurasi yang valid (mis. build Windows lokal).
  if (!db) {
    return Response.json({ ok: true, database: "disabled", leaderboard: "firestore" });
  }
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: "connected" });
  } catch {
    return Response.json({ ok: false, database: "error" }, { status: 500 });
  }
}
