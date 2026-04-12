import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const getAuthenticatedUserMock = vi.fn();
const getUserEmailMock = vi.fn();
const customersListMock = vi.fn();
const portalSessionsCreateMock = vi.fn();

vi.mock("../../api/_lib/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
  getUserEmail: getUserEmailMock,
}));

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: { list: customersListMock },
    billingPortal: { sessions: { create: portalSessionsCreateMock } },
  })),
}));

function createReqRes(overrides: Record<string, unknown> = {}) {
  const req = {
    method: "POST",
    headers: { authorization: "Bearer tok", origin: "http://localhost:8080" },
    query: { action: "portal" },
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

describe("customer-portal route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test";
  });

  it("returns 204 for OPTIONS", async () => {
    const handler = (await import("../../api/stripe")).default;
    const { req, res } = createReqRes({ method: "OPTIONS" });
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(204);
  });

  it("returns 500 when no STRIPE_SECRET_KEY", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const handler = (await import("../../api/stripe")).default;
    const { req, res } = createReqRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(500);
  });

  it("returns 500 when auth fails", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/stripe")).default;
    const { req, res } = createReqRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(500);
  });

  it("returns 500 when no Stripe customer found", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    getUserEmailMock.mockResolvedValue("test@example.com");
    customersListMock.mockResolvedValue({ data: [] });
    const handler = (await import("../../api/stripe")).default;
    const { req, res } = createReqRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "No Stripe customer found for this user" });
  });

  it("creates a portal session and returns the URL", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    getUserEmailMock.mockResolvedValue("test@example.com");
    customersListMock.mockResolvedValue({ data: [{ id: "cus_abc" }] });
    portalSessionsCreateMock.mockResolvedValue({ url: "https://billing.stripe.com/portal" });
    const handler = (await import("../../api/stripe")).default;
    const { req, res } = createReqRes();
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ url: "https://billing.stripe.com/portal" });
    expect(portalSessionsCreateMock).toHaveBeenCalledWith({
      customer: "cus_abc",
      return_url: "http://localhost:8080/dashboard",
    });
  });
});
