import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────
//  Dua mode build:
//   • Biasa  (npm run build)                  → server Next.js + API PostgreSQL opsional
//   • Statis (node scripts/static-build.mjs)  → folder `out/` untuk GitHub Pages / Netlify
//  Mode statis aktif lewat STATIC_EXPORT=1 (diatur oleh scripts/static-build.mjs).
// ─────────────────────────────────────────────────────────────
const isStatic = process.env.STATIC_EXPORT === "1";

/**
 * Awalan path situs. GitHub Pages "project site" berada di /nama-repo, sedangkan
 * Netlify, domain sendiri, dan <user>.github.io berada di root (kosong).
 * Bisa dipaksa lewat variabel NEXT_PUBLIC_BASE_PATH (contoh: "/survival-matematic").
 */
function resolveBasePath(): string {
  if (!isStatic) return "";
  const explicit = process.env.NEXT_PUBLIC_BASE_PATH;
  if (explicit !== undefined) {
    const clean = explicit.trim().replace(/\/+$/, "");
    if (!clean || clean === "/") return "";
    return clean.startsWith("/") ? clean : `/${clean}`;
  }
  if (process.env.GITHUB_ACTIONS === "true") {
    const repo = (process.env.GITHUB_REPOSITORY ?? "").split("/")[1] ?? "";
    if (repo && !repo.toLowerCase().endsWith(".github.io")) return `/${repo}`;
  }
  return "";
}

const basePath = resolveBasePath();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC_EXPORT: isStatic ? "1" : "",
  },
};

if (isStatic) {
  nextConfig.output = "export";
  nextConfig.images = { unoptimized: true };
  if (basePath) nextConfig.basePath = basePath;
}

export default nextConfig;
