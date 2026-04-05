import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const customersListMock = vi.fn();
const portalSessionsCreateMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: { list: customersListMock },
    billingPortal: { sessions: { create: portalSessionsCreateMock } },
  })),
}));

function createReqRes(overrides: Record<string, any> = {}) {
  const req = {
    method: "POST",
    headers: { authorization: "Bearer tok", origin: "http://localhost:8080" },
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
    process.env.SUPABASE_URL = "http://localhost";
    process.env.SUPABASE_PUBLISHABLE_KEY = "pub_key";
  });

  it("returns 204 for OPTIONS", async () => {
    const handler = (await import("../../api/customer-portal")).default;
    const { req, res } = createReqRes({ method: "OPTIONS" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(204);
  });

  it("returns 500 when no STRIPE_SECRET_KEY", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const handler = (await import("../../api/customer-portal")).default;
    const { req, res } = createReqRes();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(500);
  });

  it("returns 500 when auth fails", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "bad" } });
    const handler = (await import("../../api/customer-portal")).default;
    const { req, res } = createReqRes();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(500);
  });

  it("returns 500 when no Stripe customer found", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "test@example.com" } }, error: null });
    customersListMock.mockResolvedValue({ data: [] });
    const handler = (await import("../../api/customer-portal")).default;
    const { req, res } = createReqRes();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "No Stripe customer found for this user" });
  });

  it("creates a portal session and returns the URL", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "test@example.com" } }, error: null });
    customersListMock.mockResolvedValue({ data: [{ id: "cus_abc" }] });
    portalSessionsCreateMock.mockResolvedValue({ url: "https://billing.stripe.com/portal" });
    const handler = (await import("../../api/customer-portal")).default;
    const { req, res } = createReqRes();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ url: "https://billing.stripe.com/portal" });
    expect(portalSessionsCreateMock).toHaveBeenCalledWith({
      customer: "cus_abc",
      return_url: "http://localhost:8080/dashboard",
    });
  });
});
