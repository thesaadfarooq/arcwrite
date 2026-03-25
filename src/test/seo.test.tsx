import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SEO from "@/components/SEO";

function renderSEO(props: Parameters<typeof SEO>[0]) {
  render(
    <HelmetProvider>
      <SEO {...props} />
    </HelmetProvider>
  );
}

afterEach(cleanup);

describe("SEO component", () => {
  it("sets the page title", async () => {
    renderSEO({ title: "Test Page — Arcwrite" });
    await waitFor(() => {
      expect(document.title).toBe("Test Page — Arcwrite");
    });
  });

  it("sets meta description when provided", async () => {
    renderSEO({ title: "Features", description: "Explore features" });
    await waitFor(() => {
      const meta = document.querySelector('meta[name="description"]');
      expect(meta).not.toBeNull();
      expect(meta!.getAttribute("content")).toBe("Explore features");
    });
  });

  it("sets OG tags when description is provided", async () => {
    renderSEO({ title: "Features — Arcwrite", description: "Explore features" });
    await waitFor(() => {
      expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe("Features — Arcwrite");
      expect(document.querySelector('meta[property="og:description"]')?.getAttribute("content")).toBe("Explore features");
      expect(document.querySelector('meta[property="og:image"]')).not.toBeNull();
      expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe("summary_large_image");
    });
  });

  it("sets canonical URL when provided", async () => {
    renderSEO({ title: "Pricing", canonical: "/pricing" });
    await waitFor(() => {
      const link = document.querySelector('link[rel="canonical"]');
      expect(link).not.toBeNull();
      expect(link!.getAttribute("href")).toBe("https://arcwrite.app/pricing");
    });
  });

  it("sets noindex when specified", async () => {
    renderSEO({ title: "Not Found", noindex: true });
    await waitFor(() => {
      const robots = document.querySelector('meta[name="robots"]');
      expect(robots).not.toBeNull();
      expect(robots!.getAttribute("content")).toContain("noindex");
    });
  });

  it("does not set OG tags when description is omitted", async () => {
    renderSEO({ title: "Bare Page" });
    // Give Helmet time to process, then verify OG tags are absent
    await waitFor(() => {
      expect(document.title).toBe("Bare Page");
    });
    expect(document.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.querySelector('meta[name="twitter:card"]')).toBeNull();
  });

  it("generates BreadcrumbList structured data", async () => {
    renderSEO({
      title: "Features",
      breadcrumbs: [
        { name: "Home", url: "/" },
        { name: "Features", url: "/features" },
      ],
    });
    await waitFor(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      const ldJsons = Array.from(scripts).map((s) => s.textContent || "");
      const breadcrumb = ldJsons.find((s) => s.includes("BreadcrumbList"));
      expect(breadcrumb).toBeDefined();
      expect(breadcrumb).toContain("https://arcwrite.app/features");
    });
  });

  it("generates FAQPage structured data", async () => {
    renderSEO({
      title: "Pricing",
      faqItems: [{ question: "Is it free?", answer: "Yes, there is a free plan." }],
    });
    await waitFor(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      const ldJsons = Array.from(scripts).map((s) => s.textContent || "");
      const faq = ldJsons.find((s) => s.includes("FAQPage"));
      expect(faq).toBeDefined();
      expect(faq).toContain("Is it free?");
    });
  });
});
