import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// DATABASE_URL opsional saat build. Pool TIDAK terkoneksi di sini —
// koneksi baru terjadi saat query pertama, jadi `next build` aman
// walau PostgreSQL belum disiapkan. Kalau DB tidak ada, API /api/scores
// akan mengembalikan error 500 dan game otomatis memakai Firestore saja.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  console.warn(
    "[db] DATABASE_URL tidak ditemukan di .env — memakai bawaan " +
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db " +
      "(leaderboard cadangan PostgreSQL nonaktif bila DB tidak berjalan; " +
      "peringkat global tetap jalan lewat Firestore).",
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    // jangan menggantung lama kalau DB tidak ada
    connectionTimeoutMillis: 4000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
