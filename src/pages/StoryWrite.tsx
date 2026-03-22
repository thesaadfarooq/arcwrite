import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, PanelLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { StoryCanvas, type StoryParagraph } from "@/components/story/StoryCanvas";
import { ChoiceCards, type StoryChoice } from "@/components/story/ChoiceCards";
import { ChapterSidebar, type Chapter } from "@/components/story/ChapterSidebar";

// Demo data — will be replaced by real AI generation
const demoParagraphs: StoryParagraph[] = [
  {
    id: "1",
    text: "The signal arrived on a Tuesday, which felt wrong. Discoveries like this — the kind that rewrite textbooks and topple careers — should land on days with more gravity. A Thursday, perhaps, or the ominous quiet of a Sunday morning. But it was Tuesday, and Dr. Maren Okoro was eating leftover pad thai when the alert pinged her personal terminal.",
  },
  {
    id: "2",
    text: "She almost ignored it. The Kepler Array threw false positives the way a dog sheds fur — constantly, everywhere, impossible to fully clean up. But something about the frequency signature made her set down the fork. It was 1,427 megahertz. The hydrogen line. And it was coming from Gliese 581.",
  },
  {
    id: "3",
    text: "Maren had been to Gliese 581. Or rather, she'd spent four years of her life aiming humanity's most expensive telescope at it, mapping its planets from a cramped station orbiting Europa. That was eleven years ago. The system had been declared barren — no atmosphere worth mentioning on any of the rocky worlds, no biosignatures, no anomalies. She'd co-authored the paper herself. 'Comprehensive Survey of the Gliese 581 System: Null Results for Technosignatures.' The most expensive null result in history.",
  },
];

const demoChoices: StoryChoice[] = [
  { type: "safe", label: "Report the signal through official channels", preview: "Maren contacts her former supervisor at SETI and begins the standard verification protocol, knowing it will take weeks." },
  { type: "risky", label: "Investigate secretly first", preview: "Before telling anyone, Maren uses her old access codes to redirect the Array for a closer look — a career-ending move if caught." },
  { type: "emotional", label: "Call her old research partner", preview: "She picks up the phone and dials Jonas, the one person who believed they'd missed something on that survey eleven years ago." },
  { type: "chaotic", label: "Transmit a response immediately", preview: "Without thinking, Maren mirrors the signal pattern and sends it back. First contact protocol be damned." },
];

export default function StoryWrite() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paragraphs, setParagraphs] = useState<StoryParagraph[]>(demoParagraphs);
  const [choices] = useState<StoryChoice[]>(demoChoices);
  const [isGenerating] = useState(false);

  const wordCount = useMemo(
    () => paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0),
    [paragraphs]
  );

  const chapters: Chapter[] = [
    { id: "ch1", title: "The Signal", wordCount, isActive: true },
  ];

  const handleEdit = (id: string, newText: string) => {
    setParagraphs((prev) => prev.map((p) => (p.id === id ? { ...p, text: newText } : p)));
  };

  const handleChoiceSelect = (choice: StoryChoice | { type: "custom"; label: string; preview: string }) => {
    // Demo: add the choice preview as new paragraph
    setParagraphs((prev) => [
      ...prev,
      { id: `${Date.now()}`, text: choice.preview, isStreaming: false },
    ]);
  };

  return (
    <div className="h-screen flex flex-col bg-background transition-colors duration-500">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-story text-sm font-semibold text-foreground">The Signal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">{wordCount.toLocaleString()} words</span>
          <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-secondary transition-colors active:scale-95">
            {theme === "light" ? <Moon className="w-3.5 h-3.5 text-muted-foreground" /> : <Sun className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-56 shrink-0 border-r border-border/50 bg-card/50 overflow-hidden animate-fade-in">
            <ChapterSidebar chapters={chapters} totalWords={wordCount} onChapterClick={() => {}} />
          </aside>
        )}

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[680px] mx-auto px-6 md:px-12 py-12 md:py-16">
            {/* Chapter Header */}
            <div className="mb-10">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Chapter 1</span>
              <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground mt-1 leading-tight">The Signal</h2>
            </div>

            {/* Story Text */}
            <StoryCanvas paragraphs={paragraphs} onEdit={handleEdit} />

            {/* Choice Cards */}
            <ChoiceCards
              choices={choices}
              onSelect={handleChoiceSelect}
              onRegenerate={() => {}}
              isLoading={isGenerating}
            />

            {/* Bottom padding */}
            <div className="h-24" />
          </div>
        </main>
      </div>
    </div>
  );
}
