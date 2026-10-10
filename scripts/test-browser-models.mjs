// Run after static build: node scripts/test-browser-models.mjs
// Requires: npx playwright install chromium
import { chromium } from "@playwright/test";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";

if (!globalThis.FileReader) globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then((buffer) => { this.result = `data:application/octet-stream;base64,${Buffer.from(buffer).toString("base64")}`; this.onloadend?.(); }); }
};
const model = new THREE.Group(); model.name = "Fixture";
const mat = new THREE.MeshStandardMaterial({ color: 0x64cc78 });
const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2, 0.8), mat); torso.position.y = 2.2; model.add(torso);
const arm = new THREE.Group(); arm.name = "Arm"; arm.position.set(0.9, 2.8, 0);
const hand = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 0.45), mat); hand.position.y = -0.7; arm.add(hand); model.add(arm);
const leg = new THREE.Group(); leg.name = "Leg"; leg.position.set(-0.4, 1.25, 0);
const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.6), mat); foot.position.y = -0.6; leg.add(foot); model.add(leg);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), mat); head.position.y = 3.6; model.add(head);
function clip(name, target) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.3, 0, 0));
  return new THREE.AnimationClip(name, 1.2, [new THREE.QuaternionKeyframeTrack(`${target}.quaternion`, [0, 0.6, 1.2], [0, 0, 0, 1, ...q.toArray(), 0, 0, 0, 1])]);
}
const glb = Buffer.from(await new GLTFExporter().parseAsync(model, { binary: true, animations: [clip("Armature|Berjalan", "Leg"), clip("Armature|Menyerang", "Arm")] }));
const root = resolve("out");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".glb": "model/gltf-binary" };
const server = http.createServer(async (request, response) => {
  try {
    const u = new URL(request.url, "http://localhost");
    const path = resolve(root, `.${decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname)}`);
    if (!path.startsWith(root + "/")) { response.writeHead(403).end(); return; }
    const bytes = await readFile(path);
    response.writeHead(200, { "Content-Type": mime[extname(path)] ?? "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : bytes);
  } catch { response.writeHead(404).end("Not found"); }
});
await new Promise((resolve) => server.listen(4187, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const context = await browser.newContext({ viewport: { width: 1180, height: 850 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("http://127.0.0.1:4187/model-check.html", { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').setInputFiles({ name: "boss_00_goblin.glb", mimeType: "model/gltf-binary", buffer: glb });
  await page.waitForFunction(() => document.body.innerText.includes("Jalan · loop"), { timeout: 20000 });
  await page.getByRole("button", { name: "Serang", exact: true }).click();
  await page.waitForFunction(() => document.body.innerText.includes("Serang · satu putaran"));
  await page.waitForFunction(() => document.body.innerText.includes("Jalan · loop"));
  await page.getByRole("button", { name: "↻ Jalan → Serang", exact: true }).click();
  await page.waitForFunction(() => document.body.innerText.includes("Serang · satu putaran"), undefined, { timeout: 30000 });
  await page.waitForFunction(() => document.body.innerText.includes("Jalan · loop"));
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh animation-map.json" }).click();
  const download = await downloaded;
  const config = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(config["boss_00_goblin.glb"].clips.walk, "Armature|Berjalan");
  assert.equal(config["boss_00_goblin.glb"].clips.attack, "Armature|Menyerang");
  await mkdir(".tmp-test", { recursive: true });
  await page.screenshot({ path: ".tmp-test/model-check.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log("PASS browser: local GLB load, Attack one-shot, return to Walk, repeat cycle, download mapping, no page errors");
  await page.addInitScript(() => {
    localStorage.setItem("sm_profile_v1", JSON.stringify({ id: "browser-regression", name: "Uji", photo: null }));
    localStorage.setItem("sm_save_v1", JSON.stringify({ bestScore: 0, bestLevel: 1, sound: false, tutorialSeen: true, scoreVersion: 2 }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4187/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Main Sekarang/ }).click();
  await page.waitForTimeout(13000);
  await page.screenshot({ path: ".tmp-test/battle-gate.png" });
  assert.deepEqual(errors, []);
  console.log("PASS browser: game boots at mobile size with gate-wave renderer, no page errors");
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
