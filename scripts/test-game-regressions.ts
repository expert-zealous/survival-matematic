// Run: npx --yes tsx scripts/test-game-regressions.ts
// Synthetic clips exercise the real controller; user GLBs are separately audited by check-models.mjs.
import assert from "node:assert/strict";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MonsterAnimationController, resolveClips, prepareClip, type AnimationRole } from "../src/lib/game/animation-controller";
import { prepareGlbTemplate, wrapGlb } from "../src/lib/game/glb-rig";
import { GameEngine } from "../src/lib/game/engine";
import { setSoundEnabled } from "../src/lib/audio";
import { BALANCE } from "../src/lib/game/data";
import { ENEMY_ENTRY_Y, FORMATION_COLUMNS, FORMATION_LEFT, FORMATION_RIGHT, RED_GATE_Z, fieldToWorld, planFormation, type FormationMember } from "../src/lib/game/battlefield";

setSoundEnabled(false);
let checks = 0;
function check(name: string, run: () => void) { run(); checks++; console.log(`PASS ${name}`); }
function rotationClip(name: string, node: string, duration = 1) {
  return new THREE.AnimationClip(name, duration, [new THREE.NumberKeyframeTrack(`${node}.rotation[x]`, [0, duration / 2, duration], [0, 1.1, 0])]);
}
function actor() {
  const root = new THREE.Group();
  const arm = new THREE.Group(); arm.name = "Arm";
  const leg = new THREE.Group(); leg.name = "Leg";
  root.add(arm, leg); return { root, arm, leg };
}

check("English + Indonesian Blender names resolve separately", () => {
  for (const [walk, attack] of [["Armature|Walk.001", "Armature|Attack_01"], ["Berjalan", "Menyerang"], ["Jalan", "Pukul"], ["Walking", "Slam"]]) {
    const chosen = resolveClips([rotationClip(walk, "Leg"), rotationClip(attack, "Arm")]);
    assert.equal(chosen.names.walk, walk); assert.equal(chosen.names.attack, attack);
  }
  const selected = resolveClips([rotationClip("Walk", "Leg"), rotationClip("HitReaction", "Arm")]);
  assert.equal(selected.clips.attack, undefined, "hit reaction is not an attack");
});

check("opaque NLA names are reported as inferred and can be explicitly reversed", () => {
  const clips = [rotationClip("NlaTrack", "Leg"), rotationClip("NlaTrack.001", "Arm")];
  const auto = resolveClips(clips);
  assert.equal(auto.names.attack, "NlaTrack.001"); assert.ok(auto.warnings.length);
  const manual = resolveClips(clips, { walk: "NlaTrack.001", attack: "NlaTrack" });
  assert.equal(manual.names.attack, "NlaTrack");
  const missing = resolveClips([clips[0]]);
  assert.equal(missing.clips.attack, undefined); assert.ok(missing.warnings.length);
});

check("NLA long leading/trailing holds trimmed on a CLONE", () => {
  const input = new THREE.AnimationClip("Attack", 20, [new THREE.NumberKeyframeTrack("Arm.rotation[x]", [0, 9, 10, 11, 20], [0, 0, 1, 0, 0])]);
  const output = prepareClip(input);
  assert.equal(output.duration, 2); assert.equal(output.tracks[0].times[0], 0);
  assert.equal(input.duration, 20); assert.equal(input.tracks[0].times[1], 9);
  assert.equal(prepareClip(input, false).duration, 20);
});

check("walk → FULL attack → walk repeats 15 times without being swallowed", () => {
  const a = actor();
  const ctl = new MonsterAnimationController(a.root, [rotationClip("Walk", "Leg"), rotationClip("Attack", "Arm"), rotationClip("Roar", "Arm")]);
  for (let cycle = 1; cycle <= 15; cycle++) {
    for (let f = 0; f < 90; f++) ctl.update(1 / 60, { role: "walk", id: cycle });
    assert.equal(ctl.currentRole, "walk");
    let maxArm = 0;
    for (let f = 0; f < 90; f++) {
      ctl.update(1 / 60, { role: f < 15 ? "attack" : "walk", id: cycle, duration: 1 });
      if (f < 50) maxArm = Math.max(maxArm, Math.abs(a.arm.rotation.x));
      if (f === 25) assert.equal(ctl.currentRole, "attack", "walk must not cancel unfinished strike");
    }
    assert.ok(maxArm > 0.75); assert.equal(ctl.currentRole, "walk"); assert.equal(ctl.isOneShot, false);
  }
  ctl.dispose();
});

check("a held attack ID plays ONCE, a new ID retriggers, death stops, reset revives", () => {
  const a = actor(); const ctl = new MonsterAnimationController(a.root, [rotationClip("Walk", "Leg"), rotationClip("Attack", "Arm"), rotationClip("Death", "Arm")]);
  for (let i = 0; i < 240; i++) ctl.update(1 / 60, { role: "attack", id: 1, duration: 0.8 });
  assert.equal(ctl.currentRole, "walk");
  ctl.update(1 / 60, { role: "attack", id: 2, duration: 0.8 }); assert.equal(ctl.currentRole, "attack");
  ctl.update(1 / 60, { role: "death", id: 3 });
  for (let i = 0; i < 100; i++) ctl.update(1 / 60, { role: "death", id: 3 });
  ctl.update(1 / 60, { role: "walk", id: 4 }); assert.equal(ctl.currentRole, "death");
  ctl.reset(); assert.equal(ctl.currentRole, "walk"); ctl.dispose();
});

check("missing attack never selects walk as its strike", () => {
  const a = actor(); const ctl = new MonsterAnimationController(a.root, [rotationClip("Walk", "Leg")]);
  assert.equal(ctl.has("attack"), false);
  ctl.update(0.1, { role: "attack", id: 1 }); assert.equal(ctl.isOneShot, false);
  assert.ok(ctl.selection.warnings.some((w) => w.includes("serang"))); ctl.dispose();
});

check("independent GLB instances, rest-pose normalization and repeated attack while enraged", () => {
  const a = actor();
  a.root.position.set(4, 2, 7); a.root.scale.setScalar(0.025);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1)); mesh.position.y = 1; a.root.add(mesh);
  const template = prepareGlbTemplate({ scene: a.root, animations: [rotationClip("Walk", "Leg"), rotationClip("Attack", "Arm"), rotationClip("Roar", "Arm")] }, "goblin-test.glb");
  const first = wrapGlb(template, 6.4), second = wrapGlb(template, 5.4);
  const bounds = new THREE.Box3().setFromObject(first.group, true);
  assert.ok(Math.abs(bounds.min.y) < 1e-5); assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).y - 6.4) < 1e-5);
  const originalScale = template.scene.scale.x;
  for (let frame = 0; frame < 600; frame++) {
    const time = frame / 60, cycle = Math.floor(time / 3), attack = time % 3 >= 1;
    first.animate({ time, walk: time * 5, stride: 1, windup: attack ? 0.5 : 0, slam: 0, hit: 0, enraged: true, action: attack ? "attack" : "walk", actionId: cycle, actionDuration: 1, entityId: 1 });
    second.animate({ time, walk: time * 5, stride: 1, windup: 0, slam: 0, hit: 0, action: "walk", entityId: 2 });
    if (frame % 180 === 95) {
      assert.equal(first.group.userData.animationRole, "attack");
      assert.equal(second.group.userData.animationRole, "walk");
    }
  }
  first.dispose();
  second.animate({ time: 11, walk: 1, stride: 1, windup: 0, slam: 0, hit: 0 });
  assert.equal(template.scene.scale.x, originalScale); assert.ok(template.scene.children.length > 0);
  second.dispose();
});

check("1000 full-width formations conserve HP budgets and stay inside fences", () => {
  for (let i = 0; i < 1000; i++) {
    const budget = 0.2 + i * 2.5;
    const row = planFormation(budget, (i % 55) + 1, { rush: true, elite: true, allowElite: true });
    assert.ok(row.length >= FORMATION_COLUMNS);
    assert.ok(Math.abs(row.reduce((a, e) => a + e.power, 0) - budget) < budget * 1e-10);
    assert.ok(row.every((e) => e.x >= FORMATION_LEFT && e.x <= FORMATION_RIGHT));
    assert.ok(Math.max(...row.slice(0, 10).map((e) => e.x)) - Math.min(...row.slice(0, 10).map((e) => e.x)) > 0.74);
  }
  assert.ok(Math.abs(fieldToWorld(0.5, ENEMY_ENTRY_Y).z - (RED_GATE_Z + 0.55)) < 1e-8);
});

interface Harness {
  phase: string; stageMode: string; mopTimer: number;
  enemies: { x: number; y: number; r: number; power: number }[];
  units: { y: number }[];
  enemyRows: FormationMember[][];
  boss: { hp: number; warnT: number; attackT: number; actionId: number; attackKind: string; id: number; attackCd: number };
  spawnWave: (n?: number) => void; updateEnemyEntrance: (dt: number) => void;
  updateStage: (dt: number) => void; updateSpecials: (dt: number) => void;
  updateBossCombat: (dt: number) => void; updateUnits: (dt: number) => void;
  enterChampion: () => void;
}
check("real engine emits rows at gate; queued enemies block stage completion beyond 60s", () => {
  let cleared = 0;
  const engine = new GameEngine({} as HTMLCanvasElement, { startLevel: 1, rankIndex: 0 }, { onHud: () => {}, onGameOver: () => {}, onBossDefeated: () => { cleared++; } });
  const e = engine as unknown as Harness; e.phase = "play";
  e.spawnWave(1); assert.ok(e.enemyRows.length > 0);
  e.updateEnemyEntrance(0.5);
  assert.equal(e.enemies.length, FORMATION_COLUMNS);
  assert.ok(e.enemies.every((enemy) => enemy.y === ENEMY_ENTRY_Y));
  e.updateUnits(1 / 60);
  assert.ok(e.enemies.every((enemy) => enemy.y < ENEMY_ENTRY_Y && enemy.x >= enemy.r * 1.4 + 0.035 && enemy.x <= 1 - (enemy.r * 1.4 + 0.035)));
  e.stageMode = "mopup"; e.boss.hp = 0; e.enemies = [];
  e.enemyRows = [planFormation(10, 10, { rush: false, elite: false, allowElite: false })];
  e.updateStage(120); assert.equal(e.phase, "play"); assert.equal(cleared, 0);
  e.updateSpecials(15); assert.equal(e.enemyRows.length, 1, "no ambush spawns after last boss death");
  e.enemyRows = []; e.updateStage(0.01); assert.equal(e.phase, "clear"); assert.equal(cleared, 1);
});

check("boss attack ID is stable from windup to hit, then changes for next attack", () => {
  const engine = new GameEngine({} as HTMLCanvasElement, { startLevel: 1, rankIndex: 0 }, { onHud: () => {}, onGameOver: () => {}, onBossDefeated: () => {} });
  const e = engine as unknown as Harness; e.phase = "play"; e.enterChampion();
  e.boss.attackT = 0; e.boss.attackCd = 0.001;
  e.updateBossCombat(0.01);
  const event = e.boss.actionId; assert.ok(e.boss.warnT > 0);
  for (let i = 0; i < 60; i++) e.updateBossCombat(1 / 60);
  assert.equal(e.boss.actionId, event); assert.ok(e.boss.attackKind === "slam" || e.boss.attackKind === "stomp");
  e.boss.attackCd = 0.001; e.boss.attackT = 0; e.updateBossCombat(0.01);
  assert.ok(e.boss.actionId > event);
  assert.ok(e.enemies.length <= BALANCE.maxEnemyUnits);
});

async function glbRoundtrip() {
  // Embedded, texture-free representative Blender-style GLB. Does not replace user assets.
  if (!globalThis.FileReader) {
    class Reader {
      result: ArrayBuffer | string | null = null;
      onloadend: (() => void) | null = null;
      readAsArrayBuffer(blob: Blob) { void blob.arrayBuffer().then((value) => { this.result = value; this.onloadend?.(); }); }
      readAsDataURL(blob: Blob) { void blob.arrayBuffer().then((value) => { this.result = `data:application/octet-stream;base64,${Buffer.from(value).toString("base64")}`; this.onloadend?.(); }); }
    }
    Object.defineProperty(globalThis, "FileReader", { value: Reader, configurable: true });
  }
  const a = actor(); a.root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1)));
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.1, 0, 0));
  const gltfClip = (name: string, target: string) => new THREE.AnimationClip(name, 1, [
    new THREE.QuaternionKeyframeTrack(`${target}.quaternion`, [0, 0.5, 1], [0, 0, 0, 1, ...q.toArray(), 0, 0, 0, 1]),
  ]);
  const clips = [gltfClip("Armature|Berjalan", "Leg"), gltfClip("Armature|Menyerang", "Arm")];
  const buffer = await new GLTFExporter().parseAsync(a.root, { binary: true, animations: clips });
  assert.ok(buffer instanceof ArrayBuffer);
  const gltf: GLTF = await new GLTFLoader().parseAsync(buffer, "");
  const rig = wrapGlb(prepareGlbTemplate(gltf, "roundtrip.glb"), 6.4);
  let rotated = 0;
  for (let i = 0; i < 120; i++) {
    rig.animate({ time: i / 60, walk: 0, stride: 0, windup: 1, slam: 0, hit: 0, action: "attack", actionId: 1, actionDuration: 1 });
    rotated = Math.max(rotated, Math.abs(rig.group.getObjectByName("Arm")!.rotation.x));
  }
  assert.ok(rotated > 0.7); assert.equal(rig.group.userData.animationRole, "walk"); rig.dispose();
  checks++; console.log("PASS exported GLB loads through real GLTFLoader, attacks and returns to Walk");
}
void glbRoundtrip().then(() => console.log(`\n${checks} regression groups passed.`)).catch((error) => { console.error(error); process.exitCode = 1; });
