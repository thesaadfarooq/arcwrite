import type { ReactNode } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { TonePanelContent } from "@/components/story/TonePanel";

interface StoryToolsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTone: string | undefined;
  onToneChange: (tone: string) => void;
  toolsSlot?: ReactNode;
  canCustomTone?: boolean;
}

export function StoryToolsSheet({
  open,
  onOpenChange,
  currentTone,
  onToneChange,
  toolsSlot,
  canCustomTone,
}: StoryToolsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-3 text-left">
          <SheetTitle>Tools</SheetTitle>
          <SheetDescription className="sr-only">Adjust tone and other story tools from one place.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <TonePanelContent
            currentTone={currentTone}
            onToneChange={onToneChange}
            onDone={() => onOpenChange(false)}
            canCustomTone={canCustomTone}
          />
          {toolsSlot}
        </div>
      </SheetContent>
    </Sheet>
  );
}
