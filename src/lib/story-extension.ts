import { calculateBeat, type BeatInfo } from "@/lib/story-arc";
import type { StoryMoveFamily } from "@/lib/story-moves";

export type StoryEndingType = "conclude" | "epilogue";
export type ResumeStrength = "soft" | "medium" | "strong";
export type StoryArcOverride = "concluding" | "post_ending" | "resumed_extension";

export type ArcState = {
  segmentStartTurn: number;
  bufferTurnsUsed: number;
  endedWith: StoryEndingType | null;
  resumeStrength: ResumeStrength | null;
  extensionTargetTurns: number | null;
};

export function seedPostEndingArcState(activeTurns: number, endedWith: StoryEndingType): ArcState {
  return {
    segmentStartTurn: activeTurns,
    bufferTurnsUsed: 0,
    endedWith,
    resumeStrength: null,
    extensionTargetTurns: null,
  };
}

export function classifyResumeStrength(moveFamily: StoryMoveFamily): ResumeStrength {
  if (moveFamily === "new_problem") return "strong";
  if (moveFamily === "time_skip" || moveFamily === "loose_thread") return "medium";
  return "soft";
}

export function shouldExitPostEndingBuffer({
  bufferTurnsUsed,
  resumeStrength,
}: {
  bufferTurnsUsed: number;
  resumeStrength: ResumeStrength | null;
}): boolean {
  if (resumeStrength === "strong") return bufferTurnsUsed >= 2;
  if (resumeStrength === "medium") return bufferTurnsUsed >= 3;
  return bufferTurnsUsed >= 4;
}

export function getExtensionTargetTurns(resumeStrength: ResumeStrength): number {
  if (resumeStrength === "strong") return 10;
  if (resumeStrength === "medium") return 8;
  return 6;
}

export function calculateArcBeat({
  activeTurns,
  targetTurns,
  arcOverride,
  arcState,
}: {
  activeTurns: number;
  targetTurns: number;
  arcOverride: StoryArcOverride | null;
  arcState: ArcState | null;
}): BeatInfo {
  if (arcOverride === "concluding") {
    return calculateBeat(Math.max(activeTurns, Math.ceil(targetTurns * 0.75)), targetTurns);
  }

  if (
    arcOverride === "resumed_extension" &&
    arcState?.extensionTargetTurns &&
    arcState.segmentStartTurn > 0
  ) {
    const segmentTurns = Math.max(0, activeTurns - arcState.segmentStartTurn);
    return calculateBeat(segmentTurns, arcState.extensionTargetTurns);
  }

  return calculateBeat(activeTurns, targetTurns);
}
