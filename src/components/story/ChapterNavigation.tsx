import { ChevronLeft, ChevronRight } from "lucide-react";

interface ChapterNavigationProps {
  currentIndex: number;
  totalChapters: number;
  currentTitle: string;
  onPrev: () => void;
  onNext: () => void;
}

export function ChapterNavigation({
  currentIndex,
  totalChapters,
  currentTitle,
  onPrev,
  onNext,
}: ChapterNavigationProps) {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < totalChapters - 1;

  return (
    <div className="flex items-center justify-between py-3 px-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Prev
      </button>
      <span className="text-xs font-medium text-muted-foreground">
        {currentTitle}
        <span className="ml-1.5 opacity-60">
          {currentIndex + 1}/{totalChapters}
        </span>
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
