export const JOIN_PASS_KEY = "3344";
export const REGISTRATION_CODE = "SS/2627/theary-8867";
export const ADMIN_KEY = "91870";
export const WAIT_MS = 24 * 60 * 60 * 1000;

export type ClassState =
  | { state: "locked" }
  | { state: "open" }
  | { state: "completed" }
  | { state: "waiting"; opensAt: number };

/**
 * Sequential unlocking: nothing opens until the registration code is entered.
 * Class 1 opens first; each next class opens 24 hours after the previous one
 * was marked "Complete watching".
 */
export function classStates(
  ids: string[],
  completedAt: Map<string, number>,
  unlocked: boolean,
  now: number,
): ClassState[] {
  const out: ClassState[] = [];
  let prevOpenAt: number | null = unlocked ? 0 : null;
  for (const id of ids) {
    const done = completedAt.get(id);
    if (prevOpenAt === null) {
      out.push({ state: "locked" });
    } else if (prevOpenAt > now) {
      out.push({ state: "waiting", opensAt: prevOpenAt });
      prevOpenAt = null;
      continue;
    } else if (done !== undefined) {
      out.push({ state: "completed" });
      prevOpenAt = done + WAIT_MS;
      continue;
    } else {
      out.push({ state: "open" });
    }
    prevOpenAt = null;
  }
  return out;
}
