interface ChapterEditModeBarProps {
  active: boolean;
  onDone: () => void;
  onShowEarlier?: () => void;
  showEarlierExpanded?: boolean;
  hasBreakPoints?: boolean;
}

export function ChapterEditModeBar({ active, onDone, onShowEarlier, showEarlierExpanded, hasBreakPoints = true }: ChapterEditModeBarProps) {
  if (!active) return null;

  return (
    <div className="sticky top-12 z-20 mb-6 rounded-2xl border border-primary/30 bg-background shadow-lg px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Add a chapter break</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasBreakPoints
              ? "Choose where the new chapter should begin. Breaks are inserted after the paragraph you select."
              : "No break points available yet. Each section needs at least two paragraphs before it can be split into chapters."}
          </p>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
        >
          Cancel
        </button>
      </div>
      {!showEarlierExpanded && onShowEarlier ? (
        <button
          type="button"
          onClick={onShowEarlier}
          className="mt-2 text-xs font-medium text-primary hover:underline"
        >
          Show earlier chapters
        </button>
      ) : null}
    </div>
  );
}
