import type { ReactNode } from "react";

interface StoryWriteDesktopShellProps {
  header: ReactNode;
  sidebar: ReactNode;
  content: ReactNode;
}

export function StoryWriteDesktopShell({
  header,
  sidebar,
  content,
}: StoryWriteDesktopShellProps) {
  return (
    <div className="relative flex h-screen flex-col bg-background transition-colors duration-500">
      {header}
      <div className="flex flex-1 overflow-hidden">
        {sidebar}
        <main className="flex-1 overflow-y-auto">{content}</main>
      </div>
    </div>
  );
}
