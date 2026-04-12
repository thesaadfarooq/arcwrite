import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const queryOneMock = vi.fn();
const readFileSyncMock = vi.fn();

vi.mock("../../api/_db", () => ({
  queryOne: queryOneMock,
}));

vi.mock("fs", () => ({
  readFileSync: readFileSyncMock,
  default: {
    readFileSync: readFileSyncMock,
  },
}));

function createResponse() {
  return {
    statusCode: 200,
    body: "",
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: string) {
      this.body = payload;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    redirect(code: number, location: string) {
      this.statusCode = code;
      this.headers.Location = location;
      return this;
    },
  };
}

describe("og-shared-story route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves the SPA html to non-crawler requests", async () => {
    readFileSyncMock.mockReturnValue("<html>SPA</html>");
    const handler = (await import("../../api/shared-story")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: { token: "share-token", og: "true" },
        headers: { "user-agent": "Mozilla/5.0" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(readFileSyncMock).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("<html>SPA</html>");
  });

  it("builds crawler OG html from the shared story query", async () => {
    queryOneMock.mockResolvedValue({
      title: "The Hidden Keep",
      genre: "Fantasy",
      premise: "A lone courier uncovers a sealed fortress beneath the city.",
    });
    const handler = (await import("../../api/shared-story")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: { token: "share-token", og: "true" },
        headers: { "user-agent": "Twitterbot/1.0" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(queryOneMock).toHaveBeenCalledWith(
      "SELECT title, genre, premise FROM stories WHERE share_token = $1",
      ["share-token"]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("The Hidden Keep [Fantasy] — Arcwrite");
    expect(res.body).toContain("A lone courier uncovers a sealed fortress beneath the city.");
  });

  it("falls back to the generic OG metadata when no story is found", async () => {
    queryOneMock.mockResolvedValue(null);
    const handler = (await import("../../api/shared-story")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: { token: "missing-token", og: "true" },
        headers: { "user-agent": "Slackbot 1.0" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Arcwrite — AI Story Generator");
    expect(res.body).toContain("Create branching choose-your-own-adventure stories with AI.");
  });
});
