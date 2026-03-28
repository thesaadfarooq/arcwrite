import type { ReactNode } from "react";

import { MobileStoryBar } from "@/components/story/MobileStoryBar";

interface StoryWriteMobileShellProps {
  header: ReactNode;
  content: ReactNode;
  onWrite: () => void;
  onShowStructure: () => void;
  onShowTools: () => void;
  structureSheet: ReactNode;
  toolsSheet: ReactNode;
}

export function StoryWriteMobileShell({
  header,
  content,
  onWrite,
  onShowStructure,
  onShowTools,
  structureSheet,
  toolsSheet,
}: StoryWriteMobileShellProps) {
  return (
    <div className="flex h-screen flex-col bg-background">
      {header}
      <main className="flex-1 overflow-y-auto">{content}</main>
      <MobileStoryBar onWrite={onWrite} onStructure={onShowStructure} onTools={onShowTools} />
      {structureSheet}
      {toolsSheet}
    </div>
  );
}
