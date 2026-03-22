import { BookOpen, Hash, ChevronRight } from "lucide-react";

export interface Chapter {
  id: string;
  title: string;
  wordCount: number;
  isActive?: boolean;
}

interface ChapterSidebarProps {
  chapters: Chapter[];
  totalWords: number;
  onChapterClick: (id: string) => void;
}

export function ChapterSidebar({ chapters, totalWords, onChapterClick }: ChapterSidebarProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="font-story font-semibold text-foreground text-sm">Chapters</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {totalWords.toLocaleString()} words
        </div>
      </div>

      {/* Chapter List */}
      <div className="flex-1 overflow-y-auto p-2">
        {chapters.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Chapters will appear as your story grows
          </div>
        ) : (
          <div className="space-y-0.5">
            {chapters.map((ch, i) => (
              <button
                key={ch.id}
                onClick={() => onChapterClick(ch.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 flex items-center gap-2 group active:scale-[0.98] ${
                  ch.isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Hash className="w-3.5 h-3.5 shrink-0 opacity-50" />
                <span className="truncate flex-1">{ch.title || `Chapter ${i + 1}`}</span>
                <span className="text-xs opacity-0 group-hover:opacity-60 transition-opacity">
                  {ch.wordCount}w
                </span>
                {ch.isActive && <ChevronRight className="w-3 h-3 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
