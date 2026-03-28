import { BookOpen, FolderTree, SlidersHorizontal } from "lucide-react";

interface MobileStoryBarProps {
  onWrite: () => void;
  onStructure: () => void;
  onTools: () => void;
}

export function MobileStoryBar({ onWrite, onStructure, onTools }: MobileStoryBarProps) {
  return (
    <div className="sticky bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onWrite}
          className="rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Write
          </span>
        </button>
        <button
          type="button"
          onClick={onStructure}
          className="rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 active:scale-[0.98]"
        >
          <span className="inline-flex items-center gap-1.5">
            <FolderTree className="h-3.5 w-3.5" />
            Structure
          </span>
        </button>
        <button
          type="button"
          onClick={onTools}
          className="rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 active:scale-[0.98]"
        >
          <span className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Tools
          </span>
        </button>
      </div>
    </div>
  );
}
