import {
  Shield,
  Flame,
  Heart,
  Zap,
  RefreshCw,
  Send,
  Lock,
  Crown,
  Compass,
  Users,
  Eye,
  Puzzle,
  Swords,
  CheckCircle2,
  Flag,
  Sparkles,
  SplitSquareVertical,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SectionLength } from "@/lib/story-api";
import { StoryComplete } from "@/components/story/StoryComplete";

export interface StoryChoice {
  type:
    | "safe"
    | "risky"
    | "emotional"
    | "chaotic"
    | "explore"
    | "connect"
    | "foreshadow"
    | "complicate"
    | "confront"
    | "resolve"
    | "conclude"
    | "epilogue"
    | "investigate"
    | "commit"
    | "reveal"
    | "risk"
    | "bargain"
    | "sacrifice"
    | "regroup"
    | "reflect"
    | "aftermath"
    | "loose_thread"
    | "new_problem"
    | "time_skip";
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
  isNearEnd?: boolean;
  onBeginConclusion?: () => void;
  onAddChapterBreak?: () => void;
  isStoryComplete?: boolean;
  sectionLength: SectionLength;
  onSectionLengthChange: (length: SectionLength) => void;
  turnCount?: number;
  turnLimit?: number;
  modeLabel?: string;
}

const choiceConfig = {
  safe: { icon: Shield, color: "choice-safe", label: "Expected" },
  risky: { icon: Flame, color: "choice-risky", label: "Twist" },
  emotional: { icon: Heart, color: "choice-emotional", label: "Emotional" },
  chaotic: { icon: Zap, color: "choice-chaotic", label: "Wildcard" },
  explore: { icon: Compass, color: "choice-safe", label: "Discovery" },
  connect: { icon: Users, color: "choice-emotional", label: "Bond" },
  foreshadow: { icon: Eye, color: "choice-risky", label: "Omen" },
  complicate: { icon: Puzzle, color: "choice-chaotic", label: "Complication" },
  confront: { icon: Swords, color: "choice-risky", label: "Showdown" },
  resolve: { icon: CheckCircle2, color: "choice-safe", label: "Resolution" },
  conclude: { icon: Flag, color: "choice-emotional", label: "Conclusion" },
  epilogue: { icon: Sparkles, color: "choice-chaotic", label: "Epilogue" },
  investigate: { icon: Compass, color: "choice-safe", label: "Discovery" },
  commit: { icon: Flag, color: "choice-risky", label: "Crossroads" },
  reveal: { icon: Eye, color: "choice-chaotic", label: "Reveal" },
  risk: { icon: Flame, color: "choice-risky", label: "Risk" },
  bargain: { icon: Puzzle, color: "choice-emotional", label: "Crossroads" },
  sacrifice: { icon: Heart, color: "choice-risky", label: "Sacrifice" },
  regroup: { icon: Shield, color: "choice-safe", label: "Recovery" },
  reflect: { icon: Eye, color: "choice-emotional", label: "Recovery" },
  aftermath: { icon: Sparkles, color: "choice-emotional", label: "Aftermath" },
  loose_thread: { icon: Compass, color: "choice-safe", label: "Discovery" },
  new_problem: { icon: Puzzle, color: "choice-chaotic", label: "Complication" },
  time_skip: { icon: Flag, color: "choice-risky", label: "Crossroads" },
} as const;

export function ChoiceCards({
  choices,
  onSelect,
  onRegenerate,
  isLoading,
  isNearEnd,
  onBeginConclusion,
  onAddChapterBreak,
  isStoryComplete,
  sectionLength,
  onSectionLengthChange,
  turnCount,
  turnLimit,
  modeLabel,
}: ChoiceCardsProps) {
  const [customText, setCustomText] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const navigate = useNavigate();
  const atTurnLimit = turnLimit !== undefined && turnCount !== undefined && turnCount >= turnLimit;

  if (isStoryComplete) {
    return <StoryComplete />;
  }

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

  if (atTurnLimit) {
    return (
      <div className="mt-10 space-y-4">
        <div className="p-5 rounded-xl border border-primary/20 bg-primary/[0.04] text-center">
          <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">Turn limit reached</p>
          <p className="text-xs text-muted-foreground mb-4">
            You've used all {turnLimit} turns available on your current plan.
            Upgrade to continue this story.
          </p>
          <Button size="sm" onClick={() => navigate("/pricing")}>
            <Crown className="w-3.5 h-3.5 mr-1" /> Upgrade plan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-4">
      {turnLimit !== undefined && turnCount !== undefined && turnCount >= turnLimit - 1 && (
        <div className="p-3 rounded-lg border border-primary/15 bg-primary/[0.03] flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{turnCount}/{turnLimit} turns used</span>
            {" · "}You have {turnLimit - turnCount} turn{turnLimit - turnCount === 1 ? "" : "s"} remaining.{" "}
            <button onClick={() => navigate("/pricing")} className="text-primary hover:underline font-medium">Upgrade</button>
          </p>
        </div>
      )}
      {modeLabel ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {modeLabel}
        </p>
      ) : null}
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
          {onAddChapterBreak ? (
            <Button variant="ghost" size="sm" onClick={onAddChapterBreak} className="text-muted-foreground hover:text-foreground">
              <SplitSquareVertical className="w-3.5 h-3.5 mr-1.5" /> Add chapter break
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {choices.map((choice, i) => {
          const config = choiceConfig[choice.type] ?? choiceConfig.safe;
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

      {isNearEnd && onBeginConclusion && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={onBeginConclusion}>
            Begin conclusion
          </Button>
        </div>
      )}

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
