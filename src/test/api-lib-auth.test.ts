import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

describe("api/_lib/auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "http://localhost";
    process.env.SUPABASE_PUBLISHABLE_KEY = "pub_key";
  });

  describe("getAuthenticatedUser", () => {
    it("returns null when no auth header", async () => {
      const { getAuthenticatedUser } = await import("../../api/_lib/auth");
      expect(await getAuthenticatedUser(null)).toBeNull();
    });

    it("returns null when header lacks Bearer prefix", async () => {
      const { getAuthenticatedUser } = await import("../../api/_lib/auth");
      expect(await getAuthenticatedUser("InvalidHeader")).toBeNull();
    });

    it("returns null when supabase returns an error", async () => {
      getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "bad" } });
      const { getAuthenticatedUser } = await import("../../api/_lib/auth");
      expect(await getAuthenticatedUser("Bearer validtoken")).toBeNull();
    });

    it("returns the user on success", async () => {
      const fakeUser = { id: "u1", email: "test@example.com" };
      getUserMock.mockResolvedValue({ data: { user: fakeUser }, error: null });
      const { getAuthenticatedUser } = await import("../../api/_lib/auth");
      expect(await getAuthenticatedUser("Bearer validtoken")).toEqual(fakeUser);
    });
  });

  describe("getUserTier", () => {
    it("returns 'free' when no profile row", async () => {
      fromMock.mockReturnValue({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
      });
      const { getUserTier } = await import("../../api/_lib/auth");
      expect(await getUserTier("u1")).toBe("free");
    });

    it("returns 'plus' when profile tier is plus", async () => {
      fromMock.mockReturnValue({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { tier: "plus" } }) }) }),
      });
      const { getUserTier } = await import("../../api/_lib/auth");
      expect(await getUserTier("u1")).toBe("plus");
    });

    it("returns 'pro' when profile tier is pro", async () => {
      fromMock.mockReturnValue({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { tier: "pro" } }) }) }),
      });
      const { getUserTier } = await import("../../api/_lib/auth");
      expect(await getUserTier("u1")).toBe("pro");
    });

    it("returns 'free' for unknown tier values", async () => {
      fromMock.mockReturnValue({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { tier: "unknown" } }) }) }),
      });
      const { getUserTier } = await import("../../api/_lib/auth");
      expect(await getUserTier("u1")).toBe("free");
    });
  });

  describe("unauthorizedResponse", () => {
    it("returns a 401 response with JSON body", async () => {
      const { unauthorizedResponse } = await import("../../api/_lib/auth");
      const resp = unauthorizedResponse();
      expect(resp.status).toBe(401);
      const body = await resp.json();
      expect(body).toEqual({ error: "Authentication required" });
    });
  });
});
