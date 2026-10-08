import { describe, expect, it } from "vitest";
import { classStates, WAIT_MS } from "./class-rules";

const ids = ["a", "b", "c"];

describe("class unlocking", () => {
  it("all classes locked before the registration code", () => {
    expect(classStates(ids, new Map(), false, 1000).map((s) => s.state)).toEqual(["locked", "locked", "locked"]);
  });
  it("only class 1 opens after the code", () => {
    expect(classStates(ids, new Map(), true, 1000).map((s) => s.state)).toEqual(["open", "locked", "locked"]);
  });
  it("next class waits 24 hours after completing", () => {
    const s = classStates(ids, new Map([["a", 1000]]), true, 2000);
    expect(s[0]!.state).toBe("completed");
    expect(s[1]).toEqual({ state: "waiting", opensAt: 1000 + WAIT_MS });
    expect(s[2]!.state).toBe("locked");
  });
  it("next class opens once 24 hours pass", () => {
    const s = classStates(ids, new Map([["a", 0]]), true, WAIT_MS + 1);
    expect(s[1]!.state).toBe("open");
  });
});
