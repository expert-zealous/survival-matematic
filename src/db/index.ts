import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// PostgreSQL hanya berfungsi sebagai mirror/cadangan Firestore.
// Jangan melempar error saat DATABASE_URL kosong: ini memungkinkan build lokal,
// PWA, dan deployment Firestore-only berjalan tanpa instalasi PostgreSQL.
const databaseUrl = process.env.DATABASE_URL?.trim() || null;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool: Pool | null = databaseUrl
  ? (globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
      // Jangan menahan proses Node ketika koneksi sedang tidak digunakan.
      allowExitOnIdle: true,
    }))
  : null;

if (process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = pool ? drizzle(pool) : null;
export const databaseEnabled = db !== null;
