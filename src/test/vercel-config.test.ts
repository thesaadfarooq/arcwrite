import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const vercelConfig = JSON.parse(
  readFileSync(resolve(__dirname, "../../vercel.json"), "utf-8")
);

describe("vercel.json configuration", () => {
  it("has rewrites array", () => {
    expect(vercelConfig.rewrites).toBeDefined();
    expect(Array.isArray(vercelConfig.rewrites)).toBe(true);
  });

  it("has SPA catch-all rewrite to index.html", () => {
    const catchAll = vercelConfig.rewrites.find(
      (r: any) => r.destination === "/index.html"
    );
    expect(catchAll).toBeDefined();
    // The source pattern should use a negative lookahead to exclude /api/ routes
    expect(catchAll.source).toContain("(?!api/");
  });

  it("has shared story OG rewrite before the catch-all", () => {
    const ogRewrite = vercelConfig.rewrites.find(
      (r: any) => r.source === "/s/:token"
    );
    expect(ogRewrite).toBeDefined();
    expect(ogRewrite.destination).toContain("/api/og-shared-story");

    const ogIndex = vercelConfig.rewrites.indexOf(ogRewrite);
    const catchAllIndex = vercelConfig.rewrites.findIndex(
      (r: any) => r.destination === "/index.html"
    );
    expect(ogIndex).toBeLessThan(catchAllIndex);
  });

  it("uses vite framework and dist output", () => {
    expect(vercelConfig.framework).toBe("vite");
    expect(vercelConfig.outputDirectory).toBe("dist");
  });
});
