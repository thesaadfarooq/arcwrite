import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChoiceCards, type StoryChoice } from "@/components/story/ChoiceCards";
import type { SectionLength } from "@/lib/story-api";

const navigateMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

describe("ChoiceCards", () => {
  const baseProps = {
    onSelect: vi.fn(),
    onRegenerate: vi.fn(),
    sectionLength: "medium" as SectionLength,
    onSectionLengthChange: vi.fn(),
  };

  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("renders the expanded choice types with their config labels", () => {
    const choices: StoryChoice[] = [
      { type: "explore", label: "Explore the ruins", preview: "Search the ruins for clues." },
      { type: "connect", label: "Bond with the ally", preview: "Build trust over a quiet meal." },
      { type: "foreshadow", label: "Notice the omen", preview: "A warning hangs in the air." },
      { type: "complicate", label: "Complicate the plan", preview: "A new problem emerges." },
    ];

    render(<ChoiceCards {...baseProps} choices={choices} />);

    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getByText("Bond")).toBeInTheDocument();
    expect(screen.getByText("Omen")).toBeInTheDocument();
    expect(screen.getByText("Complication")).toBeInTheDocument();
  });

  it("shows a begin conclusion button near the end of the story", () => {
    render(
      <ChoiceCards
        {...baseProps}
        choices={[
          { type: "safe", label: "Hold position", preview: "Keep things steady." },
          { type: "risky", label: "Push ahead", preview: "Take the dangerous route." },
        ]}
        isNearEnd
        onBeginConclusion={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /begin conclusion/i })).toBeInTheDocument();
  });

  it("switches to the story complete view when the story is complete", () => {
    render(
      <ChoiceCards
        {...baseProps}
        choices={[
          { type: "safe", label: "Hold position", preview: "Keep things steady." },
          { type: "risky", label: "Push ahead", preview: "Take the dangerous route." },
        ]}
        isStoryComplete
      />,
    );

    expect(screen.getByText(/story complete/i)).toBeInTheDocument();
    expect(screen.queryByText("Hold position")).not.toBeInTheDocument();
  });

  it("shows a subtle mode label during post-ending continuation", () => {
    render(
      <ChoiceCards
        {...baseProps}
        choices={[
          { type: "aftermath", label: "Count the cost", preview: "The ending's cost lands." } as any,
        ]}
        modeLabel="After the ending"
      />,
    );

    expect(screen.getByText(/after the ending/i)).toBeInTheDocument();
  });

  it("does not render a mode label when modeLabel is not set", () => {
    render(
      <ChoiceCards
        {...baseProps}
        choices={[
          { type: "safe", label: "Hold position", preview: "Keep things steady." },
        ]}
      />,
    );

    expect(screen.queryByText(/after the ending/i)).not.toBeInTheDocument();
  });

  it("keeps the existing custom direction flow intact", () => {
    render(
      <ChoiceCards
        {...baseProps}
        choices={[
          { type: "safe", label: "Hold position", preview: "Keep things steady." },
          { type: "risky", label: "Push ahead", preview: "Take the dangerous route." },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /write your own direction/i }));
    expect(screen.getByRole("button", { name: /go/i })).toBeDisabled();
  });

  it("renders an add chapter break action and calls it when clicked", () => {
    const onAddChapterBreak = vi.fn();

    render(
      <ChoiceCards
        {...baseProps}
        choices={[
          { type: "safe", label: "Hold position", preview: "Keep things steady." },
        ]}
        onAddChapterBreak={onAddChapterBreak}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add chapter break/i }));

    expect(onAddChapterBreak).toHaveBeenCalledTimes(1);
  });

  it("stacks the action row on small screens so chapter break stays readable", () => {
    const onAddChapterBreak = vi.fn();

    render(
      <ChoiceCards
        {...baseProps}
        choices={[
          { type: "safe", label: "Hold position", preview: "Keep things steady." },
        ]}
        onAddChapterBreak={onAddChapterBreak}
      />,
    );

    expect(screen.getByText(/what happens next\?/i).parentElement).toHaveClass(
      "flex",
      "flex-col",
      "gap-3",
      "sm:flex-row",
      "sm:items-center",
      "sm:justify-between",
    );
    expect(screen.getByRole("button", { name: /add chapter break/i })).toHaveClass("max-sm:w-full");
  });
});
