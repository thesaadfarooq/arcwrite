import type { NarrativePhase } from "@/lib/story-arc";

export type StoryArcMode = "normal" | "concluding" | "post_ending" | "resumed_extension";

export type StoryMoveFamily =
  | "investigate"
  | "connect"
  | "commit"
  | "foreshadow"
  | "reveal"
  | "complicate"
  | "risk"
  | "bargain"
  | "confront"
  | "sacrifice"
  | "regroup"
  | "reflect"
  | "resolve"
  | "conclude"
  | "epilogue"
  | "aftermath"
  | "loose_thread"
  | "new_problem"
  | "time_skip";

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

const PHASE_POOLS: Record<NarrativePhase, readonly StoryMoveFamily[]> = {
  setup: ["investigate", "connect", "commit", "foreshadow", "reveal"],
  rising: ["investigate", "connect", "risk", "complicate", "bargain", "reveal", "regroup"],
  climax: ["risk", "confront", "sacrifice", "reveal", "complicate", "commit"],
  falling: ["reflect", "regroup", "resolve", "reveal", "conclude"],
  resolution: ["reflect", "resolve", "conclude", "epilogue"],
};

const POST_ENDING_POOL: readonly StoryMoveFamily[] = [
  "aftermath",
  "reflect",
  "loose_thread",
  "new_problem",
  "time_skip",
  "epilogue",
];

const VISIBLE_LABELS: Record<StoryMoveFamily, string> = {
  investigate: "Discovery",
  connect: "Bond",
  commit: "Crossroads",
  foreshadow: "Omen",
  reveal: "Reveal",
  complicate: "Complication",
  risk: "Risk",
  bargain: "Crossroads",
  confront: "Showdown",
  sacrifice: "Sacrifice",
  regroup: "Recovery",
  reflect: "Recovery",
  resolve: "Resolution",
  conclude: "Conclusion",
  epilogue: "Epilogue",
  aftermath: "Aftermath",
  loose_thread: "Discovery",
  new_problem: "Complication",
  time_skip: "Crossroads",
};

const PHASE_CHOICE_TYPES: Record<NarrativePhase, readonly ChoiceType[]> = {
  setup: ["explore", "connect", "safe", "foreshadow"],
  rising: ["safe", "risky", "emotional", "complicate"],
  climax: ["confront", "risky", "emotional", "chaotic"],
  falling: ["resolve", "emotional", "explore", "conclude"],
  resolution: ["resolve", "emotional", "conclude", "epilogue"],
};

export const ALL_CHOICE_TYPES = Object.freeze([
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
]) as readonly ChoiceType[];

export function getVisibleMoveLabel(family: StoryMoveFamily): string {
  return VISIBLE_LABELS[family];
}

export function getChoiceTypesForPhase(phase: NarrativePhase): ChoiceType[] {
  return [...PHASE_CHOICE_TYPES[phase]];
}

export function getMovePool({
  phase,
  arcMode,
  previousEnding,
}: {
  phase: NarrativePhase;
  arcMode: StoryArcMode;
  previousEnding: "conclude" | "epilogue" | null;
}): StoryMoveFamily[] {
  const pool = arcMode !== "post_ending"
    ? PHASE_POOLS[phase]
    : previousEnding === "epilogue"
    ? POST_ENDING_POOL.filter((family) => family !== "epilogue")
    : POST_ENDING_POOL;

  return [...pool];
}

export function selectMoveFamilies({
  phase,
  arcMode,
  previousEnding,
  recentFamilies,
  variantOffset,
}: {
  phase: NarrativePhase;
  arcMode: StoryArcMode;
  previousEnding: "conclude" | "epilogue" | null;
  recentFamilies: StoryMoveFamily[];
  variantOffset: number;
}): StoryMoveFamily[] {
  const pool = getMovePool({ phase, arcMode, previousEnding });
  const recentSet = new Set(recentFamilies.slice(-2));
  const filteredPool = pool.filter((family) => !recentSet.has(family));
  const source = filteredPool.length >= 4 ? filteredPool : pool;

  if (source.length === 0) {
    return [];
  }

  const normalizedOffset = ((variantOffset % source.length) + source.length) % source.length;
  const rotated = source.map((_, index) => source[(index + normalizedOffset) % source.length]);
  const uniqueLabelFamilies: StoryMoveFamily[] = [];
  const seenLabels = new Set<string>();

  for (const family of rotated) {
    const visibleLabel = getVisibleMoveLabel(family);
    if (seenLabels.has(visibleLabel)) {
      continue;
    }

    uniqueLabelFamilies.push(family);
    seenLabels.add(visibleLabel);

    if (uniqueLabelFamilies.length === 4) {
      return uniqueLabelFamilies;
    }
  }

  for (const family of rotated) {
    if (uniqueLabelFamilies.includes(family)) {
      continue;
    }

    uniqueLabelFamilies.push(family);
    if (uniqueLabelFamilies.length === 4) {
      break;
    }
  }

  return uniqueLabelFamilies;
}
