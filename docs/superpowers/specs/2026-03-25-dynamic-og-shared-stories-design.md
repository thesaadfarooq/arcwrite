# Dynamic OG Tags for Shared Stories

**Date:** 2026-03-25
**Status:** Approved

## Problem

When a shared story link (`/s/:token`) is posted on social media or chat platforms, the preview shows generic Arcwrite branding instead of the story's title and description. Social crawlers don't execute JavaScript, so the static `index.html` meta tags are all they see.

## Solution

A Vercel serverless function intercepts `/s/:token` requests via a rewrite rule. It checks the User-Agent to distinguish crawlers from browsers:

- **Crawlers** receive a minimal HTML page with story-specific OG meta tags.
- **Browsers** receive the built `dist/index.html` as-is, so React Router handles the route normally.

## Decisions

- **OG image:** Static branded PNG image (`/og-image.png`). Convert existing SVG to PNG since most social platforms (Twitter, Facebook, LinkedIn) do not render SVG in previews. No per-story image generation.
- **Approach:** User-Agent sniffing in a single API route, with a Vercel rewrite. No changes to the React app.
- **Supabase client:** Use the anon (publishable) key, not the admin/service-role key. The existing RLS policy already allows anonymous `SELECT` on stories with a `share_token`. This minimizes service-key exposure.

## Components

### 1. API Route: `api/og-shared-story.ts`

**Runtime:** Node.js (same as `export-story.ts`)

**Flow:**

1. Extract `token` from query string.
2. Query Supabase (anon client) for the story by `share_token`. Fetch `title`, `genre`, `premise`.
3. If story not found, return generic Arcwrite OG tags (not a 404 — crawlers should still get valid HTML).
4. Check `User-Agent` against known crawler list: `Twitterbot`, `facebookexternalhit`, `LinkedInBot`, `Slackbot-LinkExpanding`, `Discordbot`, `WhatsApp`, `TelegramBot`, `Applebot`, `Googlebot`, `bingbot`, `Mastodon`, `Bluesky-Cardyb`, `PetalBot`.
5. **If crawler:** Return minimal HTML with:
   - `og:title` — story title
   - `og:description` — premise truncated to 155 chars, or fallback "An interactive story on Arcwrite"
   - `og:image` — `https://arcwrite.app/og-image.png`
   - `og:url` — `https://arcwrite.app/s/{token}`
   - `og:type` — `article`
   - `og:site_name` — `Arcwrite`
   - `twitter:card` — `summary_large_image`
   - `twitter:title` / `twitter:description` — same as OG
6. **If browser:** Read the built `dist/index.html` from the filesystem (bundled via `includeFiles` config) and serve it inline with `Content-Type: text/html`. React Router picks up the `/s/:token` route client-side. No redirect needed.

**Response details:**
- Crawler responses: `200` status, `Content-Type: text/html`, well-formed HTML with `<!DOCTYPE html>`.
- Crawler responses include `Cache-Control: s-maxage=300, stale-while-revalidate=600` so Vercel's CDN caches them for 5 minutes (reduces DB load if a link goes viral).
- Browser responses: `200` status, full SPA `index.html` served inline.

### 2. Vercel Rewrite: `vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/s/:token",
      "destination": "/api/og-shared-story?token=:token"
    }
  ]
}
```

All `/s/:token` requests hit the API function. The function serves the appropriate response based on User-Agent: OG HTML for crawlers, SPA `index.html` for browsers.

## Error Handling

- Invalid or missing token: return generic Arcwrite OG tags for crawlers, or the SPA `index.html` for browsers (the SharedStory component already handles "Story not found" UI).
- Supabase query failure: same fallback — generic OG for crawlers, SPA for browsers. No 500s served to crawlers.

## Files Changed

| File | Change |
|------|--------|
| `api/og-shared-story.ts` | New serverless function |
| `vercel.json` | Add rewrite rule |
| `public/og-image.png` | New PNG version of OG image (converted from SVG) |
| `index.html` | Update `og:image` and `twitter:image` to reference `.png` instead of `.svg` |

## Out of Scope

- Per-story OG image generation
- Changes to the SharedStory React component
- SSR or pre-rendering
