import { Palette, Check, X } from "lucide-react";
import { useState } from "react";

const presetTones = [
  "Dark & gritty",
  "Whimsical & light",
  "Literary & introspective",
  "Fast-paced & cinematic",
  "Poetic & dreamlike",
  "Humorous & witty",
];

interface TonePanelProps {
  currentTone: string | undefined;
  onToneChange: (tone: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function TonePanel({ currentTone, onToneChange, isOpen, onClose }: TonePanelProps) {
  const [customTone, setCustomTone] = useState("");

  if (!isOpen) return null;

  return (
    <div className="absolute right-4 top-14 z-30 w-64 p-4 rounded-xl border border-border bg-card shadow-lg animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Story Tone</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary transition-colors active:scale-95">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-1.5">
        {presetTones.map((t) => (
          <button
            key={t}
            onClick={() => {
              onToneChange(t);
              onClose();
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150 flex items-center justify-between active:scale-[0.97] ${
              currentTone === t
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {t}
            {currentTone === t && <Check className="w-3 h-3" />}
          </button>
        ))}
      </div>

      {/* Custom tone input */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={customTone}
            onChange={(e) => setCustomTone(e.target.value)}
            placeholder="Custom tone…"
            className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
          <button
            disabled={customTone.trim().length < 3}
            onClick={() => {
              onToneChange(customTone.trim());
              setCustomTone("");
              onClose();
            }}
            className="text-xs px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-95"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}
