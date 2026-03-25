import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { TIERS, type TierKey } from "@/lib/subscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, Sun, Moon, ArrowLeft, Check, Loader2, Crown } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";

const tierOrder: TierKey[] = ["free", "plus", "pro"];

const FAQ_ITEMS = [
  {
    question: "Can I try Arcwrite for free?",
    answer: "Yes. The Free plan lets you create 2 stories with up to 10 turns each. No credit card required.",
  },
  {
    question: "What happens when I hit my story limit?",
    answer: "You can still read and share your existing stories. To create new ones, upgrade your plan or delete an existing story to free up a slot.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. You can cancel your subscription at any time from the customer portal. You'll keep access until the end of your billing period.",
  },
  {
    question: "What AI models does Arcwrite use?",
    answer: "Free and Plus plans use standard AI models optimized for interactive fiction. Pro unlocks the best available models for richer, more nuanced prose.",
  },
  {
    question: "Can I export my stories?",
    answer: "Plus and Pro plans include PDF export. Your story is formatted as a readable document with everything you've written.",
  },
  {
    question: "What are public sharing links?",
    answer: "Pro users can generate a public link for any story. Anyone with the link can read the full story — no account needed. Great for sharing your work.",
  },
];

const tierFeatures: Record<TierKey, string[]> = {
  free: ["2 stories", "10 turns per story", "Standard AI models"],
  plus: ["10 stories", "Unlimited turns", "PDF export", "Standard AI models"],
  pro: ["Unlimited stories", "Unlimited turns", "PDF export", "Public sharing links", "Best AI models"],
};

export default function Pricing() {
  const { user, tier: currentTier, subscriptionEnd, cancelAtPeriodEnd, refreshSubscription } = useAuth();
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
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const resp = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ priceId }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed to start checkout" }));
        throw new Error(err.error);
      }
      const data = await resp.json();
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
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const resp = await fetch("/api/customer-portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed to open portal" }));
        throw new Error(err.error);
      }
      const data = await resp.json();
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to open subscription management");
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <SEO
        title="Pricing & Plans — Arcwrite"
        description="Choose the right Arcwrite plan for your interactive fiction writing. Start free with 2 stories, or upgrade for more stories, PDF export, and the best AI models."
        canonical="/pricing"
        faqItems={FAQ_ITEMS}
      />
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-story text-lg font-semibold text-foreground tracking-tight">Arcwrite</span>
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

        {cancelAtPeriodEnd && (
          <div className="mt-8 p-4 rounded-xl border border-primary/20 bg-primary/[0.04] text-center">
            <p className="text-sm text-foreground">
              Your <span className="font-medium">{TIERS[currentTier].name}</span> plan has been cancelled.{" "}
              {subscriptionEnd
                ? <>You'll have access until <span className="font-medium">{new Date(subscriptionEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>.</>
                : <>You'll have access until the end of your billing period.</>
              }
            </p>
          </div>
        )}

        {currentTier !== "free" && (
          <div className="text-center mt-8">
            <button onClick={refreshSubscription} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Refresh subscription status
            </button>
          </div>
        )}
        {/* What's included */}
        <section className="mt-16 mb-16">
          <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-8">
            What's included in every plan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {["AI-powered story generation", "Branching narrative choices", "Story tree visualization", "Six genres and six tones", "Dark and light themes", "Auto-save"].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* Who each plan is for */}
        <section className="mb-16">
          <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-8">
            Who each plan is for
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-medium text-foreground mb-2">Free</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Perfect for trying out interactive fiction or writing a short story. Get a feel for AI-assisted storytelling with two full stories.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-medium text-foreground mb-2">Plus</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For regular writers who want longer stories and more of them. Includes PDF export so you can keep polished copies of your work.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-medium text-foreground mb-2">Pro</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For power users who want unlimited creation, public sharing links, and the best AI models for richer, more nuanced prose.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-6">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question}>
                <h3 className="font-medium text-foreground mb-1">{item.question}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
