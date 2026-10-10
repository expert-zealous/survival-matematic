import * as THREE from "three";

export type AnimationRole = "idle" | "walk" | "attack" | "roar" | "death";
export type ClipMap = Partial<Record<AnimationRole, string>>;
export interface ModelSettings {
  clips?: ClipMap;
  /** Arah wajah di FILE, sebelum dinormalkan menjadi -Z lokal game. */
  forward?: "+Z" | "-Z" | "+X" | "-X";
  trimPadding?: boolean;
}
export interface ClipSelection {
  clips: Partial<Record<AnimationRole, THREE.AnimationClip>>;
  names: ClipMap;
  warnings: string[];
}

const ROLES: AnimationRole[] = ["death", "attack", "roar", "walk", "idle"];
const WORDS: Record<AnimationRole, string[]> = {
  walk: ["walk", "walking", "run", "running", "jalan", "berjalan", "lari", "march", "locomotion", "crawl", "fly", "move"],
  attack: ["attack", "attacking", "serang", "menyerang", "serangan", "pukul", "memukul", "punch", "slam", "hantam", "menghantam", "strike", "bite", "smash", "swipe", "kick", "combat", "atk"],
  roar: ["roar", "taunt", "rage", "scream", "intro", "spawn", "meraung"],
  death: ["death", "dead", "die", "dying", "defeat", "mati", "tumbang"],
  idle: ["idle", "stand", "breath", "wait", "rest", "diam"],
};
const normalize = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const compact = (name: string) => normalize(name).replace(/\s+/g, "");
const reaction = (name: string) => /hurt|hit ?react|take ?hit|damage|flinch|knock|terkena/.test(normalize(name));
const generic = (name: string) => /^(nla ?track|armature ?action|animation|action|take|clip|mixamo ?com)(\s*\d+)*$/.test(normalize(name));

/** Infer from semantic names, NEVER select an unrelated first clip as the attack. */
export function resolveClips(source: THREE.AnimationClip[], overrides: ClipMap = {}): ClipSelection {
  const valid = source.filter((c) => c.tracks.length > 0 && c.duration > 0);
  const chosen: ClipSelection["clips"] = {};
  const names: ClipMap = {};
  const warnings: string[] = [];
  const used = new Set<THREE.AnimationClip>();
  for (const role of ROLES) {
    const name = overrides[role];
    if (name === "") continue; // explicit disable
    if (name !== undefined) {
      const clip = valid.find((c) => c.name === name) ?? valid.find((c) => compact(c.name) === compact(name));
      if (clip) { chosen[role] = clip; names[role] = clip.name; used.add(clip); }
      else warnings.push(`Klip ${role} “${name}” tidak ditemukan dalam GLB.`);
    }
  }
  for (const role of ROLES) {
    if (chosen[role] || overrides[role] !== undefined) continue;
    const ranked = valid.filter((c) => !used.has(c) && !(role === "attack" && reaction(c.name))).map((clip) => {
      const n = normalize(clip.name), joined = compact(clip.name);
      const tokens = n.split(/\s+|(?=\d)/);
      let score = 0;
      for (const word of WORDS[role]) {
        if (n === word) score = Math.max(score, 100);
        else if (tokens.includes(word)) score = Math.max(score, 80);
        else if (joined.includes(word)) score = Math.max(score, 40);
      }
      // Do not confuse WalkAttack/WalkAndAttack with a standalone attack.
      if (role === "attack" && /walk|jalan|running/.test(n)) score = 0;
      return { clip, score };
    }).sort((a, b) => b.score - a.score);
    if (ranked[0]?.score > 0) {
      const c = ranked[0].clip;
      chosen[role] = c; names[role] = c.name; used.add(c);
    }
  }
  // Typical Blender default names: exactly two unknown tracks. This is only a guess,
  // prominently reported so the owner can verify/reverse it in the inspector.
  if (valid.length === 2) {
    const unknown = valid.filter((c) => !used.has(c) && generic(c.name));
    if (!chosen.walk && !chosen.attack && unknown.length === 2 && overrides.walk === undefined && overrides.attack === undefined) {
      chosen.walk = unknown[0]; chosen.attack = unknown[1];
      names.walk = unknown[0].name; names.attack = unknown[1].name;
      warnings.push("Dua track tanpa nama jelas: sementara klip pertama = jalan, kedua = serang. Verifikasi pemetaan sebelum publikasi.");
    } else if (chosen.walk && !chosen.attack && unknown.length === 1 && overrides.attack === undefined) {
      chosen.attack = unknown[0]; names.attack = unknown[0].name;
      warnings.push(`Klip “${unknown[0].name}” diduga serangan; verifikasi melalui pemeriksa GLB.`);
    }
  }
  if (!chosen.walk && valid.length === 1 && generic(valid[0].name) && overrides.walk === undefined) {
    chosen.walk = valid[0]; names.walk = valid[0].name;
    warnings.push("Hanya satu klip tanpa nama: dipakai sebagai jalan. Tidak ada klip serangan terpisah.");
  }
  if (!chosen.attack) warnings.push("Animasi serang belum terpetakan. Pilih klipnya atau ekspor ulang Action/NLA Attack dari Blender.");
  if (!chosen.walk) warnings.push("Animasi jalan belum terpetakan; gerakan tubuh cadangan digunakan.");
  return { clips: chosen, names, warnings };
}

function valueDiff(track: THREE.KeyframeTrack, a: number, b: number): number {
  const cubic = Boolean((track as THREE.KeyframeTrack & { createInterpolant?: { isInterpolantFactoryMethodGLTFCubicSpline?: boolean } }).createInterpolant?.isInterpolantFactoryMethodGLTFCubicSpline);
  const size = track.getValueSize();
  const n = cubic ? size / 3 : size;
  const offset = cubic ? n : 0;
  let diff = 0;
  for (let k = 0; k < n; k++) diff = Math.max(diff, Math.abs(Number(track.values[a * size + offset + k]) - Number(track.values[b * size + offset + k])));
  return diff;
}

/** Remove NLA common leading/trailing hold, retaining every moving keyframe and static track. */
export function prepareClip(source: THREE.AnimationClip, trimPadding = true): THREE.AnimationClip {
  const clip = source.clone();
  if (!trimPadding) return clip;
  let start = Infinity, end = -Infinity;
  for (const t of clip.tracks) {
    for (let i = 1; i < t.times.length; i++) {
      if (valueDiff(t, i - 1, i) > 1e-6) {
        start = Math.min(start, t.times[i - 1]);
        end = Math.max(end, t.times[i]);
      }
    }
  }
  if (!Number.isFinite(start) || end - start < 0.001) return clip;
  // Avoid shaving off deliberate very short transition holds.
  if (start < 0.15) start = 0;
  if (clip.duration - end < 0.15) end = clip.duration;
  for (const track of clip.tracks) track.trim(start, end).shift(-start);
  clip.duration = Math.max(0.05, end - start);
  return clip;
}

export interface AnimationIntent {
  role: AnimationRole;
  /** Unique for EACH combat action, stable during windup + impact + recovery. */
  id?: number;
  /** Combat duration (simulation seconds), not the length of the Blender timeline. */
  duration?: number;
}

/** One independent state machine per monster. Finished listener is installed exactly once. */
export class MonsterAnimationController {
  readonly mixer: THREE.AnimationMixer;
  readonly selection: ClipSelection;
  readonly actions = new Map<AnimationRole, THREE.AnimationAction>();
  private active: THREE.AnimationAction | null = null;
  private activeRole: AnimationRole = "walk";
  private shot: THREE.AnimationAction | null = null;
  private finished: THREE.AnimationAction | null = null;
  private lastEvent = "";
  private lastIntent: AnimationRole = "walk";
  private locomotion: "walk" | "idle" = "walk";
  private dead = false;
  private disposed = false;
  private onFinished = (event: { action: THREE.AnimationAction }) => {
    if (event.action === this.shot) this.finished = event.action;
  };

  constructor(private root: THREE.Object3D, source: THREE.AnimationClip[], settings: ModelSettings = {}) {
    this.mixer = new THREE.AnimationMixer(root);
    this.selection = resolveClips(source, settings.clips);
    for (const role of ROLES) {
      const clip = this.selection.clips[role];
      if (clip) this.actions.set(role, this.mixer.clipAction(prepareClip(clip, settings.trimPadding !== false)));
    }
    this.mixer.addEventListener("finished", this.onFinished);
    this.transition("walk", false);
  }

  get currentRole(): AnimationRole { return this.activeRole; }
  get isOneShot(): boolean { return this.shot !== null; }
  has(role: AnimationRole): boolean { return this.actions.has(role); }

  private transition(role: AnimationRole, once: boolean, duration?: number): boolean {
    const next = this.actions.get(role) ?? (role === "walk" ? this.actions.get("idle") : role === "idle" ? this.actions.get("walk") : undefined);
    this.activeRole = role;
    if (!next) return false;
    if (!once && next === this.active) return true;
    const previous = this.active;
    next.stopFading().stopWarping().reset();
    next.enabled = true;
    next.paused = false;
    next.clampWhenFinished = once;
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.setEffectiveWeight(1);
    const speed = once && duration && duration > 0 ? next.getClip().duration / duration : 1;
    next.setEffectiveTimeScale(speed);
    if (previous && previous !== next) { previous.stopFading().fadeOut(0.12); next.fadeIn(0.12); }
    next.play();
    this.active = next;
    this.shot = once ? next : null;
    this.finished = null;
    return true;
  }

  update(dt: number, intent: AnimationIntent) {
    if (this.disposed) return;
    const role = intent.role;
    if (this.dead && role !== "death") return;
    if (role === "walk" || role === "idle") this.locomotion = role;
    const isShot = role === "attack" || role === "roar" || role === "death";
    const eventKey = intent.id === undefined ? (role !== this.lastIntent ? `${role}:edge` : "") : `${role}:${intent.id}`;
    const newEvent = intent.id === undefined ? isShot && role !== this.lastIntent : isShot && eventKey !== this.lastEvent;
    if (newEvent) {
      this.lastEvent = eventKey;
      // Attack can interrupt a roar. Locomotion never interrupts an unfinished attack.
      this.transition(role, true, intent.duration);
      if (role === "death") this.dead = true;
    }
    if (!isShot && !this.shot) this.transition(this.locomotion, false);
    this.lastIntent = role;
    this.mixer.update(Math.max(0, Math.min(0.1, dt)));
    if (this.finished && this.finished === this.shot) {
      this.shot = null;
      this.finished = null;
      if (!this.dead) this.transition(this.locomotion, false);
    }
  }

  reset() {
    this.mixer.stopAllAction();
    this.active = null;
    this.shot = null;
    this.finished = null;
    this.lastEvent = "";
    this.lastIntent = "walk";
    this.locomotion = "walk";
    this.dead = false;
    this.transition("walk", false);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.mixer.removeEventListener("finished", this.onFinished);
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
