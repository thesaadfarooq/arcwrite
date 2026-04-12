import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser, useAuth as useClerkAuth } from "@clerk/react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BookOpen, Sun, Moon, Crown, Mail, Shield, ArrowLeft,
} from "lucide-react";

export default function Account() {
  const { user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerkAuth();
  const { tier, subscriptionEnd, cancelAtPeriodEnd } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [changingPassword, setChangingPassword] = useState(false);

  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? "";
  const name = clerkUser?.firstName
    ? `${clerkUser.firstName}${clerkUser.lastName ? ` ${clerkUser.lastName}` : ""}`
    : null;
  const imageUrl = clerkUser?.imageUrl;
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() ?? "?";
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  const hasPassword = clerkUser?.passwordEnabled ?? false;

  const handleChangePassword = async () => {
    if (!clerkUser) return;
    setChangingPassword(true);
    try {
      await clerkUser.createEmailAddress?.({ email });
      // Clerk doesn't have a direct "change password" via headless — send reset email
      const { startEmailAddressVerification } = clerkUser.primaryEmailAddress ?? {} as never;
      // Use Clerk's password reset flow
      toast.info("To change your password, use the reset password flow from the sign-in page.");
      navigate("/reset-password");
    } catch {
      toast.error("Failed to initiate password change");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!clerkUser) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This will permanently delete all your stories and data. This action cannot be undone."
    );
    if (!confirmed) return;
    try {
      await clerkUser.delete();
      toast.success("Account deleted");
    } catch {
      toast.error("Failed to delete account");
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <Link to="/" className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-story text-lg font-semibold text-foreground tracking-tight">Arcwrite</span>
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
            {theme === "light" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
          </button>
          <UserMenu />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to stories
        </button>

        <h1 className="font-story text-2xl font-semibold text-foreground mb-8">Account</h1>

        {/* Profile section */}
        <section className="rounded-xl border border-border bg-card p-6 mb-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-medium ring-2 ring-border">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {name && <p className="text-foreground font-medium">{name}</p>}
              <div className="flex items-center gap-2 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground truncate">{email}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Plan section */}
        <section className="rounded-xl border border-border bg-card p-6 mb-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Plan</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium">{tierLabel} plan</p>
                {cancelAtPeriodEnd && subscriptionEnd && (
                  <p className="text-xs text-muted-foreground">
                    Cancels {new Date(subscriptionEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}
                {!cancelAtPeriodEnd && subscriptionEnd && (
                  <p className="text-xs text-muted-foreground">
                    Renews {new Date(subscriptionEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>
              {tier === "free" ? "Upgrade" : "Manage"}
            </Button>
          </div>
        </section>

        {/* Security section */}
        <section className="rounded-xl border border-border bg-card p-6 mb-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Security</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-foreground font-medium">Password</p>
                <p className="text-xs text-muted-foreground">
                  {hasPassword ? "Password is set" : "Sign in with social account"}
                </p>
              </div>
            </div>
            {hasPassword && (
              <Button
                variant="outline"
                size="sm"
                disabled={changingPassword}
                onClick={handleChangePassword}
              >
                Change
              </Button>
            )}
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-xl border border-destructive/30 bg-card p-6">
          <h2 className="text-sm font-medium text-destructive uppercase tracking-wider mb-4">Danger zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and all stories</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
              Delete
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
