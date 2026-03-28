import { Loader2, Sparkles } from "lucide-react";

interface ChapterReviewPromptProps {
  suggestionCount?: number;
  isLoading?: boolean;
  onReview: () => void;
}

export function ChapterReviewPrompt({ suggestionCount, isLoading = false, onReview }: ChapterReviewPromptProps) {
  const hasSuggestions = typeof suggestionCount === "number" && suggestionCount > 0;

  return (
    <div className="rounded-2xl border border-border bg-card/80 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
            <p className="text-sm font-medium text-foreground">
              {isLoading
                ? "Reviewing chapter structure"
                : hasSuggestions
                ? `${suggestionCount} chapter suggestion${suggestionCount === 1 ? "" : "s"} ready`
                : "Review chapter structure"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Looking at the recent story beats now." : "Review when convenient."}
          </p>
        </div>
        <button
          type="button"
          onClick={onReview}
          disabled={isLoading}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Reviewing…" : "Review"}
        </button>
      </div>
    </div>
  );
}
