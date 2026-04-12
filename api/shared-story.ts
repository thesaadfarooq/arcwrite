import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import { join } from "path";
import { query, queryOne } from "./_db.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
  includeFiles: ["dist/index.html"],
};

// --- OG meta for crawlers ---

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

function buildOgHtml(opts: { title: string; description: string; url: string }): string {
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

async function handleOg(token: string, ua: string, res: VercelResponse) {
  // Browsers: serve the SPA index.html so React Router handles the route
  if (!isCrawler(ua)) {
    try {
      const html = readFileSync(join(process.cwd(), "dist/index.html"), "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    } catch {
      return res.redirect(302, `/s/${encodeURIComponent(token)}`);
    }
  }

  // Crawlers: fetch story data and return OG HTML
  const fallbackTitle = "Arcwrite \u2014 AI Story Generator";
  const fallbackDesc =
    "Create branching choose-your-own-adventure stories with AI. You direct the plot, AI writes the prose.";

  let title = fallbackTitle;
  let description = fallbackDesc;
  const url = token ? `${BASE_URL}/s/${token}` : BASE_URL;

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
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.status(200).send(html);
}

// --- JSON data for frontend ---

async function handleData(token: string, res: VercelResponse) {
  const story = await queryOne<{
    id: string;
    title: string;
    genre: string | null;
    premise: string | null;
  }>(
    "SELECT id, title, genre, premise FROM stories WHERE share_token = $1",
    [token]
  );

  if (!story) {
    return res.status(404).json({ error: "Not found" });
  }

  const nodes = await query(
    "SELECT * FROM story_nodes WHERE story_id = $1 AND is_active = true ORDER BY created_at ASC",
    [story.id]
  );

  return res.json({ story, nodes });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) {
      return res.status(400).json({ error: "token required" });
    }

    // OG mode: serve HTML for crawlers/browsers (used by vercel.json rewrite)
    if (req.query.og === "true") {
      const ua = (req.headers["user-agent"] as string) || "";
      return await handleOg(token, ua, res);
    }

    // Default: return JSON data for frontend
    return await handleData(token, res);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}
