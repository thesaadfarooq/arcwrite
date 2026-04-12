import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const getAuthenticatedUserMock = vi.fn();
const getUserEmailMock = vi.fn();
const queryMock = vi.fn();
const queryOneMock = vi.fn();
const customersListMock = vi.fn();
const subscriptionsListMock = vi.fn();

vi.mock("../../api/_lib/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
  getUserEmail: getUserEmailMock,
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

describe("check-subscription route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_PLUS_PRODUCT_ID = "prod_plus";
    process.env.STRIPE_PRO_PRODUCT_ID = "prod_pro";
  });

  it("returns 401 without an authenticated user", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/check-subscription")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        headers: {},
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns the override tier and syncs it into profiles", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    getUserEmailMock.mockResolvedValue("user@example.com");
    queryOneMock.mockResolvedValue({ tier_override: "pro" });
    const handler = (await import("../../api/check-subscription")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(getAuthenticatedUserMock).toHaveBeenCalledWith("Bearer token");
    expect(queryOneMock).toHaveBeenCalledWith(
      "SELECT tier_override FROM profiles WHERE user_id = $1",
      ["user-1"]
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO profiles (user_id, tier) VALUES ($1, $2)"),
      ["user-1", "pro"]
    );
    expect(customersListMock).not.toHaveBeenCalled();
    expect(res.body).toEqual({
      subscribed: true,
      product_id: "prod_pro",
      subscription_end: null,
      cancel_at_period_end: false,
      tier_override: "pro",
    });
  });

  it("syncs free tier when no active customer exists", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-2" });
    getUserEmailMock.mockResolvedValue("free@example.com");
    queryOneMock.mockResolvedValue(null);
    customersListMock.mockResolvedValue({ data: [] });
    const handler = (await import("../../api/check-subscription")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (user_id) DO UPDATE SET tier = EXCLUDED.tier"),
      ["user-2", "free"]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ subscribed: false });
  });

  it("maps an active stripe subscription back to the resolved tier", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-3" });
    getUserEmailMock.mockResolvedValue("plus@example.com");
    queryOneMock.mockResolvedValue(null);
    customersListMock.mockResolvedValue({ data: [{ id: "cus_123" }] });
    subscriptionsListMock.mockResolvedValue({
      data: [
        {
          cancel_at_period_end: true,
          items: {
            data: [
              {
                current_period_end: 1_774_464_000,
                price: { product: "prod_plus" },
              },
            ],
          },
        },
      ],
    });
    const handler = (await import("../../api/check-subscription")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO profiles (user_id, tier) VALUES ($1, $2)"),
      ["user-3", "plus"]
    );
    expect(res.body).toEqual({
      subscribed: true,
      product_id: "prod_plus",
      subscription_end: "2026-03-25T18:40:00.000Z",
      cancel_at_period_end: true,
    });
  });

  it("returns a generic 500 when the route fails", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-4" });
    getUserEmailMock.mockResolvedValue("boom@example.com");
    queryOneMock.mockRejectedValue(new Error("db blew up"));
    const handler = (await import("../../api/check-subscription")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
