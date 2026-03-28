import { Sparkles } from "lucide-react";

interface ChapterReviewPromptProps {
  suggestionCount?: number;
  onReview: () => void;
}

export function ChapterReviewPrompt({ suggestionCount, onReview }: ChapterReviewPromptProps) {
  const hasSuggestions = typeof suggestionCount === "number" && suggestionCount > 0;

  return (
    <div className="rounded-2xl border border-border bg-card/80 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-sm font-medium text-foreground">
              {hasSuggestions
                ? `${suggestionCount} chapter suggestion${suggestionCount === 1 ? "" : "s"} ready`
                : "Review chapter structure"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Review when convenient.</p>
        </div>
        <button
          type="button"
          onClick={onReview}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          Review
        </button>
      </div>
    </div>
  );
}
