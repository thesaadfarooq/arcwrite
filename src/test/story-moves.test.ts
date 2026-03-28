import { describe, expect, it } from "vitest";
import {
  getChoiceTypesForPhase,
  getMovePool,
  getVisibleMoveLabel,
  selectMoveFamilies,
} from "@/lib/story-moves";

describe("story move registry", () => {
  it("uses the post-ending pool when arc mode is post_ending", () => {
    expect(
      getMovePool({
        phase: "resolution",
        arcMode: "post_ending",
        previousEnding: "conclude",
      }),
    ).toEqual(["aftermath", "reflect", "loose_thread", "new_problem", "time_skip", "epilogue"]);
  });

  it("suppresses epilogue in the post-ending pool after an epilogue ending", () => {
    expect(
      getMovePool({
        phase: "resolution",
        arcMode: "post_ending",
        previousEnding: "epilogue",
      }),
    ).not.toContain("epilogue");
  });

  it("returns four distinct move families", () => {
    const families = selectMoveFamilies({
      phase: "rising",
      arcMode: "normal",
      previousEnding: null,
      recentFamilies: [],
      variantOffset: 0,
    });

    expect(families).toHaveLength(4);
    expect(new Set(families).size).toBe(4);
  });

  it("rotates away from recently chosen families when possible", () => {
    const families = selectMoveFamilies({
      phase: "rising",
      arcMode: "normal",
      previousEnding: null,
      recentFamilies: ["risk", "complicate"],
      variantOffset: 0,
    });

    expect(families).not.toContain("risk");
    expect(families).not.toContain("complicate");
  });

  it("avoids duplicate visible labels in a choice set when alternatives exist", () => {
    const families = selectMoveFamilies({
      phase: "falling",
      arcMode: "normal",
      previousEnding: null,
      recentFamilies: [],
      variantOffset: 0,
    });

    const visibleLabels = families.map((family) => getVisibleMoveLabel(family));
    expect(new Set(visibleLabels).size).toBe(visibleLabels.length);
  });

  it("returns a defensive copy of phase pools", () => {
    const pool = getMovePool({
      phase: "rising",
      arcMode: "normal",
      previousEnding: null,
    });

    pool.pop();

    expect(
      getMovePool({
        phase: "rising",
        arcMode: "normal",
        previousEnding: null,
      }),
    ).toEqual(["investigate", "connect", "risk", "complicate", "bargain", "reveal", "regroup"]);
  });

  it("returns a defensive copy of choice-type pools", () => {
    const choiceTypes = getChoiceTypesForPhase("setup");

    choiceTypes.pop();

    expect(getChoiceTypesForPhase("setup")).toEqual(["explore", "connect", "safe", "foreshadow"]);
  });

  it("keeps visible labels simple", () => {
    expect(getVisibleMoveLabel("investigate")).toBe("Discovery");
    expect(getVisibleMoveLabel("commit")).toBe("Crossroads");
    expect(getVisibleMoveLabel("regroup")).toBe("Recovery");
    expect(getVisibleMoveLabel("bargain")).toBe("Crossroads");
    expect(getVisibleMoveLabel("reflect")).toBe("Recovery");
    expect(getVisibleMoveLabel("aftermath")).toBe("Aftermath");
    expect(getVisibleMoveLabel("loose_thread")).toBe("Discovery");
    expect(getVisibleMoveLabel("time_skip")).toBe("Crossroads");
  });

  it("does not surface raw internal names for broad move families", () => {
    expect(getVisibleMoveLabel("bargain")).not.toBe("Bargain");
    expect(getVisibleMoveLabel("reflect")).not.toBe("Reflection");
    expect(getVisibleMoveLabel("loose_thread")).not.toBe("Loose Thread");
    expect(getVisibleMoveLabel("time_skip")).not.toBe("Time Skip");
  });
});
