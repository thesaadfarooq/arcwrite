import type { ReactNode } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface StoryStructureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewSlot: ReactNode;
  chaptersSlot: ReactNode;
}

export function StoryStructureSheet({
  open,
  onOpenChange,
  reviewSlot,
  chaptersSlot,
}: StoryStructureSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl px-0">
        <SheetHeader className="px-4 pb-3 text-left">
          <SheetTitle>Chapters</SheetTitle>
          <SheetDescription className="sr-only">Review and manage chapters for this story.</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-6">
          {reviewSlot ? <div className="shrink-0">{reviewSlot}</div> : null}
          <div className="min-h-0 flex-1">{chaptersSlot}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
