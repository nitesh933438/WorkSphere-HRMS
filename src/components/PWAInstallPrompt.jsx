import { useEffect, useState } from "react";
import { Download, X, Smartphone, Share2 } from "lucide-react";

const DISMISS_KEY = `worksphere-pwa-install-dismissed-${__APP_VERSION__}`;

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (isStandalone()) return undefined;

    const show = () => {
      if (localStorage.getItem(DISMISS_KEY) !== "1") setVisible(true);
    };

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setFallback(false);
      show();
    };

    const onInstalled = () => {
      setInstallEvent(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Give browsers time to evaluate installability, then show the branded
    // banner even when the browser does not expose beforeinstallprompt.
    const timer = window.setTimeout(show, 900);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || isStandalone()) return null;

  const install = async () => {
    if (!installEvent) {
      setFallback(true);
      return;
    }
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice?.outcome === "accepted") {
        setVisible(false);
      }
    } catch (error) {
      console.warn("WorkSphere install prompt failed:", error);
    } finally {
      setInstallEvent(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 top-3 z-[120] mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900/95 sm:left-1/2 sm:right-auto sm:w-[min(680px,calc(100vw-2rem))] sm:-translate-x-1/2">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 shadow-sm">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="WorkSphere" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">Install WorkSphere App</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">APP</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Install WorkSphere on this device for a faster, app-like experience with a home-screen icon.
          </p>
          {fallback && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <p className="font-bold text-slate-800 dark:text-white">Install from your browser menu</p>
              <p className="mt-1 flex items-start gap-2"><Smartphone size={14} className="mt-0.5 shrink-0" /> Android/Chrome: use the browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>
              <p className="mt-1 flex items-start gap-2"><Share2 size={14} className="mt-0.5 shrink-0" /> iPhone/iPad: Share → <b>Add to Home Screen</b>.</p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={install} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
              <Download size={15} /> {installEvent ? "Install App" : "How to Install"}
            </button>
            <button type="button" onClick={dismiss} className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              Not now
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
