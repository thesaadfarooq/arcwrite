interface ChapterEditModeBarProps {
  active: boolean;
  onDone: () => void;
}

export function ChapterEditModeBar({ active, onDone }: ChapterEditModeBarProps) {
  if (!active) return null;

  return (
    <div className="sticky top-12 z-10 mb-6 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">Chapter edit mode</p>
        <p className="text-xs text-muted-foreground">
          Tap a marker between paragraphs to start a new chapter.
        </p>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
      >
        Done
      </button>
    </div>
  );
}
