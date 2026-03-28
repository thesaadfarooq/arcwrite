import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StoryWrite from "@/pages/StoryWrite";

const {
  navigateMock,
  calculateBeatMock,
  getStoryMock,
  getStoryNodesMock,
  getAllStoryNodesMock,
  streamSectionMock,
  generateChoicesMock,
  summarizeStoryMock,
  createStoryNodeMock,
  apiUpdateStoryMock,
  apiUpdateNodeMock,
  latestChoiceCardsProps,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  calculateBeatMock: vi.fn(),
  getStoryMock: vi.fn(),
  getStoryNodesMock: vi.fn(),
  getAllStoryNodesMock: vi.fn(),
  streamSectionMock: vi.fn(),
  generateChoicesMock: vi.fn(),
  summarizeStoryMock: vi.fn(),
  createStoryNodeMock: vi.fn(),
  apiUpdateStoryMock: vi.fn(),
  apiUpdateNodeMock: vi.fn(),
  latestChoiceCardsProps: { current: null as any },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ tier: "pro" }),
}));

vi.mock("@/lib/subscription", () => ({
  getTierLimits: () => ({ turns: Infinity, export: true, sharing: true }),
}));

vi.mock("@/lib/story-arc", () => ({
  calculateBeat: calculateBeatMock,
}));

vi.mock("@/lib/story-api", () => ({
  streamSection: streamSectionMock,
  generateChoices: generateChoicesMock,
  summarizeStory: summarizeStoryMock,
  getStory: getStoryMock,
  getStoryNodes: getStoryNodesMock,
  getAllStoryNodes: getAllStoryNodesMock,
  createStoryNode: createStoryNodeMock,
  updateStoryTitle: vi.fn(),
  updateStoryTone: vi.fn(),
  jumpToNode: vi.fn(),
  updateNodeChapterTitle: vi.fn(),
  deleteNodeAndDescendants: vi.fn(),
  splitNodeAtPosition: vi.fn(),
  mergeNodeWithParent: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    updateStory: apiUpdateStoryMock,
    updateNode: apiUpdateNodeMock,
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/components/story/StoryCanvas", () => ({
  StoryCanvas: ({ paragraphs }: { paragraphs: Array<{ text: string }> }) => (
    <div data-testid="story-canvas">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph.text}</p>
      ))}
    </div>
  ),
}));

vi.mock("@/components/story/ChapterSidebar", () => ({
  ChapterSidebar: () => <div data-testid="chapter-sidebar" />,
}));

vi.mock("@/components/story/StoryTimeline", () => ({
  StoryTimeline: () => <div data-testid="story-timeline" />,
}));

vi.mock("@/components/story/TonePanel", () => ({
  TonePanel: () => null,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/story/ChoiceCards", () => ({
  ChoiceCards: (props: any) => {
    latestChoiceCardsProps.current = props;
    return (
      <div data-testid="choice-cards">
        <div data-testid="choice-near-end">{String(Boolean(props.isNearEnd))}</div>
        <button type="button" onClick={() => props.onBeginConclusion?.()}>
          begin conclusion
        </button>
        {props.choices.map((choice: any) => (
          <button
            key={choice.label}
            type="button"
            onClick={() => props.onSelect(choice)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock("@/components/story/StoryComplete", () => ({
  StoryComplete: ({ onContinue }: { onContinue?: () => void }) => (
    <div data-testid="story-complete">
      <button type="button" onClick={() => onContinue?.()}>
        continue anyway
      </button>
    </div>
  ),
}));

function renderStoryWrite() {
  return render(
    <MemoryRouter initialEntries={["/story/story-1"]}>
      <Routes>
        <Route path="/story/:id" element={<StoryWrite />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StoryWrite narrative arc integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestChoiceCardsProps.current = null;

    calculateBeatMock.mockReturnValue({
      phase: "falling",
      progress: 0.8,
      phaseProgress: 0.5,
      turnsRemaining: 2,
      isNearEnd: true,
    });

    getStoryMock.mockResolvedValue({
      id: "story-1",
      title: "Arc Story",
      premise: "A strange light appears offshore.",
      tone: "Atmospheric",
      genre: "Mystery",
      target_turns: 10,
      arc_override: null,
      status: "in_progress",
    });

    getStoryNodesMock.mockResolvedValue([
      {
        id: "node-1",
        text: "Opening paragraph.",
        summary: "Opening",
        story_state: { stage: "setup" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-2",
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
    ]);

    getAllStoryNodesMock.mockResolvedValue([
      {
        id: "node-1",
        text: "Opening paragraph.",
        parent_id: null,
        chosen_option: null,
        created_at: "2026-03-28T10:00:00.000Z",
        is_active: true,
        starts_chapter: true,
      },
      {
        id: "node-2",
        text: "Second section.",
        parent_id: "node-1",
        chosen_option: null,
        created_at: "2026-03-28T10:05:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
    ]);

    generateChoicesMock.mockResolvedValue([
      { type: "resolve", label: "Resolve it", preview: "Try to tie things up." },
      { type: "conclude", label: "Conclude now", preview: "End the story here." },
    ]);

    summarizeStoryMock.mockResolvedValue({
      summary: "Updated summary",
      story_state: { stage: "ending" },
    });

    createStoryNodeMock.mockResolvedValue({ id: "node-3" });
    apiUpdateStoryMock.mockResolvedValue({});
    apiUpdateNodeMock.mockResolvedValue({});

    streamSectionMock.mockImplementation(async ({ onDone }: { onDone: (text: string) => Promise<void> | void }) => {
      await onDone("Final paragraph.");
    });
  });

  it("loads target turns and arc override state, then passes beat into choice generation", async () => {
    getStoryMock.mockResolvedValueOnce({
      id: "story-1",
      title: "Arc Story",
      premise: "A strange light appears offshore.",
      tone: "Atmospheric",
      genre: "Mystery",
      target_turns: 10,
      arc_override: "concluding",
      status: "in_progress",
    });

    renderStoryWrite();

    await waitFor(() => {
      expect(generateChoicesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          beat: expect.objectContaining({
            phase: "falling",
            progress: 0.8,
            isNearEnd: true,
          }),
        }),
      );
    });

    expect(calculateBeatMock).toHaveBeenCalledWith(8, 10);
    expect(screen.getByTestId("choice-near-end")).toHaveTextContent("true");
  });

  it("begins the conclusion flow by persisting the override and regenerating choices with beat info", async () => {
    getStoryNodesMock.mockResolvedValueOnce([
      {
        id: "node-1",
        text: "Opening paragraph.",
        summary: "Opening",
        story_state: { stage: "setup" },
        choices: [
          { type: "safe", label: "Hold", preview: "Keep steady." },
          { type: "risky", label: "Push", preview: "Take the risk." },
        ],
        is_active: true,
      },
      {
        id: "node-2",
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [
          { type: "safe", label: "Hold", preview: "Keep steady." },
          { type: "risky", label: "Push", preview: "Take the risk." },
        ],
        is_active: true,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => {
      expect(screen.getByTestId("choice-cards")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /begin conclusion/i }));

    await waitFor(() => {
      expect(apiUpdateStoryMock).toHaveBeenCalledWith("story-1", { arc_override: "concluding" });
    });

    expect(generateChoicesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        beat: expect.objectContaining({
          phase: "falling",
          progress: 0.8,
          isNearEnd: true,
        }),
      }),
    );
  });

  it("treats conclude choices as final sections and supports continue anyway", async () => {
    getStoryMock.mockResolvedValueOnce({
      id: "story-1",
      title: "Arc Story",
      premise: "A strange light appears offshore.",
      tone: "Atmospheric",
      genre: "Mystery",
      target_turns: 4,
      arc_override: null,
      status: "in_progress",
    });

    getStoryNodesMock.mockResolvedValueOnce([
      {
        id: "node-1",
        text: "Opening paragraph.",
        summary: "Opening",
        story_state: { stage: "setup" },
        choices: [
          { type: "safe", label: "Hold", preview: "Keep steady." },
          { type: "conclude", label: "Conclude now", preview: "End the story here." },
        ],
        is_active: true,
      },
      {
        id: "node-2",
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [
          { type: "safe", label: "Hold", preview: "Keep steady." },
          { type: "conclude", label: "Conclude now", preview: "End the story here." },
        ],
        is_active: true,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Conclude now" })).toBeInTheDocument();
    });

    const initialChoiceCalls = generateChoicesMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Conclude now" }));

    await waitFor(() => {
      expect(screen.getByTestId("story-complete")).toBeInTheDocument();
    });

    expect(streamSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        beat: expect.objectContaining({
          phase: "falling",
          progress: 0.8,
          isNearEnd: true,
          isFinalSection: true,
        }),
      }),
    );
    expect(apiUpdateStoryMock).toHaveBeenCalledWith("story-1", { status: "completed" });
    expect(generateChoicesMock).toHaveBeenCalledTimes(initialChoiceCalls);

    fireEvent.click(screen.getByRole("button", { name: /continue anyway/i }));

    await waitFor(() => {
      expect(apiUpdateStoryMock).toHaveBeenCalledWith("story-1", {
        status: "in_progress",
        arc_override: null,
      });
    });

    expect(generateChoicesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        beat: expect.objectContaining({
          phase: "falling",
          progress: 0.8,
        }),
      }),
    );
  });

  it("keeps the story complete view when continue-anyway persistence fails", async () => {
    getStoryMock.mockResolvedValueOnce({
      id: "story-1",
      title: "Arc Story",
      premise: "A strange light appears offshore.",
      tone: "Atmospheric",
      genre: "Mystery",
      target_turns: 4,
      arc_override: null,
      status: "completed",
    });

    getStoryNodesMock.mockResolvedValueOnce([
      {
        id: "node-1",
        text: "Opening paragraph.",
        summary: "Opening",
        story_state: { stage: "setup" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-2",
        text: "Final paragraph.",
        summary: "Ending",
        story_state: { stage: "ending" },
        choices: [],
        is_active: true,
      },
    ]);

    apiUpdateStoryMock.mockRejectedValueOnce(new Error("write failed"));

    renderStoryWrite();

    await waitFor(() => {
      expect(screen.getByTestId("story-complete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /continue anyway/i }));

    await waitFor(() => {
      expect(apiUpdateStoryMock).toHaveBeenCalledWith("story-1", {
        status: "in_progress",
        arc_override: null,
      });
    });

    expect(screen.getByTestId("story-complete")).toBeInTheDocument();
  });
});
