import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      title="Back to top"
      className="fixed bottom-5 right-5 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition hover:animate-none hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 animate-bounce"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100" style={{ fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif" }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
      <Footer />
      <BackToTopButton />
    </div>
  );
}
