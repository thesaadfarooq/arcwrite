import { describe, expect, it } from "vitest";
import {
  calculateArcBeat,
  classifyResumeStrength,
  getExtensionTargetTurns,
  seedPostEndingArcState,
  shouldExitPostEndingBuffer,
} from "@/lib/story-extension";

describe("story extension helpers", () => {
  it("seeds post-ending state from the current turn and ending type", () => {
    expect(seedPostEndingArcState(12, "conclude")).toEqual({
      segmentStartTurn: 12,
      bufferTurnsUsed: 0,
      endedWith: "conclude",
      resumeStrength: null,
      extensionTargetTurns: null,
    });
  });

  it("classifies restart strength from the selected move family", () => {
    expect(classifyResumeStrength("new_problem")).toBe("strong");
    expect(classifyResumeStrength("time_skip")).toBe("medium");
    expect(classifyResumeStrength("aftermath")).toBe("soft");
  });

  it("exits after two turns on a strong restart", () => {
    expect(shouldExitPostEndingBuffer({ bufferTurnsUsed: 2, resumeStrength: "strong" })).toBe(true);
  });

  it("keeps a soft continuation alive until the fourth turn", () => {
    expect(shouldExitPostEndingBuffer({ bufferTurnsUsed: 3, resumeStrength: "soft" })).toBe(false);
    expect(shouldExitPostEndingBuffer({ bufferTurnsUsed: 4, resumeStrength: "soft" })).toBe(true);
  });

  it("maps resume strength to reopened target turns", () => {
    expect(getExtensionTargetTurns("strong")).toBe(10);
    expect(getExtensionTargetTurns("medium")).toBe(8);
    expect(getExtensionTargetTurns("soft")).toBe(6);
  });

  it("re-bases beat calculation for resumed extension segments", () => {
    const beat = calculateArcBeat({
      activeTurns: 16,
      targetTurns: 35,
      arcOverride: "resumed_extension",
      arcState: {
        segmentStartTurn: 13,
        bufferTurnsUsed: 2,
        endedWith: "conclude",
        resumeStrength: "strong",
        extensionTargetTurns: 10,
      },
    });

    expect(beat.phase).toBe("rising");
    expect(beat.turnsRemaining).toBe(7);
  });
});
