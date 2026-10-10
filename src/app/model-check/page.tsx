"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MODEL_FILES, BOSS_ASSET_IDS, GIANT_ASSET_IDS } from "@/lib/game/assets";
import { withBase } from "@/lib/base";
import { loadGlb, getGlbLoader, prepareGlbTemplate, wrapGlb, loadAnimationSettings, modelKey, type GlbTemplate } from "@/lib/game/glb-rig";
import { resolveClips, type ModelSettings, type AnimationRole } from "@/lib/game/animation-controller";
import type { MonsterRig } from "@/lib/game/models";

const ASSETS = [
  ...BOSS_ASSET_IDS.map((_, i) => MODEL_FILES.boss(i)),
  ...GIANT_ASSET_IDS.map((_, i) => MODEL_FILES.giant(i)),
];
const LABEL: Record<AnimationRole, string> = { walk: "Jalan", attack: "Serang", idle: "Diam", roar: "Raung", death: "Mati" };
const ROLES: AnimationRole[] = ["walk", "attack", "idle", "roar", "death"];

export default function ModelCheck() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rigRef = useRef<MonsterRig | null>(null);
  const [template, setTemplate] = useState<GlbTemplate | null>(null);
  const [settings, setSettings] = useState<ModelSettings>({});
  const [allSettings, setAllSettings] = useState<Record<string, ModelSettings>>({});
  const [url, setUrl] = useState(ASSETS[0]);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gpuReady, setGpuReady] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [mode, setMode] = useState<"cycle" | AnimationRole>("cycle");
  const [team, setTeam] = useState<"boss" | "giant">("boss");
  const [status, setStatus] = useState("Belum ada model");
  const [saved, setSaved] = useState(false);
  const [eventVersion, setEventVersion] = useState(0);
  const versionRef = useRef(0);
  const playback = useRef({ playing, mode, team, eventVersion });
  playback.current = { playing, mode, team, eventVersion };
  const selection = template ? resolveClips(template.animations, settings.clips) : null;

  useEffect(() => {
    let cancelled = false;
    void loadAnimationSettings().then((value) => { if (!cancelled) setAllSettings(value); });
    return () => { cancelled = true; versionRef.current++; };
  }, []);

  const accept = useCallback((data: GlbTemplate, local: boolean, configs: Record<string, ModelSettings>) => {
    setTemplate(data);
    setSettings(configs[modelKey(data.url)] ?? {});
    setSource(local ? "File lokal — diproses di browser, tidak diunggah" : "File dari public/assets/models/");
    setError(""); setSaved(false); setMode("cycle"); setPlaying(true); setEventVersion((v) => v + 1);
  }, []);

  const openServerFile = async () => {
    const request = ++versionRef.current;
    setLoading(true); setError("");
    const [data, configs] = await Promise.all([loadGlb(url), loadAnimationSettings()]);
    if (request !== versionRef.current) return;
    if (data) accept(data, false, configs);
    else setError(`File ${modelKey(url)} belum tersedia atau tidak dapat dibaca. Pilih GLB dari komputer untuk memeriksa hasil ekspor Blender.`);
    setLoading(false);
  };

  const openLocalFile = async (file?: File) => {
    if (!file) return;
    const request = ++versionRef.current;
    setLoading(true); setError("");
    try {
      if (file.size > 60 * 1024 * 1024) throw new Error("File melebihi 60 MB. Gunakan GLB yang dioptimalkan untuk HP.");
      const gltf = await getGlbLoader().parseAsync(await file.arrayBuffer(), "");
      const data = prepareGlbTemplate(gltf, file.name);
      if (request !== versionRef.current) return;
      accept(data, true, allSettings);
    } catch (e) {
      if (request === versionRef.current) setError(e instanceof Error ? e.message : "GLB tidak valid. Ekspor sebagai glTF Binary dengan tekstur tertanam.");
    } finally { if (request === versionRef.current) setLoading(false); }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
    catch { setError("WebGL tidak tersedia pada browser ini. Coba Chrome dengan akselerasi grafis aktif."); return; }
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#101c31");
    sceneRef.current = scene;
    scene.add(new THREE.HemisphereLight(0xddeeff, 0x334155, 2));
    const key = new THREE.DirectionalLight(0xffe9cc, 3); key.position.set(6, 12, 8); scene.add(key);
    const rim = new THREE.DirectionalLight(0x6abaff, 2); rim.position.set(-6, 6, -8); scene.add(rim);
    const grid = new THREE.GridHelper(24, 24, 0x3c6797, 0x253b55); scene.add(grid);
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.08, 0), 4, 0xfb7185, 0.6, 0.3);
    scene.add(arrow);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(9, 6.5, 13);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 2.8, 0); controls.enableDamping = true; controls.minDistance = 3; controls.maxDistance = 35;
    const resize = () => {
      const parent = canvas.parentElement!;
      renderer.setSize(parent.clientWidth, parent.clientHeight, false);
      camera.aspect = parent.clientWidth / Math.max(1, parent.clientHeight); camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement!); resize();
    let raf = 0, last = performance.now(), t = 0, lastStatus = "", seenVersion = -1;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const p = playback.current;
      if (seenVersion !== p.eventVersion) { seenVersion = p.eventVersion; t = 0; }
      if (p.playing) t += dt;
      const rig = rigRef.current;
      if (rig) {
        const cycle = Math.floor(t / 5);
        const attack = p.mode === "cycle" ? t % 5 >= 3.5 : p.mode === "attack";
        const role = p.mode === "cycle" ? (attack ? "attack" : "walk") : p.mode;
        const progress = attack ? (t % 5 - 3.5) / 1.5 : 0;
        rig.group.rotation.y = p.team === "boss" ? Math.PI : 0;
        arrow.setDirection(new THREE.Vector3(0, 0, p.team === "boss" ? 1 : -1));
        rig.animate({ time: t, walk: t * 5, stride: role === "walk" ? 1 : 0,
          windup: attack ? Math.max(0, 1 - progress * 2) : 0, slam: attack ? Math.sin(Math.max(0, progress) * Math.PI) : 0,
          hit: 0, action: role, actionId: (p.mode === "cycle" ? cycle : 0) + p.eventVersion * 100000, actionDuration: attack ? 1.5 : undefined,
          entityId: p.eventVersion,
        });
        const state = rig.group.userData.animationRole as AnimationRole | undefined;
        const label = state ? `${LABEL[state]}${rig.group.userData.animationOneShot ? " · satu putaran" : " · loop"}` : role;
        if (label !== lastStatus) { lastStatus = label; setStatus(label); }
      }
      controls.update(); renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    setGpuReady(true); raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      sceneRef.current = null;
      grid.geometry.dispose(); (grid.material as THREE.Material).dispose();
      renderer.dispose(); renderer.forceContextLoss();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!template || !scene || !gpuReady) return;
    const rig = wrapGlb(template, 6.4, settings);
    scene.add(rig.group); rigRef.current = rig; setEventVersion((v) => v + 1);
    return () => { rigRef.current = null; rig.dispose(); };
  }, [template, settings, gpuReady]);

  const download = () => {
    if (!template || !selection) return;
    const resolved = { ...settings, clips: { ...selection.names, ...settings.clips } };
    const merged = { ...allSettings, [modelKey(template.url)]: resolved };
    const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(merged, null, 2) + "\n"], { type: "application/json" }));
    const a = document.createElement("a"); a.href = objectUrl; a.download = "animation-map.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    setAllSettings(merged); setSaved(true);
  };

  return (
    <main className="h-[100dvh] overflow-y-auto bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-5 p-4 pb-12 sm:p-7">
        <header className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-widest text-sky-400">Survival Matematic · alat pengembang</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Pemeriksa animasi GLB</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Periksa isi ekspor Blender, bukan hanya nama filenya. Coba siklus jalan → serang → jalan memakai pengontrol yang sama dengan game.</p></div>
          <a href={withBase("/")} className="shrink-0 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold">← Game</a>
        </header>
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
          <select aria-label="Model di folder game" value={url} onChange={(e) => setUrl(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-800 px-3 py-2.5 text-sm">
            {ASSETS.map((value) => <option key={value} value={value}>{modelKey(value)}</option>)}
          </select>
          <button disabled={loading} onClick={() => void openServerFile()} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold disabled:opacity-50">Muat dari folder</button>
          <button disabled={loading} onClick={() => fileRef.current?.click()} className="rounded-xl border border-sky-400/50 px-4 py-2.5 text-sm font-bold text-sky-300">Pilih GLB komputer</button>
          <input ref={fileRef} className="hidden" type="file" accept=".glb" onChange={(e) => void openLocalFile(e.target.files?.[0])} />
        </section>
        {error && <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
            <div className="relative h-[48vh] min-h-[310px] lg:h-[520px]">
              <canvas ref={canvasRef} className="h-full w-full touch-none" aria-label="Pratinjau model 3D" />
              <div className="pointer-events-none absolute left-3 top-3 rounded-xl bg-black/50 px-3 py-2 text-xs"><b className="text-sky-200">{loading ? "Memuat model…" : status}</b><div className="mt-1 text-slate-300">Seret untuk memutar · cubit/scroll untuk zoom</div></div>
              {!template && !loading && <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-400">Pilih model untuk melihat nama klip dan mencoba animasinya.</div>}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-white/10 p-3">
              {(["cycle", ...ROLES] as const).map((value) => <button key={value} disabled={!template} onClick={() => { setMode(value); setPlaying(true); setEventVersion((v) => v + 1); }} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-30 ${mode === value ? "bg-sky-500 text-white" : "bg-white/5"}`}>{value === "cycle" ? "↻ Jalan → Serang" : LABEL[value]}</button>)}
              <button disabled={!template} onClick={() => setPlaying(!playing)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold">{playing ? "Jeda" : "Lanjut"}</button>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-4 pb-4 text-xs text-slate-300">
              <span>Peran:</span>{(["boss", "giant"] as const).map((v) => <label key={v} className="flex items-center gap-1"><input type="radio" checked={team === v} onChange={() => setTeam(v)} />{v === "boss" ? "Bos → pemain" : "Bantuan → lawan"}</label>)}
            </div>
          </section>
          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <h2 className="font-black">Klip yang terbaca</h2>
              <p className="mt-1 break-all text-xs text-slate-400">{template ? `${modelKey(template.url)} · ${source}` : "Belum ada model"}</p>
              <div className="mt-3 max-h-48 space-y-2 overflow-auto">
                {template?.animations.map((clip, i) => <div key={i} className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs"><span className="break-all font-bold">{clip.name || `(tanpa nama ${i})`}</span><span className="shrink-0 tabular-nums text-slate-400">{clip.duration.toFixed(2)} s · {clip.tracks.length} kanal</span></div>)}
                {template && template.animations.length === 0 && <p className="text-sm text-amber-300">Model ini tidak memiliki klip animasi. Gerakan tubuh cadangan bukan animasi tulang hasil Blender.</p>}
              </div>
              {selection?.warnings.map((w, i) => <p key={i} className="mt-2 rounded-lg bg-amber-400/10 p-2 text-xs text-amber-200">{w}</p>)}
            </section>
            <section className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <h2 className="font-black">Pemetaan animasi</h2>
              <p className="mb-3 mt-1 text-xs text-slate-400">Gunakan ini jika nama klip masih NlaTrack/ArmatureAction. Jangan tebak hanya dari urutannya.</p>
              <div className="space-y-2">
                {ROLES.map((role) => <label key={role} className="grid grid-cols-[70px_1fr] items-center gap-2 text-xs"><span>{LABEL[role]}</span><select disabled={!template} value={settings.clips?.[role] ?? "__auto__"} onChange={(e) => { const clips = { ...settings.clips }; if (e.target.value === "__auto__") delete clips[role]; else clips[role] = e.target.value; setSettings({ ...settings, clips }); setSaved(false); }} className="w-full min-w-0 rounded-lg border border-white/10 bg-slate-800 p-2"><option value="__auto__">Otomatis {selection?.names[role] ? `→ ${selection.names[role]}` : ""}</option><option value="">Tidak tersedia</option>{template?.animations.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}</select></label>)}
                <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-xs"><span>Depan file</span><select value={settings.forward ?? "+Z"} onChange={(e) => setSettings({ ...settings, forward: e.target.value as ModelSettings["forward"] })} className="rounded-lg border border-white/10 bg-slate-800 p-2">{["+Z", "-Z", "+X", "-X"].map((v) => <option key={v}>{v}</option>)}</select></label>
                <label className="flex items-center gap-2 pt-2 text-xs"><input type="checkbox" checked={settings.trimPadding !== false} onChange={(e) => setSettings({ ...settings, trimPadding: e.target.checked })} />Pangkas jeda kosong di awal/akhir NLA</label>
              </div>
              <button disabled={!template} onClick={download} className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold disabled:opacity-30">Unduh animation-map.json</button>
              {saved && <p role="status" className="mt-2 text-xs text-emerald-300">Salin file unduhan ke public/assets/models/animation-map.json, lalu build dan deploy ulang. Pengaturan ini belum mengubah situs online.</p>}
            </section>
          </aside>
        </div>
        <section className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 text-sm text-slate-300">
          <h2 className="mb-2 font-black text-white">Jika Attack tidak ada dalam daftar</h2>
          <ol className="list-inside list-decimal space-y-1"><li>Di Blender, beri nama Action dan NLA Track berbeda: <b>Walk</b> dan <b>Attack</b>.</li><li>Push Down/Stash setiap Action ke track tersendiri; jangan gabungkan keduanya menjadi satu klip.</li><li>Ekspor GLB dengan <b>Animations</b> aktif. Gunakan mode <b>Actions</b>, atau <b>NLA Tracks</b> jika memakai beberapa strip/modifier.</li><li>Impor GLB hasil ekspor ke halaman ini. Dua animasi yang terlihat di Blender belum tentu keduanya masuk file GLB.</li></ol>
          <p className="mt-3 text-xs text-slate-400">Push Down menyimpan Action ke NLA; bukan jaminan nama/klip ekspor sudah sesuai. Animasi yang tidak ada di file tidak bisa dipulihkan oleh game.</p>
        </section>
      </div>
    </main>
  );
}
