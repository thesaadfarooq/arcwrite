import { ArrowRight, Download, LayoutDashboard, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StoryCompleteProps {
  onShare?: () => void;
  onExport?: () => void;
  onDashboard?: () => void;
  onContinue?: () => void;
}

export function StoryComplete({ onShare, onExport, onDashboard, onContinue }: StoryCompleteProps) {
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
        </CardContent>
      </Card>
    </div>
  );
}
