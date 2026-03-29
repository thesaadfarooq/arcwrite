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
      <div className="mb-2 flex items-center gap-2">
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" /> : <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />}
        <p className="text-sm font-medium text-foreground">
          {isLoading
            ? "Preparing chapter suggestions"
            : hasSuggestions
            ? `${suggestionCount} chapter suggestion${suggestionCount === 1 ? "" : "s"} ready`
            : "Chapter suggestions ready"}
        </p>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {isLoading
          ? "Looking at recent story beats and chapter titles."
          : "Suggestions may include chapter breaks or better titles for recent chapters."}
      </p>
      <button
        type="button"
        onClick={onReview}
        disabled={isLoading}
        className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Loading..." : "See suggestions"}
      </button>
    </div>
  );
}
