import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Supabase DB migration audit", () => {
  it("leaves no supabase.from database calls in src/ or api/", () => {
    const files = [
      "src/lib/auth.tsx",
      "src/pages/StoryWrite.tsx",
      "src/lib/story-api.ts",
      "src/pages/Dashboard.tsx",
      "src/pages/StoryNew.tsx",
      "src/pages/SharedStory.tsx",
      "api/stripe.ts",
      "api/export-story.ts",
      "api/shared-story.ts",
    ];

    const offenders = files.filter((file) =>
      readFileSync(join(process.cwd(), file), "utf8").includes("supabase.from(")
    );

    expect(offenders).toEqual([]);
  });
});
