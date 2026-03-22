import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { TIERS, type TierKey } from "@/lib/subscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, Sun, Moon, ArrowLeft, Check, Loader2, Crown } from "lucide-react";
import { toast } from "sonner";

const tierOrder: TierKey[] = ["free", "plus", "pro"];

const tierFeatures: Record<TierKey, string[]> = {
  free: ["2 stories", "5 chapters per story", "Standard AI models"],
  plus: ["15 stories", "20 chapters per story", "PDF export", "Standard AI models"],
  pro: ["Unlimited stories", "Unlimited chapters", "PDF export", "Public sharing links", "Best AI models"],
};

export default function Pricing() {
  const { user, tier: currentTier, refreshSubscription } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<TierKey | null>(null);

  const handleCheckout = async (tierKey: TierKey) => {
    if (tierKey === "free") return;
    if (!user) {
      navigate("/auth");
      return;
    }

    const priceId = TIERS[tierKey].price_id;
    if (!priceId) return;

    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to start checkout");
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManage = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to open subscription management");
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-story text-lg font-semibold text-foreground tracking-tight">VibeWrite</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
            {theme === "light" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate(user ? "/dashboard" : "/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="font-story text-3xl font-semibold text-foreground" style={{ lineHeight: "1.1" }}>
            Choose your plan
          </h1>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">
            Start free, upgrade when you need more stories, exports, and the best AI models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tierOrder.map((tierKey) => {
            const t = TIERS[tierKey];
            const isCurrent = currentTier === tierKey;
            const isPopular = tierKey === "plus";

            return (
              <div
                key={tierKey}
                className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                  isCurrent
                    ? "border-primary bg-primary/[0.03] shadow-[0_4px_24px_-8px_hsl(var(--primary)/0.15)]"
                    : isPopular
                    ? "border-primary/30 bg-card shadow-[0_2px_16px_-4px_hsl(var(--primary)/0.08)]"
                    : "border-border bg-card"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Your Plan
                  </div>
                )}
                {isPopular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-medium px-3 py-1 rounded-full">
                    Popular
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {tierKey === "pro" && <Crown className="w-4 h-4 text-primary" />}
                    <h3 className="font-story text-lg font-semibold text-foreground">{t.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold text-foreground" style={{ lineHeight: "1" }}>
                      {t.price === 0 ? "Free" : `$${t.price}`}
                    </span>
                    {t.price > 0 && <span className="text-sm text-muted-foreground">/month</span>}
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tierFeatures[tierKey].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  currentTier !== "free" ? (
                    <Button variant="outline" className="w-full" onClick={handleManage}>
                      Manage subscription
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  )
                ) : tierKey === "free" ? (
                  <Button variant="outline" className="w-full" disabled>
                    {currentTier === "free" ? "Current plan" : "Downgrade via manage"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={isPopular ? "default" : "outline"}
                    onClick={() => handleCheckout(tierKey)}
                    disabled={loadingTier !== null}
                  >
                    {loadingTier === tierKey ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : null}
                    {currentTier !== "free" ? "Switch plan" : "Upgrade"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {currentTier !== "free" && (
          <div className="text-center mt-8">
            <button onClick={refreshSubscription} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Refresh subscription status
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
