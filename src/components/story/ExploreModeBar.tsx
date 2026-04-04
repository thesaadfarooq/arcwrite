import { GitBranch } from "lucide-react";

interface ExploreModeBarProps {
  branchName: string | null;
  onSetAsMain: () => void;
  onReturnToMain: () => void;
}

export function ExploreModeBar({ branchName, onSetAsMain, onReturnToMain }: ExploreModeBarProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 mb-4 animate-fade-in">
      <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="flex-1 text-xs text-foreground">
        Exploring: <span className="font-medium">{branchName || "Unnamed branch"}</span>
      </span>
      <button type="button" onClick={onSetAsMain} className="text-xs font-medium text-primary hover:underline">
        Set as main
      </button>
      <button type="button" onClick={onReturnToMain} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Return to main
      </button>
    </div>
  );
}
