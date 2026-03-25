# Dynamic OG Tags for Shared Stories — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make shared story links (`/s/:token`) show story-specific titles and descriptions when posted on social media and chat platforms.

**Architecture:** A Vercel rewrite intercepts `/s/:token` requests and routes them to a serverless function. The function checks User-Agent: crawlers get a minimal HTML page with OG tags populated from Supabase; browsers get a 302 redirect back to the SPA.

**Tech Stack:** Vercel serverless functions (Node.js), Supabase JS client, Vercel rewrites

**Spec:** `docs/superpowers/specs/2026-03-25-dynamic-og-shared-stories-design.md`

---

## Chunk 1: OG Image and HTML Updates

### Task 1: Convert OG image from SVG to PNG

The existing `public/og-image.svg` is 1200x630 — correct OG dimensions. Most social platforms (Twitter/X, Facebook, LinkedIn) don't render SVG in previews, so we need a PNG version.

**Files:**
- Create: `public/og-image.png`
- Modify: `index.html:18,25`

- [ ] **Step 1: Convert SVG to PNG**

Use a browser or CLI tool to render the SVG at its native 1200x630 resolution:

```bash
npx svg2png-cli public/og-image.svg --output public/og-image.png --width 1200 --height 1200
```

If that tool isn't available, use `sharp`:

```bash
node -e "
const sharp = require('sharp');
sharp('public/og-image.svg')
  .resize(1200, 630)
  .png()
  .toFile('public/og-image.png')
  .then(() => console.log('Done'))
  .catch(e => console.error(e));
"
```

Or as a last resort, open `public/og-image.svg` in a browser, screenshot at 1200x630, and save as PNG.

Verify: `file public/og-image.png` should show PNG image data, 1200 x 630.

- [ ] **Step 2: Update index.html to reference PNG**

In `index.html`, change both image references from `.svg` to `.png`:

Line 18 — change:
```html
<meta property="og:image" content="https://arcwrite.app/og-image.svg" />
```
to:
```html
<meta property="og:image" content="https://arcwrite.app/og-image.png" />
```

Line 25 — change:
```html
<meta name="twitter:image" content="https://arcwrite.app/og-image.svg" />
```
to:
```html
<meta name="twitter:image" content="https://arcwrite.app/og-image.png" />
```

- [ ] **Step 3: Verify build still works**

```bash
npm run build
```

Expected: Clean build with no errors. `dist/og-image.png` should exist in output.

- [ ] **Step 4: Commit**

```bash
git add public/og-image.png index.html
git commit -m "feat: add PNG OG image for social platform compatibility"
```

---

## Chunk 2: API Route and Vercel Rewrite

### Task 2: Create the OG shared story API route

**Files:**
- Create: `api/og-shared-story.ts`

- [ ] **Step 1: Create `api/og-shared-story.ts`**

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs", maxDuration: 5 };

const CRAWLERS = [
  "Twitterbot",
  "facebookexternalhit",
  "LinkedInBot",
  "Slackbot-LinkExpanding",
  "Slackbot",
  "Discordbot",
  "WhatsApp",
  "TelegramBot",
  "Applebot",
  "Googlebot",
  "bingbot",
  "Mastodon",
  "Bluesky-Cardyb",
  "PetalBot",
];

const BASE_URL = "https://arcwrite.app";

function isCrawler(ua: string): boolean {
  return CRAWLERS.some((bot) => ua.includes(bot));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "\u2026";
}

function buildOgHtml(opts: {
  title: string;
  description: string;
  url: string;
}): string {
  const { title, description, url } = opts;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  const img = `${BASE_URL}/og-image.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${t}</title>
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:image" content="${img}" />
<meta property="og:url" content="${u}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Arcwrite" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${img}" />
</head>
<body></body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = (req.query.token as string) || "";
  const ua = req.headers["user-agent"] || "";

  // Browsers get redirected to the SPA with ?spa=1 to bypass the rewrite
  if (!isCrawler(ua)) {
    return res.redirect(302, `/s/${encodeURIComponent(token)}?spa=1`);
  }

  // Crawlers: fetch story data and return OG HTML
  const fallbackTitle = "Arcwrite — AI Story Generator";
  const fallbackDesc =
    "Create branching choose-your-own-adventure stories with AI. You direct the plot, AI writes the prose.";
  const fallbackUrl = BASE_URL;

  let title = fallbackTitle;
  let description = fallbackDesc;
  let url = token ? `${BASE_URL}/s/${token}` : fallbackUrl;

  if (token) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_PUBLISHABLE_KEY!
      );

      const { data: story } = await supabase
        .from("stories")
        .select("title, genre, premise")
        .eq("share_token", token)
        .single();

      if (story) {
        title = story.title || "Untitled Story";
        const genreTag = story.genre ? ` [${story.genre}]` : "";
        title = `${title}${genreTag} — Arcwrite`;
        description = story.premise
          ? truncate(story.premise, 155)
          : "An interactive story on Arcwrite";
      }
    } catch {
      // Supabase error — fall through to generic OG tags
    }
  }

  const html = buildOgHtml({ title, description, url });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "s-maxage=300, stale-while-revalidate=600"
  );
  return res.status(200).send(html);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit api/og-shared-story.ts --esModuleInterop --moduleResolution node --target es2020 --module commonjs --skipLibCheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add api/og-shared-story.ts
git commit -m "feat: add OG meta tag API route for shared stories"
```

### Task 3: Add Vercel rewrite rule

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Update `vercel.json`**

Replace the current contents with:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/s/:token",
      "missing": [{ "type": "query", "key": "spa" }],
      "destination": "/api/og-shared-story?token=:token"
    }
  ]
}
```

The `missing` condition ensures that requests with `?spa=1` (i.e., the redirect target for browsers) bypass the rewrite and fall through to the SPA catch-all.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Clean build. The rewrite is only processed at deploy time by Vercel, so the build just needs to succeed.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: add rewrite routing /s/:token to OG API for crawlers"
```

---

## Chunk 3: Testing

### Task 4: Manual verification

- [ ] **Step 1: Test locally with curl (crawler simulation)**

Start the dev server:
```bash
npm run dev
```

Then in another terminal, simulate a crawler:
```bash
curl -H "User-Agent: Twitterbot/1.0" "http://localhost:8080/api/og-shared-story?token=SOME_REAL_TOKEN"
```

Expected: HTML response with `og:title` containing the story title, `og:description` with the premise.

Test with an invalid token:
```bash
curl -H "User-Agent: Twitterbot/1.0" "http://localhost:8080/api/og-shared-story?token=invalidtoken"
```

Expected: HTML response with generic Arcwrite OG tags (fallback).

- [ ] **Step 2: Test browser redirect**

```bash
curl -v "http://localhost:8080/api/og-shared-story?token=SOME_REAL_TOKEN"
```

Expected: `302` redirect to `/s/SOME_REAL_TOKEN?spa=1`.

- [ ] **Step 3: Validate OG tags with a linter**

After deploying, use these tools to verify:
- https://developers.facebook.com/tools/debug/ (paste shared story URL)
- https://cards-dev.twitter.com/validator (paste shared story URL)

These will show exactly what crawlers see.

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during OG tag testing"
```

Only if changes were needed.
