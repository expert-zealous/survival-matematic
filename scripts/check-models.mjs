#!/usr/bin/env node
// Read glTF metadata without loading WebGL, executing animations, or uploading files.
// Usage: node scripts/check-models.mjs [path/to/model.glb]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dir = resolve(root, "public/assets/models");
const files = process.argv.slice(2).filter((arg) => arg !== "--strict");
const strict = process.argv.includes("--strict");
const paths = files.length ? files.map((f) => resolve(f)) : existsSync(dir) ? readdirSync(dir).filter((f) => /\.(glb|gltf)$/i.test(f)).map((f) => resolve(dir, f)) : [];
let failures = 0;
let mapping = {};
try { mapping = JSON.parse(readFileSync(resolve(dir, "animation-map.json"), "utf8")); } catch {}
for (const path of paths) {
  try {
    const bytes = readFileSync(path);
    let json;
    if (extname(path).toLowerCase() === ".gltf") json = JSON.parse(bytes.toString("utf8"));
    else {
      if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error("Bukan GLB glTF 2.0 yang valid");
      let offset = 12;
      while (offset + 8 <= bytes.length) {
        const size = bytes.readUInt32LE(offset), kind = bytes.readUInt32LE(offset + 4);
        if (offset + 8 + size > bytes.length) throw new Error("GLB terpotong/rusak");
        if (kind === 0x4e4f534a) { json = JSON.parse(bytes.subarray(offset + 8, offset + 8 + size).toString("utf8").replace(/\0+$/, "").trim()); break; }
        offset += 8 + size;
      }
    }
    if (!json) throw new Error("JSON glTF tidak ditemukan");
    const clips = json.animations ?? [];
    console.log(`\n${basename(path)} — ${(bytes.length / 1024 / 1024).toFixed(2)} MB · ${json.meshes?.length ?? 0} mesh · ${json.skins?.length ?? 0} skin · ${clips.length} animasi`);
    clips.forEach((clip, i) => {
      const times = (clip.samplers ?? []).map((s) => json.accessors?.[s.input]);
      const start = Math.min(...times.map((a) => a?.min?.[0] ?? 0));
      const end = Math.max(...times.map((a) => a?.max?.[0] ?? 0));
      console.log(`  [${i}] ${clip.name ?? "(tanpa nama)"} | ${(Number.isFinite(end) ? end - start : 0).toFixed(2)}s | ${clip.channels?.length ?? 0} kanal | mulai ${Number.isFinite(start) ? start : "?"}s`);
    });
    const config = mapping[basename(path)] ?? {};
    const mappedWalk = config.clips?.walk ?? config.ranges?.walk?.clip;
    const mappedAttack = config.clips?.attack ?? config.ranges?.attack?.clip;
    const names = new Set(clips.map((c) => c.name ?? ""));
    const attack = mappedAttack ? names.has(mappedAttack) : clips.some((c) => /attack|serang|pukul|punch|slam|hantam|strike|bite|smash|swipe|kick/i.test(c.name ?? ""));
    const walk = mappedWalk ? names.has(mappedWalk) : clips.some((c) => /walk|jalan|run|lari|march|move|crawl/i.test(c.name ?? ""));
    if (mappedWalk || mappedAttack) console.log(`  mapping: jalan=${mappedWalk ?? "otomatis"}, serang=${mappedAttack ?? "otomatis"}`);
    for (const [role, range] of Object.entries(config.ranges ?? {})) {
      const clip = clips.find((c) => c.name === range.clip);
      if (!clip || !(range.start >= 0 && range.end > range.start)) { failures++; console.log(`  ERROR mapping rentang ${role} tidak valid`); }
    }
    if (!attack || !walk) {
      failures++;
      console.log("  PERIKSA: nama Walk/Attack belum lengkap. Buka Pemeriksa GLB di menu game untuk memilih klip yang benar.");
      if (clips.length < 2) console.log("  File belum berisi dua klip terpisah. Push Down saja tidak menjamin semuanya ikut diekspor.");
    } else console.log("  Nama klip jalan dan serang ditemukan. Uji gerak visual melalui Pemeriksa GLB.");
  } catch (e) { failures++; console.error(`\n${path}: ${e.message}`); }
}
if (!paths.length) console.log("Belum ada GLB dalam public/assets/models/. File pada komputer Anda belum ikut salinan proyek ini.");
console.log(`\nSelesai: ${paths.length} file diperiksa. Ini memeriksa struktur klip, bukan menjamin kualitas gerak model.`);
if (strict && failures) process.exitCode = 1;
