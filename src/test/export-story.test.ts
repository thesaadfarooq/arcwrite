import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserMock = vi.fn();
const queryMock = vi.fn();
const queryOneMock = vi.fn();
const customersListMock = vi.fn();
const subscriptionsListMock = vi.fn();

vi.mock("../../api/_lib/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}));

vi.mock("../../api/_db", () => ({
  query: queryMock,
  queryOne: queryOneMock,
}));

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: { list: customersListMock },
    subscriptions: { list: subscriptionsListMock },
  })),
}));

function createResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}

describe("export-story route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test";
  });

  it("returns 401 when the user is not authenticated", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/export-story")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        headers: {},
        body: { storyId: "story-1" },
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns exported story data for a user with an override tier", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    queryOneMock
      .mockResolvedValueOnce({ tier_override: "plus" })
      .mockResolvedValueOnce({
        id: "story-1",
        title: "Moonfall",
        genre: "Sci-Fi",
      });
    queryMock.mockResolvedValue([
      {
        text: "Opening scene",
        chosen_option: null,
        chapter_title: "Arrival",
        starts_chapter: true,
      },
      {
        text: "The station alarms ring out",
        chosen_option: { label: "Investigate" },
        chapter_title: null,
        starts_chapter: false,
      },
    ]);
    const handler = (await import("../../api/export-story")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer token" },
        body: { storyId: "story-1" },
      } as any,
      res as any
    );

    expect(getAuthenticatedUserMock).toHaveBeenCalledWith("Bearer token");
    expect(queryOneMock).toHaveBeenNthCalledWith(
      1,
      "SELECT tier_override FROM profiles WHERE user_id = $1",
      ["user-1"]
    );
    expect(queryOneMock).toHaveBeenNthCalledWith(
      2,
      "SELECT * FROM stories WHERE id = $1 AND user_id = $2",
      ["story-1", "user-1"]
    );
    expect(queryMock).toHaveBeenCalledWith(
      "SELECT text, chosen_option, chapter_title, starts_chapter FROM story_nodes WHERE story_id = $1 AND is_active = true ORDER BY created_at ASC",
      ["story-1"]
    );
    expect(res.body).toEqual({
      title: "Moonfall",
      genre: "Sci-Fi",
      wordCount: 7,
      sections: [
        {
          title: "Arrival",
          paragraphs: ["Opening scene"],
          startsChapter: true,
        },
        {
          title: "Investigate",
          paragraphs: ["The station alarms ring out"],
          startsChapter: false,
        },
      ],
    });
  });

  it("returns 403 when the user does not have export access", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-2", email: "free@example.com" });
    queryOneMock.mockResolvedValue({ tier_override: null });
    customersListMock.mockResolvedValue({ data: [] });
    const handler = (await import("../../api/export-story")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer token" },
        body: { storyId: "story-2" },
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "PDF export requires a Plus or Pro plan" });
  });

  it("returns a generic 500 when the route fails", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-3", email: "boom@example.com" });
    queryOneMock.mockRejectedValue(new Error("db exploded"));
    const handler = (await import("../../api/export-story")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer token" },
        body: { storyId: "story-3" },
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
