import { describe, expect, it } from "vitest";
import {
  ALL_CHOICE_TYPES,
  calculateBeat,
  getChoiceTypesForPhase,
  getPacingInstruction,
  type NarrativePhase,
} from "@/lib/story-arc";

describe("calculateBeat", () => {
  const T = 20;

  it("returns setup at turn 1", () => {
    const beat = calculateBeat(1, T);
    expect(beat.phase).toBe("setup");
    expect(beat.isNearEnd).toBe(false);
  });

  it("returns setup at the 15 percent boundary", () => {
    const beat = calculateBeat(3, T);
    expect(beat.phase).toBe("setup");
  });

  it("returns rising after setup", () => {
    const beat = calculateBeat(4, T);
    expect(beat.phase).toBe("rising");
  });

  it("returns rising at the 50 percent boundary", () => {
    const beat = calculateBeat(10, T);
    expect(beat.phase).toBe("rising");
  });

  it("returns climax after rising", () => {
    const beat = calculateBeat(11, T);
    expect(beat.phase).toBe("climax");
  });

  it("returns climax at the 70 percent boundary", () => {
    const beat = calculateBeat(14, T);
    expect(beat.phase).toBe("climax");
  });

  it("returns falling after climax", () => {
    const beat = calculateBeat(15, T);
    expect(beat.phase).toBe("falling");
    expect(beat.isNearEnd).toBe(true);
  });

  it("returns resolution near the end", () => {
    const beat = calculateBeat(18, T);
    expect(beat.phase).toBe("resolution");
    expect(beat.isNearEnd).toBe(true);
  });

  it("clamps to resolution when story exceeds target", () => {
    const beat = calculateBeat(25, T);
    expect(beat.phase).toBe("resolution");
    expect(beat.progress).toBeGreaterThan(1);
    expect(beat.isNearEnd).toBe(true);
  });

  it("returns setup at turn 0", () => {
    const beat = calculateBeat(0, T);
    expect(beat.phase).toBe("setup");
    expect(beat.progress).toBe(0);
  });

  it("computes progress as currentTurn divided by targetTurns", () => {
    const beat = calculateBeat(10, T);
    expect(beat.progress).toBeCloseTo(0.5);
  });

  it("computes turnsRemaining correctly", () => {
    const beat = calculateBeat(12, T);
    expect(beat.turnsRemaining).toBe(8);
  });

  it("reports zero turns remaining when past target", () => {
    const beat = calculateBeat(25, T);
    expect(beat.turnsRemaining).toBe(0);
  });

  it("computes phase progress within a phase", () => {
    const beat = calculateBeat(7, T);
    expect(beat.phase).toBe("rising");
    expect(beat.phaseProgress).toBeGreaterThan(0.5);
    expect(beat.phaseProgress).toBeLessThan(0.65);
  });

  it("scales across shorter stories", () => {
    expect(calculateBeat(1, 15).phase).toBe("setup");
    expect(calculateBeat(5, 15).phase).toBe("rising");
    expect(calculateBeat(10, 15).phase).toBe("climax");
    expect(calculateBeat(12, 15).phase).toBe("falling");
    expect(calculateBeat(14, 15).phase).toBe("resolution");
  });

  it("scales across longer stories", () => {
    expect(calculateBeat(3, 45).phase).toBe("setup");
    expect(calculateBeat(15, 45).phase).toBe("rising");
    expect(calculateBeat(25, 45).phase).toBe("climax");
    expect(calculateBeat(35, 45).phase).toBe("falling");
    expect(calculateBeat(40, 45).phase).toBe("resolution");
  });

  it("defaults targetTurns to 35 when missing or invalid", () => {
    const beat = calculateBeat(5, 0);
    expect(beat.phase).toBe("setup");
    expect(beat.turnsRemaining).toBe(30);
  });
});

describe("getPacingInstruction", () => {
  it("returns the setup instruction", () => {
    const instruction = getPacingInstruction("setup", false);
    expect(instruction).toContain("opening of this story");
    expect(instruction).toContain("not a cliffhanger");
  });

  it("returns the rising instruction", () => {
    const instruction = getPacingInstruction("rising", false);
    expect(instruction).toContain("building momentum");
  });

  it("returns the climax instruction", () => {
    const instruction = getPacingInstruction("climax", false);
    expect(instruction).toContain("peak");
  });

  it("returns the falling instruction", () => {
    const instruction = getPacingInstruction("falling", false);
    expect(instruction).toContain("aftermath");
  });

  it("returns the resolution instruction", () => {
    const instruction = getPacingInstruction("resolution", false);
    expect(instruction).toContain("satisfying close");
  });

  it("returns the final-turn instruction when requested", () => {
    const instruction = getPacingInstruction("resolution", true);
    expect(instruction).toContain("final section of the story");
    expect(instruction).toContain("Do not set up further choices");
  });

  it("lets the final-turn instruction override the phase", () => {
    const instruction = getPacingInstruction("rising", true);
    expect(instruction).toContain("final section of the story");
  });
});

describe("getChoiceTypesForPhase", () => {
  it("returns setup types", () => {
    expect(getChoiceTypesForPhase("setup")).toEqual(["explore", "connect", "safe", "foreshadow"]);
  });

  it("returns rising types", () => {
    expect(getChoiceTypesForPhase("rising")).toEqual(["safe", "risky", "emotional", "complicate"]);
  });

  it("returns climax types", () => {
    expect(getChoiceTypesForPhase("climax")).toEqual(["confront", "risky", "emotional", "chaotic"]);
  });

  it("returns falling types", () => {
    expect(getChoiceTypesForPhase("falling")).toEqual(["resolve", "emotional", "explore", "conclude"]);
  });

  it("returns resolution types", () => {
    expect(getChoiceTypesForPhase("resolution")).toEqual(["resolve", "emotional", "conclude", "epilogue"]);
  });

  it("always returns four types", () => {
    const phases: NarrativePhase[] = ["setup", "rising", "climax", "falling", "resolution"];
    for (const phase of phases) {
      expect(getChoiceTypesForPhase(phase)).toHaveLength(4);
    }
  });
});

describe("ALL_CHOICE_TYPES", () => {
  it("contains all 12 supported types", () => {
    expect(ALL_CHOICE_TYPES).toHaveLength(12);
    expect(ALL_CHOICE_TYPES).toContain("safe");
    expect(ALL_CHOICE_TYPES).toContain("conclude");
    expect(ALL_CHOICE_TYPES).toContain("epilogue");
  });
});
