import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

const PAGE_LINKS = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Terms & Privacy", to: "/legal" },
];

const GENRE_LINKS = [
  { label: "Fantasy", to: "/genres/fantasy" },
  { label: "Sci-Fi", to: "/genres/scifi" },
  { label: "Mystery", to: "/genres/mystery" },
  { label: "Romance", to: "/genres/romance" },
  { label: "Horror", to: "/genres/horror" },
  { label: "Thriller", to: "/genres/thriller" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/50 py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="font-story font-semibold text-foreground">Arcwrite</span>
            </div>
            <p className="text-xs text-muted-foreground">Stories you direct, AI delivers.</p>
          </div>

          {/* Pages */}
          <div>
            <h4 className="text-xs font-medium text-foreground uppercase tracking-wider mb-3">Pages</h4>
            <ul className="space-y-2">
              {PAGE_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Genres */}
          <div>
            <h4 className="text-xs font-medium text-foreground uppercase tracking-wider mb-3">Genres</h4>
            <ul className="space-y-2">
              {GENRE_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Silvergrain. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/legal#privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/legal#terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
