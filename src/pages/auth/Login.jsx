import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, LogIn, Mail, ArrowRight } from "lucide-react";
import { loginWithEmail, loginWithGoogle, resetPassword } from "../../services/authService";

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.2-2.28H12v4.31h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" />
      <path fill="#34A853" d="M12 21.99c2.63 0 4.84-.87 6.45-2.34l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.99Z" />
      <path fill="#FBBC05" d="M6.54 14.1A5.86 5.86 0 0 1 6.23 12c0-.73.13-1.43.31-2.1V7.37H3.3A10 10 0 0 0 2 12c0 1.67.4 3.25 1.3 4.63l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 5.87c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.83 2.98 14.62 2 12 2a9.74 9.74 0 0 0-8.7 5.37l3.24 2.53C7.31 7.59 9.46 5.87 12 5.87Z" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await loginWithEmail(formData.email, formData.password);
      // Navigate only after Firebase has returned a successful credential.
      // AuthProvider will then hydrate the role in the background.
      navigate("/dashboard", { replace: true });
      if (remember) localStorage.setItem("worksphere-remember-email", formData.email.trim());
      else localStorage.removeItem("worksphere-remember-email");
    } catch (authError) {
      setError(authError.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(""); setMessage(""); setGoogleLoading(true);
    try {
      // Popup returns the authenticated Firebase user immediately. If the
      // browser blocks it, authService falls back to Firebase redirect.
      const signedInUser = await loginWithGoogle();
      // Popup returns the authenticated Firebase user immediately. Do not
      // wait for a second redirect/result round-trip; this prevents the
      // login page from being rendered again after a successful Google sign-in.
      if (signedInUser) {
        navigate("/dashboard", { replace: true });
      }
    } catch (authError) {
      setError(authError.message || "Google sign-in failed.");
      setGoogleLoading(false);
    }
    finally {
      setGoogleLoading(false);
    }
  };

  const handleReset = async () => {
    const email = formData.email.trim();
    if (!email) { setError("Enter your email address first to reset your password."); return; }
    setError(""); setMessage(""); setResetLoading(true);
    try { await resetPassword(email); setMessage("Password reset email sent. Check your inbox."); }
    catch (authError) { setError(authError.message || "Unable to send password reset email."); }
    finally { setResetLoading(false); }
  };

  const isLoading = loading || googleLoading || resetLoading;

  return (
    <div className="auth-login-content">
      <div className="mb-8">
        <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-indigo-300">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,.9)]" /> Secure workspace
        </div>
        <h2 className="text-3xl font-extrabold tracking-[-.03em] sm:text-4xl">Welcome back</h2>
        <p className="mt-3 text-sm leading-6 auth-muted">Sign in to continue to your personalized WorkSphere workspace.</p>
      </div>

      {error && <div role="alert" className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-200">{error}</div>}
      {message && <div role="status" className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm leading-5 text-emerald-200">{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-wider auth-label">Email address</label>
          <div className="relative">
            <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 auth-icon" />
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" value={formData.email} onChange={handleChange} required disabled={isLoading} className="auth-input w-full rounded-2xl py-3 pl-11 pr-4 text-sm outline-none auth-placeholder disabled:opacity-60" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider auth-label">Password</label>
            <button type="button" onClick={handleReset} disabled={isLoading} className="text-xs font-semibold auth-link transition disabled:opacity-50">
              {resetLoading ? "Sending..." : "Forgot password?"}
            </button>
          </div>
          <div className="relative">
            <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 auth-icon" />
            <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={formData.password} onChange={handleChange} required disabled={isLoading} className="auth-input w-full rounded-2xl py-3 pl-11 pr-12 text-sm outline-none auth-placeholder disabled:opacity-60" />
            <button type="button" onClick={() => setShowPassword((current) => !current)} disabled={isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-500 transition auth-password-toggle disabled:opacity-50" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 select-none">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={isLoading} className="h-4 w-4 rounded auth-checkbox" />
          <span className="text-sm auth-muted">Remember this email on this device</span>
        </label>

        <button type="submit" disabled={isLoading} className="auth-primary-btn flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Signing in...</> : <><LogIn size={17} /> Sign in <ArrowRight size={16} className="ml-1" /></>}
        </button>
      </form>

      <div className="auth-divider my-6 flex items-center gap-3"><div className="h-px flex-1" /><span className="text-[10px] font-bold tracking-[.2em]">OR</span><div className="h-px flex-1" /></div>

      <button type="button" onClick={handleGoogleLogin} disabled={isLoading} className="auth-google-btn flex w-full items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60">
        {googleLoading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 auth-spinner" /> Connecting to Google...</> : <><GoogleLogo /> Continue with Google</>}
      </button>

      <div className="auth-security-wrap mt-7 border-t pt-6">
        <div className="auth-security-box flex items-start gap-3 rounded-2xl p-4">
          <ShieldIcon />
          <p className="auth-security-copy">Your access, role and workspace are securely managed through Firebase Authentication and Firestore.</p>
        </div>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl auth-shield">✓</span>;
}
