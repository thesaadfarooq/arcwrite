import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from "@clerk/react";
import { dark } from "@clerk/themes";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import Index from "./pages/Index.tsx";
import StoryNew from "./pages/StoryNew.tsx";
import StoryWrite from "./pages/StoryWrite.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Account from "./pages/Account.tsx";
import Features from "./pages/Features.tsx";
import GenreLanding from "./pages/GenreLanding.tsx";
import Pricing from "./pages/Pricing.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";
import Legal from "./pages/Legal.tsx";
import SharedStory from "./pages/SharedStory.tsx";
import StoryExplore from "@/pages/StoryExplore";
import SSOCallback from "./pages/SSOCallback.tsx";
import NotFound from "./pages/NotFound.tsx";
import { PromoBanner } from "@/components/PromoBanner";

const CLERK_PUB_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>} />
    <Route path="/sso-callback" element={<SSOCallback />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
    <Route path="/story/new" element={<ProtectedRoute><StoryNew /></ProtectedRoute>} />
    <Route path="/story/:id" element={<ProtectedRoute><StoryWrite /></ProtectedRoute>} />
    <Route path="/story/:id/explore" element={<ProtectedRoute><StoryExplore /></ProtectedRoute>} />
    <Route path="/features" element={<Features />} />
    <Route path="/genres/:genre" element={<GenreLanding />} />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/about" element={<About />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/legal" element={<Legal />} />
    <Route path="/s/:token" element={<SharedStory />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

function ThemedClerkProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <ClerkProvider
      publishableKey={CLERK_PUB_KEY}
      afterSignOutUrl="/auth"
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: isDark
          ? {
              colorBackground: "hsl(220, 14%, 13%)",
              colorNeutral: "hsl(35, 15%, 88%)",
              colorPrimary: "hsl(30, 65%, 55%)",
              colorDanger: "hsl(0, 55%, 45%)",
              colorSuccess: "hsl(142, 71%, 45%)",
              fontFamily: "Inter, sans-serif",
              borderRadius: "0.75rem",
              colorInput: "hsl(220, 12%, 18%)",
              colorInputForeground: "hsl(35, 15%, 88%)",
              colorBorder: "hsl(220, 12%, 20%)",
              colorForeground: "hsl(35, 15%, 88%)",
              colorMutedForeground: "hsl(220, 10%, 62%)",
              colorMuted: "hsl(220, 12%, 18%)",
              colorModalBackdrop: "rgba(0, 0, 0, 0.6)",
              colorShimmer: "hsl(220, 12%, 22%)",
            }
          : {
              colorBackground: "hsl(39, 32%, 96%)",
              colorNeutral: "hsl(30, 10%, 15%)",
              colorPrimary: "hsl(24, 70%, 35%)",
              colorDanger: "hsl(0, 84%, 60%)",
              colorSuccess: "hsl(142, 71%, 45%)",
              fontFamily: "Inter, sans-serif",
              borderRadius: "0.75rem",
              colorInput: "hsl(39, 28%, 93%)",
              colorInputForeground: "hsl(30, 10%, 15%)",
              colorBorder: "hsl(35, 18%, 85%)",
              colorForeground: "hsl(30, 10%, 15%)",
              colorMutedForeground: "hsl(30, 8%, 50%)",
              colorMuted: "hsl(35, 15%, 90%)",
            },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedClerkProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <PromoBanner />
                <AppRoutes />
              </BrowserRouter>
              <Analytics />
              <SpeedInsights />
            </TooltipProvider>
          </AuthProvider>
        </ThemedClerkProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
