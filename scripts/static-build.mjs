#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  Build statis → folder `out/` (GitHub Pages / Netlify / hosting statis)
//
//  Pakai:   node scripts/static-build.mjs
//
//  Yang dilakukan:
//   1. Menyingkirkan sementara folder src/app/api (route server tidak bisa
//      diekspor statis; ranking memakai Firestore langsung dari browser).
//   2. Menjalankan `next build` dengan STATIC_EXPORT=1.
//   3. SELALU mengembalikan folder api, walau build gagal / dibatalkan.
//   4. Menambah out/.nojekyll (wajib agar GitHub Pages memuat folder _next).
// ─────────────────────────────────────────────────────────────
import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const apiDir = join(root, "src", "app", "api");
const backupDir = join(root, ".api-backup");
const outDir = join(root, "out");
const nextDir = join(root, ".next");
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

let moved = false;

function restoreApi() {
  if (!existsSync(backupDir)) return;
  if (existsSync(apiDir)) rmSync(apiDir, { recursive: true, force: true });
  renameSync(backupDir, apiDir);
  moved = false;
}

function dirSize(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    total += s.isDirectory() ? dirSize(p) : s.size;
  }
  return total;
}

function fail(message, code = 1) {
  restoreApi();
  console.error(`\n✖ ${message}`);
  process.exit(code);
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => fail(`Dibatalkan (${sig}). Folder api sudah dikembalikan.`, 130));
}
process.on("uncaughtException", (e) => fail(String(e?.stack ?? e)));

if (!existsSync(nextBin)) {
  fail("Next.js belum terpasang. Jalankan dulu:  npm install");
}

// pulihkan sisa proses sebelumnya yang terputus
restoreApi();
rmSync(outDir, { recursive: true, force: true });
rmSync(nextDir, { recursive: true, force: true });

if (existsSync(apiDir)) {
  renameSync(apiDir, backupDir);
  moved = true;
}

console.log("▶ Build statis (STATIC_EXPORT=1)…\n");
const child = spawn(process.execPath, [nextBin, "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, STATIC_EXPORT: "1", NEXT_TELEMETRY_DISABLED: "1" },
});

child.on("error", (e) => fail(`Gagal menjalankan next build: ${e.message}`));
child.on("exit", (code) => {
  restoreApi();
  // Build ekspor tidak bisa dipakai `next start`; hapus agar tidak membingungkan.
  // Di Netlify folder .next DIBIARKAN: runtime Next.js milik Netlify kadang mencarinya,
  // dan di sana tidak ada `npm run start` yang bisa salah dipakai.
  if (process.env.NETLIFY !== "true") rmSync(nextDir, { recursive: true, force: true });
  if (code !== 0) {
    console.error(`\n✖ next build gagal (kode ${code}). Folder api sudah dikembalikan.`);
    process.exit(code ?? 1);
  }
  if (!existsSync(join(outDir, "index.html"))) {
    console.error("\n✖ out/index.html tidak ditemukan — ekspor statis tidak berhasil.");
    process.exit(1);
  }
  writeFileSync(join(outDir, ".nojekyll"), "");
  // Beri service worker nama cache unik di SETIAP build, supaya pemain yang sudah pernah
  // membuka game langsung mendapat versi terbaru (cache lama dibuang otomatis).
  const swPath = join(outDir, "sw.js");
  if (existsSync(swPath)) {
    const stamp = Date.now().toString(36);
    const src = readFileSync(swPath, "utf8");
    const next = src.replace(/const CACHE = "[^"]*";/, `const CACHE = "sm-${stamp}";`);
    if (next !== src) {
      writeFileSync(swPath, next);
      console.log(`  Service worker: cache versi ${stamp}`);
    }
  }
  const mb = (dirSize(outDir) / 1024 / 1024).toFixed(1);
  console.log(`\n✔ Selesai. Folder "out" siap diunggah (${mb} MB).`);
  console.log('  Uji lokal:  npx serve out');
  console.log('  Catatan:    sebelum "npm run start" lokal, jalankan lagi "npm run build".');
});
