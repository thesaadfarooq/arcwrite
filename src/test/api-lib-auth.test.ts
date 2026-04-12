import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyTokenMock = vi.fn();
vi.mock("@clerk/backend", () => ({
  verifyToken: (...args: unknown[]) => verifyTokenMock(...args),
}));

describe("api/_lib/auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.CLERK_SECRET_KEY = "sk_test_xxx";
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

    it("returns null when verifyToken throws", async () => {
      verifyTokenMock.mockRejectedValue(new Error("invalid token"));
      const { getAuthenticatedUser } = await import("../../api/_lib/auth");
      expect(await getAuthenticatedUser("Bearer badtoken")).toBeNull();
    });

    it("returns { id } from the sub claim on success", async () => {
      verifyTokenMock.mockResolvedValue({ sub: "user_abc123" });
      const { getAuthenticatedUser } = await import("../../api/_lib/auth");
      expect(await getAuthenticatedUser("Bearer validtoken")).toEqual({
        id: "user_abc123",
      });
    });

    it("calls verifyToken with the token and secretKey", async () => {
      verifyTokenMock.mockResolvedValue({ sub: "user_abc123" });
      const { getAuthenticatedUser } = await import("../../api/_lib/auth");
      await getAuthenticatedUser("Bearer mytoken");
      expect(verifyTokenMock).toHaveBeenCalledWith("mytoken", {
        secretKey: "sk_test_xxx",
      });
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
