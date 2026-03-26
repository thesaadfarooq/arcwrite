import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import { join } from "path";
import { queryOne } from "./_db.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 5,
  includeFiles: ["dist/index.html"],
};

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

  // Browsers: serve the SPA index.html so React Router handles the route
  if (!isCrawler(ua)) {
    try {
      const html = readFileSync(join(process.cwd(), "dist/index.html"), "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    } catch {
      // Fallback: redirect to root and let SPA handle it
      return res.redirect(302, `/s/${encodeURIComponent(token)}`);
    }
  }

  // Crawlers: fetch story data and return OG HTML
  const fallbackTitle = "Arcwrite \u2014 AI Story Generator";
  const fallbackDesc =
    "Create branching choose-your-own-adventure stories with AI. You direct the plot, AI writes the prose.";

  let title = fallbackTitle;
  let description = fallbackDesc;
  let url = token ? `${BASE_URL}/s/${token}` : BASE_URL;

  if (token) {
    try {
      const story = await queryOne<{
        title: string | null;
        genre: string | null;
        premise: string | null;
      }>(
        "SELECT title, genre, premise FROM stories WHERE share_token = $1",
        [token]
      );

      if (story) {
        title = story.title || "Untitled Story";
        const genreTag = story.genre ? ` [${story.genre}]` : "";
        title = `${title}${genreTag} \u2014 Arcwrite`;
        description = story.premise
          ? truncate(story.premise, 155)
          : "An interactive story on Arcwrite";
      }
    } catch {
      // DB error — fall through to generic OG tags
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
