import { useState, useRef, useEffect } from "react";
import { Send, Check, Undo2, Loader2 } from "lucide-react";

interface RewriteInputProps {
  onSubmit: (instruction: string) => void;
  onAccept: () => void;
  onRevert: () => void;
  onCancel: () => void;
  isStreaming: boolean;
  hasResult: boolean;
}

export function RewriteInput({
  onSubmit,
  onAccept,
  onRevert,
  onCancel,
  isStreaming,
  hasResult,
}: RewriteInputProps) {
  const [instruction, setInstruction] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = instruction.trim();
    if (trimmed.length < 3) return;
    onSubmit(trimmed);
  };

  if (hasResult && !isStreaming) {
    return (
      <div className="flex items-center gap-2 py-2 animate-fade-in">
        <button
          type="button"
          onClick={onAccept}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Check className="h-3 w-3" />
          Accept
        </button>
        <button
          type="button"
          onClick={onRevert}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Undo2 className="h-3 w-3" />
          Revert
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2 animate-fade-in">
      <input
        ref={inputRef}
        type="text"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="How should this be rewritten?"
        disabled={isStreaming}
        className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isStreaming || instruction.trim().length < 3}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
      >
        {isStreaming ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Send className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}
