import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChapterReviewPrompt } from "@/components/story/ChapterReviewPrompt";
import { ChapterSidebar } from "@/components/story/ChapterSidebar";
import { MobileStoryBar } from "@/components/story/MobileStoryBar";
import { StoryStructureSheet } from "@/components/story/StoryStructureSheet";
import { StoryToolsSheet } from "@/components/story/StoryToolsSheet";

describe("mobile story surfaces", () => {
  it("renders the mobile bottom bar actions", () => {
    render(<MobileStoryBar onWrite={vi.fn()} onStructure={vi.fn()} onTools={vi.fn()} />);

    expect(screen.getByRole("button", { name: /write/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /structure/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tools/i })).toBeInTheDocument();
  });

  it("renders review content and switches between chapter and timeline tabs", async () => {
    render(
      <StoryStructureSheet
        open
        onOpenChange={vi.fn()}
        reviewSlot={<div>Review chapter structure</div>}
        chaptersSlot={<div>Chapter list</div>}
        timelineSlot={<div>Timeline list</div>}
      />,
    );

    expect(screen.getByText("Review chapter structure")).toBeInTheDocument();
    expect(screen.getByText("Chapter list")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: /chapters/i })).toHaveClass("flex", "min-h-0", "flex-1");

    const chaptersTab = screen.getByRole("tab", { name: /chapters/i });
    await act(async () => {
      chaptersTab.focus();
      fireEvent.keyDown(chaptersTab, { key: "ArrowRight" });
    });
    expect(await screen.findByText("Timeline list")).toBeInTheDocument();
  });

  it("shows chapter suggestion wording when suggestions exist", () => {
    const onReview = vi.fn();

    render(<ChapterReviewPrompt suggestionCount={2} onReview={onReview} />);

    expect(screen.getByText(/2 chapter suggestions ready/i)).toBeInTheDocument();
    expect(
      screen.getByText(/suggestions may include chapter breaks or better titles for recent chapters\./i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /see suggestions/i }));
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("shows the idle chapter suggestion wording when no count is provided", () => {
    render(<ChapterReviewPrompt onReview={vi.fn()} />);

    expect(screen.getByText(/chapter suggestions ready/i)).toBeInTheDocument();
    expect(
      screen.getByText(/suggestions may include chapter breaks or better titles for recent chapters\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /see suggestions/i })).toBeInTheDocument();
  });

  it("shows a loading state while preparing chapter suggestions", () => {
    render(<ChapterReviewPrompt isLoading onReview={vi.fn()} />);

    expect(screen.getByText(/preparing chapter suggestions/i)).toBeInTheDocument();
    expect(screen.getByText(/looking at recent story beats and chapter titles\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /loading\.\.\./i })).toBeDisabled();
  });

  it("renders manual chapter controls above the list when actions are provided", () => {
    render(
      <ChapterSidebar
        chapters={[{ id: "chapter-1", title: "Chapter 1", wordCount: 120 }]}
        totalWords={120}
        onChapterClick={vi.fn()}
        onStartBreakMode={vi.fn()}
        onEnterEditMode={vi.fn()}
      />,
    );

    const addBreak = screen.getByRole("button", { name: /add chapter break/i });
    const editTitles = screen.getByRole("button", { name: /edit chapter titles/i });
    const chapterTitle = screen.getByRole("button", { name: /chapter 1/i });

    expect(addBreak.compareDocumentPosition(editTitles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(editTitles.compareDocumentPosition(chapterTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("reuses tone content inside the tools sheet", () => {
    const onToneChange = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <StoryToolsSheet
        open
        onOpenChange={onOpenChange}
        currentTone="Whimsical & light"
        onToneChange={onToneChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /dark & gritty/i }));

    expect(onToneChange).toHaveBeenCalledWith("Dark & gritty");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
