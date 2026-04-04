import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import Index from "./pages/Index.tsx";
import StoryNew from "./pages/StoryNew.tsx";
import StoryWrite from "./pages/StoryWrite.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Features from "./pages/Features.tsx";
import GenreLanding from "./pages/GenreLanding.tsx";
import Pricing from "./pages/Pricing.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";
import SharedStory from "./pages/SharedStory.tsx";
import StoryExplore from "@/pages/StoryExplore";
import NotFound from "./pages/NotFound.tsx";
import { PromoBanner } from "@/components/PromoBanner";

const queryClient = new QueryClient();

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
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/story/new" element={<ProtectedRoute><StoryNew /></ProtectedRoute>} />
    <Route path="/story/:id" element={<ProtectedRoute><StoryWrite /></ProtectedRoute>} />
    <Route path="/story/:id/explore" element={<ProtectedRoute><StoryExplore /></ProtectedRoute>} />
    <Route path="/features" element={<Features />} />
    <Route path="/genres/:genre" element={<GenreLanding />} />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/about" element={<About />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/s/:token" element={<SharedStory />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PromoBanner />
              <AppRoutes />
            </BrowserRouter>
            <Analytics />
            <SpeedInsights />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
