import { useState, useRef, useEffect } from "react";
import { BookOpen, Hash, ChevronRight, MoreHorizontal, Pencil, Trash2, Merge } from "lucide-react";
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
  reviewSlot?: React.ReactNode;
  embedded?: boolean;
  onEnterEditMode?: () => void;
}

export function ChapterSidebar({
  chapters,
  totalWords,
  onChapterClick,
  onRename,
  onDelete,
  onMerge,
  reviewSlot,
  embedded = false,
  onEnterEditMode,
}: ChapterSidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  const startRename = (ch: Chapter) => {
    setRenamingId(ch.id);
    setRenameValue(ch.title);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim() && onRename) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="h-full flex flex-col">
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

      {onEnterEditMode ? (
        <div className="px-2 pb-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={onEnterEditMode}
          >
            Edit chapters
          </Button>
        </div>
      ) : null}

      {/* Chapter List */}
      <div className="flex-1 overflow-y-auto p-2">
        {chapters.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Chapters will appear as your story grows
          </div>
        ) : (
          <div className="space-y-0.5">
            {chapters.map((ch, i) => (
              <div key={ch.id} className="group relative flex items-center">
                {renamingId === ch.id ? (
                  <input
                    ref={inputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm bg-primary/10 border border-primary/30 text-foreground font-medium focus:outline-none focus:border-primary/50"
                  />
                ) : (
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
                )}

                {/* Context menu */}
                {renamingId !== ch.id && (onRename || onDelete || onMerge) && (
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
                          <DropdownMenuItem onClick={() => startRename(ch)}>
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
    </div>
  );
}
