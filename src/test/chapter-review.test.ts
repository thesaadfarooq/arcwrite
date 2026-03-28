import { describe, expect, it } from "vitest";
import {
  CHAPTER_REVIEW_COOLDOWN_TURNS,
  CHAPTER_REVIEW_EARLY_TURNS,
  CHAPTER_REVIEW_LONG_CHAPTER_WORDS,
  CHAPTER_REVIEW_MIN_NEW_TURNS,
  countWordsSinceChapterStart,
  isChapterSuggestionsStale,
  shouldResetChapterReviewCheckpoint,
  shouldOfferChapterReview,
  type ChapterReviewCheckpoint,
} from "@/lib/chapter-review";

describe("chapter review helpers", () => {
  const checkpoint: ChapterReviewCheckpoint = {
    reviewedAtTurns: 2,
    dismissedAtTurns: null,
    reviewedTipId: "node-2",
  };

  it("offers review after four new active turns", () => {
    expect(
      shouldOfferChapterReview({
        activeTurns: 6,
        currentTipId: "node-6",
        checkpoint,
        beatPhaseChanged: false,
        wordsSinceChapterStart: 900,
      })
    ).toBe(true);
  });

  it("offers review after three turns when the beat changed", () => {
    expect(
      shouldOfferChapterReview({
        activeTurns: 5,
        currentTipId: "node-5",
        checkpoint,
        beatPhaseChanged: true,
        wordsSinceChapterStart: 700,
      })
    ).toBe(true);
  });

  it("offers review after three turns when the current chapter is long", () => {
    expect(
      shouldOfferChapterReview({
        activeTurns: 5,
        currentTipId: "node-5",
        checkpoint,
        beatPhaseChanged: false,
        wordsSinceChapterStart: CHAPTER_REVIEW_LONG_CHAPTER_WORDS + 25,
      })
    ).toBe(true);
  });

  it("suppresses review during the dismiss cooldown", () => {
    expect(
      shouldOfferChapterReview({
        activeTurns: 6,
        currentTipId: "node-6",
        checkpoint: {
          ...checkpoint,
          dismissedAtTurns: 5,
        },
        beatPhaseChanged: true,
        wordsSinceChapterStart: CHAPTER_REVIEW_LONG_CHAPTER_WORDS + 25,
      })
    ).toBe(false);
  });

  it("does not offer review before the thresholds are met", () => {
    expect(
      shouldOfferChapterReview({
        activeTurns: 4,
        currentTipId: "node-4",
        checkpoint,
        beatPhaseChanged: false,
        wordsSinceChapterStart: 500,
      })
    ).toBe(false);
  });

  it("does not offer review when there is no current tip", () => {
    expect(
      shouldOfferChapterReview({
        activeTurns: 6,
        currentTipId: null,
        checkpoint,
        beatPhaseChanged: true,
        wordsSinceChapterStart: CHAPTER_REVIEW_LONG_CHAPTER_WORDS + 25,
      })
    ).toBe(false);
  });

  it("marks suggestions stale when the active tip changes", () => {
    expect(
      isChapterSuggestionsStale({
        suggestionsTipId: "node-4",
        currentTipId: "node-5",
      })
    ).toBe(true);
  });

  it("keeps suggestions fresh when they match the current tip", () => {
    expect(
      isChapterSuggestionsStale({
        suggestionsTipId: "node-4",
        currentTipId: "node-4",
      })
    ).toBe(false);
  });

  it("marks suggestions stale when the current tip is missing", () => {
    expect(
      isChapterSuggestionsStale({
        suggestionsTipId: "node-4",
        currentTipId: null,
      })
    ).toBe(true);
  });

  it("resets the checkpoint when the reviewed tip is no longer on the active path", () => {
    expect(
      shouldResetChapterReviewCheckpoint({
        activeNodeIds: ["node-1", "node-3", "node-4"],
        checkpoint,
      })
    ).toBe(true);
  });

  it("keeps the checkpoint when the reviewed tip remains on the active path", () => {
    expect(
      shouldResetChapterReviewCheckpoint({
        activeNodeIds: ["node-1", "node-2", "node-4"],
        checkpoint,
      })
    ).toBe(false);
  });

  it("counts words since the most recent chapter start", () => {
    expect(
      countWordsSinceChapterStart([
        { text: "Opening words only", startsChapter: true },
        { text: "Middle node with several more words", startsChapter: false },
        { text: "Newest node has the final five words", startsChapter: false },
      ])
    ).toBe(16);
  });

  it("exports the tuned thresholds used by StoryWrite", () => {
    expect(CHAPTER_REVIEW_MIN_NEW_TURNS).toBe(4);
    expect(CHAPTER_REVIEW_EARLY_TURNS).toBe(3);
    expect(CHAPTER_REVIEW_COOLDOWN_TURNS).toBe(2);
  });
});
