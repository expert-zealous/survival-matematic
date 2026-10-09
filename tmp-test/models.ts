import { BOSS_BUILDERS, GIANT_BUILDERS } from "../src/lib/game/models";
let ok = 0, bad = 0;
const check = (name: string, make: () => any) => {
  try {
    const rig = make();
    const g = rig.group; let meshes = 0, tris = 0, joints = 0;
    g.traverse((o: any) => { if (o.isMesh) { meshes++; tris += o.geometry.getAttribute("position").count / 3; } if ((o as any).isGroup) joints++; });
    for (let i = 0; i < 240; i++) {
      const t = i / 60;
      rig.animate({ time: t, walk: t * 8, stride: 1, windup: Math.max(0, Math.sin(t * 2)), slam: Math.max(0, Math.sin(t * 2 + Math.PI)), hit: i % 60 < 6 ? 1 : 0, enraged: i > 120 });
    }
    if (!isFinite(g.position.y) || Math.abs(g.position.y) > 10) throw new Error("posisi aneh " + g.position.y);
    console.log(`${name.padEnd(20)} mesh=${String(meshes).padStart(3)} joint=${String(joints).padStart(3)} tris=${String(Math.round(tris)).padStart(6)} h=${rig.height.toFixed(2)}`);
    rig.dispose(); ok++;
  } catch (e) { console.log(`${name.padEnd(20)} GAGAL: ${(e as Error).message}`); bad++; }
};
BOSS_BUILDERS.forEach((b, i) => check(`boss_${String(i).padStart(2, "0")}`, b as any));
GIANT_BUILDERS.forEach((b, i) => check(`giant_${String(i).padStart(2, "0")}`, b as any));
console.log(`berhasil ${ok}/16, gagal ${bad}`);
