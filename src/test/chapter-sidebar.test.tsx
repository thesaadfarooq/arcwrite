import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChapterSidebar, type Chapter } from "@/components/story/ChapterSidebar";

const chapters: Chapter[] = [
  { id: "ch1", title: "The Beginning", wordCount: 500, isActive: true, isRoot: true },
  { id: "ch2", title: "The Journey", wordCount: 800, isActive: false, isRoot: false },
  { id: "ch3", title: "The End", wordCount: 300, isActive: false, isRoot: false },
];

describe("ChapterSidebar", () => {
  it("renders chapter list with word counts", () => {
    render(
      <ChapterSidebar
        chapters={chapters}
        totalWords={1600}
        onChapterClick={vi.fn()}
      />
    );
    expect(screen.getByText("The Beginning")).toBeDefined();
    expect(screen.getByText("The Journey")).toBeDefined();
    expect(screen.getByText("The End")).toBeDefined();
    expect(screen.getByText("1,600 words")).toBeDefined();
  });

  it("calls onChapterClick when a chapter is clicked", () => {
    const onClick = vi.fn();
    render(
      <ChapterSidebar
        chapters={chapters}
        totalWords={1600}
        onChapterClick={onClick}
      />
    );
    fireEvent.click(screen.getByText("The Journey"));
    expect(onClick).toHaveBeenCalledWith("ch2");
  });

  it("shows empty state when no chapters", () => {
    render(
      <ChapterSidebar
        chapters={[]}
        totalWords={0}
        onChapterClick={vi.fn()}
      />
    );
    expect(screen.getByText("Chapters will appear as your story grows")).toBeDefined();
  });

  it("renders fallback title when chapter has no title", () => {
    render(
      <ChapterSidebar
        chapters={[{ id: "ch1", title: "", wordCount: 100, isRoot: true }]}
        totalWords={100}
        onChapterClick={vi.fn()}
      />
    );
    expect(screen.getByText("Chapter 1")).toBeDefined();
  });

  it("shows context menu buttons when handlers are provided", () => {
    render(
      <ChapterSidebar
        chapters={chapters}
        totalWords={1600}
        onChapterClick={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMerge={vi.fn()}
      />
    );
    // There should be "Chapter options" buttons
    expect(screen.getAllByLabelText("Chapter options").length).toBe(3);
  });

  it("renders in embedded mode without header", () => {
    render(
      <ChapterSidebar
        chapters={chapters}
        totalWords={1600}
        onChapterClick={vi.fn()}
        embedded={true}
      />
    );
    // "Chapters" header should not be rendered
    expect(screen.queryByText("Chapters")).toBeNull();
  });

  it("renders reviewSlot when provided", () => {
    render(
      <ChapterSidebar
        chapters={chapters}
        totalWords={1600}
        onChapterClick={vi.fn()}
        reviewSlot={<div data-testid="review">Review content</div>}
      />
    );
    expect(screen.getByTestId("review")).toBeDefined();
  });
});
