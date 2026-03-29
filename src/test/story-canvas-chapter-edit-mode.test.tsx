import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoryCanvas } from "@/components/story/StoryCanvas";

describe("StoryCanvas chapter edit mode", () => {
  it("shows visible split markers only when chapter edit mode is enabled", () => {
    const onInsertBreak = vi.fn();
    const paragraphs = [
      { id: "node-1-0", text: "First paragraph." },
      { id: "node-1-1", text: "Second paragraph." },
      { id: "node-1-2", text: "Third paragraph." },
    ];

    const { rerender } = render(
      <StoryCanvas
        paragraphs={paragraphs}
        onInsertBreak={onInsertBreak}
        chapterEditMode={false}
      />,
    );

    expect(screen.queryByRole("button", { name: /start new chapter after this paragraph/i })).not.toBeInTheDocument();

    rerender(
      <StoryCanvas
        paragraphs={paragraphs}
        onInsertBreak={onInsertBreak}
        chapterEditMode
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /start new chapter after this paragraph/i })[0]);
    expect(onInsertBreak).toHaveBeenCalledWith("node-1", 1);
  });

  it("shows explicit after-paragraph markers only for allowed node ids", () => {
    const onInsertBreak = vi.fn();
    const paragraphs = [
      { id: "node-1-0", text: "First paragraph." },
      { id: "node-1-1", text: "Second paragraph." },
      { id: "node-2-0", text: "Third paragraph." },
      { id: "node-2-1", text: "Fourth paragraph." },
    ];

    render(
      <StoryCanvas
        paragraphs={paragraphs}
        onInsertBreak={onInsertBreak}
        chapterEditMode
        breakTargetNodeIds={["node-2"]}
      />,
    );

    const markers = screen.getAllByRole("button", { name: /start new chapter after this paragraph/i });
    expect(markers).toHaveLength(1);

    fireEvent.click(markers[0]);
    expect(onInsertBreak).toHaveBeenCalledWith("node-2", 1);
  });
});
