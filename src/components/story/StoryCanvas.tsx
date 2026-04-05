import { useState, useRef, useEffect, useCallback } from "react";
import { SplitSquareVertical, Pencil } from "lucide-react";
import { ChapterNavigation } from "@/components/story/ChapterNavigation";
import { ParagraphActionBar } from "@/components/story/ParagraphActionBar";
import { RewriteInput } from "@/components/story/RewriteInput";

export interface StoryParagraph {
  id: string;
  text: string;
  isStreaming?: boolean;
}

export interface ChapterHeading {
  nodeId: string;
  title: string;
}

interface StoryCanvasProps {
  paragraphs: StoryParagraph[];
  onEdit?: (id: string, newText: string) => void;
  isEditable?: boolean;
  chapterHeadings?: ChapterHeading[];
  onInsertBreak?: (nodeId: string, paragraphIndex: number) => void;
  onRenameChapter?: (nodeId: string, newTitle: string) => void;
  chapterEditMode?: boolean;
  pendingBreakKey?: string | null;
  breakTargetNodeIds?: string[];
  chapterViewEnabled?: boolean;
  activeChapterIndex?: number;
  onChapterNavigate?: (index: number) => void;
  onRewrite?: (id: string, instruction: string) => void;
  rewritingParagraphId?: string | null;
  rewriteStreamedText?: string;
  rewriteHasResult?: boolean;
  onRewriteAccept?: () => void;
  onRewriteRevert?: () => void;
  onRewriteCancel?: () => void;
}

export function StoryCanvas({
  paragraphs,
  onEdit,
  isEditable = true,
  chapterHeadings,
  onInsertBreak,
  onRenameChapter,
  chapterEditMode,
  pendingBreakKey,
  breakTargetNodeIds,
  chapterViewEnabled,
  activeChapterIndex,
  onChapterNavigate,
  onRewrite,
  rewritingParagraphId,
  rewriteStreamedText,
  rewriteHasResult,
  onRewriteAccept,
  onRewriteRevert,
  onRewriteCancel,
}: StoryCanvasProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const last = paragraphs[paragraphs.length - 1];
    if (last?.isStreaming) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [paragraphs]);

  if (paragraphs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground font-story italic text-lg">
        Your story begins here…
      </div>
    );
  }

  // Build a map of nodeId → chapter title for headings
  const headingMap = new Map<string, string>();
  chapterHeadings?.forEach((h) => headingMap.set(h.nodeId, h.title));

  // --- Chapter-at-a-time view filtering ---
  const chapterNodeIds = chapterHeadings?.map((h) => h.nodeId) ?? [];
  const totalChapters = chapterNodeIds.length || 1;

  let visibleParagraphs = paragraphs;
  if (chapterViewEnabled && chapterNodeIds.length > 0 && activeChapterIndex !== undefined) {
    const chapterStartId = chapterNodeIds[activeChapterIndex];
    const nextChapterStartId = chapterNodeIds[activeChapterIndex + 1] ?? null;

    let inChapter = false;
    visibleParagraphs = paragraphs.filter((p) => {
      const nodeId = p.id.includes("-") ? p.id.substring(0, p.id.lastIndexOf("-")) : p.id;
      if (nodeId === chapterStartId) inChapter = true;
      if (nextChapterStartId && nodeId === nextChapterStartId) inChapter = false;
      return inChapter;
    });
  }

  return (
    <div className="space-y-0">
      {chapterViewEnabled && chapterNodeIds.length > 1 && activeChapterIndex !== undefined && onChapterNavigate && (
        <ChapterNavigation
          currentIndex={activeChapterIndex}
          totalChapters={totalChapters}
          currentTitle={chapterHeadings?.[activeChapterIndex]?.title ?? `Chapter ${activeChapterIndex + 1}`}
          onPrev={() => onChapterNavigate(activeChapterIndex - 1)}
          onNext={() => onChapterNavigate(activeChapterIndex + 1)}
        />
      )}
      {visibleParagraphs.map((p, i) => {
        // Extract node ID from paragraph ID (format: "nodeId-index")
        const nodeId = p.id.includes("-") ? p.id.substring(0, p.id.lastIndexOf("-")) : p.id;
        const paraIndexStr = p.id.includes("-") ? p.id.substring(p.id.lastIndexOf("-") + 1) : "0";
        const paraIndex = parseInt(paraIndexStr, 10);
        const isFirstOfNode = i === 0 || visibleParagraphs[i - 1]?.id.substring(0, visibleParagraphs[i - 1].id.lastIndexOf("-")) !== nodeId;
        const isChapterNode = headingMap.has(nodeId);
        const breakKey = `${nodeId}:${paraIndex}`;
        const isPendingBreak = pendingBreakKey === breakKey;
        const isBreakDisabled = Boolean(pendingBreakKey);

        // Show chapter heading only for chapter-start nodes, not for every timeline node.
        const showHeading = isFirstOfNode && i > 0 && isChapterNode;

        return (
          <div key={p.id} id={isFirstOfNode ? `para-${nodeId}` : undefined}>
            {showHeading && (
              <EditableChapterHeading
                nodeId={nodeId}
                title={headingMap.get(nodeId) || ""}
                onRename={onRenameChapter}
              />
            )}

            {/* Insert chapter break button — between paragraphs of the same node */}
            {onInsertBreak && !isFirstOfNode && paraIndex > 0 && (
              chapterEditMode === true && (!breakTargetNodeIds || breakTargetNodeIds.includes(nodeId)) ? (
                <div className="relative py-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => onInsertBreak(nodeId, paraIndex)}
                    disabled={isBreakDisabled}
                    aria-label="Start new chapter after this paragraph"
                    className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary transition-all duration-200 active:scale-95 hover:bg-primary/10"
                  >
                    <SplitSquareVertical className="h-3 w-3" />
                    <span>{isPendingBreak ? "Adding chapter…" : "Start new chapter after this paragraph"}</span>
                  </button>
                </div>
              ) : chapterEditMode === undefined ? (
                <div className="relative h-0 group/break">
                  <button
                    type="button"
                    onClick={() => onInsertBreak(nodeId, paraIndex)}
                    disabled={isBreakDisabled}
                    className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 rounded-full bg-secondary/80 border border-border px-3 py-1 text-xs text-muted-foreground opacity-0 transition-all duration-200 hover:!opacity-100 hover:bg-primary/10 hover:text-primary hover:border-primary/30 group-hover/break:opacity-100 active:scale-95 disabled:pointer-events-none disabled:opacity-100"
                    title="Insert chapter break here"
                    aria-label="Chapter break"
                  >
                    <SplitSquareVertical className="h-3 w-3" />
                    <span>{isPendingBreak ? "Adding chapter…" : "Chapter break"}</span>
                  </button>
                </div>
              ) : null
            )}

            <ParagraphBlock
              paragraph={p}
              isFirst={i === 0}
              isChapterStart={showHeading}
              onEdit={isEditable ? onEdit : undefined}
              onRewrite={onRewrite}
              rewritingId={rewritingParagraphId}
              rewriteStreamedText={rewriteStreamedText}
              rewriteHasResult={rewriteHasResult}
              onRewriteAccept={onRewriteAccept}
              onRewriteRevert={onRewriteRevert}
              onRewriteCancel={onRewriteCancel}
            />
          </div>
        );
      })}
      {chapterViewEnabled && chapterNodeIds.length > 1 && activeChapterIndex !== undefined && onChapterNavigate && (
        <div className="pt-4">
          <ChapterNavigation
            currentIndex={activeChapterIndex}
            totalChapters={totalChapters}
            currentTitle={chapterHeadings?.[activeChapterIndex]?.title ?? `Chapter ${activeChapterIndex + 1}`}
            onPrev={() => onChapterNavigate(activeChapterIndex - 1)}
            onNext={() => onChapterNavigate(activeChapterIndex + 1)}
          />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function EditableChapterHeading({
  nodeId,
  title,
  onRename,
}: {
  nodeId: string;
  title: string;
  onRename?: (nodeId: string, newTitle: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setEditValue(title);
  }, [title, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title && onRename) {
      onRename(nodeId, trimmed);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="mt-12 mb-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setIsEditing(false);
          }}
          className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground bg-secondary/50 border border-primary/30 rounded px-2 py-1 text-center focus:outline-none focus:border-primary/50 max-w-[200px]"
        />
        <div className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return (
    <div className="mt-12 mb-6 flex items-center gap-4 group/heading">
      <div className="h-px flex-1 bg-border" />
      <span
        className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1.5"
        onClick={() => onRename && setIsEditing(true)}
        title={onRename ? "Click to rename" : undefined}
      >
        {title}
        {onRename && <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/heading:opacity-60 transition-opacity" />}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function ParagraphBlock({
  paragraph,
  isFirst,
  isChapterStart,
  onEdit,
  onRewrite,
  rewritingId,
  rewriteStreamedText,
  rewriteHasResult,
  onRewriteAccept,
  onRewriteRevert,
  onRewriteCancel,
}: {
  paragraph: StoryParagraph;
  isFirst: boolean;
  isChapterStart?: boolean;
  onEdit?: (id: string, newText: string) => void;
  onRewrite?: (id: string, instruction: string) => void;
  rewritingId?: string | null;
  rewriteStreamedText?: string;
  rewriteHasResult?: boolean;
  onRewriteAccept?: () => void;
  onRewriteRevert?: () => void;
  onRewriteCancel?: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "action" | "editing" | "rewriting">("idle");
  const [editText, setEditText] = useState(paragraph.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isThisRewriting = rewritingId === paragraph.id;

  useEffect(() => {
    if (!isThisRewriting && mode === "rewriting") setMode("idle");
  }, [isThisRewriting, mode]);

  useEffect(() => {
    if (mode !== "editing") setEditText(paragraph.text);
  }, [paragraph.text, mode]);

  useEffect(() => {
    if (mode === "editing" && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [mode]);

  const handleSave = () => {
    if (editText.trim() !== paragraph.text && onEdit) {
      onEdit(paragraph.id, editText.trim());
    }
    setMode("idle");
  };

  const handleClick = () => {
    if (mode === "idle" && (onEdit || onRewrite)) {
      setMode("action");
    }
  };

  const displayText = isThisRewriting && rewriteStreamedText !== undefined
    ? rewriteStreamedText
    : paragraph.text;

  if (mode === "editing") {
    return (
      <div className="relative group">
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setEditText(paragraph.text); setMode("idle"); }
          }}
          className="w-full font-story text-lg leading-[1.85] text-story-text bg-primary/[0.03] rounded-lg p-3 -m-3 border border-primary/20 resize-none focus:outline-none focus:border-primary/40 overflow-wrap-break-word"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {mode === "action" && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10">
          <ParagraphActionBar
            onEdit={() => setMode("editing")}
            onRewrite={() => {
              setMode("rewriting");
            }}
          />
        </div>
      )}
      <p
        onClick={handleClick}
        onBlur={() => { if (mode === "action") setMode("idle"); }}
        tabIndex={mode === "action" ? 0 : undefined}
        className={`font-story text-lg leading-[1.85] text-story-text transition-colors duration-200 py-2 ${
          onEdit || onRewrite ? "cursor-text hover:bg-primary/[0.02] rounded-lg px-1 -mx-1" : ""
        } ${(isFirst || isChapterStart) ? "first-letter:text-4xl first-letter:font-semibold first-letter:float-left first-letter:mr-1.5 first-letter:leading-[1] first-letter:text-primary" : ""} ${
          paragraph.isStreaming ? "animate-fade-in" : ""
        } ${isThisRewriting ? "bg-primary/[0.04] rounded-lg px-1 -mx-1" : ""} ${
          mode === "action" ? "bg-primary/[0.03] rounded-lg px-1 -mx-1 ring-1 ring-primary/20" : ""
        }`}
        style={{ overflowWrap: "break-word" }}
      >
        {displayText}
        {(paragraph.isStreaming || (isThisRewriting && !rewriteHasResult)) && (
          <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 animate-pulse-gentle align-text-bottom" />
        )}
      </p>
      {mode === "rewriting" && onRewrite && (
        <RewriteInput
          onSubmit={(instruction) => onRewrite(paragraph.id, instruction)}
          onAccept={() => { onRewriteAccept?.(); setMode("idle"); }}
          onRevert={() => { onRewriteRevert?.(); setMode("idle"); }}
          onCancel={() => { onRewriteCancel?.(); setMode("idle"); }}
          isStreaming={isThisRewriting && !rewriteHasResult && rewriteStreamedText !== undefined}
          hasResult={isThisRewriting && !!rewriteHasResult}
        />
      )}
    </div>
  );
}
