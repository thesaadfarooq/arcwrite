import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Tag, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ACTIVE_PROMO } from "@/lib/promo";

const BANNER_HEIGHT = "36px";

function setGlobalBannerOffset(active: boolean) {
  document.documentElement.style.setProperty("--promo-banner-h", active ? BANNER_HEIGHT : "0px");
}

export function PromoBanner() {
  const { tier } = useAuth();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("promo-dismissed") === "1";
    } catch {
      return false;
    }
  });

  // Don't show if no promo, already dismissed, top tier, or in the story editor
  const isEditor = /^\/story\/[^/]+$/.test(location.pathname) && !location.pathname.endsWith("/new");
  const visible = Boolean(ACTIVE_PROMO) && !dismissed && tier !== "pro" && !isEditor;

  useEffect(() => {
    setGlobalBannerOffset(visible);
    return () => setGlobalBannerOffset(false);
  }, [visible]);

  if (!visible || !ACTIVE_PROMO) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("promo-dismissed", "1");
    } catch {
      // ignore
    }
  };

  const upgradeLabel = tier === "plus" ? "Upgrade to Pro" : "See plans";

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] bg-primary text-primary-foreground"
      style={{ height: BANNER_HEIGHT }}
    >
      <div className="max-w-4xl mx-auto h-full flex items-center justify-between gap-3 px-4">
        <Link
          to="/pricing"
          className="flex items-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>{ACTIVE_PROMO.label}</span>
          <span className="hidden sm:inline opacity-80">—</span>
          <span className="hidden sm:inline opacity-80">{upgradeLabel}</span>
        </Link>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md hover:bg-primary-foreground/10 transition-colors"
          aria-label="Dismiss promotion banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
