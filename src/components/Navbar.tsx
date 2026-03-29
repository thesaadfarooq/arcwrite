import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, LogIn, Menu, Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (to: string) => location.pathname.startsWith(to);

  const themeButton = (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="w-4 h-4 text-muted-foreground" />
      ) : (
        <Sun className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  );

  const authButton = user ? (
    <Button size="sm" asChild>
      <Link to="/dashboard">Dashboard</Link>
    </Button>
  ) : (
    <Button size="sm" variant="outline" asChild>
      <Link to="/auth">
        <LogIn className="w-3.5 h-3.5 mr-1" /> Sign in
      </Link>
    </Button>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
      {/* Left: Logo + desktop nav links */}
      <div className="flex items-center gap-6">
        <Link
          to="/"
          aria-label="Arcwrite"
          className="flex items-center gap-2"
        >
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-story text-lg font-semibold text-foreground tracking-tight">
            Arcwrite
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                isActive(link.to)
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right: Desktop actions */}
      <div className="hidden md:flex items-center gap-2">
        {themeButton}
        {authButton}
      </div>

      {/* Right: Mobile actions */}
      <div className="flex md:hidden items-center gap-2">
        {themeButton}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <div className="flex flex-col gap-4 mt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    "text-base py-2 transition-colors hover:text-foreground",
                    isActive(link.to)
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-auto pb-6" onClick={() => setSheetOpen(false)}>
              {authButton}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
