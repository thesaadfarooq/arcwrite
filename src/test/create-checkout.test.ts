import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const getAuthenticatedUserMock = vi.fn();
const getUserEmailMock = vi.fn();
const customersListMock = vi.fn();
const checkoutSessionsCreateMock = vi.fn();

vi.mock("../../api/_lib/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
  getUserEmail: getUserEmailMock,
}));

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: { list: customersListMock },
    checkout: { sessions: { create: checkoutSessionsCreateMock } },
  })),
}));

function createReqRes(overrides: Record<string, unknown> = {}) {
  const req = {
    method: "POST",
    headers: { authorization: "Bearer tok", origin: "http://localhost:8080" },
    body: { priceId: "price_123" },
    ...overrides,
  };
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
    end() { return this; },
  };
  return { req, res };
}

describe("create-checkout route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test";
  });

  it("returns 204 for OPTIONS", async () => {
    const handler = (await import("../../api/create-checkout")).default;
    const { req, res } = createReqRes({ method: "OPTIONS" });
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(204);
  });

  it("returns 500 when STRIPE_SECRET_KEY is missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const handler = (await import("../../api/create-checkout")).default;
    const { req, res } = createReqRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "STRIPE_SECRET_KEY is not set" });
  });

  it("returns 500 when no authorization header", async () => {
    const handler = (await import("../../api/create-checkout")).default;
    const { req, res } = createReqRes({ headers: {} });
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "No authorization header provided" });
  });

  it("returns 500 when user is not authenticated", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/create-checkout")).default;
    const { req, res } = createReqRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "User not authenticated or email not available" });
  });

  it("returns 500 when priceId is missing", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    getUserEmailMock.mockResolvedValue("test@example.com");
    const handler = (await import("../../api/create-checkout")).default;
    const { req, res } = createReqRes({ body: {} });
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "priceId is required" });
  });

  it("creates a checkout session for an existing customer", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    getUserEmailMock.mockResolvedValue("test@example.com");
    customersListMock.mockResolvedValue({ data: [{ id: "cus_123" }] });
    checkoutSessionsCreateMock.mockResolvedValue({ url: "https://checkout.stripe.com/session" });
    const handler = (await import("../../api/create-checkout")).default;
    const { req, res } = createReqRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ url: "https://checkout.stripe.com/session" });
    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_123", mode: "subscription" })
    );
  });

  it("creates a checkout session for a new customer", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    getUserEmailMock.mockResolvedValue("new@example.com");
    customersListMock.mockResolvedValue({ data: [] });
    checkoutSessionsCreateMock.mockResolvedValue({ url: "https://checkout.stripe.com/new" });
    const handler = (await import("../../api/create-checkout")).default;
    const { req, res } = createReqRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: undefined, customer_email: "new@example.com" })
    );
  });

  it("passes coupon when provided", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    getUserEmailMock.mockResolvedValue("test@example.com");
    customersListMock.mockResolvedValue({ data: [] });
    checkoutSessionsCreateMock.mockResolvedValue({ url: "https://checkout.stripe.com/coupon" });
    const handler = (await import("../../api/create-checkout")).default;
    const { req, res } = createReqRes({ body: { priceId: "price_123", coupon: "SAVE50" } });
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ discounts: [{ coupon: "SAVE50" }] })
    );
  });
});
