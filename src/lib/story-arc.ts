export type NarrativePhase = "setup" | "rising" | "climax" | "falling" | "resolution";

export interface BeatInfo {
  phase: NarrativePhase;
  progress: number;
  phaseProgress: number;
  turnsRemaining: number;
  isNearEnd: boolean;
}

export type ChoiceType =
  | "safe"
  | "risky"
  | "emotional"
  | "chaotic"
  | "explore"
  | "connect"
  | "foreshadow"
  | "complicate"
  | "confront"
  | "resolve"
  | "conclude"
  | "epilogue";

const DEFAULT_TARGET_TURNS = 35;

const PHASE_BOUNDARIES: Array<{
  phase: NarrativePhase;
  start: number;
  end: number;
}> = [
  { phase: "setup", start: 0, end: 0.15 },
  { phase: "rising", start: 0.15, end: 0.5 },
  { phase: "climax", start: 0.5, end: 0.7 },
  { phase: "falling", start: 0.7, end: 0.85 },
  { phase: "resolution", start: 0.85, end: 1 },
];

const PACING_INSTRUCTIONS: Record<NarrativePhase, string> = {
  setup:
    "You are in the opening of this story. Establish the world and characters with vivid detail, ground the reader in the setting, and plant the seeds of the central conflict. End this section at a natural pause — not a cliffhanger. Let the reader settle into the world before things start moving.",
  rising:
    "The story is building momentum. Develop complications, deepen character relationships, and raise the stakes. Vary your section endings — sometimes build tension, sometimes end with a quiet character moment or a surprising revelation. Not every section needs a cliffhanger.",
  climax:
    "The story is approaching its peak. Escalate the central conflict toward confrontation or revelation. This is where the biggest, most consequential moments happen. End with impact — this is where cliffhangers and dramatic beats feel earned.",
  falling:
    "The major conflict has peaked. Show the aftermath and consequences, resolve secondary threads, and let characters process what happened. The pace should feel like exhaling — purposeful but no longer frantic.",
  resolution:
    "Bring the story to a satisfying close. Tie up remaining threads, deliver a final emotional beat, and give the reader a sense of completion. This section should feel conclusive. No need to set up what's next — let the story land.",
};

const FINAL_TURN_INSTRUCTION =
  "This is the final section of the story. Write a conclusive, satisfying ending. Resolve the central thread, give the protagonist a final moment, and close with an image or line that resonates. Do not set up further choices — this is the end.";

const PHASE_CHOICE_TYPES: Record<NarrativePhase, ChoiceType[]> = {
  setup: ["explore", "connect", "safe", "foreshadow"],
  rising: ["safe", "risky", "emotional", "complicate"],
  climax: ["confront", "risky", "emotional", "chaotic"],
  falling: ["resolve", "emotional", "explore", "conclude"],
  resolution: ["resolve", "emotional", "conclude", "epilogue"],
};

export const ALL_CHOICE_TYPES: ChoiceType[] = [
  "safe",
  "risky",
  "emotional",
  "chaotic",
  "explore",
  "connect",
  "foreshadow",
  "complicate",
  "confront",
  "resolve",
  "conclude",
  "epilogue",
];

export function calculateBeat(currentTurn: number, targetTurns: number): BeatInfo {
  const effectiveTargetTurns = targetTurns > 0 ? targetTurns : DEFAULT_TARGET_TURNS;
  const progress = currentTurn / effectiveTargetTurns;
  const turnsRemaining = Math.max(0, effectiveTargetTurns - currentTurn);

  let matchedPhase = PHASE_BOUNDARIES[PHASE_BOUNDARIES.length - 1];
  for (const boundary of PHASE_BOUNDARIES) {
    if (progress <= boundary.end) {
      matchedPhase = boundary;
      break;
    }
  }

  const phaseLength = matchedPhase.end - matchedPhase.start;
  const rawPhaseProgress =
    phaseLength > 0 ? (progress - matchedPhase.start) / phaseLength : 1;
  const phaseProgress = Math.max(0, Math.min(1, rawPhaseProgress));

  return {
    phase: matchedPhase.phase,
    progress,
    phaseProgress,
    turnsRemaining,
    isNearEnd:
      matchedPhase.phase === "falling" || matchedPhase.phase === "resolution",
  };
}

export function getPacingInstruction(
  phase: NarrativePhase,
  isFinalSection: boolean,
): string {
  if (isFinalSection) {
    return FINAL_TURN_INSTRUCTION;
  }

  return PACING_INSTRUCTIONS[phase];
}

export function getChoiceTypesForPhase(phase: NarrativePhase): ChoiceType[] {
  return PHASE_CHOICE_TYPES[phase];
}
