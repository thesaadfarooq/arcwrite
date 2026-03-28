import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChapterReviewPrompt } from "@/components/story/ChapterReviewPrompt";
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

    const chaptersTab = screen.getByRole("tab", { name: /chapters/i });
    await act(async () => {
      chaptersTab.focus();
      fireEvent.keyDown(chaptersTab, { key: "ArrowRight" });
    });
    expect(await screen.findByText("Timeline list")).toBeInTheDocument();
  });

  it("shows the quiet chapter review prompt", () => {
    const onReview = vi.fn();

    render(<ChapterReviewPrompt suggestionCount={2} onReview={onReview} />);

    expect(screen.getByText(/2 chapter suggestions ready/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /review/i }));
    expect(onReview).toHaveBeenCalledTimes(1);
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
