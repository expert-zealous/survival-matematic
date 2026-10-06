"use client";
// ─────────────────────────────────────────────────────────────
//  Firebase / Firestore – global leaderboard (project: survival-matematic)
//  Firebase web config values are public by design (they identify the
//  project; access is controlled by Firestore security rules).
// ─────────────────────────────────────────────────────────────
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyACFGxFU5nay49SY7GljTX2R2vbtrAm4kI",
  authDomain: "survival-matematic.firebaseapp.com",
  projectId: "survival-matematic",
  storageBucket: "survival-matematic.firebasestorage.app",
  messagingSenderId: "1036776934232",
  appId: "1:1036776934232:web:c9e38f55207a7a9920732d",
};

export const LEADERBOARD_COLLECTION = "leaderboard";
// Peringkat memakai field `pts` (rumus skor v2). Dokumen lama (rumus damage, tanpa `pts`)
// otomatis TIDAK ikut peringkat dan ditimpa saat pemainnya bermain lagi — tanpa index baru
// dan tanpa mengubah Rules. Field `score` tetap ditulis agar Rules lama tetap lolos.

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

function getDb(): Firestore {
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  if (!db) db = getFirestore(app);
  return db;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  photo: string | null;
  score: number;
  level: number;
  rank: string;
  achievedAt: number; // epoch ms
}

export interface ScoreSubmission {
  id: string;
  name: string;
  photo: string | null;
  score: number;
  level: number;
  rank: string;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Save the score to Firestore – only when it beats the player's stored best.
 * `achievedAt` is written only when the best improves, so ties are ranked
 * by who reached the score first.
 */
export async function submitScoreToFirestore(sub: ScoreSubmission): Promise<{ improved: boolean }> {
  const database = getDb();
  const ref = doc(database, LEADERBOARD_COLLECTION, sub.id);
  const safeName = (sub.name || "Pemain").slice(0, 24);
  return withTimeout(
    runTransaction(database, async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists() ? (snap.data() as { pts?: number }) : null;
      const prevScore = existing?.pts ?? -1; // dokumen lama tanpa `pts` dianggap belum punya rekor
      if (!snap.exists() || sub.score > prevScore) {
        tx.set(ref, {
          name: safeName,
          photo: sub.photo ?? null,
          score: sub.score,
          pts: sub.score,
          level: sub.level,
          rank: sub.rank,
          achievedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return { improved: true };
      }
      // Keep profile fresh without touching the record score/time.
      tx.update(ref, { name: safeName, photo: sub.photo ?? null, rank: sub.rank, updatedAt: serverTimestamp() });
      return { improved: false };
    }),
    10000,
    "submit",
  );
}

/** Top 10 global scores: highest first; equal scores → earliest achiever first. */
export async function fetchTop10FromFirestore(): Promise<LeaderboardEntry[]> {
  const database = getDb();
  const q = query(collection(database, LEADERBOARD_COLLECTION), orderBy("pts", "desc"), limit(40));
  const snap = await withTimeout(getDocs(q), 10000, "fetch");
  const rows: LeaderboardEntry[] = snap.docs.map((d) => {
    const data = d.data() as {
      name?: string;
      photo?: string | null;
      pts?: number;
      level?: number;
      rank?: string;
      achievedAt?: Timestamp | null;
    };
    return {
      id: d.id,
      name: data.name ?? "Pemain",
      photo: data.photo ?? null,
      score: data.pts ?? 0,
      level: data.level ?? 1,
      rank: data.rank ?? "Perunggu",
      achievedAt: data.achievedAt instanceof Timestamp ? data.achievedAt.toMillis() : Date.now(),
    };
  });
  rows.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.achievedAt - b.achievedAt));
  return rows.slice(0, 10);
}
