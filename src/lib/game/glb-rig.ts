import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { MODEL_DIR } from "./assets";
import { MonsterAnimationController, type ModelSettings, type AnimationRole, type ClipRange } from "./animation-controller";
import type { MonsterRig, RigPose } from "./models";

export interface GlbTemplate {
  url: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  rawHeight: number;
  rawWidth: number;
  center: THREE.Vector3;
  minY: number;
}

let loader: GLTFLoader | null = null;
export function getGlbLoader(): GLTFLoader {
  if (loader) return loader;
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

export function prepareGlbTemplate(gltf: Pick<GLTF, "scene" | "animations">, url: string): GlbTemplate {
  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene, true);
  const rawHeight = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(rawHeight) || rawHeight < 1e-8) throw new Error("GLB tidak memiliki mesh dengan tinggi yang valid.");
  gltf.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
  });
  return {
    url, scene: gltf.scene, animations: gltf.animations ?? [], rawHeight,
    rawWidth: Math.max(1e-8, bounds.max.x - bounds.min.x),
    center: bounds.getCenter(new THREE.Vector3()), minY: bounds.min.y,
  };
}

const templates = new Map<string, Promise<GlbTemplate | null>>();
export function loadGlb(url: string): Promise<GlbTemplate | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  let pending = templates.get(url);
  if (!pending) {
    pending = (async () => {
      try {
        // Revalidate replaces older models without requiring a new filename.
        const response = await fetch(url, { cache: "no-cache" });
        if (!response.ok || response.headers.get("content-type")?.includes("text/html")) return null;
        const bytes = await response.arrayBuffer();
        const directory = new URL(".", new URL(url, window.location.href)).href;
        const gltf = await getGlbLoader().parseAsync(bytes, directory);
        return prepareGlbTemplate(gltf, url);
      } catch (error) {
        console.warn(`[GLB] Gagal memuat ${url}`, error);
        return null;
      }
    })();
    templates.set(url, pending);
  }
  return pending;
}

export function modelKey(url: string) { return url.split("/").pop()?.split("?")[0] ?? url; }
let settingsPromise: Promise<Record<string, ModelSettings>> | null = null;
export function loadAnimationSettings(): Promise<Record<string, ModelSettings>> {
  if (typeof window === "undefined") return Promise.resolve({});
  if (!settingsPromise) settingsPromise = fetch(`${MODEL_DIR}/animation-map.json`, { cache: "no-cache" })
    .then(async (r) => {
      if (!r.ok) return {};
      const data: unknown = await r.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) return {};
      const result: Record<string, ModelSettings> = {};
      for (const [key, value] of Object.entries(data)) {
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;
        const v = value as Record<string, unknown>;
        const config: ModelSettings = {};
        if (v.forward === "+Z" || v.forward === "-Z" || v.forward === "+X" || v.forward === "-X") config.forward = v.forward;
        if (typeof v.trimPadding === "boolean") config.trimPadding = v.trimPadding;
        if (v.clips && typeof v.clips === "object" && !Array.isArray(v.clips)) {
          config.clips = {};
          for (const role of ["walk", "idle", "attack", "roar", "death"] as AnimationRole[]) {
            const name = (v.clips as Record<string, unknown>)[role];
            if (typeof name === "string") config.clips[role] = name;
          }
        }
        if (v.ranges && typeof v.ranges === "object" && !Array.isArray(v.ranges)) {
          config.ranges = {};
          for (const role of ["walk", "idle", "attack", "roar", "death"] as AnimationRole[]) {
            const raw = (v.ranges as Record<string, unknown>)[role];
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
            const range = raw as Partial<ClipRange>;
            if (typeof range.clip === "string" && typeof range.start === "number" && typeof range.end === "number" && range.end > range.start) config.ranges[role] = { clip: range.clip, start: range.start, end: range.end };
          }
        }
        result[key] = config;
      }
      return result;
    }).catch(() => ({}));
  return settingsPromise;
}

const reports = new Set<string>();
/** Every call owns its skeleton and mixer. Cached geometry/materials are never destroyed by an instance. */
export function wrapGlb(data: GlbTemplate, targetSize: number, settings: ModelSettings = {}, maxWidth = 5.2): MonsterRig {
  const group = new THREE.Group();
  const motion = new THREE.Group(); // world-size procedural fallback, never changes imported mesh/skeleton
  const orientation = new THREE.Group();
  const normalizer = new THREE.Group();
  const offset = new THREE.Group();
  const clone = cloneSkeleton(data.scene) as THREE.Group;
  const scaleY = targetSize / data.rawHeight;
  const scaleX = Math.min(scaleY, maxWidth / data.rawWidth); // feet/body stay within the road without shrinking height
  normalizer.scale.set(scaleX, scaleY, scaleY); // preserves original imported root transforms
  offset.position.set(-data.center.x, -data.minY, -data.center.z);
  const correction = { "+Z": Math.PI, "-Z": 0, "+X": Math.PI / 2, "-X": -Math.PI / 2 };
  orientation.rotation.y = correction[settings.forward ?? "+Z"];
  offset.add(clone); normalizer.add(offset); orientation.add(normalizer); motion.add(orientation); group.add(motion);
  group.updateMatrixWorld(true);

  const controller = new MonsterAnimationController(clone, data.animations, settings);
  const report = {
    file: modelKey(data.url),
    clips: data.animations.map((c) => ({ name: c.name, seconds: c.duration, tracks: c.tracks.length })),
    selected: controller.selection.names,
    warnings: controller.selection.warnings,
  };
  group.userData.animationReport = report;
  const signature = data.url + JSON.stringify(settings);
  if (typeof window !== "undefined" && !reports.has(signature)) {
    reports.add(signature);
    console.info(`[GLB] ${report.file}`, report);
    if (report.warnings.length) console.warn(`[GLB] ${report.file}: ${report.warnings.join(" ")}`);
  }

  let lastTime: number | null = null;
  let entity: number | undefined;
  let disposed = false;
  let wasEnraged = false;
  return {
    group, height: targetSize,
    animate(p: RigPose) {
      if (disposed) return;
      if (p.entityId !== undefined && p.entityId !== entity) {
        entity = p.entityId;
        controller.reset();
        lastTime = null;
      }
      const dt = lastTime === null ? 0 : Math.max(0, Math.min(0.1, p.time - lastTime));
      lastTime = p.time;
      const roaring = Boolean(p.enraged && !wasEnraged);
      wasEnraged = Boolean(p.enraged);
      const role: AnimationRole = p.action ?? (p.windup > 0 || p.slam > 0 ? "attack" : roaring ? "roar" : p.stride > 0 ? "walk" : "idle");
      controller.update(dt, { role, id: p.actionId, duration: p.actionDuration });
      group.userData.animationRole = controller.currentRole;
      group.userData.animationOneShot = controller.isOneShot;

      // Never bend the imported character when it has the requested animation.
      // Missing attack still gets a visible body lunge, NOT a replay of Walk as Attack.
      const noWalk = !controller.has("walk") && !controller.has("idle");
      const noAttack = !controller.has("attack");
      const walk = noWalk ? Math.sin(p.walk) * p.stride : 0;
      const wind = noAttack ? p.windup : 0;
      const slam = noAttack ? p.slam : 0;
      const dead = role === "death" && !controller.has("death");
      motion.position.set(0, Math.abs(walk) * targetSize * 0.025 + wind * targetSize * 0.035, -slam * targetSize * 0.08);
      motion.rotation.set(dead ? -1.25 : -0.18 * wind + 0.22 * slam, 0, walk * 0.035);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.dispose();
      const skeletons = new Set<THREE.Skeleton>();
      clone.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) skeletons.add((o as THREE.SkinnedMesh).skeleton); });
      skeletons.forEach((s) => s.dispose());
      group.removeFromParent();
      // geometry, textures and materials belong to the cached template
    },
  };
}
