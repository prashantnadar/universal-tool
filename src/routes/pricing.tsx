import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { SITE_URL } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
};

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Free, Premium & Pro Lifetime Deal | UniversalTools" },
      { name: "description", content: "Compare Free, Premium ($5/mo) and Pro lifetime ($50 — 50% off, limited time). Unlimited PDF, image, text, code & productivity tools in your browser." },
      { name: "keywords", content: "universaltools pricing, free online tools, pdf tools pricing, image tools pricing, lifetime deal, premium tools subscription" },
      { property: "og:title", content: "UniversalTools Pricing — Free, Premium & Pro Lifetime" },
      { property: "og:description", content: "Free forever plan, Premium at $5/mo, and a limited-time Pro lifetime deal at $50 (was $100)." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/pricing` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "UniversalTools Pricing" },
      { name: "twitter:description", content: "Free forever, $5/mo Premium, or $50 lifetime Pro (limited time)." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/pricing` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "Are UniversalTools really free?", acceptedAnswer: { "@type": "Answer", text: "Yes. All text, code, color, password and productivity tools are unlimited and free forever. PDF and image tools have a small daily cap on free tiers." } },
            { "@type": "Question", name: "What's the difference between guest and free account?", acceptedAnswer: { "@type": "Answer", text: "Guests get 3 PDF/image runs per day. A free account raises that to 10 per day and unlocks favorites and history." } },
            { "@type": "Question", name: "What does the Pro lifetime deal include?", acceptedAnswer: { "@type": "Answer", text: "One payment of $50 (regularly $100) unlocks unlimited PDF & image processing, all future tools, and use across multiple devices — for life." } },
            { "@type": "Question", name: "Can I cancel Premium anytime?", acceptedAnswer: { "@type": "Answer", text: "Yes. Premium is billed monthly and can be cancelled at any time from your account." } },
            { "@type": "Question", name: "Are my files uploaded anywhere?", acceptedAnswer: { "@type": "Answer", text: "No. Every tool runs 100% in your browser — files never leave your device." } },
          ],
        }),
      },
    ],
  }),
  component: Pricing,
});

type Plan = {
  name: string;
  price: string;
  originalPrice?: string;
  tagline: string;
  badge?: string;
  features: string[];
  cta: string;
  to: string;
  featured?: boolean;
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    tagline: "forever, no card",
    features: [
      "All text, code, color, password & productivity tools — unlimited",
      "PDF & Image tools: 3/day as guest · 10/day with a free account",
      "Favorites & recently used (with free account)",
      "100% in-browser — files never leave your device",
    ],
    cta: "Get started free",
    to: "/signup",
  },
  {
    name: "Premium",
    price: "$5",
    tagline: "per month",
    features: [
      "Unlimited PDF & Image tool usage",
      "Bulk processing",
      "Tool history & favorites",
      "Priority email support",
    ],
    cta: "Upgrade to Premium",
    to: "/signup",
    featured: true,
  },
  {
    name: "Pro",
    price: "$50",
    originalPrice: "$100",
    tagline: "one-time · lifetime",
    badge: "Limited time — 50% off",
    features: [
      "Everything in Premium — forever",
      "Unlimited usage across multiple devices",
      "All upcoming tools included at no extra cost",
      "Lifetime updates & priority support",
      "Pay once, own it for life",
    ],
    cta: "Claim Pro Lifetime",
    to: "/signup",
    highlight: true,
  },
];

// Countdown target: 7 days from first load (persisted so it doesn't reset on refresh).
function useCountdown() {
  const [now, setNow] = useState(0);
  const [target, setTarget] = useState(0);
  useEffect(() => {
    const key = "pro-lifetime-deal-ends";
    let t = Number(window.localStorage.getItem(key));
    if (!Number.isFinite(t) || t <= Date.now()) {
      t = Date.now() + 7 * 24 * 3600 * 1000;
      window.localStorage.setItem(key, String(t));
    }
    setTarget(t);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = target && now ? Math.max(0, target - now) : 0;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, expired: target > 0 && diff === 0, ready: target > 0 };
}

function Countdown() {
  const { d, h, m, s, expired, ready } = useCountdown();
  const cell = (v: number, l: string) => (
    <div className="flex min-w-[3.5rem] flex-col items-center rounded-lg bg-slate-900 px-2 py-1.5 text-white shadow dark:bg-black">
      <span className="text-lg font-bold tabular-nums">{String(v).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-wide text-slate-300">{l}</span>
    </div>
  );
  return (
    <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-950/30">
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
        {expired ? "Deal ended" : "🔥 Pro lifetime $50 offer ends in"}
      </p>
      {ready && !expired && (
        <div className="flex gap-2">
          {cell(d, "days")}{cell(h, "hrs")}{cell(m, "min")}{cell(s, "sec")}
        </div>
      )}
    </div>
  );
}

const COMPARE_ROWS: { feature: string; guest: string; free: string; premium: string; pro: string }[] = [
  { feature: "Text / code / color / password / productivity tools", guest: "Unlimited", free: "Unlimited", premium: "Unlimited", pro: "Unlimited" },
  { feature: "PDF & Image tools per day", guest: "3", free: "10", premium: "Unlimited", pro: "Unlimited" },
  { feature: "Favorites & recently used", guest: "✓", free: "✓", premium: "✓", pro: "✓" },
  { feature: "Multi-device use (desktop, laptop, tablet, mobile)", guest: "✓", free: "✓", premium: "✓", pro: "✓" },
  { feature: "Access to core tools library", guest: "Limited preview", free: "Limited preview", premium: "Full library", pro: "Full library" },
  { feature: "Bulk processing", guest: "—", free: "—", premium: "✓", pro: "✓" },
  { feature: "Tool history (cloud-synced)", guest: "—", free: "—", premium: "✓", pro: "✓" },
  { feature: "Priority support", guest: "—", free: "—", premium: "✓", pro: "✓" },
  { feature: "All upcoming tools included", guest: "—", free: "—", premium: "✓", pro: "✓" },
  { feature: "Billing", guest: "Free", free: "Free", premium: "$5 / month", pro: "$50 one-time" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "Are UniversalTools really free?", a: "Yes. Text, code, color, password and productivity tools are unlimited for everyone — no account or card required. PDF and image tools have a small daily cap on the free tiers." },
  { q: "Do I need an account to use the tools?", a: "No. You can use tools as a guest right away. Signing up is free and raises your PDF/image daily limit and lets favorites and recent history sync across devices." },
  { q: "How do I sign up?", a: "Click 'Sign up free' on any pricing card. You can create an account with email + password, or continue with Google in one click." },
  { q: "Can I log in with Google after signing up with email (or vice versa)?", a: "Yes. If both methods use the same verified email address, they map to the same account — no duplicates." },
  { q: "What's the difference between guest and a free account?", a: "Guests get 3 PDF/image tool runs per day and can preview the tool library. A free account raises the daily cap to 10, unlocks the full library, and syncs favorites and recently used across devices." },
  { q: "What does Premium include?", a: "$5/month gives unlimited PDF & image processing, bulk operations, cloud-synced tool history, priority support, and every upcoming tool at no extra cost." },
  { q: "What does the Pro lifetime deal include?", a: "One payment of $50 (regularly $100) unlocks everything in Premium — forever. No monthly fee, no renewal, and every future tool is included." },
  { q: "Is the $50 Pro price permanent?", a: "No. The $50 price is a limited-time launch offer (50% off the regular $100). Once the countdown ends, Pro returns to full price." },
  { q: "How many devices can I use my plan on?", a: "All plans — including guest and free — work on desktop, laptop, tablet and mobile. There's no device cap. Just sign in on each device to sync favorites and history." },
  { q: "Can I cancel Premium anytime?", a: "Yes. Premium is billed monthly and you can cancel from your account at any time — you'll keep access until the current period ends." },
  { q: "Do you offer refunds?", a: "Premium can be cancelled at any time. For the Pro lifetime deal, contact support within 7 days of purchase for a full refund." },
  { q: "Are my files uploaded to a server?", a: "No. Every tool runs 100% in your browser — your files never leave your device. Only your account settings, favorites and tool history sync to the cloud." },
  { q: "What payment methods do you accept?", a: "All major credit and debit cards. You'll see the exact options at checkout." },
  { q: "I forgot my password — what do I do?", a: "Go to the sign-in page and click 'Forgot password?'. We'll email you a secure reset link that expires in one hour." },
  { q: "Can I upgrade from Free to Premium or Pro later?", a: "Yes. Upgrade any time from your account — your favorites, history and settings carry over." },
];


function Pricing() {
  useEffect(() => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [proBusy, setProBusy] = useState(false);

  const handleProPurchase = async () => {
    if (proBusy) return;

    if (!isAuthenticated || !user) {
      navigate({
        to: "/auth",
        search: {
          mode: "signin",
          redirect: "/pricing",
        },
      });
      return;
    }

    setProBusy(true);

    try {
      const { data, error } = await supabase.functions.invoke("razorpay", {
        body: {
          action: "create_order",
          plan: "pro_lifetime",
        },
      });

      if (error) {
        console.error("Razorpay order creation error:", error);
        toast.error("Unable to start Pro checkout");
        return;
      }

      if (!data?.success || !data?.order?.id || !data?.keyId) {
        toast.error(data?.error || "Unable to start Pro checkout");
        return;
      }

      if (!window.Razorpay) {
        toast.error("Razorpay Checkout failed to load. Please refresh and try again.");
        return;
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "UniversalTools",
        description: "Pro Lifetime — Test Payment ₹2",
        order_id: data.order.id,
        prefill: {
          email: user.email ?? "",
          name:
            typeof user.user_metadata?.display_name === "string"
              ? user.user_metadata.display_name
              : "",
        },
        theme: {
          color: "#2563eb",
        },
        handler: async (response) => {
          try {
            const { data: verificationData, error: verificationError } =
              await supabase.functions.invoke("razorpay", {
                body: {
                  action: "verify_payment",
                  plan: "pro_lifetime",
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });

            if (verificationError) {
              console.error(
                "Razorpay payment verification error:",
                verificationError,
              );
              toast.error("Payment verification failed");
              return;
            }

            if (!verificationData?.verified) {
              toast.error(
                verificationData?.error ||
                "Payment could not be verified",
              );
              return;
            }

            toast.success("Pro Lifetime activated successfully");

            navigate({
              to: "/dashboard",
              replace: true,
            });
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification failed");
          } finally {
            setProBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProBusy(false);
          },
        },
      });

      razorpay.open();
    } catch (error) {
      console.error("Pro checkout error:", error);
      toast.error("Unable to start Pro checkout");
      setProBusy(false);
    }
  };

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Simple, honest pricing for every toolset
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Most tools are free forever. PDF &amp; Image tools have daily caps — sign up or go Premium for more.
            </p>
          </div>
        </Reveal>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white/60 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          <p><strong>Daily limits apply to PDF &amp; Image tools only:</strong> 3/day as guest · 10/day with a free account · unlimited on Premium &amp; Pro. Every other category (text, code, color, password, productivity) is unlimited for everyone.</p>
        </div>

        <Countdown />

        <h2 className="mt-12 text-center text-2xl font-bold text-slate-900 dark:text-white">Choose your plan</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {PLANS.map((p, i) => {
            const cardBg = p.featured
              ? "border-blue-500 bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-2xl shadow-blue-600/30"
              : p.highlight
                ? "border-amber-400 bg-gradient-to-b from-amber-50 to-white shadow-2xl shadow-amber-500/20 dark:from-amber-950/40 dark:to-slate-900"
                : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";
            const titleColor = p.featured ? "text-white" : "text-slate-900 dark:text-white";
            const taglineColor = p.featured ? "text-blue-100" : "text-slate-500 dark:text-slate-400";
            const featureColor = p.featured ? "text-blue-50" : "text-slate-600 dark:text-slate-300";
            const btnClass = p.featured
              ? "bg-white text-blue-700 hover:bg-blue-50"
              : p.highlight
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-blue-600 text-white hover:bg-blue-700";
            return (
              <Reveal key={p.name} delay={i * 0.08}>
                <div className={`relative flex h-full flex-col rounded-2xl border p-6 ${cardBg}`}>
                  {p.featured && <div className="mb-3 inline-flex w-fit rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Most popular</div>}
                  {p.badge && <div className="mb-3 inline-flex w-fit rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white">{p.badge}</div>}
                  <h3 className={`text-lg font-bold ${titleColor}`}>{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${titleColor}`}>{p.price}</span>
                    {p.originalPrice && <span className="text-lg text-slate-400 line-through dark:text-slate-500">{p.originalPrice}</span>}
                    <span className={taglineColor}>/ {p.tagline}</span>
                  </div>
                  <ul className="mt-6 space-y-2 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className={`flex gap-2 ${featureColor}`}>
                        <span aria-hidden>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  {p.name === "Pro" ? (
                    <button
                      type="button"
                      onClick={handleProPurchase}
                      disabled={proBusy}
                      className={`mt-8 block w-full rounded-lg px-4 py-2.5 text-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${btnClass}`}
                    >
                      {proBusy ? "Opening checkout…" : p.cta}
                    </button>
                  ) : (
                    <Link
                      to={p.to}
                      className={`mt-8 block rounded-lg px-4 py-2.5 text-center font-semibold transition ${btnClass}`}
                    >
                      {p.cta}
                    </Link>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Compare table */}
        <Reveal>
          <h2 className="mt-16 text-center text-2xl font-bold text-slate-900 dark:text-white">Compare plans at a glance</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Feature</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Guest</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Free</th>
                  <th className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-300">Premium</th>
                  <th className="px-4 py-3 font-semibold text-amber-700 dark:text-amber-400">Pro (lifetime)</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((r) => (
                  <tr key={r.feature} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.feature}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.guest}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.free}</td>
                    <td className="px-4 py-3 text-blue-700 dark:text-blue-300">{r.premium}</td>
                    <td className="px-4 py-3 text-amber-700 dark:text-amber-400">{r.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* FAQ */}
        <Reveal>
          <h2 className="mt-16 text-center text-2xl font-bold text-slate-900 dark:text-white">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-4 open:shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <summary className="cursor-pointer list-none text-base font-semibold text-slate-900 dark:text-white marker:hidden">
                  <span className="mr-2 text-blue-600 group-open:hidden">+</span>
                  <span className="mr-2 text-blue-600 hidden group-open:inline">−</span>
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>
    </Layout>
  );
}
