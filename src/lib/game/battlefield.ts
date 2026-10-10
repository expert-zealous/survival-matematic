// Single geometry contract shared by simulation, formation planner, and renderer.
export const LANE_WIDTH = 6.4;
export const LANE_LENGTH = 20.5;
export const PLAYER_Z = 5.6;
export const ROAD_FRONT_Z = 10;
export const ROAD_END_Z = -34;
export const RED_GATE_Z = ROAD_END_Z + 2.4;
// Troops emerge just in front of the red arch, not from the boss's feet.
export const ENEMY_ENTRY_Y = (PLAYER_Z - (RED_GATE_Z + 0.55)) / LANE_LENGTH;
export const PLAYABLE_MAX_Y = ENEMY_ENTRY_Y + 0.08;
export const FORMATION_COLUMNS = 10;
export const FORMATION_LEFT = 0.115;
export const FORMATION_RIGHT = 0.885;
export const ENTRY_ROW_INTERVAL = 0.46;

export function fieldToWorld(x: number, y: number) {
  return { x: (x - 0.5) * LANE_WIDTH, z: PLAYER_Z - y * LANE_LENGTH };
}
export interface FormationMember { x: number; type: 0 | 1 | 2 | 3; power: number }

/** Full-width rows, same TOTAL strength budget even at level 1. */
export function planFormation(
  budget: number,
  requestedCount: number,
  options: { rush: boolean; elite: boolean; allowElite: boolean },
  random: () => number = Math.random,
): FormationMember[] {
  const count = Math.min(60, Math.max(FORMATION_COLUMNS, Math.round(requestedCount / FORMATION_COLUMNS) * FORMATION_COLUMNS));
  const result: FormationMember[] = [];
  const weights: number[] = [];
  for (let i = 0; i < count; i++) {
    const r = random();
    const elite = options.allowElite ? (options.elite ? 0.06 : 0.02) : 0;
    const brute = options.elite ? 0.18 : 0.08;
    const runner = options.rush ? 0.3 : 0.1;
    const type: FormationMember["type"] = r < elite ? 3 : r < elite + brute ? 2 : r < elite + brute + runner ? 1 : 0;
    weights.push([1, 0.6, 3, 7][type]);
    const col = i % FORMATION_COLUMNS;
    const jitter = (random() - 0.5) * 0.008;
    const x = FORMATION_LEFT + col * ((FORMATION_RIGHT - FORMATION_LEFT) / (FORMATION_COLUMNS - 1));
    result.push({ x: Math.min(FORMATION_RIGHT, Math.max(FORMATION_LEFT, x + jitter)), type, power: 0 });
  }
  const total = weights.reduce((a, b) => a + b, 0);
  result.forEach((member, i) => { member.power = Math.max(0.1, budget) * weights[i] / total; });
  return result;
}
