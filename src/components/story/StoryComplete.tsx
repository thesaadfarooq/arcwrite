import { ArrowRight, Download, LayoutDashboard, Share2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StoryCompleteProps {
  onShare?: () => void;
  onExport?: () => void;
  onDashboard?: () => void;
  onContinue?: () => void;
  showArcUpgradeHint?: boolean;
}

export function StoryComplete({ onShare, onExport, onDashboard, onContinue, showArcUpgradeHint }: StoryCompleteProps) {
  return (
    <div className="mt-10">
      <Card className="border-primary/15 bg-primary/[0.03]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">Story complete</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            The final section has landed. Share it, export it, or keep going if you want to extend the arc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {onShare && (
              <Button type="button" variant="outline" size="sm" onClick={onShare}>
                <Share2 className="w-3.5 h-3.5" />
                Share story
              </Button>
            )}
            {onExport && (
              <Button type="button" variant="outline" size="sm" onClick={onExport}>
                <Download className="w-3.5 h-3.5" />
                Export as PDF
              </Button>
            )}
            {onDashboard && (
              <Button type="button" variant="outline" size="sm" onClick={onDashboard}>
                <LayoutDashboard className="w-3.5 h-3.5" />
                Back to dashboard
              </Button>
            )}
            {onContinue && (
              <Button type="button" size="sm" onClick={onContinue}>
                <ArrowRight className="w-3.5 h-3.5" />
                Continue anyway
              </Button>
            )}
          </div>
          {showArcUpgradeHint && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="w-3 h-3 shrink-0" />
              Extend your story past the ending with Plus or Pro
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
