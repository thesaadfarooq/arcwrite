import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { getTierByProductId, type TierKey } from "@/lib/subscription";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  tier: TierKey;
  subscriptionEnd: string | null;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  tier: "free",
  subscriptionEnd: null,
  refreshSubscription: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [tier, setTier] = useState<TierKey>("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const refreshSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("Subscription check error:", error);
        return;
      }
      if (data) {
        setTier(getTierByProductId(data.product_id));
        setSubscriptionEnd(data.subscription_end);
      }
    } catch (e) {
      console.error("Failed to check subscription:", e);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        setTimeout(async () => {
          const { data } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("user_id", session.user.id)
            .single();
          setProfile(data);
        }, 0);
        // Check subscription after auth
        setTimeout(() => refreshSubscription(), 100);
      } else {
        setProfile(null);
        setTier("free");
        setSubscriptionEnd(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [refreshSubscription]);

  // Periodic refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user, refreshSubscription]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, tier, subscriptionEnd, refreshSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
