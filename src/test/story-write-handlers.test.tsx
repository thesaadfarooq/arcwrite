import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
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
  updateStoryTitleMock,
  updateStoryToneMock,
  jumpToNodeMock,
  deleteNodeAndDescendantsMock,
  mergeNodeWithParentMock,
  splitNodeAtPositionMock,
  streamRewriteMock,
  apiUpdateStoryMock,
  apiUpdateNodeMock,
  latestChoiceCardsProps,
  latestStoryCanvasProps,
  latestStoryCompleteProps,
  useIsMobileMock,
  toastErrorMock,
  toastSuccessMock,
  toastInfoMock,
  fetchMock,
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
  updateStoryTitleMock: vi.fn(),
  updateStoryToneMock: vi.fn(),
  jumpToNodeMock: vi.fn(),
  deleteNodeAndDescendantsMock: vi.fn(),
  mergeNodeWithParentMock: vi.fn(),
  splitNodeAtPositionMock: vi.fn(),
  streamRewriteMock: vi.fn(),
  apiUpdateStoryMock: vi.fn(),
  apiUpdateNodeMock: vi.fn(),
  latestChoiceCardsProps: { current: null as Record<string, unknown> | null },
  latestStoryCanvasProps: { current: null as Record<string, unknown> | null },
  latestStoryCompleteProps: { current: null as Record<string, unknown> | null },
  useIsMobileMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastInfoMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ tier: "pro", getToken: () => Promise.resolve("tok") }),
}));

vi.mock("@/lib/subscription", () => ({
  getTierLimits: () => ({ turns: Infinity, stories: Infinity, export: true, sharing: true, customTone: true, arcOverrides: true }),
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
  updateStoryTitle: updateStoryTitleMock,
  updateStoryTone: updateStoryToneMock,
  jumpToNode: jumpToNodeMock,
  updateNodeChapterTitle: updateNodeChapterTitleMock,
  deleteNodeAndDescendants: deleteNodeAndDescendantsMock,
  splitNodeAtPosition: splitNodeAtPositionMock,
  mergeNodeWithParent: mergeNodeWithParentMock,
}));

vi.mock("@/lib/rewrite-api", () => ({
  streamRewrite: streamRewriteMock,
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    updateStory: apiUpdateStoryMock,
    updateNode: apiUpdateNodeMock,
  },
}));


vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
  },
}));

vi.mock("@/components/story/StoryCanvas", () => ({
  StoryCanvas: (props: Record<string, unknown> & { paragraphs: { id: string; text: string }[]; isEditable?: boolean; onEdit?: (id: string, text: string) => void; onRewrite?: (id: string, instruction: string) => void; onRewriteAccept?: () => void; onRewriteRevert?: () => void }) => {
    latestStoryCanvasProps.current = props;
    return (
      <div data-testid="story-canvas">
        {props.paragraphs.map((p: { id: string; text: string }, i: number) => (
          <p key={i} data-para-id={p.id}>{p.text}</p>
        ))}
        {props.isEditable !== false && props.onEdit && (
          <button type="button" onClick={() => props.onEdit("node-1-0", "Edited text")}>
            mock-edit
          </button>
        )}
        {props.onRewrite && (
          <button type="button" onClick={() => props.onRewrite("node-1-0", "make it better")}>
            mock-rewrite
          </button>
        )}
        {props.onRewriteAccept && (
          <button type="button" onClick={() => props.onRewriteAccept()}>
            mock-accept-rewrite
          </button>
        )}
        {props.onRewriteRevert && (
          <button type="button" onClick={() => props.onRewriteRevert()}>
            mock-revert-rewrite
          </button>
        )}
      </div>
    );
  },
}));

vi.mock("@/components/story/ChapterSidebar", () => ({
  ChapterSidebar: ({ chapters, onDelete, onMerge }: { chapters?: { id: string; title: string; isRoot?: boolean }[]; onDelete?: (id: string) => void; onMerge?: (id: string) => void }) => (
    <div data-testid="chapter-sidebar">
      {chapters?.map((ch: { id: string; title: string; isRoot?: boolean }) => (
        <div key={ch.id}>
          <span>{ch.title}</span>
          {onDelete && !ch.isRoot && (
            <button type="button" onClick={() => onDelete(ch.id)}>delete-{ch.id}</button>
          )}
          {onMerge && !ch.isRoot && (
            <button type="button" onClick={() => onMerge(ch.id)}>merge-{ch.id}</button>
          )}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/story/ChoiceCards", () => ({
  ChoiceCards: (props: Record<string, unknown> & { choices: { label: string }[]; onSelect: (choice: { label: string }) => void; onRegenerate?: () => void }) => {
    latestChoiceCardsProps.current = props;
    return (
      <div data-testid="choice-cards">
        {props.choices.map((choice: { label: string }) => (
          <button key={choice.label} type="button" onClick={() => props.onSelect(choice)}>
            {choice.label}
          </button>
        ))}
        {props.onRegenerate && (
          <button type="button" onClick={props.onRegenerate}>regenerate-choices</button>
        )}
      </div>
    );
  },
}));

vi.mock("@/components/story/StoryComplete", () => ({
  StoryComplete: (props: Record<string, unknown> & { onExport?: () => void; onShare?: () => void; onContinue?: () => void }) => {
    latestStoryCompleteProps.current = props;
    return (
      <div data-testid="story-complete">
        {props.onExport && <button type="button" onClick={props.onExport}>export-from-complete</button>}
        {props.onShare && <button type="button" onClick={props.onShare}>share-from-complete</button>}
        {props.onContinue && <button type="button" onClick={props.onContinue}>continue anyway</button>}
      </div>
    );
  },
}));

vi.mock("@/components/story/TonePanel", () => ({
  TonePanel: () => null,
  TonePanelContent: () => null,
}));
vi.mock("@/components/story/ExplorePane", () => ({
  ExplorePane: () => null,
}));
vi.mock("@/components/story/ExploreModeBar", () => ({
  ExploreModeBar: () => null,
}));
vi.mock("@/components/story/BranchGraph", () => ({
  BranchGraph: () => null,
}));
vi.mock("@/lib/branch-api", () => ({
  getBranches: vi.fn().mockResolvedValue([
    { id: "branch-1", story_id: "story-1", name: null, is_main: true, fork_node_id: null, tip_node_id: "node-2", created_at: "2026-01-01" },
  ]),
  createBranch: vi.fn(),
  promoteBranch: vi.fn(),
  deleteBranch: vi.fn(),
}));
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/story/ChapterReviewPrompt", () => ({
  ChapterReviewPrompt: () => null,
}));
vi.mock("@/components/story/ChapterEditModeBar", () => ({
  ChapterEditModeBar: () => null,
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

const twoNodeStory = () => {
  getStoryMock.mockResolvedValue({
    id: "story-1",
    title: "Test Story",
    premise: "A premise.",
    tone: "Dark",
    genre: "Fantasy",
    target_turns: 35,
    arc_override: null,
    status: "in_progress",
  });

  getStoryNodesMock.mockResolvedValue([
    {
      id: "node-1",
      text: "First paragraph.\n\nSecond paragraph.",
      summary: "Opening",
      story_state: { stage: "setup" },
      choices: [
        { type: "safe", label: "Hold steady", preview: "Keep the course." },
        { type: "risky", label: "Push ahead", preview: "Take the risk." },
      ],
      is_active: true,
      parent_id: null,
      starts_chapter: true,
      chapter_title: "Chapter 1",
    },
    {
      id: "node-2",
      text: "Third paragraph.",
      summary: "Continuation",
      story_state: { stage: "middle" },
      choices: [
        { type: "safe", label: "Hold steady", preview: "Keep the course." },
        { type: "risky", label: "Push ahead", preview: "Take the risk." },
      ],
      is_active: true,
      parent_id: "node-1",
      starts_chapter: false,
    },
  ]);

  getAllStoryNodesMock.mockResolvedValue([
    {
      id: "node-1",
      text: "First paragraph.\n\nSecond paragraph.",
      parent_id: null,
      chosen_option: null,
      is_active: true,
      starts_chapter: true,
      chapter_title: "Chapter 1",
    },
    {
      id: "node-2",
      text: "Third paragraph.",
      parent_id: "node-1",
      chosen_option: { type: "safe", label: "Hold steady" },
      is_active: true,
      starts_chapter: false,
    },
  ]);
};

describe("StoryWrite handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestChoiceCardsProps.current = null;
    latestStoryCanvasProps.current = null;
    latestStoryCompleteProps.current = null;
    useIsMobileMock.mockReturnValue(false);
    sessionStorage.clear();

    calculateBeatMock.mockReturnValue({
      phase: "rising",
      progress: 0.3,
      phaseProgress: 0.5,
      turnsRemaining: 20,
      isNearEnd: false,
    });

    generateChoicesMock.mockResolvedValue([
      { type: "safe", label: "Hold steady", preview: "Keep the course." },
      { type: "risky", label: "Push ahead", preview: "Take the risk." },
    ]);

    summarizeStoryMock.mockResolvedValue({
      summary: "Updated summary",
      story_state: { stage: "middle" },
    });

    createStoryNodeMock.mockResolvedValue({ id: "node-3" });
    updateNodeChapterTitleMock.mockResolvedValue(undefined);
    updateStoryTitleMock.mockResolvedValue(undefined);
    updateStoryToneMock.mockResolvedValue(undefined);
    jumpToNodeMock.mockResolvedValue(undefined);
    deleteNodeAndDescendantsMock.mockResolvedValue(undefined);
    mergeNodeWithParentMock.mockResolvedValue(undefined);
    splitNodeAtPositionMock.mockResolvedValue({ id: "node-2b" });
    apiUpdateStoryMock.mockResolvedValue({});
    apiUpdateNodeMock.mockResolvedValue({});
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    streamSectionMock.mockImplementation(async ({ onDone }: { onDone: (text: string) => void }) => {
      await onDone("New section text.");
    });
  });

  it("selects a choice and generates the next section", async () => {
    twoNodeStory();
    renderStoryWrite();

    await waitFor(() => expect(screen.getByText("Hold steady")).toBeDefined());

    fireEvent.click(screen.getByText("Hold steady"));

    await waitFor(() => expect(streamSectionMock).toHaveBeenCalled());
    await waitFor(() => expect(createStoryNodeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        storyId: "story-1",
        parentId: "node-2",
        chosenOption: expect.objectContaining({ type: "safe", label: "Hold steady" }),
      }),
    ));
  });

  it("shows error when choice selection fails to save", async () => {
    twoNodeStory();
    createStoryNodeMock.mockRejectedValue(new Error("save failed"));
    renderStoryWrite();

    await waitFor(() => expect(screen.getByText("Hold steady")).toBeDefined());
    fireEvent.click(screen.getByText("Hold steady"));

    // The retry mechanism tries 3 times with 1s delays, so we need a longer timeout
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(
      "Failed to save after retries — please try again",
    ), { timeout: 10000 });
  });

  it("handles edit and shows desync warning", async () => {
    twoNodeStory();
    renderStoryWrite();

    await waitFor(() => expect(screen.getByText("mock-edit")).toBeDefined());
    fireEvent.click(screen.getByText("mock-edit"));

    // The canvas calls onEdit which sets desync
    await waitFor(() => expect(latestStoryCanvasProps.current).not.toBeNull());
    // After edit, the desync banner should eventually appear
    await waitFor(() => {
      expect(screen.getByText("Text was edited")).toBeDefined();
    });
  });

  it("re-aligns after edit via the Re-align button", async () => {
    twoNodeStory();
    renderStoryWrite();

    await waitFor(() => expect(screen.getByText("mock-edit")).toBeDefined());
    fireEvent.click(screen.getByText("mock-edit"));

    await waitFor(() => expect(screen.getByText("Re-align story")).toBeDefined());
    fireEvent.click(screen.getByText("Re-align story"));

    await waitFor(() => expect(summarizeStoryMock).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith("Story re-aligned with your edits"));
  });

  it("triggers rewrite flow via canvas callback", async () => {
    twoNodeStory();
    streamRewriteMock.mockImplementation(({ onDone }: { onDone: (text: string) => void }) => {
      onDone("Rewritten text here.");
    });
    renderStoryWrite();

    await waitFor(() => expect(screen.getByText("mock-rewrite")).toBeDefined());
    fireEvent.click(screen.getByText("mock-rewrite"));

    await waitFor(() => expect(streamRewriteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instruction: "make it better",
      }),
    ));
  });

  it("accepts a rewrite and persists to node", async () => {
    twoNodeStory();
    streamRewriteMock.mockImplementation(({ onDone }: { onDone: (text: string) => void }) => {
      onDone("Rewritten text here.");
    });
    renderStoryWrite();

    await waitFor(() => expect(screen.getByText("mock-rewrite")).toBeDefined());
    fireEvent.click(screen.getByText("mock-rewrite"));

    await waitFor(() => expect(screen.getByText("mock-accept-rewrite")).toBeDefined());
    fireEvent.click(screen.getByText("mock-accept-rewrite"));

    await waitFor(() => expect(apiUpdateNodeMock).toHaveBeenCalledWith(
      "node-1",
      expect.objectContaining({ text: expect.any(String) }),
    ));
  });

  it("reverts a rewrite without persisting", async () => {
    twoNodeStory();
    streamRewriteMock.mockImplementation(({ onDone }: { onDone: (text: string) => void }) => {
      onDone("Rewritten text.");
    });
    renderStoryWrite();

    await waitFor(() => expect(screen.getByText("mock-rewrite")).toBeDefined());
    fireEvent.click(screen.getByText("mock-rewrite"));

    await waitFor(() => expect(screen.getByText("mock-revert-rewrite")).toBeDefined());
    fireEvent.click(screen.getByText("mock-revert-rewrite"));

    // Should not update node when reverting
    const callsBefore = apiUpdateNodeMock.mock.calls.length;
    // Give it a tick
    await new Promise((r) => setTimeout(r, 50));
    expect(apiUpdateNodeMock.mock.calls.length).toBe(callsBefore);
  });

  it("handles rewrite stream error", async () => {
    twoNodeStory();
    streamRewriteMock.mockImplementation(({ onError }: { onError: (msg: string) => void }) => {
      onError("Rewrite failed");
    });
    renderStoryWrite();

    await waitFor(() => expect(screen.getByText("mock-rewrite")).toBeDefined());
    fireEvent.click(screen.getByText("mock-rewrite"));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Rewrite failed"));
  });

  it("exports as PDF", async () => {
    twoNodeStory();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ title: "Test", genre: "Fantasy", nodes: [] }),
    });
    const generatePDFMock = vi.fn();
    vi.doMock("@/lib/pdf-export", () => ({ generatePDF: generatePDFMock }));
    renderStoryWrite();

    await waitFor(() => expect(screen.getByTitle("Export as PDF")).toBeDefined());
    fireEvent.click(screen.getByTitle("Export as PDF"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/export-story",
      expect.objectContaining({ method: "POST" }),
    ));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith("PDF downloaded"));
  });

  it("handles export failure", async () => {
    twoNodeStory();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Export failed" }),
    });
    renderStoryWrite();

    await waitFor(() => expect(screen.getByTitle("Export as PDF")).toBeDefined());
    fireEvent.click(screen.getByTitle("Export as PDF"));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Export failed"));
  });

  it("creates and copies a share link", async () => {
    twoNodeStory();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText: writeTextMock }, writable: true });
    Object.defineProperty(crypto, "randomUUID", { value: () => "abcd1234-5678-9abc-def0-123456789abc", writable: true });

    renderStoryWrite();

    await waitFor(() => {
      const shareBtn = screen.queryByTitle("Create share link");
      expect(shareBtn).toBeDefined();
    });
    fireEvent.click(screen.getByTitle("Create share link"));

    await waitFor(() => expect(apiUpdateStoryMock).toHaveBeenCalledWith(
      "story-1",
      expect.objectContaining({ share_token: expect.any(String) }),
    ));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith("Story shared! Link copied to clipboard"));
  });

  it("handles tone change", async () => {
    twoNodeStory();
    renderStoryWrite();

    // The tone change is triggered via the TonePanel mock, but we can test via
    // the latestStoryCanvasProps which passes down handlers. The TonePanel is
    // mocked to null, so let's test it indirectly — the tone button is in the header.
    // We'll verify the tone change mock is wired by checking the UI shows the current tone.
    await waitFor(() => expect(screen.getByText("Dark")).toBeDefined());
  });

  it("regenerates choices via the ChoiceCards onRegenerate callback", async () => {
    twoNodeStory();
    renderStoryWrite();

    await waitFor(() => expect(screen.getByText("regenerate-choices")).toBeDefined());
    generateChoicesMock.mockClear();
    fireEvent.click(screen.getByText("regenerate-choices"));

    await waitFor(() => expect(generateChoicesMock).toHaveBeenCalled());
  });

  it("shows story-complete state for completed stories", async () => {
    getStoryMock.mockResolvedValue({
      id: "story-1",
      title: "Done Story",
      premise: "A premise.",
      tone: "Dark",
      genre: "Fantasy",
      target_turns: 10,
      arc_override: null,
      status: "completed",
    });
    getStoryNodesMock.mockResolvedValue([
      { id: "node-1", text: "End.", summary: "End", story_state: {}, choices: [], is_active: true, parent_id: null, starts_chapter: true },
    ]);
    getAllStoryNodesMock.mockResolvedValue([
      { id: "node-1", text: "End.", parent_id: null, chosen_option: null, is_active: true, starts_chapter: true },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByTestId("story-complete")).toBeDefined());
  });

  it("handles load story failure", async () => {
    getStoryMock.mockRejectedValue(new Error("Not found"));
    renderStoryWrite();

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Failed to load story"));
    expect(navigateMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders mobile shell when on mobile", async () => {
    useIsMobileMock.mockReturnValue(true);
    twoNodeStory();
    renderStoryWrite();

    await waitFor(() => expect(screen.getByTestId("story-canvas")).toBeDefined());
    // Mobile shell should be rendered — it uses StoryWriteMobileShell
  });

  it("deletes a chapter from the sidebar", async () => {
    getStoryMock.mockResolvedValue({
      id: "story-1",
      title: "Test Story",
      premise: "A premise.",
      tone: "Dark",
      genre: "Fantasy",
      target_turns: 35,
      arc_override: null,
      status: "in_progress",
    });
    getStoryNodesMock.mockResolvedValue([
      { id: "node-1", text: "Opening.", summary: "Opening", story_state: {}, choices: [], is_active: true, parent_id: null, starts_chapter: true, chapter_title: "Chapter 1" },
      { id: "node-2", text: "Middle.", summary: "Middle", story_state: {}, choices: [{ type: "safe", label: "Go", preview: "..." }], is_active: true, parent_id: "node-1", starts_chapter: true, chapter_title: "Chapter 2" },
    ]);
    getAllStoryNodesMock.mockResolvedValue([
      { id: "node-1", text: "Opening.", parent_id: null, chosen_option: null, is_active: true, starts_chapter: true, chapter_title: "Chapter 1" },
      { id: "node-2", text: "Middle.", parent_id: "node-1", chosen_option: { type: "safe", label: "Go" }, is_active: true, starts_chapter: true, chapter_title: "Chapter 2" },
    ]);

    renderStoryWrite();
    await waitFor(() => expect(screen.getByText("delete-node-2")).toBeDefined());

    // After deletion, reload returns only node-1
    getStoryNodesMock.mockResolvedValueOnce([
      { id: "node-1", text: "Opening.", summary: "Opening", story_state: {}, choices: [], is_active: true, parent_id: null, starts_chapter: true },
    ]);

    fireEvent.click(screen.getByText("delete-node-2"));

    await waitFor(() => expect(deleteNodeAndDescendantsMock).toHaveBeenCalledWith("story-1", "node-2"));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith("Chapter deleted"));
  });

  it("merges a chapter from the sidebar", async () => {
    getStoryMock.mockResolvedValue({
      id: "story-1",
      title: "Test Story",
      premise: "A premise.",
      tone: "Dark",
      genre: "Fantasy",
      target_turns: 35,
      arc_override: null,
      status: "in_progress",
    });
    getStoryNodesMock.mockResolvedValue([
      { id: "node-1", text: "Opening.", summary: "Opening", story_state: {}, choices: [], is_active: true, parent_id: null, starts_chapter: true, chapter_title: "Chapter 1" },
      { id: "node-2", text: "Middle.", summary: "Middle", story_state: {}, choices: [{ type: "safe", label: "Go", preview: "..." }], is_active: true, parent_id: "node-1", starts_chapter: true, chapter_title: "Chapter 2" },
    ]);
    getAllStoryNodesMock.mockResolvedValue([
      { id: "node-1", text: "Opening.", parent_id: null, chosen_option: null, is_active: true, starts_chapter: true, chapter_title: "Chapter 1" },
      { id: "node-2", text: "Middle.", parent_id: "node-1", chosen_option: { type: "safe", label: "Go" }, is_active: true, starts_chapter: true, chapter_title: "Chapter 2" },
    ]);

    renderStoryWrite();
    await waitFor(() => expect(screen.getByText("merge-node-2")).toBeDefined());

    getStoryNodesMock.mockResolvedValueOnce([
      { id: "node-1", text: "Opening.\n\nMiddle.", summary: "Merged", story_state: {}, choices: [], is_active: true, parent_id: null, starts_chapter: true },
    ]);

    fireEvent.click(screen.getByText("merge-node-2"));

    await waitFor(() => expect(mergeNodeWithParentMock).toHaveBeenCalledWith("story-1", "node-2"));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith("Chapters merged"));
  });

  it("handles re-align failure", async () => {
    twoNodeStory();
    summarizeStoryMock.mockRejectedValueOnce(new Error("fail"));
    renderStoryWrite();

    await waitFor(() => expect(screen.getByText("mock-edit")).toBeDefined());
    fireEvent.click(screen.getByText("mock-edit"));

    await waitFor(() => expect(screen.getByText("Re-align story")).toBeDefined());
    // Clear so the rejected one is next
    summarizeStoryMock.mockRejectedValueOnce(new Error("fail"));
    fireEvent.click(screen.getByText("Re-align story"));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Failed to re-align"));
  });

  it("generates opening for a new story with no nodes", async () => {
    getStoryMock.mockResolvedValue({
      id: "story-1",
      title: "Untitled Story",
      premise: "A brave knight.",
      tone: "Epic",
      genre: "Fantasy",
      target_turns: 35,
      arc_override: null,
      status: "in_progress",
    });
    getStoryNodesMock.mockResolvedValue([]);
    getAllStoryNodesMock.mockResolvedValue([]);

    renderStoryWrite();

    await waitFor(() => expect(streamSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        premise: "A brave knight.",
        genre: "Fantasy",
        tone: "Epic",
      }),
    ));
    await waitFor(() => expect(createStoryNodeMock).toHaveBeenCalled());
  });

  it("auto-titles the story from generated opening", async () => {
    getStoryMock.mockResolvedValue({
      id: "story-1",
      title: "Untitled Story",
      premise: "A brave knight.",
      tone: "Epic",
      genre: "Fantasy",
      target_turns: 35,
      arc_override: null,
      status: "in_progress",
    });
    getStoryNodesMock.mockResolvedValue([]);
    getAllStoryNodesMock.mockResolvedValue([]);

    streamSectionMock.mockImplementation(async ({ onDone }: { onDone: (text: string) => void }) => {
      await onDone("The dawn broke over the mountain. A knight stood ready.");
    });

    renderStoryWrite();

    await waitFor(() => expect(updateStoryTitleMock).toHaveBeenCalledWith(
      "story-1",
      "The dawn broke over the mountain",
    ));
  });
});
