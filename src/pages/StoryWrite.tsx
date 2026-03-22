import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, PanelLeft, Sun, Moon, AlertTriangle, Palette, GitBranch, Hash, Download, Share2, Loader2, Link, Crown } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { getTierLimits } from "@/lib/subscription";
import { StoryCanvas, type StoryParagraph } from "@/components/story/StoryCanvas";
import { ChoiceCards, type StoryChoice } from "@/components/story/ChoiceCards";
import { ChapterSidebar, type Chapter } from "@/components/story/ChapterSidebar";
import { StoryTimeline, type TimelineNode } from "@/components/story/StoryTimeline";
import { TonePanel } from "@/components/story/TonePanel";
import { supabase } from "@/integrations/supabase/client";
import {
  streamSection, generateChoices, summarizeStory,
  getStory, getStoryNodes, getAllStoryNodes, createStoryNode,
  updateStoryTitle, updateStoryTone, jumpToNode,
} from "@/lib/story-api";
import { toast } from "sonner";

export default function StoryWrite() {
  const { id: storyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { tier } = useAuth();
  const limits = getTierLimits(tier);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"chapters" | "timeline">("chapters");
  const [paragraphs, setParagraphs] = useState<StoryParagraph[]>([]);
  const [choices, setChoices] = useState<StoryChoice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
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
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!storyId || loadedRef.current) return;
    loadedRef.current = true;
    loadStory();
  }, [storyId]);

  const loadStory = async () => {
    try {
      const story = await getStory(storyId!);
      setStoryTitle(story.title);
      setStoryMeta({ genre: story.genre || undefined, tone: story.tone || undefined, premise: story.premise || undefined });

      const [activeNodes, allStoryNodes] = await Promise.all([
        getStoryNodes(storyId!),
        getAllStoryNodes(storyId!),
      ]);

      setAllNodes(allStoryNodes);

      if (activeNodes.length > 0) {
        const paras: StoryParagraph[] = [];
        activeNodes.forEach((node) => {
          const texts = (node.text || "").split("\n\n").filter(Boolean);
          texts.forEach((t, i) => {
            paras.push({ id: `${node.id}-${i}`, text: t });
          });
        });
        setParagraphs(paras);
        const lastNode = activeNodes[activeNodes.length - 1];
        setLastNodeId(lastNode.id);
        setSummary(lastNode.summary || "");
        setStoryState(lastNode.story_state || {});
        if (lastNode.choices && Array.isArray(lastNode.choices) && (lastNode.choices as any[]).length > 0) {
          setChoices(lastNode.choices as any as StoryChoice[]);
        } else {
          fetchChoices(paras.map((p) => p.text).join("\n\n"));
        }
      } else {
        generateOpening();
      }
    } catch (err: any) {
      toast.error("Failed to load story");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const refreshAllNodes = async () => {
    try {
      const nodes = await getAllStoryNodes(storyId!);
      setAllNodes(nodes);
    } catch {}
  };

  const generateOpening = async () => {
    setIsGenerating(true);
    let fullText = "";

    setParagraphs([{ id: `streaming-${Date.now()}`, text: "", isStreaming: true }]);

    await streamSection({
      premise: storyMeta.premise,
      genre: storyMeta.genre,
      tone: storyMeta.tone,
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

        try {
          const summaryResult = await summarizeStory({ fullText: text, storyState: {} });
          setSummary(summaryResult.summary);
          setStoryState(summaryResult.story_state);

          const node = await createStoryNode({
            storyId: storyId!,
            text,
            summary: summaryResult.summary,
            storyState: summaryResult.story_state,
          });
          setLastNodeId(node.id);
          refreshAllNodes();

          const firstLine = text.split(".")[0]?.trim();
          if (firstLine && storyTitle === "Untitled Story") {
            const title = firstLine.length > 50 ? firstLine.slice(0, 50) + "…" : firstLine;
            setStoryTitle(title);
            await updateStoryTitle(storyId!, title);
          }
        } catch (e) {
          console.error("Failed to save node:", e);
        }

        setIsProcessing(false);
        fetchChoices(text);
      },
      onError: (err) => {
        setIsGenerating(false);
        setIsProcessing(false);
        toast.error(err);
      },
    });
  };

  const fetchChoices = async (recentText: string) => {
    setIsLoadingChoices(true);
    try {
      const result = await generateChoices({
        recentText,
        summary,
        storyState,
        tone: storyMeta.tone,
        genre: storyMeta.genre,
      });
      setChoices(result);

      if (lastNodeId) {
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("story_nodes").update({ choices: result as any }).eq("id", lastNodeId);
      }
    } catch {
      toast.error("Failed to generate choices");
    } finally {
      setIsLoadingChoices(false);
    }
  };

  const handleChoiceSelect = async (choice: StoryChoice | { type: "custom"; label: string; preview: string }) => {
    setIsGenerating(true);
    setChoices([]);
    setIsDesyncced(false);

    const existingParas = paragraphs.filter((p) => !p.isStreaming);
    const recentText = existingParas.slice(-3).map((p) => p.text).join("\n\n");
    let fullText = "";

    await streamSection({
      direction: choice.type === "custom" ? choice.preview : `${choice.label}: ${choice.preview}`,
      tone: storyMeta.tone,
      genre: storyMeta.genre,
      summary,
      recentText,
      storyState,
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

        try {
          const allText = [...existingParas.map((p) => p.text), ...newParas].join("\n\n");
          const summaryResult = await summarizeStory({
            fullText: allText,
            previousSummary: summary,
            storyState,
          });
          setSummary(summaryResult.summary);
          setStoryState(summaryResult.story_state);

          const node = await createStoryNode({
            storyId: storyId!,
            parentId: lastNodeId || undefined,
            text,
            summary: summaryResult.summary,
            storyState: summaryResult.story_state,
            chosenOption: choice,
          });
          setLastNodeId(node.id);
          refreshAllNodes();
        } catch (e) {
          console.error("Failed to save:", e);
        }

        setIsProcessing(false);
        fetchChoices(text);
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

    try {
      await jumpToNode(storyId!, nodeId);

      const activeNodes = await getStoryNodes(storyId!);
      const paras: StoryParagraph[] = [];
      activeNodes.forEach((node) => {
        const texts = (node.text || "").split("\n\n").filter(Boolean);
        texts.forEach((t, i) => {
          paras.push({ id: `${node.id}-${i}`, text: t });
        });
      });
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
      } else {
        fetchChoices(paras.map((p) => p.text).join("\n\n"));
      }

      toast.success("Jumped to this point");
    } catch {
      toast.error("Failed to jump");
    }
  };

  const handleForkFromNode = async (nodeId: string) => {
    await handleJumpToNode(nodeId);
    toast.info("Forked — choose a new direction");
  };

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
      fetchChoices(allText);
    } catch {
      toast.error("Failed to re-align");
    }
  };

  const wordCount = useMemo(
    () => paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length, 0),
    [paragraphs]
  );

  // Build chapters from active nodes
  const chapters: Chapter[] = useMemo(() => {
    const activeNodes = allNodes.filter((n) => n.is_active);
    return activeNodes.map((n, i) => ({
      id: n.id,
      title: n.chosen_option?.label || (i === 0 ? "Opening" : `Section ${i + 1}`),
      wordCount: (n.text || "").split(/\s+/).filter(Boolean).length,
      isActive: n.id === lastNodeId,
    }));
  }, [allNodes, lastNodeId]);

  const timelineNodes: TimelineNode[] = useMemo(() =>
    allNodes.map((n) => ({
      id: n.id,
      parentId: n.parent_id,
      chosenLabel: n.chosen_option?.label || null,
      createdAt: n.created_at,
      isActive: n.is_active,
      wordCount: (n.text || "").split(/\s+/).filter(Boolean).length,
    })),
    [allNodes]
  );

  const handleChapterClick = (id: string) => {
    // Scroll to the paragraph from this node
    const el = document.getElementById(`para-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background transition-colors duration-500 relative">
      <header className="h-12 flex items-center justify-between px-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors active:scale-95">
            <PanelLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-story text-sm font-semibold text-foreground truncate max-w-[200px]">{storyTitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setToneOpen(!toneOpen)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors active:scale-95"
          >
            <Palette className="w-3 h-3" />
            <span className="hidden sm:inline">{storyMeta.tone || "Set tone"}</span>
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">{wordCount.toLocaleString()} words</span>
          <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-secondary transition-colors active:scale-95">
            {theme === "light" ? <Moon className="w-3.5 h-3.5 text-muted-foreground" /> : <Sun className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </header>

      <TonePanel
        currentTone={storyMeta.tone}
        onToneChange={handleToneChange}
        isOpen={toneOpen}
        onClose={() => setToneOpen(false)}
      />

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <aside className="w-56 shrink-0 border-r border-border/50 bg-card/50 overflow-hidden flex flex-col animate-fade-in">
            {/* Tab switcher */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setSidebarTab("chapters")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  sidebarTab === "chapters"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Hash className="w-3 h-3" />
                Chapters
              </button>
              <button
                onClick={() => setSidebarTab("timeline")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  sidebarTab === "timeline"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GitBranch className="w-3 h-3" />
                Timeline
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {sidebarTab === "chapters" ? (
                <ChapterSidebar
                  chapters={chapters}
                  totalWords={wordCount}
                  onChapterClick={handleChapterClick}
                />
              ) : (
                <StoryTimeline
                  nodes={timelineNodes}
                  currentNodeId={lastNodeId}
                  onJumpToNode={handleJumpToNode}
                  onForkFromNode={handleForkFromNode}
                  totalWords={wordCount}
                  storyTitle={storyTitle}
                />
              )}
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[680px] mx-auto px-6 md:px-12 py-12 md:py-16">
            <div className="mb-10">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Chapter 1</span>
              <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground mt-1 leading-tight">{storyTitle}</h2>
            </div>

            <StoryCanvas paragraphs={paragraphs} onEdit={handleEdit} />

            {/* Processing indicator — shows after streaming ends while saving/summarizing */}
            {isProcessing && !isGenerating && (
              <div className="mt-6 flex items-center gap-3 text-muted-foreground animate-fade-in">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Saving and preparing choices…</span>
              </div>
            )}

            {isDesyncced && !isGenerating && !isProcessing && (
              <div className="mt-6 p-4 rounded-xl border border-choice-risky/30 bg-choice-risky/5 flex items-center gap-3 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-choice-risky shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">Text was edited</p>
                  <p className="text-xs text-muted-foreground">Future options may not match your changes.</p>
                </div>
                <button onClick={handleRealign} className="text-xs font-medium text-primary hover:underline shrink-0">
                  Re-align story
                </button>
              </div>
            )}

            {!isDesyncced && !isProcessing && (
              <ChoiceCards
                choices={choices}
                onSelect={handleChoiceSelect}
                onRegenerate={() => fetchChoices(paragraphs.slice(-3).map((p) => p.text).join("\n\n"))}
                isLoading={isGenerating || isLoadingChoices}
              />
            )}

            <div className="h-24" />
          </div>
        </main>
      </div>
    </div>
  );
}
