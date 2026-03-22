import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, PanelLeft, Sun, Moon, AlertTriangle } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { StoryCanvas, type StoryParagraph } from "@/components/story/StoryCanvas";
import { ChoiceCards, type StoryChoice } from "@/components/story/ChoiceCards";
import { ChapterSidebar, type Chapter } from "@/components/story/ChapterSidebar";
import { streamSection, generateChoices, summarizeStory, getStory, getStoryNodes, createStoryNode, updateStoryTitle } from "@/lib/story-api";
import { toast } from "sonner";

export default function StoryWrite() {
  const { id: storyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paragraphs, setParagraphs] = useState<StoryParagraph[]>([]);
  const [choices, setChoices] = useState<StoryChoice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingChoices, setIsLoadingChoices] = useState(false);
  const [storyTitle, setStoryTitle] = useState("Untitled Story");
  const [storyMeta, setStoryMeta] = useState<{ genre?: string; tone?: string; premise?: string }>({});
  const [summary, setSummary] = useState<string>("");
  const [storyState, setStoryState] = useState<any>({});
  const [lastNodeId, setLastNodeId] = useState<string | null>(null);
  const [isDesyncced, setIsDesyncced] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  // Load story and nodes — guarded against double-mount
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

      const nodes = await getStoryNodes(storyId!);
      if (nodes.length > 0) {
        const paras: StoryParagraph[] = [];
        nodes.forEach((node) => {
          const texts = (node.text || "").split("\n\n").filter(Boolean);
          texts.forEach((t, i) => {
            paras.push({ id: `${node.id}-${i}`, text: t });
          });
        });
        setParagraphs(paras);
        const lastNode = nodes[nodes.length - 1];
        setLastNodeId(lastNode.id);
        setSummary(lastNode.summary || "");
        setStoryState(lastNode.story_state || {});
        if (lastNode.choices && Array.isArray(lastNode.choices) && (lastNode.choices as any[]).length > 0) {
          setChoices(lastNode.choices as any as StoryChoice[]);
        } else {
          // Generate choices for existing content
          fetchChoices(paras.map((p) => p.text).join("\n\n"));
        }
      } else {
        // New story — generate the opening
        generateOpening();
      }
    } catch (err: any) {
      toast.error("Failed to load story");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const generateOpening = async () => {
    setIsGenerating(true);
    let fullText = "";
    const streamingId = `streaming-${Date.now()}`;

    setParagraphs([{ id: streamingId, text: "", isStreaming: true }]);

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
        const paras = text.split("\n\n").filter(Boolean);
        setParagraphs(paras.map((t, i) => ({ id: `gen-${i}`, text: t })));

        // Save node and generate choices
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

          // Auto-title from first line
          const firstLine = text.split(".")[0]?.trim();
          if (firstLine && storyTitle === "Untitled Story") {
            const title = firstLine.length > 50 ? firstLine.slice(0, 50) + "…" : firstLine;
            setStoryTitle(title);
            await updateStoryTitle(storyId!, title);
          }
        } catch (e) {
          console.error("Failed to save node:", e);
        }

        fetchChoices(text);
      },
      onError: (err) => {
        setIsGenerating(false);
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

      // Save choices to last node
      if (lastNodeId) {
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("story_nodes").update({ choices: result as any }).eq("id", lastNodeId);
      }
    } catch (err: any) {
      toast.error("Failed to generate choices");
    } finally {
      setIsLoadingChoices(false);
    }
  };

  const handleChoiceSelect = async (choice: StoryChoice | { type: "custom"; label: string; preview: string }) => {
    setIsGenerating(true);
    setChoices([]);
    setIsDesyncced(false);

    const recentText = paragraphs.slice(-3).map((p) => p.text).join("\n\n");
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
        setParagraphs((prev) => {
          const existing = prev.filter((p) => !p.isStreaming);
          return [
            ...existing,
            ...newParas.map((t, i) => ({
              id: `new-${Date.now()}-${i}`,
              text: t,
              isStreaming: i === newParas.length - 1,
            })),
          ];
        });
      },
      onDone: async (text) => {
        setIsGenerating(false);
        const newParas = text.split("\n\n").filter(Boolean);
        setParagraphs((prev) => {
          const existing = prev.filter((p) => !p.isStreaming);
          return [...existing, ...newParas.map((t, i) => ({ id: `done-${Date.now()}-${i}`, text: t }))];
        });

        // Summarize and save
        try {
          const allText = [...paragraphs.filter((p) => !p.isStreaming).map((p) => p.text), ...newParas].join("\n\n");
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
        } catch (e) {
          console.error("Failed to save:", e);
        }

        fetchChoices(text);
      },
      onError: (err) => {
        setIsGenerating(false);
        toast.error(err);
      },
    });
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

  const chapters: Chapter[] = [
    { id: "ch1", title: storyTitle, wordCount, isActive: true },
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background transition-colors duration-500">
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
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">{wordCount.toLocaleString()} words</span>
          <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-secondary transition-colors active:scale-95">
            {theme === "light" ? <Moon className="w-3.5 h-3.5 text-muted-foreground" /> : <Sun className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <aside className="w-56 shrink-0 border-r border-border/50 bg-card/50 overflow-hidden animate-fade-in">
            <ChapterSidebar chapters={chapters} totalWords={wordCount} onChapterClick={() => {}} />
          </aside>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[680px] mx-auto px-6 md:px-12 py-12 md:py-16">
            <div className="mb-10">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Chapter 1</span>
              <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground mt-1 leading-tight">{storyTitle}</h2>
            </div>

            <StoryCanvas paragraphs={paragraphs} onEdit={handleEdit} />

            {/* Desync banner */}
            {isDesyncced && !isGenerating && (
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

            {!isDesyncced && (
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
