import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { TIERS, type TierKey } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { Check, Minus, Loader2, Crown, Tag } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import { ACTIVE_PROMO } from "@/lib/promo";
import { Reveal, StaggerGroup } from "@/components/motion";

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
    question: "What's the difference between Standard and Enhanced AI?",
    answer: "Standard AI is optimized for speed and works great for exploring ideas. Enhanced AI (Plus and Pro) produces richer, more nuanced prose with better story continuity.",
  },
  {
    question: "What are custom tones and story arc control?",
    answer: "Custom tones let you write your own tone description instead of choosing from presets. Story arc control lets you extend your story past its natural ending or resume with a fresh arc. Both are available on Plus and Pro plans.",
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

type FeatureRow = {
  label: string;
  free: string | boolean;
  plus: string | boolean;
  pro: string | boolean;
};

const featureRows: FeatureRow[] = [
  { label: "Stories",           free: "2",         plus: "10",        pro: "Unlimited" },
  { label: "Turns per story",   free: "10",        plus: "Unlimited", pro: "Unlimited" },
  { label: "AI quality",        free: "Standard",  plus: "Enhanced",  pro: "Enhanced" },
  { label: "Custom tones",      free: false,       plus: true,        pro: true },
  { label: "Story arc control", free: false,       plus: true,        pro: true },
  { label: "PDF export",        free: false,       plus: true,        pro: true },
  { label: "Public sharing",    free: false,       plus: false,       pro: true },
];

const tierDescriptions: Record<TierKey, string> = {
  free: "Try AI-assisted interactive fiction",
  plus: "More stories, better AI, full control",
  pro: "Unlimited creation and sharing",
};


export default function Pricing() {
  const { user, tier: currentTier, subscriptionEnd, cancelAtPeriodEnd, refreshSubscription, getToken } = useAuth();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<TierKey | null>(null);

  const activePromo = ACTIVE_PROMO;

  const handleCheckout = async (tierKey: TierKey) => {
    if (tierKey === "free") return;
    if (!user) {
      navigate("/auth?mode=signup");
      return;
    }

    const priceId = TIERS[tierKey].price_id;
    if (!priceId) return;

    setLoadingTier(tierKey);
    try {
      const accessToken = await getToken();
      const resp = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ priceId, coupon: activePromo?.couponId || undefined }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed to start checkout" }));
        throw new Error(err.error);
      }
      const data = await resp.json();
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to start checkout");
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManage = async () => {
    try {
      const accessToken = await getToken();
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to open subscription management");
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
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <Reveal>
          {activePromo && (
            <div className="mb-8 flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/[0.04] px-5 py-2.5 mx-auto w-fit">
              <Tag className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{activePromo.label}</span>
            </div>
          )}

          <div className="text-center mb-12">
            <h1 className="font-story text-3xl font-semibold text-foreground" style={{ lineHeight: "1.1" }}>
              Choose your plan
            </h1>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto">
              Start free, upgrade when you need more stories, better AI, and full creative control.
            </p>
          </div>
        </Reveal>

        <StaggerGroup stagger={0.15} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tierOrder.map((tierKey) => {
            const t = TIERS[tierKey];
            const isCurrent = !!user && currentTier === tierKey;
            const isPopular = tierKey === "plus";

            return (
              <div
                key={tierKey}
                className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 ${
                  isCurrent
                    ? "border-primary bg-primary/[0.03] shadow-[0_4px_24px_-8px_hsl(var(--primary)/0.15)]"
                    : isPopular
                    ? "border-primary/30 bg-card shadow-[0_2px_16px_-4px_hsl(var(--primary)/0.08)]"
                    : "border-border bg-card"
                } hover:-translate-y-0.5 hover:shadow-md`}
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

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    {tierKey === "pro" && <Crown className="w-4 h-4 text-primary" />}
                    <h3 className="font-story text-lg font-semibold text-foreground">{t.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{tierDescriptions[tierKey]}</p>
                  {(() => {
                    const promoPrice = activePromo?.promoPrices[tierKey];
                    if (t.price === 0) {
                      return (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-semibold text-foreground" style={{ lineHeight: "1" }}>Free</span>
                        </div>
                      );
                    }
                    if (promoPrice != null) {
                      return (
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-semibold text-foreground" style={{ lineHeight: "1" }}>
                            ${promoPrice}
                          </span>
                          <span className="text-base text-muted-foreground/50 line-through">${t.price}</span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-semibold text-foreground" style={{ lineHeight: "1" }}>
                          ${t.price}
                        </span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-2.5 mb-6 flex-1">
                  {featureRows.map((row) => {
                    const value = row[tierKey];
                    const included = value !== false;
                    return (
                      <div key={row.label} className="flex items-center gap-2.5 text-sm">
                        {included ? (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        ) : (
                          <Minus className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={included ? "text-foreground" : "text-muted-foreground/50"}>
                          {row.label}
                          {typeof value === "string" && (
                            <span className={`ml-1.5 ${included ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                              — {value}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

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
        </StaggerGroup>

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
        {/* Every plan includes */}
        <section className="mt-16 mb-16">
          <p className="text-center text-sm text-muted-foreground mb-5">Every plan includes</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["AI story generation", "Branching choices", "Story tree view", "6 genres & 6 tones", "Dark & light mode", "Auto-save"].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <Reveal>
            <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-8">
              Frequently asked questions
            </h2>
          </Reveal>
          <StaggerGroup stagger={0.05} className="max-w-2xl mx-auto space-y-6">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question}>
                <h3 className="font-medium text-foreground mb-1.5">{item.question}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </StaggerGroup>
        </section>
      </main>

      <Footer />
    </div>
  );
}
