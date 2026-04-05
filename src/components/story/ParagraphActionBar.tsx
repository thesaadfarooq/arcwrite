import { Pencil, Sparkles } from "lucide-react";

interface ParagraphActionBarProps {
  onEdit: () => void;
  onRewrite: () => void;
}

export function ParagraphActionBar({ onEdit, onRewrite }: ParagraphActionBarProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card shadow-sm px-1 py-0.5 animate-fade-in">
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title="Edit manually"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>
      <div className="h-4 w-px bg-border" />
      <button
        type="button"
        onClick={onRewrite}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        title="Rewrite with AI"
      >
        <Sparkles className="h-3 w-3" />
        Rewrite
      </button>
    </div>
  );
}
