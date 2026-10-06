// Awalan path untuk hosting di sub-folder (GitHub Pages: "/nama-repo").
// Nilainya diisi oleh next.config.ts; kosong di localhost, Netlify, dan domain sendiri.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** true bila situs dibangun sebagai hosting statis (tanpa server/API route). */
export const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

/** Tambahkan BASE_PATH ke path absolut milik situs ini ("/assets/x.png"). */
export function withBase(path: string): string {
  if (/^([a-z]+:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) return path;
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
