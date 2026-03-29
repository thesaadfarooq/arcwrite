import { useState } from "react";
import { BookOpen, Hash, ChevronRight, MoreHorizontal, Pencil, Trash2, Merge } from "lucide-react";
import { ChapterRenameDialog } from "@/components/story/ChapterRenameDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface Chapter {
  id: string;
  title: string;
  wordCount: number;
  isActive?: boolean;
  isRoot?: boolean;
}

interface ChapterSidebarProps {
  chapters: Chapter[];
  totalWords: number;
  onChapterClick: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onDelete?: (id: string) => void;
  onMerge?: (id: string) => void;
  onGenerateTitle?: (id: string) => Promise<string>;
  reviewSlot?: React.ReactNode;
  embedded?: boolean;
  onStartBreakMode?: () => void;
  onEnterEditMode?: () => void;
}

export function ChapterSidebar({
  chapters,
  totalWords,
  onChapterClick,
  onRename,
  onDelete,
  onMerge,
  onGenerateTitle,
  reviewSlot,
  embedded = false,
  onStartBreakMode,
  onEnterEditMode,
}: ChapterSidebarProps) {
  const [renameTarget, setRenameTarget] = useState<Chapter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      {!embedded && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-story font-semibold text-foreground text-sm">Chapters</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {totalWords.toLocaleString()} words
          </div>
        </div>
      )}

      {reviewSlot ? <div className="p-2">{reviewSlot}</div> : null}

      {/* Chapter List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {chapters.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Chapters will appear as your story grows
          </div>
        ) : (
          <div className="space-y-0.5">
            {chapters.map((ch, i) => (
              <div key={ch.id} className="group relative flex items-center">
                  <button
                    type="button"
                    onClick={() => onChapterClick(ch.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 flex items-center gap-2 active:scale-[0.98] ${
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

                {/* Context menu */}
                {(onRename || onDelete || onMerge) && (
                  <div className={`absolute right-1 ${embedded ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Chapter options"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {onRename && (
                          <DropdownMenuItem onClick={() => setRenameTarget(ch)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Rename
                          </DropdownMenuItem>
                        )}
                        {onMerge && !ch.isRoot && (
                          <DropdownMenuItem onClick={() => onMerge(ch.id)}>
                            <Merge className="w-3.5 h-3.5 mr-2" />
                            Merge with previous
                          </DropdownMenuItem>
                        )}
                        {onDelete && chapters.length > 1 && !ch.isRoot && (
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(ch)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chapter?</DialogTitle>
            <DialogDescription>
              This will permanently remove "{deleteTarget?.title}" and all subsequent chapters that branch from it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteTarget && onDelete) {
                  onDelete(deleteTarget.id);
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <ChapterRenameDialog
        open={Boolean(renameTarget)}
        chapterId={renameTarget?.id ?? null}
        currentTitle={renameTarget?.title ?? ""}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSave={async (title) => {
          if (renameTarget && onRename) {
            await onRename(renameTarget.id, title);
          }
        }}
        onGenerateTitle={async () => {
          if (!renameTarget || !onGenerateTitle) return renameTarget?.title ?? "";
          return onGenerateTitle(renameTarget.id);
        }}
      />
    </div>
  );
}
