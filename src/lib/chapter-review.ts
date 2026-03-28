export const CHAPTER_REVIEW_MIN_NEW_TURNS = 4;
export const CHAPTER_REVIEW_EARLY_TURNS = 3;
export const CHAPTER_REVIEW_LONG_CHAPTER_WORDS = 1400;
export const CHAPTER_REVIEW_COOLDOWN_TURNS = 2;

export type ChapterSuggestionType = "start_new_chapter_here" | "rename_recent_chapter";

export interface ChapterSuggestion {
  type: ChapterSuggestionType;
  anchorNodeId: string;
  anchorParagraphIndex: number | null;
  proposedTitle: string | null;
  reason: string;
}

export interface ChapterReviewCheckpoint {
  reviewedAtTurns: number;
  dismissedAtTurns: number | null;
  reviewedTipId: string | null;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function shouldOfferChapterReview({
  activeTurns,
  currentTipId,
  checkpoint,
  beatPhaseChanged,
  wordsSinceChapterStart,
}: {
  activeTurns: number;
  currentTipId: string | null;
  checkpoint: ChapterReviewCheckpoint;
  beatPhaseChanged: boolean;
  wordsSinceChapterStart: number;
}): boolean {
  if (!currentTipId) return false;

  const turnsSinceReview = activeTurns - checkpoint.reviewedAtTurns;
  const turnsSinceDismiss =
    checkpoint.dismissedAtTurns == null
      ? Number.POSITIVE_INFINITY
      : activeTurns - checkpoint.dismissedAtTurns;

  if (turnsSinceDismiss < CHAPTER_REVIEW_COOLDOWN_TURNS) return false;
  if (turnsSinceReview >= CHAPTER_REVIEW_MIN_NEW_TURNS) return true;

  return (
    turnsSinceReview >= CHAPTER_REVIEW_EARLY_TURNS &&
    (beatPhaseChanged || wordsSinceChapterStart >= CHAPTER_REVIEW_LONG_CHAPTER_WORDS)
  );
}

export function isChapterSuggestionsStale({
  suggestionsTipId,
  currentTipId,
}: {
  suggestionsTipId: string | null;
  currentTipId: string | null;
}): boolean {
  return !suggestionsTipId || !currentTipId || suggestionsTipId !== currentTipId;
}

export function shouldResetChapterReviewCheckpoint({
  activeNodeIds,
  checkpoint,
}: {
  activeNodeIds: string[];
  checkpoint: ChapterReviewCheckpoint;
}): boolean {
  return Boolean(checkpoint.reviewedTipId) && !activeNodeIds.includes(checkpoint.reviewedTipId);
}

export function countWordsSinceChapterStart(
  activeNodes: Array<{ text: string; startsChapter: boolean }>,
): number {
  let lastChapterIndex = -1;
  for (let index = activeNodes.length - 1; index >= 0; index -= 1) {
    if (activeNodes[index]?.startsChapter) {
      lastChapterIndex = index;
      break;
    }
  }
  const relevantNodes = lastChapterIndex === -1 ? activeNodes : activeNodes.slice(lastChapterIndex);

  return relevantNodes.reduce((sum, node) => sum + countWords(node.text), 0);
}
