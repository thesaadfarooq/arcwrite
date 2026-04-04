import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, PanelLeft, Sun, Moon, AlertTriangle, Palette, GitBranch, Hash, Download, Share2, Loader2, Link, Crown, Lock, RefreshCw } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { getTierLimits } from "@/lib/subscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiClient } from "@/lib/api-client";
import { StoryCanvas, type StoryParagraph } from "@/components/story/StoryCanvas";
import { ChoiceCards, type StoryChoice } from "@/components/story/ChoiceCards";
import { ChapterSidebar, type Chapter } from "@/components/story/ChapterSidebar";
import { ExplorePane } from "@/components/story/ExplorePane";
import { ExploreModeBar } from "@/components/story/ExploreModeBar";
import { BranchGraph, type GraphNode } from "@/components/story/BranchGraph";
import { type Branch, getBranches, createBranch, promoteBranch, deleteBranch } from "@/lib/branch-api";
import { ChapterReviewPrompt } from "@/components/story/ChapterReviewPrompt";
import { ChapterEditModeBar } from "@/components/story/ChapterEditModeBar";
import { StoryWriteMobileShell } from "@/components/story/StoryWriteMobileShell";
import { StoryWriteDesktopShell } from "@/components/story/StoryWriteDesktopShell";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StoryStructureSheet } from "@/components/story/StoryStructureSheet";
import { StoryToolsSheet } from "@/components/story/StoryToolsSheet";
import { TonePanel } from "@/components/story/TonePanel";
import { StoryComplete } from "@/components/story/StoryComplete";
import { supabase } from "@/integrations/supabase/client";
import {
  streamSection, generateChoices, summarizeStory,
  getStory, getStoryNodes, getAllStoryNodes, createStoryNode,
  updateStoryTitle, updateStoryTone, jumpToNode,
  updateNodeChapterTitle, deleteNodeAndDescendants, splitNodeAtPosition, mergeNodeWithParent, generateChapterSuggestions,
  generateChapterTitle,
} from "@/lib/story-api";
import type { SectionLength } from "@/lib/story-api";
import type { ChapterHeading } from "@/components/story/StoryCanvas";
import { calculateBeat, type BeatInfo } from "@/lib/story-arc";
import { selectMoveFamilies, type StoryMoveFamily, type StoryArcMode } from "@/lib/story-moves";
import {
  calculateArcBeat,
  seedPostEndingArcState,
  classifyResumeStrength,
  shouldExitPostEndingBuffer,
  getExtensionTargetTurns,
  type ArcState,
  type StoryArcOverride,
} from "@/lib/story-extension";
import {
  countWordsSinceChapterStart,
  isChapterSuggestionsStale,
  shouldResetChapterReviewCheckpoint,
  shouldOfferChapterReview,
  type ChapterReviewCheckpoint,
  type ChapterSuggestion,
} from "@/lib/chapter-review";
import { toast } from "sonner";

async function retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 1000): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("Retry exhausted");
}

function EditableStoryTitle({ title, onRename }: { title: string; onRename: (newTitle: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setEditValue(title);
  }, [title, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setIsEditing(false);
        }}
        className="font-story text-sm font-semibold text-foreground bg-secondary/50 border border-primary/30 rounded px-2 py-0.5 focus:outline-none focus:border-primary/50 max-w-[200px]"
      />
    );
  }

  return (
    <span
      className="font-story text-sm font-semibold text-foreground truncate max-w-[200px] cursor-pointer hover:text-primary transition-colors"
      onClick={() => setIsEditing(true)}
      title="Click to rename"
    >
      {title}
    </span>
  );
}

function EditableTitle({ title, onRename }: { title: string; onRename?: (newTitle: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setEditValue(title);
  }, [title, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title && onRename) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="mb-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setIsEditing(false);
          }}
          className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground bg-secondary/50 border border-primary/30 rounded px-2 py-1 text-center focus:outline-none focus:border-primary/50 max-w-[200px]"
        />
        <div className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return (
    <div className="mb-8 flex items-center gap-4 group/ch1">
      <div className="h-px flex-1 bg-border" />
      <span
        className={`text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground ${onRename ? "cursor-pointer hover:text-foreground transition-colors" : ""}`}
        onClick={() => onRename && setIsEditing(true)}
        title={onRename ? "Click to rename" : undefined}
      >
        {title}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export default function StoryWrite() {
  const { id: storyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { tier } = useAuth();
  const limits = getTierLimits(tier);
  const isMobile = useIsMobile();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [explorePaneOpen, setExplorePaneOpen] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [structureOpen, setStructureOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [exploreSheetOpen, setExploreSheetOpen] = useState(false);
  const [chapterEditMode, setChapterEditMode] = useState(false);
  const [paragraphs, setParagraphs] = useState<StoryParagraph[]>([]);
  const [choices, setChoices] = useState<StoryChoice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jumpingNodeId, setJumpingNodeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingChoices, setIsLoadingChoices] = useState(false);
  const [storyTitle, setStoryTitle] = useState("Untitled Story");
  const [storyMeta, setStoryMeta] = useState<{ genre?: string; tone?: string; premise?: string }>({});
  const [summary, setSummary] = useState<string>("");
  const [storyState, setStoryState] = useState<any>({});
  const [lastNodeId, setLastNodeId] = useState<string | null>(null);
  const [isDesyncced, setIsDesyncced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toneOpen, setToneOpen] = useState(false);
  const [allNodes, setAllNodes] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sectionLength, setSectionLength] = useState<SectionLength>("medium");
  const [targetTurns, setTargetTurns] = useState(35);
  const [arcOverride, setArcOverride] = useState<StoryArcMode | null>(null);
  const [isStoryComplete, setIsStoryComplete] = useState(false);
  const [chapterSuggestions, setChapterSuggestions] = useState<ChapterSuggestion[]>([]);
  const [chapterSuggestionsTipId, setChapterSuggestionsTipId] = useState<string | null>(null);
  const [isChapterReviewLoading, setIsChapterReviewLoading] = useState(false);
  const [arcState, setArcState] = useState<ArcState | null>(null);
  const [choiceVariantOffset, setChoiceVariantOffset] = useState(0);
  const [chapterSuggestionsExpanded, setChapterSuggestionsExpanded] = useState(false);
  const [pendingBreakKey, setPendingBreakKey] = useState<string | null>(null);
  const [showEarlierBreakTargets, setShowEarlierBreakTargets] = useState(false);
  const [applyingSuggestionKey, setApplyingSuggestionKey] = useState<string | null>(null);
  const [chapterReviewCheckpoint, setChapterReviewCheckpoint] = useState<ChapterReviewCheckpoint>({
    reviewedAtTurns: 0,
    dismissedAtTurns: null,
    reviewedTipId: null,
  });
  const loadedRef = useRef(false);

  const mainBranch = useMemo(() => branches.find((b) => b.is_main) ?? null, [branches]);
  const isExploring = useMemo(() => activeBranchId !== null && activeBranchId !== mainBranch?.id, [activeBranchId, mainBranch]);
  const activeBranch = useMemo(() => branches.find((b) => b.id === activeBranchId) ?? null, [branches, activeBranchId]);

  useEffect(() => {
    if (!storyId || loadedRef.current) return;
    loadedRef.current = true;
    loadStory();
  }, [storyId]);

  useEffect(() => {
    if (!storyId) return;
    const raw = sessionStorage.getItem(`chapter-review:${storyId}`);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as ChapterReviewCheckpoint;
      setChapterReviewCheckpoint(parsed);
    } catch {
      sessionStorage.removeItem(`chapter-review:${storyId}`);
    }
  }, [storyId]);

  useEffect(() => {
    if (!storyId) return;
    sessionStorage.setItem(`chapter-review:${storyId}`, JSON.stringify(chapterReviewCheckpoint));
  }, [storyId, chapterReviewCheckpoint]);

  const loadStory = async () => {
    try {
      const story = await getStory(storyId!);
      setStoryTitle(story.title);
      setStoryMeta({ genre: story.genre || undefined, tone: story.tone || undefined, premise: story.premise || undefined });
      setTargetTurns(story.target_turns ?? 35);
      setArcOverride((story.arc_override as StoryArcMode) ?? null);
      setArcState(story.arc_state ?? null);
      setIsStoryComplete(story.status === "completed");
      setShareToken((story as any).share_token || null);

      const [activeNodes, allStoryNodes] = await Promise.all([
        getStoryNodes(storyId!),
        getAllStoryNodes(storyId!),
      ]);

      setAllNodes(allStoryNodes);

      const loadedBranches = await getBranches(storyId!);
      setBranches(loadedBranches);
      const main = loadedBranches.find((b: Branch) => b.is_main);
      if (main) setActiveBranchId(main.id);

      if (activeNodes.length > 0) {
        const paras = buildParagraphsFromNodes(activeNodes);
        setParagraphs(paras);
        const lastNode = activeNodes[activeNodes.length - 1];
        setLastNodeId(lastNode.id);
        setSummary(lastNode.summary || "");
        setStoryState(lastNode.story_state || {});
        if (lastNode.choices && Array.isArray(lastNode.choices) && (lastNode.choices as any[]).length > 0) {
          setChoices(lastNode.choices as any as StoryChoice[]);
        } else if (story.status !== "completed") {
          fetchChoices(paras.map((p) => p.text).join("\n\n"), {
            activeNodeCount: activeNodes.length,
            meta: {
              genre: story.genre || undefined,
              tone: story.tone || undefined,
              premise: story.premise || undefined,
            },
            targetTurns: story.target_turns ?? 35,
            arcOverride: story.arc_override ?? null,
            arcStateOverride: story.arc_state ?? null,
          });
        }
      } else {
        generateOpening({
          premise: story.premise || undefined,
          genre: story.genre || undefined,
          tone: story.tone || undefined,
        });
      }
    } catch (err: any) {
      toast.error("Failed to load story");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentBeat = (
    nodeCount: number,
    options?: { arcOverride?: StoryArcMode | null; targetTurns?: number },
  ): BeatInfo => {
    const effectiveTargetTurns = options?.targetTurns ?? targetTurns;
    const effectiveArcOverride = options?.arcOverride ?? arcOverride;

    return calculateArcBeat({
      activeTurns: nodeCount,
      targetTurns: effectiveTargetTurns,
      arcOverride: effectiveArcOverride === "normal" ? null : effectiveArcOverride,
      arcState,
    });
  };

  const buildBeatPayload = (beat: BeatInfo, isFinalSection = false) => ({
    phase: beat.phase,
    progress: beat.progress,
    phaseProgress: beat.phaseProgress,
    turnsRemaining: beat.turnsRemaining,
    isNearEnd: beat.isNearEnd,
    isFinalSection,
  });

  const buildParagraphsFromNodes = (nodes: any[]): StoryParagraph[] => {
    const nextParagraphs: StoryParagraph[] = [];

    nodes.forEach((node) => {
      const texts = (node.text || "").split("\n\n").filter(Boolean);
      texts.forEach((text: string, index: number) => {
        nextParagraphs.push({ id: `${node.id}-${index}`, text });
      });
    });

    return nextParagraphs;
  };

  const refreshAllNodes = async () => {
    try {
      const nodes = await getAllStoryNodes(storyId!);
      setAllNodes(nodes);
    } catch {}
  };

  /** Reload paragraphs + state from DB so IDs match real nodes (needed for chapter headings) */
  const reloadActiveState = async () => {
    try {
      const [activeNodes, allStoryNodes] = await Promise.all([
        getStoryNodes(storyId!),
        getAllStoryNodes(storyId!),
      ]);
      setAllNodes(allStoryNodes);

      const paras = buildParagraphsFromNodes(activeNodes);
      setParagraphs(paras);

      const lastNode = activeNodes[activeNodes.length - 1];
      setLastNodeId(lastNode?.id || null);
      setSummary(lastNode?.summary || "");
      setStoryState(lastNode?.story_state || {});
    } catch {}
  };

  const generateOpening = async (meta?: { premise?: string; genre?: string; tone?: string }) => {
    const useMeta = meta || storyMeta;
    const beat = getCurrentBeat(0);
    setIsGenerating(true);
    let fullText = "";

    setParagraphs([{ id: `streaming-${Date.now()}`, text: "", isStreaming: true }]);

    await streamSection({
      premise: useMeta.premise,
      genre: useMeta.genre,
      tone: useMeta.tone,
      length: sectionLength,
      arcMode: arcOverride ?? undefined,
      beat: buildBeatPayload(beat, false),
      onDelta: (delta) => {
        fullText += delta;
        const paras = fullText.split("\n\n").filter(Boolean);
        setParagraphs(paras.map((t, i) => ({
          id: `gen-${i}`,
          text: t,
          isStreaming: i === paras.length - 1,
        })));
      },
      onDone: async (text) => {
        setIsGenerating(false);
        setIsProcessing(true);
        const paras = text.split("\n\n").filter(Boolean);
        setParagraphs(paras.map((t, i) => ({ id: `gen-${i}`, text: t })));

        // Run summarize + choices in parallel
        const summarizePromise = summarizeStory({ fullText: text, storyState: {} });
        const initialMoveFamilies = selectMoveFamilies({
          phase: beat.phase,
          arcMode: arcOverride ?? "normal",
          previousEnding: arcState?.endedWith ?? null,
          recentFamilies: [],
          variantOffset: choiceVariantOffset,
        });
        const choicesPromise = generateChoices({
          recentText: text.split("\n\n").slice(-3).join("\n\n"),
          summary: "",
          storyState: {},
          tone: useMeta.tone,
          genre: useMeta.genre,
          premise: useMeta.premise,
          beat: buildBeatPayload(beat, false),
          arcMode: arcOverride ?? "normal",
          moveFamilies: initialMoveFamilies,
          previousEnding: arcState?.endedWith ?? null,
        });

        try {
          const results = await Promise.allSettled([summarizePromise, choicesPromise]);
          const summaryResult = results[0].status === "fulfilled" ? results[0].value : null;
          const choicesResult = results[1].status === "fulfilled" ? results[1].value : null;

          if (summaryResult) {
            setSummary(summaryResult.summary);
            setStoryState(summaryResult.story_state);
          } else {
            console.warn("Summarize failed, saving node without summary");
          }
          if (choicesResult) {
            setChoices(choicesResult);
          } else {
            toast.error("Failed to generate choices — you can regenerate them manually");
          }

          const node = await retry(() => createStoryNode({
            storyId: storyId!,
            text,
            summary: summaryResult?.summary || "",
            storyState: summaryResult?.story_state || storyState,
            choices: choicesResult || [],
            branchId: activeBranchId ?? undefined,
          }));
          setLastNodeId(node.id);
          await reloadActiveState();

          const firstLine = text.split(".")[0]?.trim();
          if (firstLine && storyTitle === "Untitled Story") {
            const title = firstLine.length > 50 ? firstLine.slice(0, 50) + "…" : firstLine;
            setStoryTitle(title);
            await updateStoryTitle(storyId!, title);
          }
        } catch (e) {
          console.error("Failed to save node:", e);
          toast.error("Failed to save after retries — please try again");
        }
        setIsProcessing(false);
        setIsLoadingChoices(false);
      },
      onError: (err) => {
        setIsGenerating(false);
        setIsProcessing(false);
        toast.error(err);
      },
    } as any);
  };

  const handleRegenerateOpening = async () => {
    if (!isAtOpening || isGenerating || isProcessing) return;
    const rootNode = activeNodes[0];
    if (!rootNode) return;

    setChoices([]);
    setIsGenerating(true);
    let fullText = "";

    setParagraphs([{ id: `streaming-${Date.now()}`, text: "", isStreaming: true }]);

    const beat = getCurrentBeat(0);
    await streamSection({
      premise: storyMeta.premise,
      genre: storyMeta.genre,
      tone: storyMeta.tone,
      length: sectionLength,
      arcMode: arcOverride ?? undefined,
      beat: buildBeatPayload(beat, false),
      onDelta: (delta) => {
        fullText += delta;
        const paras = fullText.split("\n\n").filter(Boolean);
        setParagraphs(paras.map((t, i) => ({
          id: `gen-${i}`,
          text: t,
          isStreaming: i === paras.length - 1,
        })));
      },
      onDone: async (text) => {
        setIsGenerating(false);
        setIsProcessing(true);
        const paras = text.split("\n\n").filter(Boolean);
        setParagraphs(paras.map((t, i) => ({ id: `gen-${i}`, text: t })));

        const summarizePromise = summarizeStory({ fullText: text, storyState: {} });
        const initialMoveFamilies = selectMoveFamilies({
          phase: beat.phase,
          arcMode: arcOverride ?? "normal",
          previousEnding: arcState?.endedWith ?? null,
          recentFamilies: [],
          variantOffset: choiceVariantOffset,
        });
        const choicesPromise = generateChoices({
          recentText: text.split("\n\n").slice(-3).join("\n\n"),
          summary: "",
          storyState: {},
          tone: storyMeta.tone,
          genre: storyMeta.genre,
          premise: storyMeta.premise,
          beat: buildBeatPayload(beat, false),
          arcMode: arcOverride ?? "normal",
          moveFamilies: initialMoveFamilies,
          previousEnding: arcState?.endedWith ?? null,
        });

        try {
          const results = await Promise.allSettled([summarizePromise, choicesPromise]);
          const summaryResult = results[0].status === "fulfilled" ? results[0].value : null;
          const choicesResult = results[1].status === "fulfilled" ? results[1].value : null;

          if (summaryResult) {
            setSummary(summaryResult.summary);
            setStoryState(summaryResult.story_state);
          }
          if (choicesResult) {
            setChoices(choicesResult);
          } else {
            toast.error("Failed to generate choices — you can regenerate them manually");
          }

          // Update the existing root node in place — do NOT create a new one
          await retry(() => apiClient.updateNode(rootNode.id, {
            text,
            summary: summaryResult?.summary || "",
            story_state: summaryResult?.story_state || storyState,
            choices: choicesResult || [],
          }));
          await reloadActiveState();

          // Update title if still auto-derived
          const firstLine = text.split(".")[0]?.trim();
          if (firstLine && storyTitle === "Untitled Story") {
            const title = firstLine.length > 50 ? firstLine.slice(0, 50) + "…" : firstLine;
            setStoryTitle(title);
            await updateStoryTitle(storyId!, title);
          }
        } catch (e) {
          console.error("Failed to save regenerated opening:", e);
          toast.error("Failed to save — please try again");
        }
        setIsProcessing(false);
      },
      onError: (err) => {
        setIsGenerating(false);
        setIsProcessing(false);
        toast.error(err);
      },
    } as any);
  };

  const fetchChoices = async (
    recentText: string,
    options?: {
      activeNodeCount?: number;
      meta?: { premise?: string; genre?: string; tone?: string };
      targetTurns?: number;
      arcOverride?: StoryArcMode | null;
      arcStateOverride?: ArcState | null;
    },
  ) => {
    setIsLoadingChoices(true);
    try {
      const beat = getCurrentBeat(options?.activeNodeCount ?? activeNodes.length, {
        arcOverride: options?.arcOverride,
        targetTurns: options?.targetTurns,
      });
      const meta = options?.meta || storyMeta;
      const effectiveArcOverride = options?.arcOverride ?? arcOverride;
      const effectiveArcState = options?.arcStateOverride !== undefined ? options.arcStateOverride : arcState;
      const moveFamilies = selectMoveFamilies({
        phase: beat.phase,
        arcMode: (effectiveArcOverride as any) ?? "normal",
        previousEnding: effectiveArcState?.endedWith ?? null,
        recentFamilies: recentMoveFamilies as StoryMoveFamily[],
        variantOffset: choiceVariantOffset,
      });
      const result = await generateChoices({
        recentText,
        summary,
        storyState,
        tone: meta.tone,
        genre: meta.genre,
        premise: meta.premise,
        beat: buildBeatPayload(beat, false),
        arcMode: (effectiveArcOverride as any) ?? undefined,
        moveFamilies,
        previousEnding: effectiveArcState?.endedWith ?? null,
      });
      setChoices(result);

      if (lastNodeId) {
        await apiClient.updateNode(lastNodeId, { choices: result as any });
      }
    } catch {
      toast.error("Failed to generate choices");
    } finally {
      setIsLoadingChoices(false);
    }
  };

  const handleChoiceSelect = async (choice: StoryChoice | { type: "custom"; label: string; preview: string }) => {
    // Check turn limit
    const activeNodeCount = allNodes.filter((n) => n.is_active).length;
    if (limits.turns !== Infinity && activeNodeCount >= limits.turns) {
      toast.error(`You've reached the ${limits.turns}-turn limit on your plan. Upgrade for more.`);
      return;
    }

    setIsGenerating(true);
    setChoices([]);
    setIsDesyncced(false);

    const existingParas = paragraphs.filter((p) => !p.isStreaming);
    const recentText = existingParas.slice(-3).map((p) => p.text).join("\n\n");
    const beat = getCurrentBeat(activeNodes.length);
    const isFinalSection = choice.type === "conclude" || choice.type === "epilogue";
    let fullText = "";

    await streamSection({
      direction: choice.type === "custom" ? choice.preview : `${choice.label}: ${choice.preview}`,
      premise: storyMeta.premise,
      tone: storyMeta.tone,
      genre: storyMeta.genre,
      summary,
      recentText,
      storyState,
      length: sectionLength,
      arcMode: arcOverride ?? undefined,
      beat: buildBeatPayload(beat, isFinalSection),
      onDelta: (delta) => {
        fullText += delta;
        const newParas = fullText.split("\n\n").filter(Boolean);
        setParagraphs([
          ...existingParas,
          ...newParas.map((t, i) => ({
            id: `new-${i}`,
            text: t,
            isStreaming: i === newParas.length - 1,
          })),
        ]);
      },
      onDone: async (text) => {
        setIsGenerating(false);
        setIsProcessing(true);
        const newParas = text.split("\n\n").filter(Boolean);
        setParagraphs([
          ...existingParas,
          ...newParas.map((t, i) => ({ id: `done-${Date.now()}-${i}`, text: t })),
        ]);

        const allText = [...existingParas.map((p) => p.text), ...newParas].join("\n\n");

        const summarizePromise2 = summarizeStory({
          fullText: allText,
          previousSummary: summary,
          storyState,
        });
        const choicesPromise2 = isFinalSection
          ? Promise.resolve<StoryChoice[] | null>(null)
          : (() => {
              const postSectionMoveFamilies = selectMoveFamilies({
                phase: beat.phase,
                arcMode: arcOverride ?? "normal",
                previousEnding: arcState?.endedWith ?? null,
                recentFamilies: recentMoveFamilies as StoryMoveFamily[],
                variantOffset: choiceVariantOffset,
              });
              return generateChoices({
                recentText: text.split("\n\n").slice(-3).join("\n\n"),
                summary,
                storyState,
                tone: storyMeta.tone,
                genre: storyMeta.genre,
                premise: storyMeta.premise,
                beat: buildBeatPayload(beat, false),
                arcMode: arcOverride ?? "normal",
                moveFamilies: postSectionMoveFamilies,
                previousEnding: arcState?.endedWith ?? null,
              });
            })();

        try {
          const results = await Promise.allSettled([summarizePromise2, choicesPromise2]);
          const summaryResult = results[0].status === "fulfilled" ? results[0].value : null;
          const choicesResult = results[1].status === "fulfilled" ? results[1].value : null;

          if (summaryResult) {
            setSummary(summaryResult.summary);
            setStoryState(summaryResult.story_state);
          } else {
            console.warn("Summarize failed, saving without summary update");
          }
          if (choicesResult) {
            setChoices(choicesResult);
          } else if (isFinalSection) {
            setChoices([]);
          } else {
            toast.error("Failed to generate choices — you can regenerate them manually");
          }

          const node = await retry(() => createStoryNode({
            storyId: storyId!,
            parentId: lastNodeId || undefined,
            text,
            summary: summaryResult?.summary || summary,
            storyState: summaryResult?.story_state || storyState,
            chosenOption: choice,
            choices: choicesResult || [],
            branchId: activeBranchId ?? undefined,
          }));
          setLastNodeId(node.id);
          if (isFinalSection) {
            await apiClient.updateStory(storyId!, { status: "completed" });
            setIsStoryComplete(true);
          }

          // Post-ending buffer tracking
          if (arcOverride === "post_ending" && !isFinalSection) {
            const resumeStrength = classifyResumeStrength(choice.type as StoryMoveFamily);
            const bufferTurnsUsed = (arcState?.bufferTurnsUsed ?? 0) + 1;
            if (shouldExitPostEndingBuffer({ bufferTurnsUsed, resumeStrength })) {
              const nextArcState: ArcState = {
                ...(arcState ?? seedPostEndingArcState(activeNodes.length, "conclude")),
                bufferTurnsUsed,
                resumeStrength,
                segmentStartTurn: activeNodes.length + 1,
                extensionTargetTurns: getExtensionTargetTurns(resumeStrength),
              };
              await apiClient.updateStory(storyId!, {
                arc_override: "resumed_extension",
                arc_state: nextArcState,
              });
              setArcOverride("resumed_extension");
              setArcState(nextArcState);
            } else {
              const nextArcState: ArcState = {
                ...(arcState ?? seedPostEndingArcState(activeNodes.length, "conclude")),
                bufferTurnsUsed,
              };
              await apiClient.updateStory(storyId!, {
                arc_override: "post_ending",
                arc_state: nextArcState,
              });
              setArcState(nextArcState);
            }
          }

          await reloadActiveState();
        } catch (e) {
          console.error("Failed to save:", e);
          toast.error("Failed to save after retries — please try again");
        }

        setIsProcessing(false);
        setIsLoadingChoices(false);
      },
      onError: (err) => {
        setIsGenerating(false);
        setIsProcessing(false);
        toast.error(err);
      },
    });
  };

  const handleJumpToNode = async (nodeId: string) => {
    if (isGenerating || isProcessing) return;
    if (nodeId === lastNodeId) return; // already here

    setJumpingNodeId(nodeId);
    try {
      await jumpToNode(storyId!, nodeId);

      const activeNodes = await getStoryNodes(storyId!);
      const paras = buildParagraphsFromNodes(activeNodes);
      setParagraphs(paras);

      const lastNode = activeNodes[activeNodes.length - 1];
      setLastNodeId(lastNode?.id || null);
      setSummary(lastNode?.summary || "");
      setStoryState(lastNode?.story_state || {});
      setChoices([]);
      setIsDesyncced(false);

      refreshAllNodes();

      if (lastNode?.choices && (lastNode.choices as any[]).length > 0) {
        setChoices(lastNode.choices as any as StoryChoice[]);
      } else if (!isStoryComplete) {
        fetchChoices(paras.map((p) => p.text).join("\n\n"), { activeNodeCount: activeNodes.length });
      }

      toast.success("Jumped to this point");
    } catch (err) {
      console.error("[jump]", err);
      toast.error("Failed to jump");
    } finally {
      setJumpingNodeId(null);
    }
  };

  const handleForkFromNode = async (nodeId: string) => {
    await handleJumpToNode(nodeId);
    toast.info("Forked — choose a new direction");
  };

  const handleBranchFromNode = useCallback(async (nodeId: string) => {
    if (!storyId || !mainBranch) return;
    try {
      const newBranch = await createBranch(storyId, nodeId);
      setBranches((prev) => [...prev, newBranch]);
      await handleJumpToNode(nodeId);
      setActiveBranchId(newBranch.id);
      toast.success("Branch created — explore a new path");
    } catch (e: any) {
      toast.error(e.message || "Failed to create branch");
    }
  }, [storyId, mainBranch, handleJumpToNode]);

  const handlePromoteBranch = useCallback(async (branchId: string) => {
    if (!storyId) return;
    try {
      await promoteBranch(branchId);
      const updatedBranches = await getBranches(storyId);
      setBranches(updatedBranches);
      const newMain = updatedBranches.find((b: Branch) => b.is_main);
      if (newMain) setActiveBranchId(newMain.id);
      const updatedNodes = await getAllStoryNodes(storyId);
      setAllNodes(updatedNodes);
      toast.success("Branch promoted to main");
    } catch (e: any) {
      toast.error(e.message || "Failed to promote branch");
    }
  }, [storyId]);

  const handleDeleteBranch = useCallback(async (branchId: string) => {
    if (!storyId) return;
    try {
      await deleteBranch(branchId);
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      if (activeBranchId === branchId && mainBranch?.tip_node_id) {
        setActiveBranchId(mainBranch.id);
        await handleJumpToNode(mainBranch.tip_node_id);
      }
      const updatedNodes = await getAllStoryNodes(storyId);
      setAllNodes(updatedNodes);
      toast.success("Branch deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete branch");
    }
  }, [storyId, activeBranchId, mainBranch, handleJumpToNode]);

  const handleReturnToMain = useCallback(async () => {
    if (!mainBranch?.tip_node_id) return;
    setActiveBranchId(mainBranch.id);
    await handleJumpToNode(mainBranch.tip_node_id);
  }, [mainBranch, handleJumpToNode]);

  const handleExploreNodeClick = useCallback(async (nodeId: string) => {
    const node = allNodes.find((n: any) => n.id === nodeId);
    if (node?.branch_id) {
      setActiveBranchId(node.branch_id);
    }
    await handleJumpToNode(nodeId);
  }, [allNodes, handleJumpToNode]);

  const handleToneChange = async (tone: string) => {
    setStoryMeta((prev) => ({ ...prev, tone }));
    try {
      await updateStoryTone(storyId!, tone);
      toast.success(`Tone set to "${tone}"`);
    } catch {
      toast.error("Failed to update tone");
    }
  };

  const handleEdit = (id: string, newText: string) => {
    setParagraphs((prev) => prev.map((p) => (p.id === id ? { ...p, text: newText } : p)));
    setIsDesyncced(true);
  };

  const handleRealign = async () => {
    setIsDesyncced(false);
    const allText = paragraphs.map((p) => p.text).join("\n\n");
    try {
      const result = await summarizeStory({ fullText: allText, previousSummary: summary, storyState });
      setSummary(result.summary);
      setStoryState(result.story_state);
      toast.success("Story re-aligned with your edits");
      fetchChoices(allText, { activeNodeCount: activeNodes.length });
    } catch {
      toast.error("Failed to re-align");
    }
  };

  const handleOpenChapterReview = async (options?: {
    force?: boolean;
    activeNodesOverride?: any[];
    currentTipIdOverride?: string | null;
  }) => {
    const reviewActiveNodes = options?.activeNodesOverride ?? activeNodes;
    const currentTipId = options?.currentTipIdOverride ?? lastNodeId;

    if (isMobile) {
      setStructureOpen(true);
    }

    if (
      !options?.force &&
      !isChapterSuggestionsStale({ suggestionsTipId: chapterSuggestionsTipId, currentTipId })
    ) {
      if (chapterSuggestions.length > 0) {
        setChapterSuggestionsExpanded(true);
      }
      return;
    }

    if (isChapterReviewLoading) return;

    setIsChapterReviewLoading(true);
    setChapterSuggestionsExpanded(true);

    try {
      // Always include the node that starts the current chapter so the AI can
      // suggest renaming it, even when it falls outside the last-6 window.
      const tail = reviewActiveNodes.slice(-6);
      let currentChapterStartIndex = -1;
      for (let i = reviewActiveNodes.length - 1; i >= 0; i--) {
        if ((reviewActiveNodes[i] as any).starts_chapter) {
          currentChapterStartIndex = i;
          break;
        }
      }
      const tailStartIndex = reviewActiveNodes.length - tail.length;
      const nodesForReview =
        currentChapterStartIndex >= 0 && currentChapterStartIndex < tailStartIndex
          ? [reviewActiveNodes[currentChapterStartIndex], ...tail]
          : tail;

      const recentNodes = nodesForReview.map((node) => ({
        id: node.id,
        text: node.text || "",
        startsChapter: Boolean((node as any).starts_chapter),
        chapterTitle: (node as any).chapter_title || null,
        paragraphCount: Math.max(1, (node.text || "").split("\n\n").filter(Boolean).length),
      }));

      const suggestions = await generateChapterSuggestions({
        recentNodes,
        premise: storyMeta.premise,
        tone: storyMeta.tone,
        genre: storyMeta.genre,
        summary,
        beat: buildBeatPayload(getCurrentBeat(reviewActiveNodes.length), false),
      });

      setChapterSuggestions(suggestions);
      setChapterSuggestionsTipId(currentTipId);
      setChapterSuggestionsExpanded(suggestions.length > 0);
      setChapterReviewCheckpoint({
        reviewedAtTurns: reviewActiveNodes.length,
        dismissedAtTurns: null,
        reviewedTipId: currentTipId,
      });
    } catch {
      toast.error("Failed to prepare chapter suggestions");
    } finally {
      setIsChapterReviewLoading(false);
    }
  };

  const handleStartBreakMode = () => {
    setStructureOpen(false);
    setChapterEditMode(true);
  };

  const handleDismissChapterReview = () => {
    setChapterSuggestions([]);
    setChapterSuggestionsTipId(null);
    setChapterSuggestionsExpanded(false);
    setChapterReviewCheckpoint((prev) => ({
      ...prev,
      dismissedAtTurns: activeNodes.length,
    }));
  };

  const handleApplyChapterSuggestion = async (suggestion: ChapterSuggestion) => {
    const suggestionKey = `${suggestion.type}-${suggestion.anchorNodeId}-${suggestion.anchorParagraphIndex ?? "rename"}`;
    if (applyingSuggestionKey) return;

    setApplyingSuggestionKey(suggestionKey);
    let applied = false;

    try {
      if (suggestion.type === "rename_recent_chapter" && suggestion.proposedTitle) {
        applied = await handleChapterRename(suggestion.anchorNodeId, suggestion.proposedTitle);
      }

      if (suggestion.type === "start_new_chapter_here" && typeof suggestion.anchorParagraphIndex === "number") {
        applied = await handleInsertBreak(suggestion.anchorNodeId, suggestion.anchorParagraphIndex);
      }

      if (!applied) return;

      if (suggestion.type === "rename_recent_chapter") {
        setChapterSuggestions((prev) =>
          prev.filter(
            (candidate) =>
              `${candidate.type}-${candidate.anchorNodeId}-${candidate.anchorParagraphIndex ?? "rename"}` !== suggestionKey,
          ),
        );
        return;
      }

      setChapterSuggestions((prev) => prev.filter((candidate) => candidate.type === "rename_recent_chapter"));

      const refreshedActiveNodes = await getStoryNodes(storyId!);
      const refreshedTipId = refreshedActiveNodes[refreshedActiveNodes.length - 1]?.id ?? null;
      await handleOpenChapterReview({
        force: true,
        activeNodesOverride: refreshedActiveNodes,
        currentTipIdOverride: refreshedTipId,
      });
    } finally {
      setApplyingSuggestionKey(null);
    }
  };

  const handleBeginConclusion = async () => {
    if (!storyId || isGenerating || isProcessing) return;

    const nextArcOverride = "concluding";
    setArcOverride(nextArcOverride);

    try {
      await apiClient.updateStory(storyId, { arc_override: nextArcOverride });
      await fetchChoices(paragraphs.slice(-3).map((p) => p.text).join("\n\n"), {
        activeNodeCount: activeNodes.length,
        arcOverride: nextArcOverride,
      });
    } catch {
      setArcOverride((prev) => (prev === nextArcOverride ? null : prev));
      toast.error("Failed to begin the conclusion");
    }
  };

  const handleContinueAnyway = async () => {
    if (!storyId) return;

    const lastChoiceType = activeNodes[activeNodes.length - 1]?.chosen_option?.type;
    const endingType = lastChoiceType === "epilogue" ? "epilogue" : "conclude";
    const nextArcState = seedPostEndingArcState(activeNodes.length, endingType);

    try {
      await apiClient.updateStory(storyId, {
        status: "in_progress",
        arc_override: "post_ending",
        arc_state: nextArcState,
      });
      setIsStoryComplete(false);
      setArcOverride("post_ending");
      setArcState(nextArcState);
      setChoiceVariantOffset(0);
      await fetchChoices(paragraphs.slice(-3).map((p) => p.text).join("\n\n"), {
        activeNodeCount: activeNodes.length,
        arcOverride: "post_ending",
        arcStateOverride: nextArcState,
      });
    } catch {
      toast.error("Failed to continue the story");
    }
  };

  const handleExport = async () => {
    if (!limits.export) {
      toast.error("PDF export is available on Plus and Pro plans");
      return;
    }
    setIsExporting(true);
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const resp = await fetch("/api/export-story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ storyId }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || "Export failed");
      }
      const data = await resp.json();
      const { generatePDF } = await import("@/lib/pdf-export");
      generatePDF(data);
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!limits.sharing) {
      toast.error("Public sharing is available on the Pro plan");
      return;
    }

    try {
      if (shareToken) {
        // Already shared — copy link
        const url = `${window.location.origin}/s/${shareToken}`;
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard");
      } else {
        // Generate new share token
        const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        await apiClient.updateStory(storyId!, { share_token: token });
        setShareToken(token);
        const url = `${window.location.origin}/s/${token}`;
        await navigator.clipboard.writeText(url);
        toast.success("Story shared! Link copied to clipboard");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to share");
    }
  };

  const wordCount = useMemo(
    () => paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length, 0),
    [paragraphs]
  );

  // Chapters are a subset of the active timeline path.
  // A chapter starts at the root node or at a node created by an explicit chapter break.
  // Regular choice generations should extend the current chapter, not create a new one.
  const activeNodes = useMemo(
    () => allNodes.filter((n) => n.is_active),
    [allNodes]
  );
  const isAtOpening = activeNodes.length === 1
    && !activeNodes[0]?.chosen_option
    && !allNodes.some((n) => n.parent_id === activeNodes[0]?.id);
  const currentBeat = useMemo(() => getCurrentBeat(activeNodes.length), [activeNodes.length, arcOverride, targetTurns]);
  const recentMoveFamilies = useMemo(
    () => activeNodes
      .map((node) => node.chosen_option?.type)
      .filter(Boolean)
      .slice(-2),
    [activeNodes]
  );
  const previousBeat = useMemo(
    () => (activeNodes.length > 0 ? getCurrentBeat(Math.max(activeNodes.length - 1, 0)) : null),
    [activeNodes.length, arcOverride, targetTurns],
  );
  const wordsSinceChapterStart = useMemo(
    () =>
      countWordsSinceChapterStart(
        activeNodes.map((node) => ({
          text: node.text || "",
          startsChapter: Boolean((node as any).starts_chapter),
        })),
      ),
    [activeNodes],
  );
  const chapterReviewEligible = useMemo(
    () =>
      shouldOfferChapterReview({
        activeTurns: activeNodes.length,
        currentTipId: lastNodeId,
        checkpoint: chapterReviewCheckpoint,
        beatPhaseChanged: Boolean(previousBeat && previousBeat.phase !== currentBeat.phase),
        wordsSinceChapterStart,
      }),
    [activeNodes.length, chapterReviewCheckpoint, currentBeat.phase, lastNodeId, previousBeat, wordsSinceChapterStart],
  );

  useEffect(() => {
    if (!lastNodeId) return;
    if (
      !shouldResetChapterReviewCheckpoint({
        activeNodeIds: activeNodes.map((node) => node.id),
        checkpoint: chapterReviewCheckpoint,
      })
    ) {
      return;
    }

    setChapterReviewCheckpoint({
      reviewedAtTurns: activeNodes.length,
      dismissedAtTurns: null,
      reviewedTipId: lastNodeId,
    });
    setChapterSuggestions([]);
    setChapterSuggestionsTipId(null);
  }, [activeNodes, chapterReviewCheckpoint, lastNodeId]);

  useEffect(() => {
    if (!isChapterSuggestionsStale({ suggestionsTipId: chapterSuggestionsTipId, currentTipId: lastNodeId })) {
      return;
    }

    setChapterSuggestions([]);
    setChapterSuggestionsTipId(null);
  }, [chapterSuggestionsTipId, lastNodeId]);

  const chapterNodes = useMemo(
    () => activeNodes.filter((n) => (n as any).starts_chapter === true),
    [activeNodes]
  );

  const currentChapterStartId = useMemo(
    () => [...activeNodes].reverse().find((node) => (node as any).starts_chapter === true)?.id ?? null,
    [activeNodes],
  );

  const breakTargetNodeIds = useMemo(() => {
    if (showEarlierBreakTargets || !currentChapterStartId) return activeNodes.map((node) => node.id);

    let include = false;
    return activeNodes
      .filter((node) => {
        if (node.id === currentChapterStartId) include = true;
        return include;
      })
      .map((node) => node.id);
  }, [activeNodes, currentChapterStartId, showEarlierBreakTargets]);

  // Count how many break points exist (paragraphs > 1 within a node = splittable)
  const breakPointCount = useMemo(
    () =>
      activeNodes.reduce((count, node) => {
        const paraCount = (node.text || "").split("\n\n").filter(Boolean).length;
        return count + Math.max(0, paraCount - 1);
      }, 0),
    [activeNodes],
  );

  const chapters: Chapter[] = useMemo(() => {
    return chapterNodes.map((n, i) => ({
      id: n.id,
      title: (n as any).chapter_title || `Chapter ${i + 1}`,
      wordCount: (n.text || "").split(/\s+/).filter(Boolean).length,
      isActive: n.id === lastNodeId,
      isRoot: !n.parent_id,
    }));
  }, [chapterNodes, lastNodeId]);

  const chapterHeadings: ChapterHeading[] = useMemo(() => {
    return chapterNodes.map((n, i) => ({
      nodeId: n.id,
      title: (n as any).chapter_title || `Chapter ${i + 1}`,
    }));
  }, [chapterNodes]);

  const graphNodes: GraphNode[] = useMemo(() => {
    // Identify chapter-split nodes: starts_chapter, no chosen_option, not root,
    // and only child of their parent. These are structural artifacts from
    // splitting a node for a chapter break — hide them from the graph.
    const childCount = new Map<string, number>();
    for (const n of allNodes) {
      if (n.parent_id) childCount.set(n.parent_id, (childCount.get(n.parent_id) ?? 0) + 1);
    }
    const isSplitNode = (n: typeof allNodes[number]) =>
      n.starts_chapter === true &&
      !n.chosen_option &&
      n.parent_id &&
      (childCount.get(n.parent_id) ?? 0) === 1;

    const splitIds = new Set(allNodes.filter(isSplitNode).map((n) => n.id));

    // Build a remap: if a node's parent was a split node, point to the split's parent instead
    const parentRemap = new Map<string, string | null>();
    for (const n of allNodes) {
      if (splitIds.has(n.id)) {
        parentRemap.set(n.id, n.parent_id);
      }
    }

    const resolveParent = (parentId: string | null): string | null => {
      let cur = parentId;
      while (cur && parentRemap.has(cur)) {
        cur = parentRemap.get(cur)!;
      }
      return cur;
    };

    return allNodes
      .filter((n) => !splitIds.has(n.id))
      .map((n) => ({
        id: n.id,
        parentId: resolveParent(n.parent_id),
        branchId: n.branch_id ?? null,
        chosenLabel: (n.chosen_option as any)?.label ?? null,
        chosenType: (n.chosen_option as any)?.type ?? null,
        chosenPreview: (n.chosen_option as any)?.preview ?? null,
        wordCount: n.text?.split(/\s+/).filter(Boolean).length ?? 0,
        isActive: n.is_active,
        startsChapter: n.starts_chapter === true,
      }));
  }, [allNodes]);

  const handleChapterClick = (id: string) => {
    const el = document.getElementById(`para-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleChapterRename = async (id: string, newTitle: string) => {
    try {
      await updateNodeChapterTitle(id, newTitle);
      await refreshAllNodes();
      toast.success("Chapter renamed");
      return true;
    } catch {
      toast.error("Failed to rename chapter");
      return false;
    }
  };

  const handleChapterDelete = async (id: string) => {
    if (isGenerating || isProcessing) return;
    try {
      await deleteNodeAndDescendants(storyId!, id);
      const activeNodes = await getStoryNodes(storyId!);
      const paras = buildParagraphsFromNodes(activeNodes);
      setParagraphs(paras);
      const lastNode = activeNodes[activeNodes.length - 1];
      setLastNodeId(lastNode?.id || null);
      setSummary(lastNode?.summary || "");
      setStoryState(lastNode?.story_state || {});
      setChoices([]);
      await refreshAllNodes();
      if (lastNode) fetchChoices(paras.map((p) => p.text).join("\n\n"));
      toast.success("Chapter deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete chapter");
    }
  };

  const handleChapterMerge = async (id: string) => {
    if (isGenerating || isProcessing) return;
    setIsProcessing(true);
    try {
      await mergeNodeWithParent(storyId!, id);
      const activeNodes = await getStoryNodes(storyId!);
      const paras = buildParagraphsFromNodes(activeNodes);
      setParagraphs(paras);
      const lastNode = activeNodes[activeNodes.length - 1];
      setLastNodeId(lastNode?.id || null);
      setSummary(lastNode?.summary || "");
      setStoryState(lastNode?.story_state || {});
      setChoices([]);
      await refreshAllNodes();
      if (lastNode) fetchChoices(paras.map((p) => p.text).join("\n\n"));
      toast.success("Chapters merged");
    } catch (e: any) {
      toast.error(e.message || "Failed to merge chapters");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateChapterTitle = async (chapterId: string): Promise<string> => {
    const chapterIndex = chapterNodes.findIndex((node) => node.id === chapterId);
    const chapterStart = chapterNodes[chapterIndex];
    const nextChapterStart = chapterNodes[chapterIndex + 1];
    const startIndex = activeNodes.findIndex((node) => node.id === chapterStart.id);
    const endIndex = nextChapterStart
      ? activeNodes.findIndex((node) => node.id === nextChapterStart.id)
      : activeNodes.length;

    const chapterSlice = activeNodes.slice(startIndex, endIndex);
    const recentNodes = chapterSlice.map((node) => ({
      id: node.id,
      text: node.text || "",
      startsChapter: (node as any).starts_chapter === true,
      chapterTitle: (node as any).chapter_title || null,
    }));

    return generateChapterTitle({
      recentNodes,
      premise: storyMeta.premise,
      tone: storyMeta.tone,
      genre: storyMeta.genre,
      summary,
      currentTitle: chapterStart.chapter_title || undefined,
    });
  };

  const handleInsertBreak = async (nodeId: string, paragraphIndex: number) => {
    if (isGenerating || isProcessing || pendingBreakKey) return false;

    const targetNode = activeNodes.find((node) => node.id === nodeId);
    const paragraphCount = Math.max(1, (targetNode?.text || "").split("\n\n").filter(Boolean).length);
    if (!targetNode || paragraphIndex <= 0 || paragraphIndex >= paragraphCount) {
      toast.error("That chapter break is no longer valid. Review the structure and try again.");
      return false;
    }

    const breakKey = `${nodeId}:${paragraphIndex}`;
    setPendingBreakKey(breakKey);
    try {
      await splitNodeAtPosition(storyId!, nodeId, paragraphIndex);
      const activeNodes = await getStoryNodes(storyId!);
      const paras = buildParagraphsFromNodes(activeNodes);
      setParagraphs(paras);
      const lastNode = activeNodes[activeNodes.length - 1];
      setLastNodeId(lastNode?.id || null);
      setSummary(lastNode?.summary || "");
      setStoryState(lastNode?.story_state || {});
      setChoices([]);
      // Exit break mode — node IDs have changed after the split
      setChapterEditMode(false);
      setShowEarlierBreakTargets(false);
      await refreshAllNodes();
      if (lastNode) fetchChoices(paras.map((p) => p.text).join("\n\n"));
      toast.success("Chapter break inserted");
      return true;
    } catch (e: any) {
      toast.error(e.message || "Failed to insert break");
      return false;
    } finally {
      setPendingBreakKey(null);
    }
  };

  const reviewPromptCard =
    chapterReviewEligible && !isDesyncced && !isProcessing && !isStoryComplete ? (
      <ChapterReviewPrompt
        suggestionCount={chapterSuggestions.length || undefined}
        isLoading={isChapterReviewLoading}
        onReview={() => {
          void handleOpenChapterReview();
        }}
      />
    ) : null;

  const chapterSuggestionCards =
    chapterSuggestions.length > 0 ? (
      <div
        data-testid="chapter-suggestion-list"
        className={
          isMobile
            ? "space-y-2 max-h-[26vh] overflow-y-auto overscroll-contain pr-1"
            : "space-y-2 max-h-[32vh] overflow-y-auto overscroll-contain pr-1"
        }
      >
        {chapterSuggestions.map((suggestion) => {
          const suggestionKey = `${suggestion.type}-${suggestion.anchorNodeId}-${suggestion.anchorParagraphIndex ?? "rename"}`;
          const isApplyingSuggestion = applyingSuggestionKey === suggestionKey;
          const isRenameSuggestion = suggestion.type === "rename_recent_chapter";
          const suggestionLabel = isRenameSuggestion ? "Rename chapter" : "Start new chapter";
          const primaryActionLabel = isRenameSuggestion ? "Apply title" : "Insert chapter";

          return (
            <div
              key={suggestionKey}
              className="rounded-xl border border-border bg-card p-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {suggestionLabel}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {suggestion.proposedTitle ||
                  (isRenameSuggestion ? "Suggested chapter title" : "Suggested chapter break")}
              </p>
              {!isRenameSuggestion ? (
                <p className="mt-1 text-xs text-muted-foreground">Creates a break at this point.</p>
              ) : null}
              <p
                className="mt-2 text-xs text-muted-foreground"
                style={
                  isMobile
                    ? {
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }
                    : undefined
                }
              >
                {suggestion.reason}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleApplyChapterSuggestion(suggestion);
                  }}
                  disabled={Boolean(applyingSuggestionKey)}
                  className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isApplyingSuggestion ? "Applying…" : primaryActionLabel}
                </button>
                <button
                  type="button"
                  onClick={handleDismissChapterReview}
                  disabled={Boolean(applyingSuggestionKey)}
                  className="rounded-lg bg-secondary px-3 py-2 text-xs transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    ) : null;

  const mobileChapterReviewPanel =
    chapterSuggestions.length > 0 ? (
      <div className="rounded-2xl border border-border bg-card/80 px-4 py-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {chapterSuggestions.length} chapter suggestion{chapterSuggestions.length === 1 ? "" : "s"} ready
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Keep writing or expand these suggestions without losing sight of your chapters.
            </p>
            {isChapterReviewLoading ? (
              <p className="mt-1 text-xs text-primary">Refreshing suggestions…</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setChapterSuggestionsExpanded((prev) => !prev)}
            className="shrink-0 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 active:scale-[0.98]"
          >
            {chapterSuggestionsExpanded ? "Hide" : "Show"}
          </button>
        </div>

        {chapterSuggestionsExpanded ? <div className="mt-3">{chapterSuggestionCards}</div> : null}
      </div>
    ) : (
      reviewPromptCard
    );

  const chapterReviewPanel = isMobile ? mobileChapterReviewPanel : chapterSuggestionCards ?? reviewPromptCard;

  const toolsActions = (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => {
          if (limits.export) {
            void handleExport();
          }
        }}
        disabled={!limits.export || isExporting}
        className="rounded-xl bg-secondary px-3 py-2 text-left text-xs transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {limits.export ? "Export PDF" : "Export requires Plus or Pro"}
      </button>
      <button
        type="button"
        onClick={() => {
          if (limits.sharing) {
            void handleShare();
          }
        }}
        disabled={!limits.sharing}
        className="rounded-xl bg-secondary px-3 py-2 text-left text-xs transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {limits.sharing ? (shareToken ? "Copy share link" : "Share story") : "Sharing requires Pro"}
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        className="rounded-xl bg-secondary px-3 py-2 text-left text-xs transition-colors hover:bg-secondary/80"
      >
        Toggle {theme === "light" ? "dark" : "light"} mode
      </button>
    </div>
  );

  const header = (
    <>
      <header className="h-12 flex items-center justify-between px-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-2">
          {!isMobile ? (
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors active:scale-95"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary" />
            <EditableStoryTitle
              title={storyTitle}
              onRename={async (title) => {
                setStoryTitle(title);
                await updateStoryTitle(storyId!, title);
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isMobile ? (
            <button
              type="button"
              onClick={() => setToneOpen((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors active:scale-95"
            >
              <Palette className="w-3 h-3" />
              <span className="hidden sm:inline">{storyMeta.tone || "Set tone"}</span>
            </button>
          ) : null}
          {!isMobile ? (
            !limits.export ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => navigate("/pricing")}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors active:scale-95"
                  >
                    <Lock className="w-3 h-3" />
                    <span className="hidden sm:inline">Export</span>
                    <Crown className="w-2.5 h-2.5 text-primary" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>PDF export requires a Plus or Pro plan</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void handleExport();
                }}
                disabled={isExporting}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors active:scale-95 disabled:opacity-50"
                title="Export as PDF"
              >
                {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                <span className="hidden sm:inline">Export</span>
              </button>
            )
          ) : null}
          {!isMobile ? (
            !limits.sharing ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => navigate("/pricing")}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors active:scale-95"
                  >
                    <Lock className="w-3 h-3" />
                    <span className="hidden sm:inline">Share</span>
                    <Crown className="w-2.5 h-2.5 text-primary" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Public sharing requires a Pro plan</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void handleShare();
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors active:scale-95"
                title={shareToken ? "Copy share link" : "Create share link"}
              >
                {shareToken ? <Link className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                <span className="hidden sm:inline">{shareToken ? "Shared" : "Share"}</span>
              </button>
            )
          ) : null}
          <span className="text-xs text-muted-foreground tabular-nums">{wordCount.toLocaleString()} words</span>
          {!isMobile ? (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors active:scale-95"
            >
              {theme === "light" ? (
                <Moon className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          ) : null}
          {!isMobile ? (
            <button
              type="button"
              onClick={() => setExplorePaneOpen(!explorePaneOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all active:scale-95 ${
                explorePaneOpen
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
              title="Explore branches"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span className="text-xs font-medium hidden sm:inline">Explore</span>
            </button>
          ) : null}
        </div>
      </header>

      {!isMobile ? (
        <TonePanel
          currentTone={storyMeta.tone}
          onToneChange={handleToneChange}
          isOpen={toneOpen}
          onClose={() => setToneOpen(false)}
          canCustomTone={limits.customTone}
        />
      ) : null}
    </>
  );

  const desktopSidebar = sidebarOpen ? (
    <aside className="w-56 shrink-0 border-r border-border/50 bg-card/50 overflow-hidden flex flex-col animate-fade-in">
      <ChapterSidebar
        chapters={chapters}
        totalWords={wordCount}
        onChapterClick={handleChapterClick}
        onRename={handleChapterRename}
        onDelete={handleChapterDelete}
        onMerge={handleChapterMerge}
        onGenerateTitle={handleGenerateChapterTitle}
        reviewSlot={chapterReviewPanel}
        onStartBreakMode={handleStartBreakMode}
      />
    </aside>
  ) : null;

  const content = (
    <div className={isMobile ? "px-4 py-6" : "max-w-[680px] mx-auto px-6 md:px-12 py-12 md:py-16"}>
      {!isMobile ? (
        <EditableTitle
          title={chapters.length > 0 ? chapters[0].title : "Chapter 1"}
          onRename={chapters.length > 0 ? (newTitle: string) => handleChapterRename(chapters[0].id, newTitle) : undefined}
        />
      ) : null}

      {isExploring && (
        <ExploreModeBar
          branchName={activeBranch?.name ?? null}
          onSetAsMain={() => activeBranchId && handlePromoteBranch(activeBranchId)}
          onReturnToMain={handleReturnToMain}
        />
      )}

      <ChapterEditModeBar
        active={chapterEditMode}
        onDone={() => {
          setChapterEditMode(false);
          setShowEarlierBreakTargets(false);
        }}
        onShowEarlier={isMobile ? () => setShowEarlierBreakTargets(true) : undefined}
        showEarlierExpanded={isMobile ? showEarlierBreakTargets : true}
        hasBreakPoints={breakPointCount > 0}
      />

      <StoryCanvas
        paragraphs={paragraphs}
        onEdit={handleEdit}
        chapterHeadings={chapterHeadings}
        onInsertBreak={handleInsertBreak}
        onRenameChapter={!isMobile || chapterEditMode ? handleChapterRename : undefined}
        chapterEditMode={isMobile ? chapterEditMode : chapterEditMode ? true : undefined}
        pendingBreakKey={pendingBreakKey}
        breakTargetNodeIds={chapterEditMode && isMobile ? breakTargetNodeIds : undefined}
      />

      {isMobile ? reviewPromptCard : null}

      {isAtOpening && !isGenerating && !isProcessing ? (
        <div className="mt-4 animate-fade-in">
          <button
            type="button"
            onClick={handleRegenerateOpening}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            Try a different opening
          </button>
        </div>
      ) : null}

      {isProcessing && !isGenerating ? (
        <div className="mt-6 flex items-center gap-3 text-muted-foreground animate-fade-in">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Saving and preparing choices…</span>
        </div>
      ) : null}

      {isDesyncced && !isGenerating && !isProcessing ? (
        <div className="mt-6 p-4 rounded-xl border border-choice-risky/30 bg-choice-risky/5 flex items-center gap-3 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-choice-risky shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-foreground font-medium">Text was edited</p>
            <p className="text-xs text-muted-foreground">Future options may not match your changes.</p>
          </div>
          <button
            type="button"
            onClick={handleRealign}
            className="text-xs font-medium text-primary hover:underline shrink-0"
          >
            Re-align story
          </button>
        </div>
      ) : null}

      {!isDesyncced && !isProcessing ? (
        isStoryComplete ? (
          <StoryComplete
            onShare={limits.sharing ? handleShare : undefined}
            onExport={limits.export ? handleExport : undefined}
            onDashboard={() => navigate("/dashboard")}
            onContinue={limits.arcOverrides ? handleContinueAnyway : undefined}
            showArcUpgradeHint={!limits.arcOverrides}
          />
        ) : (
          <ChoiceCards
            choices={choices}
            onSelect={handleChoiceSelect}
            onRegenerate={() =>
              fetchChoices(paragraphs.slice(-3).map((p) => p.text).join("\n\n"), {
                activeNodeCount: activeNodes.length,
              })
            }
            isLoading={isGenerating || isLoadingChoices}
            isNearEnd={currentBeat.isNearEnd}
            onBeginConclusion={handleBeginConclusion}
            isStoryComplete={isStoryComplete}
            sectionLength={sectionLength}
            onSectionLengthChange={setSectionLength}
            turnCount={limits.turns !== Infinity ? activeNodes.length : undefined}
            turnLimit={limits.turns !== Infinity ? limits.turns : undefined}
            modeLabel={arcOverride === "post_ending" ? "After the ending" : undefined}
            onAddChapterBreak={handleStartBreakMode}
          />
        )
      ) : null}

      <div className={isMobile ? "h-28" : "h-24"} />
    </div>
  );

  const structureSheet = (
    <StoryStructureSheet
      open={structureOpen}
      onOpenChange={setStructureOpen}
      reviewSlot={chapterReviewPanel}
      chaptersSlot={
        <ChapterSidebar
          chapters={chapters}
          totalWords={wordCount}
          onChapterClick={(id) => {
            handleChapterClick(id);
            setStructureOpen(false);
          }}
          onRename={handleChapterRename}
          onDelete={handleChapterDelete}
          onMerge={handleChapterMerge}
          onGenerateTitle={handleGenerateChapterTitle}
          embedded
          onStartBreakMode={handleStartBreakMode}
          onEnterEditMode={() => {
            handleStartBreakMode();
          }}
        />
      }
    />
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <StoryWriteMobileShell
        header={header}
        content={content}
        onWrite={() => {
          setStructureOpen(false);
          setToolsOpen(false);
          setChapterEditMode(false);
        }}
        onShowStructure={() => {
          setToolsOpen(false);
          setStructureOpen(true);
        }}
        onShowTools={() => {
          setStructureOpen(false);
          setToolsOpen(true);
        }}
        onShowExplore={() => setExploreSheetOpen(true)}
        structureSheet={structureSheet}
        toolsSheet={
          <StoryToolsSheet
            open={toolsOpen}
            onOpenChange={setToolsOpen}
            currentTone={storyMeta.tone}
            onToneChange={handleToneChange}
            toolsSlot={toolsActions}
            canCustomTone={limits.customTone}
          />
        }
        exploreSheet={
          <Sheet open={exploreSheetOpen} onOpenChange={setExploreSheetOpen}>
            <SheetContent side="bottom" className="flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl px-0">
              <SheetHeader className="px-4 pb-3 text-left">
                <SheetTitle>Explore Branches</SheetTitle>
                <SheetDescription className="sr-only">View and manage story branches.</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-hidden px-2 pb-6">
                <BranchGraph
                  nodes={graphNodes}
                  branches={branches}
                  currentNodeId={lastNodeId}
                  mainBranchId={mainBranch?.id ?? null}
                  isGenerating={isGenerating}
                  jumpingNodeId={jumpingNodeId}
                  onNodeClick={(nodeId) => {
                    void handleExploreNodeClick(nodeId);
                    setExploreSheetOpen(false);
                  }}
                  onBranchFromNode={(nodeId) => {
                    void handleBranchFromNode(nodeId);
                    setExploreSheetOpen(false);
                  }}
                  onPromoteBranch={(branchId) => {
                    void handlePromoteBranch(branchId);
                    setExploreSheetOpen(false);
                  }}
                  onDeleteBranch={(branchId) => {
                    void handleDeleteBranch(branchId);
                    setExploreSheetOpen(false);
                  }}
                  onExpandToFullPage={() => {
                    setExploreSheetOpen(false);
                    navigate(`/story/${id}/explore`);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        }
      />
    );
  }

  return (
    <StoryWriteDesktopShell
      header={header}
      sidebar={desktopSidebar}
      content={
        <div className="flex flex-1 h-full overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            {content}
          </main>
          <ExplorePane
            isOpen={explorePaneOpen}
            onClose={() => setExplorePaneOpen(false)}
            nodes={graphNodes}
            branches={branches}
            currentNodeId={lastNodeId}
            mainBranchId={mainBranch?.id ?? null}
            isGenerating={isGenerating}
            jumpingNodeId={jumpingNodeId}
            onNodeClick={handleExploreNodeClick}
            onBranchFromNode={handleBranchFromNode}
            onPromoteBranch={handlePromoteBranch}
            onDeleteBranch={handleDeleteBranch}
            onExpandToFullPage={() => navigate(`/story/${storyId}/explore`)}
          />
        </div>
      }
    />
  );
}
