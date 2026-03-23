import { useState, useRef, useEffect, useCallback } from "react";
import { SplitSquareVertical, Pencil } from "lucide-react";

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
}

export function StoryCanvas({ paragraphs, onEdit, isEditable = true, chapterHeadings, onInsertBreak, onRenameChapter }: StoryCanvasProps) {
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

  return (
    <div className="space-y-0">
      {paragraphs.map((p, i) => {
        // Extract node ID from paragraph ID (format: "nodeId-index")
        const nodeId = p.id.includes("-") ? p.id.substring(0, p.id.lastIndexOf("-")) : p.id;
        const paraIndexStr = p.id.includes("-") ? p.id.substring(p.id.lastIndexOf("-") + 1) : "0";
        const paraIndex = parseInt(paraIndexStr, 10);
        const isFirstOfNode = i === 0 || paragraphs[i - 1]?.id.substring(0, paragraphs[i - 1].id.lastIndexOf("-")) !== nodeId;
        const isChapterNode = headingMap.has(nodeId);

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
              <div className="relative h-0 group/break">
                <button
                  onClick={() => onInsertBreak(nodeId, paraIndex)}
                  className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 border border-border text-muted-foreground text-xs opacity-0 group-hover/break:opacity-100 hover:!opacity-100 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200 active:scale-95"
                  title="Insert chapter break here"
                >
                  <SplitSquareVertical className="w-3 h-3" />
                  <span>Chapter break</span>
                </button>
              </div>
            )}

            <ParagraphBlock
              paragraph={p}
              isFirst={i === 0}
              isChapterStart={showHeading}
              onEdit={isEditable ? onEdit : undefined}
            />
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function ParagraphBlock({
  paragraph,
  isFirst,
  isChapterStart,
  onEdit,
}: {
  paragraph: StoryParagraph;
  isFirst: boolean;
  isChapterStart?: boolean;
  onEdit?: (id: string, newText: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(paragraph.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) setEditText(paragraph.text);
  }, [paragraph.text, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editText.trim() !== paragraph.text && onEdit) {
      onEdit(paragraph.id, editText.trim());
    }
    setIsEditing(false);
  };

  if (isEditing) {
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
            if (e.key === "Escape") { setEditText(paragraph.text); setIsEditing(false); }
          }}
          className="w-full font-story text-lg leading-[1.85] text-story-text bg-primary/[0.03] rounded-lg p-3 -m-3 border border-primary/20 resize-none focus:outline-none focus:border-primary/40 overflow-wrap-break-word"
        />
      </div>
    );
  }

  return (
    <p
      onClick={() => onEdit && setIsEditing(true)}
      className={`font-story text-lg leading-[1.85] text-story-text transition-colors duration-200 py-2 ${
        onEdit ? "cursor-text hover:bg-primary/[0.02] rounded-lg px-1 -mx-1" : ""
      } ${(isFirst || isChapterStart) ? "first-letter:text-4xl first-letter:font-semibold first-letter:float-left first-letter:mr-1.5 first-letter:leading-[1] first-letter:text-primary" : ""} ${
        paragraph.isStreaming ? "animate-fade-in" : ""
      }`}
      style={{ overflowWrap: "break-word" }}
    >
      {paragraph.text}
      {paragraph.isStreaming && (
        <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 animate-pulse-gentle align-text-bottom" />
      )}
    </p>
  );
}
