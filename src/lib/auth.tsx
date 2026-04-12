import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/react";
import { getTierByProductId, type TierKey } from "@/lib/subscription";

interface ClerkUser {
  id: string;
  primaryEmailAddress?: { emailAddress: string } | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

interface AuthContextType {
  user: ClerkUser | null;
  loading: boolean;
  tier: TierKey;
  subscriptionEnd: string | null;
  cancelAtPeriodEnd: boolean;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  tier: "free",
  subscriptionEnd: null,
  cancelAtPeriodEnd: false,
  refreshSubscription: async () => {},
  signOut: async () => {},
  getToken: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded: userLoaded, isSignedIn, user: clerkUser } = useUser();
  const { isLoaded: authLoaded, getToken, signOut: clerkSignOut } = useClerkAuth();

  const [tier, setTier] = useState<TierKey>("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

  const loading = !userLoaded || !authLoaded;

  const user: ClerkUser | null = isSignedIn && clerkUser ? {
    id: clerkUser.id,
    primaryEmailAddress: clerkUser.primaryEmailAddress
      ? { emailAddress: clerkUser.primaryEmailAddress.emailAddress }
      : null,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
  } : null;

  const refreshSubscription = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const resp = await fetch("/api/check-subscription", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        console.error("Subscription check error:", resp.status);
        return;
      }
      const data = await resp.json();
      if (data) {
        if (data.tier_override && (data.tier_override === "plus" || data.tier_override === "pro")) {
          setTier(data.tier_override);
        } else {
          setTier(getTierByProductId(data.product_id));
        }
        setSubscriptionEnd(data.subscription_end);
        setCancelAtPeriodEnd(!!data.cancel_at_period_end);
      }
    } catch (e) {
      console.error("Failed to check subscription:", e);
    }
  }, [getToken]);

  // Check subscription when user signs in
  useEffect(() => {
    if (isSignedIn) {
      refreshSubscription();
    } else {
      setTier("free");
      setSubscriptionEnd(null);
      setCancelAtPeriodEnd(false);
    }
  }, [isSignedIn, refreshSubscription]);

  // Periodic refresh every 60s
  useEffect(() => {
    if (!isSignedIn) return;
    const interval = setInterval(refreshSubscription, 60_000);
    return () => clearInterval(interval);
  }, [isSignedIn, refreshSubscription]);

  const signOut = useCallback(async () => {
    await clerkSignOut();
  }, [clerkSignOut]);

  return (
    <AuthContext.Provider value={{ user, loading, tier, subscriptionEnd, cancelAtPeriodEnd, refreshSubscription, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
