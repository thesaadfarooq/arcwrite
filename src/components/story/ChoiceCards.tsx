import { Shield, Flame, Heart, Zap, RefreshCw, Send, AlignLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SectionLength } from "@/lib/story-api";

export interface StoryChoice {
  type: "safe" | "risky" | "emotional" | "chaotic";
  label: string;
  preview: string;
}

const LENGTH_OPTIONS: { value: SectionLength; label: string; desc: string }[] = [
  { value: "short", label: "Short", desc: "~100w" },
  { value: "medium", label: "Medium", desc: "~250w" },
  { value: "long", label: "Long", desc: "~500w" },
  { value: "epic", label: "Epic", desc: "~1000w" },
];

interface ChoiceCardsProps {
  choices: StoryChoice[];
  onSelect: (choice: StoryChoice | { type: "custom"; label: string; preview: string }) => void;
  onRegenerate: () => void;
  isLoading?: boolean;
  sectionLength: SectionLength;
  onSectionLengthChange: (length: SectionLength) => void;
}

const choiceConfig = {
  safe: { icon: Shield, color: "choice-safe", label: "Expected" },
  risky: { icon: Flame, color: "choice-risky", label: "Twist" },
  emotional: { icon: Heart, color: "choice-emotional", label: "Emotional" },
  chaotic: { icon: Zap, color: "choice-chaotic", label: "Wildcard" },
} as const;

export function ChoiceCards({ choices, onSelect, onRegenerate, isLoading, sectionLength, onSectionLengthChange }: ChoiceCardsProps) {
  const [customText, setCustomText] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3 mt-8">
        <p className="text-sm text-muted-foreground font-medium">Crafting your options…</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-card border border-border animate-pulse-gentle" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">What happens next?</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-secondary/50 p-0.5">
            {LENGTH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onSectionLengthChange(opt.value)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  sectionLength === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={opt.desc}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onRegenerate} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> New options
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {choices.map((choice, i) => {
          const config = choiceConfig[choice.type];
          const Icon = config.icon;
          return (
            <button
              key={i}
              onClick={() => onSelect(choice)}
              className="group text-left p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.12)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-slide-up"
              style={{ animationDelay: `${i * 80}ms`, opacity: 0 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-200"
                  style={{ backgroundColor: `hsl(var(--${config.color}) / 0.12)`, color: `hsl(var(--${config.color}))` }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {config.label}
                </span>
              </div>
              <div className="font-medium text-sm text-foreground mb-1">{choice.label}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{choice.preview}</div>
            </button>
          );
        })}
      </div>

      {/* Custom direction */}
      {!showCustom ? (
        <button
          onClick={() => setShowCustom(true)}
          className="w-full p-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
        >
          ✍️ Write your own direction…
        </button>
      ) : (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3 animate-fade-in">
          <Textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Describe what should happen next…"
            className="min-h-[80px] resize-none font-story text-sm bg-transparent border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowCustom(false); setCustomText(""); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={customText.trim().length < 5}
              onClick={() => onSelect({ type: "custom", label: "Custom direction", preview: customText })}
            >
              <Send className="w-3.5 h-3.5 mr-1" /> Go
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
