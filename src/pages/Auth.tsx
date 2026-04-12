import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSignIn, useSignUp } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import SEO from "@/components/SEO";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const paramMode = searchParams.get("mode");
  const urlMode = paramMode === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "verify">(urlMode);

  useEffect(() => {
    if (mode !== "verify") setMode(urlMode);
  }, [paramMode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpReady, setOtpReady] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const prefersReduced = useReducedMotion();

  const noMotion = { initial: undefined, animate: undefined, exit: undefined, transition: undefined };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setInterval(() => {
      setOtpCountdown((c) => {
        if (c <= 1) {
          setOtpReady(true);
          setTimeout(() => otpRefs.current[0]?.focus(), 100);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [otpCountdown > 0]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !signUp) return;
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error: createErr } = await signIn.create({ identifier: email });
        if (createErr) throw createErr;
        const { error: sendErr } = await signIn.resetPasswordEmailCode.sendCode();
        if (sendErr) throw sendErr;
        toast.success("Check your email for a reset code");
        setMode("login");
      } else if (mode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match.");
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          toast.error("Password must be at least 8 characters.");
          setLoading(false);
          return;
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
          toast.error("Password must include uppercase, lowercase, and a number.");
          setLoading(false);
          return;
        }
        const { error: pwErr } = await signUp.password({ emailAddress: email, password });
        if (pwErr) throw pwErr;
        const { error: sendErr } = await signUp.verifications.sendEmailCode();
        if (sendErr) throw sendErr;
        setOtpReady(false);
        setOtpCountdown(15);
        setMode("verify");
        setResendCooldown(60);
      } else {
        // Login
        const { error: pwErr } = await signIn.password({ emailAddress: email, password });
        if (pwErr) throw pwErr;
        if (signIn.status === "complete") {
          await signIn.finalize({
            navigate: ({ decorateUrl }) => {
              navigate(decorateUrl("/dashboard"));
            },
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (mode === "signup" && (msg.includes("already") || msg.includes("taken"))) {
        toast.error("An account with this email already exists. Try signing in instead.");
      } else if (mode === "login" && (msg.includes("invalid") || msg.includes("credentials") || msg.includes("password"))) {
        toast.error("Incorrect email or password. Please try again.");
      } else {
        toast.error(err instanceof Error ? err.message : "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (digit && index === 5) {
      const token = next.join("");
      if (token.length === 6) handleVerifyOtp(token);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (token: string) => {
    if (!signUp) return;
    setOtpLoading(true);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code: token });
      if (error) throw error;
      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: ({ decorateUrl }) => {
            navigate(decorateUrl("/dashboard"));
          },
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid code. Please try again.");
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !signUp) return;
    try {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) throw error;
      toast.success("Code resent — check your email");
      setOtpReady(false);
      setOtpCountdown(15);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldown(60);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  const handleGoogleAuth = async () => {
    if (!signIn) {
      toast.error("Sign-in not ready yet. Please wait a moment and try again.");
      return;
    }
    try {
      await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("already") || msg.includes("account exists")) {
        toast.error("An account with this email already exists. Try a different sign-in method.");
      } else {
        toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-500">
      <SEO title="Sign In — Arcwrite" noindex />
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-6 pt-20">
      <motion.div
        className="w-full max-w-sm"
        {...(prefersReduced ? noMotion : {
          initial: { opacity: 0, y: 16, scale: 0.96 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        })}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="font-story text-xl font-semibold text-foreground">Arcwrite</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : mode === "verify" ? "Check your email" : "Reset your password"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {mode === "verify" ? (
            <motion.div key="verify" {...(prefersReduced ? noMotion : { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.25 } })}>
              <p className="text-center text-sm text-muted-foreground mb-6">
                {!otpReady
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Sending code ({otpCountdown}s)</span>
                  : <>Enter the 6-digit code sent to <span className="text-foreground font-medium">{email}</span></>
                }
              </p>
              <div className="flex justify-center gap-2 mb-6">
                {otpDigits.map((digit, i) => (
                  <motion.div
                    key={i}
                    {...(prefersReduced ? noMotion : {
                      initial: { opacity: 0, y: 8 },
                      animate: { opacity: 1, y: 0 },
                      transition: { delay: i * 0.05, duration: 0.3 },
                    })}
                  >
                    <input
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      role="textbox"
                      maxLength={1}
                      value={digit}
                      disabled={!otpReady || otpLoading}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-10 h-12 text-center text-lg border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all ${!otpReady ? "opacity-30 cursor-not-allowed" : ""}`}
                    />
                  </motion.div>
                ))}
              </div>
              {otpLoading && (
                <div className="flex justify-center mb-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                </button>
                <div>
                  <button
                    onClick={() => { setMode("signup"); setOtpDigits(["", "", "", "", "", ""]); setOtpReady(false); setOtpCountdown(0); }}
                    className="text-primary hover:underline"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key={mode} {...(prefersReduced ? noMotion : { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.25 } })}>
              {/* Google */}
              {mode !== "forgot" && (
                <>
                  <Button variant="outline" className="w-full mb-4" onClick={handleGoogleAuth}>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continue with Google
                  </Button>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
                  </div>
                </>
              )}

              {/* Email form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
                </div>
                {mode !== "forgot" && (
                  <>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {mode === "signup" && password.length > 0 && (
                        <motion.div
                          className="mt-2.5 space-y-1.5"
                          {...(prefersReduced ? noMotion : {
                            initial: { opacity: 0, height: 0 },
                            animate: { opacity: 1, height: "auto" },
                            transition: { duration: 0.2 },
                          })}
                        >
                          {[
                            { met: password.length >= 8, label: "At least 8 characters" },
                            { met: /[A-Z]/.test(password), label: "Uppercase letter" },
                            { met: /[a-z]/.test(password), label: "Lowercase letter" },
                            { met: /[0-9]/.test(password), label: "Number" },
                          ].map(({ met, label }) => (
                            <div key={label} className="flex items-center gap-2">
                              <motion.div
                                className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-200 ${met ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/10 text-destructive"}`}
                                {...(prefersReduced ? noMotion : {
                                  animate: met ? { scale: [1, 1.3, 1] } : { scale: 1 },
                                  transition: { duration: 0.3 },
                                })}
                              >
                                {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </motion.div>
                              <span className={`text-xs transition-colors duration-200 ${met ? "text-emerald-500" : "text-muted-foreground"}`}>{label}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                    {mode === "signup" && (
                      <div>
                        <Label htmlFor="confirmPassword">Confirm password</Label>
                        <Input id="confirmPassword" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={8} autoComplete="new-password" className={confirmPassword.length > 0 ? (password === confirmPassword ? "border-emerald-500/50 focus-visible:ring-emerald-500/30" : "border-destructive/50 focus-visible:ring-destructive/30") : ""} />
                        {confirmPassword.length > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-200 ${password === confirmPassword ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                              {password === confirmPassword ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            </div>
                            <span className={`text-xs transition-colors duration-200 ${password === confirmPassword ? "text-emerald-500" : "text-muted-foreground"}`}>
                              {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "..." : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                </Button>
              </form>

              {/* Footer links */}
              <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
                {mode === "login" && (
                  <>
                    <button onClick={() => setMode("forgot")} className="hover:text-foreground transition-colors block mx-auto">Forgot password?</button>
                    <p>Don't have an account?{" "}<button onClick={() => setMode("signup")} className="text-primary hover:underline">Sign up</button></p>
                  </>
                )}
                {mode === "signup" && (
                  <p>Already have an account?{" "}<button onClick={() => setMode("login")} className="text-primary hover:underline">Sign in</button></p>
                )}
                {mode === "forgot" && (
                  <button onClick={() => setMode("login")} className="text-primary hover:underline">Back to sign in</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      </div>

      <div className="py-6 text-center">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Silvergrain. All rights reserved.</p>
      </div>
    </div>
  );
}
