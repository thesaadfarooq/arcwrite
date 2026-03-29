import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home, BookMarked, CreditCard, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-500 flex flex-col">
      <SEO title="Page Not Found — Arcwrite" noindex />

      <Navbar />

      <div className="flex-1 flex items-center justify-center px-6 pt-20">
        <div className="text-center max-w-md">
          <div className="text-7xl font-story font-semibold text-primary/20 mb-2">404</div>
          <h1 className="font-story text-2xl font-semibold text-foreground mb-3">
            This page doesn't exist
          </h1>
          <p className="text-muted-foreground mb-8">
            The page at <code className="text-sm bg-secondary px-1.5 py-0.5 rounded">{location.pathname}</code> couldn't be found. It may have been moved or deleted.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Go back
            </Button>
            <Button onClick={() => navigate(user ? "/dashboard" : "/")}>
              <Home className="w-4 h-4 mr-1.5" /> {user ? "Dashboard" : "Home"}
            </Button>
          </div>

          <div className="border-t border-border/50 pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Or try one of these</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => navigate("/features")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <BookMarked className="w-3.5 h-3.5" /> Features
              </button>
              <span className="text-border">|</span>
              <button onClick={() => navigate("/pricing")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <CreditCard className="w-3.5 h-3.5" /> Pricing
              </button>
              {!user && (
                <>
                  <span className="text-border">|</span>
                  <button onClick={() => navigate("/auth")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <LogIn className="w-3.5 h-3.5" /> Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NotFound;
