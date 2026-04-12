import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await user.updatePassword({ newPassword: password });
      toast.success("Password updated successfully");
      navigate("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Reset Password — Arcwrite" noindex />
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-6 pt-20">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="font-story text-xl font-semibold text-foreground">Arcwrite</span>
          </div>
          <p className="text-muted-foreground text-sm">Set your new password</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <Label htmlFor="password">New Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "..." : "Update password"}</Button>
        </form>
      </div>
      </div>

      <Footer />
    </div>
  );
}
