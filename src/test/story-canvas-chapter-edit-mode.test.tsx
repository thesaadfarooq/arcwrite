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

    expect(screen.queryByRole("button", { name: /chapter break/i })).not.toBeInTheDocument();

    rerender(
      <StoryCanvas
        paragraphs={paragraphs}
        onInsertBreak={onInsertBreak}
        chapterEditMode
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /chapter break/i })[0]);
    expect(onInsertBreak).toHaveBeenCalledWith("node-1", 1);
  });
});
