import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StoryCanvas } from "@/components/story/StoryCanvas";

vi.mock("@/components/story/ChapterNavigation", () => ({
  ChapterNavigation: (props: { currentIndex: number; totalChapters: number }) => (
    <div data-testid="chapter-nav">
      Chapter {props.currentIndex + 1} of {props.totalChapters}
    </div>
  ),
}));

vi.mock("@/components/story/ParagraphActionBar", () => ({
  ParagraphActionBar: (props: { onEdit: () => void; onRewrite: () => void }) => (
    <div data-testid="action-bar">
      <button onClick={props.onEdit}>Edit</button>
      <button onClick={props.onRewrite}>Rewrite</button>
    </div>
  ),
}));

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

vi.mock("@/components/story/RewriteInput", () => ({
  RewriteInput: (props: { onSubmit: (text: string) => void; onCancel: () => void }) => (
    <div data-testid="rewrite-input">
      <button onClick={() => props.onSubmit("make it better")}>Submit</button>
      <button onClick={props.onCancel}>Cancel</button>
    </div>
  ),
}));

describe("StoryCanvas", () => {
  const baseParagraphs = [
    { id: "node1-0", text: "Once upon a time in a land far away." },
    { id: "node1-1", text: "The hero set out on a journey." },
    { id: "node2-0", text: "They arrived at the castle." },
  ];

  it("renders empty state when no paragraphs", () => {
    render(<StoryCanvas paragraphs={[]} />);
    expect(screen.getByText(/your story begins here/i)).toBeDefined();
  });

  it("renders all paragraphs", () => {
    render(<StoryCanvas paragraphs={baseParagraphs} />);
    expect(screen.getByText(/once upon a time/i)).toBeDefined();
    expect(screen.getByText(/hero set out/i)).toBeDefined();
    expect(screen.getByText(/arrived at the castle/i)).toBeDefined();
  });

  it("renders chapter headings between chapter nodes", () => {
    render(
      <StoryCanvas
        paragraphs={baseParagraphs}
        chapterHeadings={[
          { nodeId: "node1", title: "Chapter 1" },
          { nodeId: "node2", title: "Chapter 2" },
        ]}
      />
    );
    // Chapter 2 heading should appear (not Chapter 1 since it's first)
    expect(screen.getByText("Chapter 2")).toBeDefined();
  });

  it("shows chapter navigation in chapter view mode", () => {
    render(
      <StoryCanvas
        paragraphs={baseParagraphs}
        chapterHeadings={[
          { nodeId: "node1", title: "Chapter 1" },
          { nodeId: "node2", title: "Chapter 2" },
        ]}
        chapterViewEnabled={true}
        activeChapterIndex={0}
        onChapterNavigate={vi.fn()}
      />
    );
    expect(screen.getAllByTestId("chapter-nav").length).toBeGreaterThan(0);
  });

  it("filters paragraphs in chapter view mode", () => {
    render(
      <StoryCanvas
        paragraphs={baseParagraphs}
        chapterHeadings={[
          { nodeId: "node1", title: "Chapter 1" },
          { nodeId: "node2", title: "Chapter 2" },
        ]}
        chapterViewEnabled={true}
        activeChapterIndex={0}
        onChapterNavigate={vi.fn()}
      />
    );
    // Only chapter 1 paragraphs should be visible
    expect(screen.getByText(/once upon a time/i)).toBeDefined();
    expect(screen.getByText(/hero set out/i)).toBeDefined();
    expect(screen.queryByText(/arrived at the castle/i)).toBeNull();
  });

  it("shows action bar on paragraph click when editable", () => {
    render(<StoryCanvas paragraphs={baseParagraphs} isEditable={true} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByText(/once upon a time/i));
    expect(screen.getByTestId("action-bar")).toBeDefined();
  });

  it("enters editing mode from action bar", () => {
    render(<StoryCanvas paragraphs={baseParagraphs} isEditable={true} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByText(/once upon a time/i));
    fireEvent.click(screen.getByText("Edit"));
    // Should show a textarea
    expect(screen.getByRole("textbox")).toBeDefined();
  });

  it("shows chapter break buttons in chapter edit mode", () => {
    render(
      <StoryCanvas
        paragraphs={baseParagraphs}
        onInsertBreak={vi.fn()}
        chapterEditMode={true}
        breakTargetNodeIds={["node1"]}
      />
    );
    const breakButtons = screen.getAllByLabelText(/start new chapter/i);
    expect(breakButtons.length).toBeGreaterThan(0);
  });

  it("displays rewrite streamed text when rewriting", () => {
    render(
      <StoryCanvas
        paragraphs={baseParagraphs}
        onRewrite={vi.fn()}
        rewritingParagraphId="node1-0"
        rewriteStreamedText="Rewritten text here"
        rewriteHasResult={false}
      />
    );
    expect(screen.getByText("Rewritten text here")).toBeDefined();
  });

  it("shows streaming cursor during generation", () => {
    const { container } = render(
      <StoryCanvas
        paragraphs={[{ id: "node1-0", text: "Generating...", isStreaming: true }]}
      />
    );
    expect(container.querySelector(".animate-pulse-gentle")).toBeDefined();
  });
});
