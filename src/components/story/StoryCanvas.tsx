import { useState, useRef, useEffect } from "react";

export interface StoryParagraph {
  id: string;
  text: string;
  isStreaming?: boolean;
}

interface StoryCanvasProps {
  paragraphs: StoryParagraph[];
  onEdit?: (id: string, newText: string) => void;
  isEditable?: boolean;
}

export function StoryCanvas({ paragraphs, onEdit, isEditable = true }: StoryCanvasProps) {
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

  return (
    <div className="space-y-0">
      {paragraphs.map((p, i) => (
        <ParagraphBlock
          key={p.id}
          paragraph={p}
          isFirst={i === 0}
          onEdit={isEditable ? onEdit : undefined}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function ParagraphBlock({
  paragraph,
  isFirst,
  onEdit,
}: {
  paragraph: StoryParagraph;
  isFirst: boolean;
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
      } ${isFirst ? "first-letter:text-4xl first-letter:font-semibold first-letter:float-left first-letter:mr-1.5 first-letter:leading-[1] first-letter:text-primary" : ""} ${
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
