import { ShieldCheck, Sparkles, Zap, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

function AuthLayout({ children }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="auth-premium-shell">
      <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-8">
        <button
          type="button"
          onClick={toggleTheme}
          className="auth-theme-pill inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>

      <div className="auth-premium-grid">
        <section className="auth-showcase">
          <div className="mb-8 inline-flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/10">
              <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="WorkSphere" className="h-full w-full object-cover" />
            </div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight">WorkSphere</p>
              <p className="text-xs font-medium auth-muted">Employee Operations Platform</p>
            </div>
          </div>

          <h1 className="auth-showcase-title">
            One workspace.
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              Every operation.
            </span>
          </h1>

          <p className="auth-showcase-copy">
            Manage people, attendance, leave, documents and payroll from one secure workspace designed for modern teams.
          </p>

          <div className="auth-feature-grid">
            <div className="auth-feature">
              <ShieldCheck className="text-indigo-300" size={20} />
              <div><strong>Role-based access</strong><span>Admin, HR, Manager and Employee workspaces.</span></div>
            </div>
            <div className="auth-feature">
              <Sparkles className="text-violet-300" size={20} />
              <div><strong>Premium experience</strong><span>Fast, clean and responsive across devices.</span></div>
            </div>
            <div className="auth-feature">
              <Zap className="text-fuchsia-300" size={20} />
              <div><strong>Connected workflow</strong><span>Firebase and Cloudinary powered operations.</span></div>
            </div>
          </div>
        </section>

        <div className="auth-card-wrap">
          <div className="auth-card">{children}</div>
          <p className="mt-5 text-center text-[11px] leading-5 auth-footer">
            © {new Date().getFullYear()} WorkSphere · Secure organization access
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
