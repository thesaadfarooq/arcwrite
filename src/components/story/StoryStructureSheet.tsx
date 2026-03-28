import type { ReactNode } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StoryStructureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewSlot: ReactNode;
  chaptersSlot: ReactNode;
  timelineSlot: ReactNode;
}

export function StoryStructureSheet({
  open,
  onOpenChange,
  reviewSlot,
  chaptersSlot,
  timelineSlot,
}: StoryStructureSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl px-0">
        <SheetHeader className="px-4 pb-3 text-left">
          <SheetTitle>Structure</SheetTitle>
          <SheetDescription className="sr-only">Review chapters and timeline details for this story.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="chapters" className="flex min-h-0 flex-1 flex-col px-4 pb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="chapters" className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            {reviewSlot ? <div className="shrink-0">{reviewSlot}</div> : null}
            <div className="min-h-0 flex-1">{chaptersSlot}</div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4 min-h-0 flex-1 overflow-hidden">
            <div className="h-full min-h-0">{timelineSlot}</div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
