import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  generateChapterSuggestionsMock,
  generateChapterTitleMock,
  summarizeStoryMock,
  createStoryNodeMock,
  updateNodeChapterTitleMock,
  splitNodeAtPositionMock,
  apiUpdateStoryMock,
  apiUpdateNodeMock,
  latestChoiceCardsProps,
  latestStoryCanvasProps,
  useIsMobileMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  calculateBeatMock: vi.fn(),
  getStoryMock: vi.fn(),
  getStoryNodesMock: vi.fn(),
  getAllStoryNodesMock: vi.fn(),
  streamSectionMock: vi.fn(),
  generateChoicesMock: vi.fn(),
  generateChapterSuggestionsMock: vi.fn(),
  generateChapterTitleMock: vi.fn(),
  summarizeStoryMock: vi.fn(),
  createStoryNodeMock: vi.fn(),
  updateNodeChapterTitleMock: vi.fn(),
  splitNodeAtPositionMock: vi.fn(),
  apiUpdateStoryMock: vi.fn(),
  apiUpdateNodeMock: vi.fn(),
  latestChoiceCardsProps: { current: null as any },
  latestStoryCanvasProps: { current: null as any },
  useIsMobileMock: vi.fn(),
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

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobileMock(),
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
  generateChapterSuggestions: generateChapterSuggestionsMock,
  generateChapterTitle: generateChapterTitleMock,
  updateStoryTitle: vi.fn(),
  updateStoryTone: vi.fn(),
  jumpToNode: vi.fn(),
  updateNodeChapterTitle: updateNodeChapterTitleMock,
  deleteNodeAndDescendants: vi.fn(),
  splitNodeAtPosition: splitNodeAtPositionMock,
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
  StoryCanvas: ({
    paragraphs,
    chapterEditMode,
    breakTargetNodeIds,
    ...props
  }: { paragraphs: Array<{ text: string }>; chapterEditMode?: boolean; breakTargetNodeIds?: string[] } & Record<string, unknown>) => {
    latestStoryCanvasProps.current = { ...props, chapterEditMode, breakTargetNodeIds };
    return (
      <div data-testid="story-canvas">
        {chapterEditMode ? <div data-testid="chapter-break-mode">Break mode visible</div> : null}
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph.text}</p>
        ))}
      </div>
    );
  },
}));

vi.mock("@/components/story/ChapterSidebar", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useState } = require("react") as typeof import("react");
  return {
    ChapterSidebar: ({
      embedded,
      reviewSlot,
      chapters,
      onRename,
      onGenerateTitle,
    }: {
      embedded?: boolean;
      reviewSlot?: React.ReactNode;
      chapters?: Array<{ id: string; title: string }>;
      onRename?: (id: string, title: string) => void;
      onGenerateTitle?: (id: string) => Promise<string>;
    }) => {
      const [menuOpen, setMenuOpen] = useState<{ id: string; title: string } | null>(null);
      const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
      const [renameValue, setRenameValue] = useState("");
      const [suggestion, setSuggestion] = useState<string | null>(null);
      const [isGenerating, setIsGenerating] = useState(false);
      return (
        <div data-testid={embedded ? "embedded-chapter-sidebar" : "chapter-sidebar"}>
          {reviewSlot}
          {chapters?.map((ch: { id: string; title: string }) => (
            <div key={ch.id}>
              <button
                type="button"
                aria-label="Chapter options"
                onClick={() => setMenuOpen(ch)}
              >
                {ch.title}
              </button>
            </div>
          ))}
          {menuOpen && (
            <div role="menu">
              <div
                role="menuitem"
                onClick={() => {
                  setRenameTarget(menuOpen);
                  setRenameValue(menuOpen.title);
                  setSuggestion(null);
                  setMenuOpen(null);
                }}
              >
                Rename
              </div>
            </div>
          )}
          {renameTarget && (
            <div>
              <input
                aria-label="Chapter title"
                value={renameValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameValue(e.target.value)}
              />
              {suggestion && (
                <div>
                  <p>{suggestion}</p>
                  <button type="button" onClick={() => setRenameValue(suggestion)}>
                    Use suggestion
                  </button>
                </div>
              )}
              <button
                type="button"
                disabled={isGenerating}
                onClick={async () => {
                  if (!onGenerateTitle) return;
                  setIsGenerating(true);
                  try {
                    const title = await onGenerateTitle(renameTarget.id);
                    setSuggestion(title);
                  } finally {
                    setIsGenerating(false);
                  }
                }}
              >
                {suggestion ? "Reroll" : "Generate title"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (renameTarget && onRename) onRename(renameTarget.id, renameValue.trim());
                  setRenameTarget(null);
                }}
              >
                Save title
              </button>
            </div>
          )}
        </div>
      );
    },
  };
});

vi.mock("@/components/story/StoryTimeline", () => ({
  StoryTimeline: ({ embedded }: { embedded?: boolean }) => (
    <div data-testid={embedded ? "embedded-story-timeline" : "story-timeline"} />
  ),
}));

vi.mock("@/components/story/TonePanel", () => ({
  TonePanel: () => null,
  TonePanelContent: () => null,
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
        {props.onAddChapterBreak ? (
          <button type="button" onClick={() => props.onAddChapterBreak?.()}>
            Add chapter break
          </button>
        ) : null}
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
    latestStoryCanvasProps.current = null;
    useIsMobileMock.mockReturnValue(false);
    sessionStorage.clear();

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
    updateNodeChapterTitleMock.mockResolvedValue(undefined);
    generateChapterTitleMock.mockResolvedValue("Untitled");
    splitNodeAtPositionMock.mockResolvedValue({ id: "node-2b" });
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
        arc_override: "post_ending",
        arc_state: expect.objectContaining({
          bufferTurnsUsed: 0,
          endedWith: "conclude",
        }),
      });
    });

    expect(generateChoicesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        arcMode: "post_ending",
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
        arc_override: "post_ending",
        arc_state: expect.objectContaining({
          bufferTurnsUsed: 0,
          endedWith: "conclude",
        }),
      });
    });

    expect(screen.getByTestId("story-complete")).toBeInTheDocument();
  });

  it("shows the mobile structure bar instead of the desktop sidebar", async () => {
    useIsMobileMock.mockReturnValue(true);
    generateChapterSuggestionsMock.mockResolvedValue([
      {
        type: "start_new_chapter_here",
        anchorNodeId: "node-4",
        anchorParagraphIndex: 1,
        proposedTitle: "The Viaduct",
        reason: "A clear location change begins here.",
      },
    ]);
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
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-3",
        text: "Third section.",
        summary: "Third",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-4",
        text: "Fourth section.\n\nThe radio crackled again.",
        summary: "Fourth",
        story_state: { stage: "falling" },
        choices: [],
        is_active: true,
      },
    ]);
    getAllStoryNodesMock.mockResolvedValueOnce([
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
      {
        id: "node-3",
        text: "Third section.",
        parent_id: "node-2",
        chosen_option: null,
        created_at: "2026-03-28T10:10:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
      {
        id: "node-4",
        text: "Fourth section.\n\nThe radio crackled again.",
        parent_id: "node-3",
        chosen_option: null,
        created_at: "2026-03-28T10:15:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByRole("button", { name: /structure/i })).toBeInTheDocument());
    expect(screen.queryByTestId("chapter-sidebar")).not.toBeInTheDocument();
    expect(latestStoryCanvasProps.current.chapterEditMode).toBe(false);
    expect(latestStoryCanvasProps.current.onRenameChapter).toBeUndefined();
  });

  it("resets the review checkpoint when the stored tip is not on the active path", async () => {
    useIsMobileMock.mockReturnValue(true);
    sessionStorage.setItem(
      "chapter-review:story-1",
      JSON.stringify({
        reviewedAtTurns: 10,
        dismissedAtTurns: 9,
        reviewedTipId: "node-old",
      }),
    );
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
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-3",
        text: "Third section.",
        summary: "Third",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        summary: "Fourth",
        story_state: { stage: "falling" },
        choices: [],
        is_active: true,
      },
    ]);
    getAllStoryNodesMock.mockResolvedValueOnce([
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
      {
        id: "node-3",
        text: "Third section.",
        parent_id: "node-2",
        chosen_option: null,
        created_at: "2026-03-28T10:10:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        parent_id: "node-3",
        chosen_option: null,
        created_at: "2026-03-28T10:15:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
    ]);

    renderStoryWrite();

    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem("chapter-review:story-1") ?? "{}")).toEqual({
        reviewedAtTurns: 4,
        dismissedAtTurns: null,
        reviewedTipId: "node-4",
      }),
    );
  });

  it("opens chapter review from the quiet prompt and requests suggestions once per current tip", async () => {
    useIsMobileMock.mockReturnValue(true);
    generateChapterSuggestionsMock.mockResolvedValue([
      {
        type: "start_new_chapter_here",
        anchorNodeId: "node-4",
        anchorParagraphIndex: 1,
        proposedTitle: "The Viaduct",
        reason: "A clear location change begins here.",
      },
    ]);
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
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-3",
        text: "Third section.",
        summary: "Third",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        summary: "Fourth",
        story_state: { stage: "falling" },
        choices: [],
        is_active: true,
      },
    ]);
    getAllStoryNodesMock.mockResolvedValueOnce([
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
      {
        id: "node-3",
        text: "Third section.",
        parent_id: "node-2",
        chosen_option: null,
        created_at: "2026-03-28T10:10:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        parent_id: "node-3",
        chosen_option: null,
        created_at: "2026-03-28T10:15:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByRole("button", { name: /see suggestions/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /see suggestions/i }));

    await waitFor(() => expect(generateChapterSuggestionsMock).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("embedded-chapter-sidebar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hide/i })).toBeInTheDocument();
    expect(screen.getByText(/the viaduct/i)).toBeInTheDocument();
  });

  it("shows a loading state while chapter review suggestions are generated", async () => {
    useIsMobileMock.mockReturnValue(true);
    let resolveSuggestions: ((value: any[]) => void) | undefined;
    generateChapterSuggestionsMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSuggestions = resolve;
      }),
    );
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
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-3",
        text: "Third section.",
        summary: "Third",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        summary: "Fourth",
        story_state: { stage: "falling" },
        choices: [],
        is_active: true,
      },
    ]);
    getAllStoryNodesMock.mockResolvedValueOnce([
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
      {
        id: "node-3",
        text: "Third section.",
        parent_id: "node-2",
        chosen_option: null,
        created_at: "2026-03-28T10:10:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        parent_id: "node-3",
        chosen_option: null,
        created_at: "2026-03-28T10:15:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByRole("button", { name: /see suggestions/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /see suggestions/i }));

    await waitFor(() => {
      const loadingButtons = screen.getAllByRole("button", { name: /loading\.\.\./i });
      expect(loadingButtons.length).toBeGreaterThan(0);
      loadingButtons.forEach((button) => expect(button).toBeDisabled());
    });

    resolveSuggestions?.([]);
    await waitFor(() => expect(generateChapterSuggestionsMock).toHaveBeenCalledTimes(1));
  });

  it("keeps chapter suggestions visible when applying them fails", async () => {
    useIsMobileMock.mockReturnValue(true);
    updateNodeChapterTitleMock.mockRejectedValueOnce(new Error("rename failed"));
    generateChapterSuggestionsMock.mockResolvedValue([
      {
        type: "rename_recent_chapter",
        anchorNodeId: "node-4",
        anchorParagraphIndex: null,
        proposedTitle: "The Bargain",
        reason: "The chapter now centers on the pact.",
      },
    ]);
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
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-3",
        text: "Third section.",
        summary: "Third",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        summary: "Fourth",
        story_state: { stage: "falling" },
        choices: [],
        is_active: true,
      },
    ]);
    getAllStoryNodesMock.mockResolvedValueOnce([
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
      {
        id: "node-3",
        text: "Third section.",
        parent_id: "node-2",
        chosen_option: null,
        created_at: "2026-03-28T10:10:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        parent_id: "node-3",
        chosen_option: null,
        created_at: "2026-03-28T10:15:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByRole("button", { name: /see suggestions/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /see suggestions/i }));
    await waitFor(() => expect(screen.getByText(/the bargain/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    await waitFor(() => expect(updateNodeChapterTitleMock).toHaveBeenCalledWith("node-4", "The Bargain"));
    expect(screen.getByText(/the bargain/i)).toBeInTheDocument();
  });

  it("labels rename and chapter-break suggestions differently", async () => {
    useIsMobileMock.mockReturnValue(true);
    generateChapterSuggestionsMock.mockResolvedValue([
      {
        type: "rename_recent_chapter",
        anchorNodeId: "node-3",
        anchorParagraphIndex: null,
        proposedTitle: "The Bargain",
        reason: "The chapter now centers on the pact.",
      },
      {
        type: "start_new_chapter_here",
        anchorNodeId: "node-4",
        anchorParagraphIndex: 1,
        proposedTitle: "The Viaduct",
        reason: "A clear location change begins here.",
      },
    ]);
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
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-3",
        text: "Third section.",
        summary: "Third",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-4",
        text: "Fourth section.\n\nThe radio crackled again.",
        summary: "Fourth",
        story_state: { stage: "falling" },
        choices: [],
        is_active: true,
      },
    ]);
    getAllStoryNodesMock.mockResolvedValueOnce([
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
      {
        id: "node-3",
        text: "Third section.",
        parent_id: "node-2",
        chosen_option: null,
        created_at: "2026-03-28T10:10:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
      {
        id: "node-4",
        text: "Fourth section.\n\nThe radio crackled again.",
        parent_id: "node-3",
        chosen_option: null,
        created_at: "2026-03-28T10:15:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByRole("button", { name: /see suggestions/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /see suggestions/i }));

    await waitFor(() => expect(screen.getByText(/rename chapter/i)).toBeInTheDocument());
    expect(screen.getByText(/start new chapter/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply title/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /insert chapter/i })).toBeInTheDocument();
  });

  it("keeps the mobile chapter suggestion list scrollable", async () => {
    useIsMobileMock.mockReturnValue(true);
    generateChapterSuggestionsMock.mockResolvedValue([
      {
        type: "rename_recent_chapter",
        anchorNodeId: "node-3",
        anchorParagraphIndex: null,
        proposedTitle: "The Bargain",
        reason: "The chapter now centers on the pact.",
      },
      {
        type: "rename_recent_chapter",
        anchorNodeId: "node-4",
        anchorParagraphIndex: null,
        proposedTitle: "The Crossing",
        reason: "The chapter shifts into a travel beat.",
      },
    ]);
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
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-3",
        text: "Third section.",
        summary: "Third",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        summary: "Fourth",
        story_state: { stage: "falling" },
        choices: [],
        is_active: true,
      },
    ]);
    getAllStoryNodesMock.mockResolvedValueOnce([
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
      {
        id: "node-3",
        text: "Third section.",
        parent_id: "node-2",
        chosen_option: null,
        created_at: "2026-03-28T10:10:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        parent_id: "node-3",
        chosen_option: null,
        created_at: "2026-03-28T10:15:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByRole("button", { name: /see suggestions/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /see suggestions/i }));

    const suggestionList = await screen.findByTestId("chapter-suggestion-list");
    expect(suggestionList).toHaveClass("max-h-[26vh]");
    expect(suggestionList).toHaveClass("overflow-y-auto");
  });

  it("keeps the desktop chapter suggestion list scrollable without hiding the chapter sidebar", async () => {
    useIsMobileMock.mockReturnValue(false);
    generateChapterSuggestionsMock.mockResolvedValue([
      {
        type: "rename_recent_chapter",
        anchorNodeId: "node-3",
        anchorParagraphIndex: null,
        proposedTitle: "The Bargain",
        reason: "The chapter now centers on the pact.",
      },
      {
        type: "start_new_chapter_here",
        anchorNodeId: "node-4",
        anchorParagraphIndex: 1,
        proposedTitle: "The Viaduct",
        reason: "A clear location change begins here.",
      },
    ]);
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
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-3",
        text: "Third section.",
        summary: "Third",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        summary: "Fourth",
        story_state: { stage: "falling" },
        choices: [],
        is_active: true,
      },
    ]);
    getAllStoryNodesMock.mockResolvedValueOnce([
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
      {
        id: "node-3",
        text: "Third section.",
        parent_id: "node-2",
        chosen_option: null,
        created_at: "2026-03-28T10:10:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        parent_id: "node-3",
        chosen_option: null,
        created_at: "2026-03-28T10:15:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByRole("button", { name: /see suggestions/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /see suggestions/i }));

    const suggestionList = await screen.findByTestId("chapter-suggestion-list");
    expect(suggestionList).toHaveClass("max-h-[32vh]");
    expect(suggestionList).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("chapter-sidebar")).toBeInTheDocument();
  });

  it("shows a pending state while applying a chapter split suggestion", async () => {
    useIsMobileMock.mockReturnValue(true);
    let resolveSplit: ((value: { id: string }) => void) | undefined;
    splitNodeAtPositionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSplit = resolve;
      }),
    );
    generateChapterSuggestionsMock.mockResolvedValue([
      {
        type: "start_new_chapter_here",
        anchorNodeId: "node-4",
        anchorParagraphIndex: 1,
        proposedTitle: "The Viaduct",
        reason: "A clear location change begins here.",
      },
    ]);
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
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-3",
        text: "Third section.",
        summary: "Third",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        summary: "Fourth",
        story_state: { stage: "falling" },
        choices: [],
        is_active: true,
      },
    ]);
    getAllStoryNodesMock.mockResolvedValueOnce([
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
      {
        id: "node-3",
        text: "Third section.",
        parent_id: "node-2",
        chosen_option: null,
        created_at: "2026-03-28T10:10:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
      {
        id: "node-4",
        text: "Fourth section.",
        parent_id: "node-3",
        chosen_option: null,
        created_at: "2026-03-28T10:15:00.000Z",
        is_active: true,
        starts_chapter: false,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByRole("button", { name: /see suggestions/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /see suggestions/i }));
    await waitFor(() => expect(screen.getByText(/the viaduct/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /insert chapter/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /applying/i })).toBeDisabled(),
    );

    resolveSplit?.({ id: "node-4b" });
  });

  it("re-runs chapter review after applying a split suggestion", async () => {
    useIsMobileMock.mockReturnValue(true);
    splitNodeAtPositionMock.mockResolvedValue({ id: "node-4b" });
    generateChapterSuggestionsMock
      .mockResolvedValueOnce([
        {
          type: "start_new_chapter_here",
          anchorNodeId: "node-4",
          anchorParagraphIndex: 1,
          proposedTitle: "The Viaduct",
          reason: "A clear location change begins here.",
        },
        {
          type: "rename_recent_chapter",
          anchorNodeId: "node-3",
          anchorParagraphIndex: null,
          proposedTitle: "The Bargain",
          reason: "The chapter now centers on the pact.",
        },
      ])
      .mockResolvedValueOnce([
        {
          type: "rename_recent_chapter",
          anchorNodeId: "node-4b",
          anchorParagraphIndex: null,
          proposedTitle: "The Crossing",
          reason: "The new chapter now has a clearer focus.",
        },
      ]);
    getStoryNodesMock
      .mockResolvedValueOnce([
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
        {
          id: "node-3",
          text: "Third section.",
          summary: "Third",
          story_state: { stage: "middle" },
          choices: [],
          is_active: true,
        },
        {
          id: "node-4",
          text: "Fourth section.\n\nThe radio crackled again.",
          summary: "Fourth",
          story_state: { stage: "falling" },
          choices: [],
          is_active: true,
        },
      ])
      .mockResolvedValueOnce([
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
        {
          id: "node-3",
          text: "Third section.",
          summary: "Third",
          story_state: { stage: "middle" },
          choices: [],
          is_active: true,
        },
        {
          id: "node-4",
          text: "Fourth section.",
          summary: "Fourth",
          story_state: { stage: "falling" },
          choices: [],
          is_active: true,
        },
        {
          id: "node-4b",
          text: "The radio crackled again.",
          summary: "Crossing",
          story_state: { stage: "falling" },
          choices: [],
          is_active: true,
        },
      ])
      .mockResolvedValueOnce([
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
        {
          id: "node-3",
          text: "Third section.",
          summary: "Third",
          story_state: { stage: "middle" },
          choices: [],
          is_active: true,
        },
        {
          id: "node-4",
          text: "Fourth section.",
          summary: "Fourth",
          story_state: { stage: "falling" },
          choices: [],
          is_active: true,
        },
        {
          id: "node-4b",
          text: "The radio crackled again.",
          summary: "Crossing",
          story_state: { stage: "falling" },
          choices: [],
          is_active: true,
        },
      ]);
    getAllStoryNodesMock
      .mockResolvedValueOnce([
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
        {
          id: "node-3",
          text: "Third section.",
          parent_id: "node-2",
          chosen_option: null,
          created_at: "2026-03-28T10:10:00.000Z",
          is_active: true,
          starts_chapter: false,
        },
        {
          id: "node-4",
          text: "Fourth section.\n\nThe radio crackled again.",
          parent_id: "node-3",
          chosen_option: null,
          created_at: "2026-03-28T10:15:00.000Z",
          is_active: true,
          starts_chapter: false,
        },
      ])
      .mockResolvedValueOnce([
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
        {
          id: "node-3",
          text: "Third section.",
          parent_id: "node-2",
          chosen_option: null,
          created_at: "2026-03-28T10:10:00.000Z",
          is_active: true,
          starts_chapter: false,
        },
        {
          id: "node-4",
          text: "Fourth section.",
          parent_id: "node-3",
          chosen_option: null,
          created_at: "2026-03-28T10:15:00.000Z",
          is_active: true,
          starts_chapter: false,
        },
        {
          id: "node-4b",
          text: "The radio crackled again.",
          parent_id: "node-4",
          chosen_option: null,
          created_at: "2026-03-28T10:20:00.000Z",
          is_active: true,
          starts_chapter: true,
        },
      ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByRole("button", { name: /see suggestions/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /see suggestions/i }));
    await waitFor(() => expect(screen.getByText(/the viaduct/i)).toBeInTheDocument());
    expect(screen.getByText(/the bargain/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /insert chapter/i }));

    await waitFor(() => expect(splitNodeAtPositionMock).toHaveBeenCalledWith("story-1", "node-4", 1));
    await waitFor(() => expect(generateChapterSuggestionsMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/the viaduct/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/the bargain/i)).not.toBeInTheDocument();
    expect(screen.getByText(/the crossing/i)).toBeInTheDocument();
  });

  it("keeps the desktop sidebar path available when not on mobile", async () => {
    useIsMobileMock.mockReturnValue(false);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByTestId("chapter-sidebar")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /structure/i })).not.toBeInTheDocument();
    expect(latestStoryCanvasProps.current.chapterEditMode).toBeUndefined();
    expect(latestStoryCanvasProps.current.onRenameChapter).toEqual(expect.any(Function));
  });

  it("enters and exits chapter break mode from the main writing flow", async () => {
    useIsMobileMock.mockReturnValue(false);

    // Need multi-paragraph nodes so break points exist
    getStoryNodesMock.mockResolvedValue([
      {
        id: "node-1",
        text: "Opening paragraph.\n\nSecond paragraph.",
        summary: "Opening",
        story_state: { stage: "setup" },
        choices: [],
        is_active: true,
      },
    ]);
    getAllStoryNodesMock.mockResolvedValue([
      {
        id: "node-1",
        text: "Opening paragraph.\n\nSecond paragraph.",
        parent_id: null,
        chosen_option: null,
        created_at: "2026-03-28T10:00:00.000Z",
        is_active: true,
        starts_chapter: true,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByTestId("choice-cards")).toBeInTheDocument());
    fireEvent.click(within(screen.getByTestId("choice-cards")).getByRole("button", { name: /chapter break/i }));

    await waitFor(() => {
      expect(screen.getByText(/choose where the new chapter should begin/i)).toBeInTheDocument();
      expect(screen.getByTestId("chapter-break-mode")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText(/choose where the new chapter should begin/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId("chapter-break-mode")).not.toBeInTheDocument();
      expect(latestStoryCanvasProps.current.chapterEditMode).toBeUndefined();
    });
  });

  it("starts chapter break mode on the current chapter and can reveal earlier chapters", async () => {
    // Scoping is mobile-only — desktop shows all markers
    useIsMobileMock.mockReturnValue(true);

    // Set up a story with two chapters so there's a scoping boundary
    getAllStoryNodesMock.mockResolvedValue([
      {
        id: "node-1",
        text: "Opening paragraph.\n\nSecond paragraph.",
        parent_id: null,
        chosen_option: null,
        created_at: "2026-03-28T10:00:00.000Z",
        is_active: true,
        starts_chapter: true,
      },
      {
        id: "node-2",
        text: "Third paragraph.\n\nFourth paragraph.",
        parent_id: "node-1",
        chosen_option: null,
        created_at: "2026-03-28T10:05:00.000Z",
        is_active: true,
        starts_chapter: true,
      },
    ]);

    getStoryNodesMock.mockResolvedValue([
      {
        id: "node-1",
        text: "Opening paragraph.\n\nSecond paragraph.",
        summary: "Opening",
        story_state: { stage: "setup" },
        choices: [],
        is_active: true,
        starts_chapter: true,
      },
      {
        id: "node-2",
        text: "Third paragraph.\n\nFourth paragraph.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
        starts_chapter: true,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByTestId("choice-cards")).toBeInTheDocument());
    fireEvent.click(within(screen.getByTestId("choice-cards")).getByRole("button", { name: /chapter break/i }));

    // Break mode should scope to the current (last) chapter
    await waitFor(() => {
      expect(latestStoryCanvasProps.current.chapterEditMode).toBe(true);
      expect(latestStoryCanvasProps.current.breakTargetNodeIds).toEqual(["node-2"]);
    });

    // Reveal earlier chapters
    fireEvent.click(screen.getByRole("button", { name: /show earlier chapters/i }));

    await waitFor(() => {
      expect(latestStoryCanvasProps.current.breakTargetNodeIds).toEqual(["node-1", "node-2"]);
    });
  });

  it("enters post-ending mode when continue anyway succeeds", async () => {
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
        chosen_option: { type: "conclude", label: "End it", preview: "Conclude." },
      },
    ]);

    renderStoryWrite();

    await waitFor(() => {
      expect(screen.getByTestId("story-complete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /continue anyway/i }));

    await waitFor(() => {
      expect(apiUpdateStoryMock).toHaveBeenCalledWith("story-1", {
        status: "in_progress",
        arc_override: "post_ending",
        arc_state: expect.objectContaining({
          bufferTurnsUsed: 0,
          endedWith: "conclude",
        }),
      });
    });

    expect(generateChoicesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        arcMode: "post_ending",
        moveFamilies: expect.any(Array),
        previousEnding: "conclude",
      }),
    );
  });

  it("generates and applies a suggested chapter title without overwriting manual input", async () => {
    renderStoryWrite();

    await waitFor(() => expect(screen.getByTestId("chapter-sidebar")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /chapter options/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /rename/i }));

    const input = await screen.findByRole("textbox", { name: /chapter title/i });
    fireEvent.change(input, { target: { value: "My own draft" } });
    generateChapterTitleMock.mockResolvedValue("The Ash Bell");

    fireEvent.click(screen.getByRole("button", { name: /generate title/i }));

    await waitFor(() => expect(screen.getByText("The Ash Bell")).toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: /chapter title/i })).toHaveValue("My own draft");

    fireEvent.click(screen.getByRole("button", { name: /use suggestion/i }));
    expect(screen.getByRole("textbox", { name: /chapter title/i })).toHaveValue("The Ash Bell");
  });

  it("keeps chapter break visible in the choice area even when no AI suggestions are ready", async () => {
    generateChapterSuggestionsMock.mockResolvedValue([]);
    renderStoryWrite();

    await waitFor(() => expect(screen.getByTestId("choice-cards")).toBeInTheDocument());
    expect(within(screen.getByTestId("choice-cards")).getByRole("button", { name: /chapter break/i })).toBeInTheDocument();
  });

  it("passes post-ending move families into choice generation", async () => {
    getStoryMock.mockResolvedValueOnce({
      id: "story-1",
      title: "Arc Story",
      premise: "A strange light appears offshore.",
      tone: "Atmospheric",
      genre: "Mystery",
      target_turns: 10,
      arc_override: "post_ending",
      arc_state: {
        segmentStartTurn: 5,
        bufferTurnsUsed: 0,
        endedWith: "conclude",
        resumeStrength: null,
        extensionTargetTurns: null,
      },
      status: "in_progress",
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
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "middle" },
        choices: [],
        is_active: true,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => {
      expect(generateChoicesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          arcMode: "post_ending",
          moveFamilies: expect.any(Array),
          previousEnding: "conclude",
        }),
      );
    });
  });
});
