import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface ChapterRenameDialogProps {
  open: boolean;
  chapterId: string | null;
  currentTitle: string;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string) => Promise<void>;
  onGenerateTitle: () => Promise<string>;
}

export function ChapterRenameDialog({
  open,
  chapterId,
  currentTitle,
  onOpenChange,
  onSave,
  onGenerateTitle,
}: ChapterRenameDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      setSuggestion(null);
    }
  }, [open, currentTitle, chapterId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename chapter</DialogTitle>
        </DialogHeader>

        <label className="space-y-2 text-sm">
          <span className="text-muted-foreground">Chapter title</span>
          <Input aria-label="Chapter title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        {suggestion ? (
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Suggested title</p>
            <p className="mt-1 text-sm font-medium text-foreground">{suggestion}</p>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setTitle(suggestion)}>
              Use suggestion
            </Button>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isGenerating}
              onClick={async () => {
                setIsGenerating(true);
                try {
                  const nextTitle = await onGenerateTitle();
                  setSuggestion(nextTitle);
                } finally {
                  setIsGenerating(false);
                }
              }}
            >
              {suggestion ? "Reroll" : "Generate title"}
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!title.trim() || isSaving}
            onClick={async () => {
              setIsSaving(true);
              try {
                await onSave(title.trim());
                onOpenChange(false);
              } finally {
                setIsSaving(false);
              }
            }}
          >
            Save title
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
