import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";

type Search = { redirect?: string; mode?: "signin" | "signup" | "forgot" };

export const Route = createFileRoute("/auth")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    redirect: typeof raw.redirect === "string" ? raw.redirect : undefined,
    mode: raw.mode === "signup" || raw.mode === "forgot" ? raw.mode : "signin",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — UniversalTools" },
      { name: "description", content: "Sign in or create your UniversalTools account." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: AuthPage,
});

// Strict email: local + @ + domain with a real TLD (2+ letters). Max 50 chars.
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(50, "Email must be 50 characters or less")
  .regex(emailRegex, "Enter a valid email address");

// Name: 1-50 letters and spaces only. No digits, no special characters.
const nameSchema = z
  .string()
  .trim() // Automatically removes accidental leading/trailing spaces
  .min(1, "Name is required")
  .max(50, "Name must be 50 characters or less")
  .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, "Only letters and spaces between words are allowed");

// Strong password 8-20 with lower, upper, digit and special char.
const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(20, "At most 20 characters")
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[0-9]/, "Must include a number")
  .regex(/[^A-Za-z0-9]/, "Must include a special character");

const signInSchema = z.object({ email: emailSchema, password: passwordSchema });
const signUpSchema = signInSchema.extend({ display_name: nameSchema });
const forgotSchema = z.object({ email: emailSchema });

function safeRedirect(target?: string): string {
  if (!target) return "/dashboard";
  try {
    if (target.startsWith("/") && !target.startsWith("//")) return target;
  } catch { /* ignore */ }
  return "/dashboard";
}

function AuthPage() {
  const { mode = "signin", redirect } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [googleBusy, setGoogleBusy] = useState(false);
  const to = safeRedirect(redirect);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate({ to, replace: true });
  }, [loading, isAuthenticated, navigate, to]);

  const handleGoogle = async () => {
    setGoogleBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        toast.error("Google sign-in failed");
        setGoogleBusy(false);
        return;
      }

      // Browser will redirect to Google, so no navigate() is needed here.
    } catch {
      toast.error("Google sign-in failed");
      setGoogleBusy(false);
    }
  };

  return (
    <Layout>
      <section className="mx-auto grid min-h-[80vh] max-w-md place-items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-blue-900/5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex gap-2 rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800" role="tablist">
            {(["signin", "signup"] as const).map((m) => (
              <Link
                key={m}
                to="/auth"
                search={{ mode: m, redirect }}
                role="tab"
                aria-selected={mode === m}
                className={`flex-1 rounded-md px-3 py-1.5 text-center font-medium transition ${mode === m ? "bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-300" : "text-slate-600 dark:text-slate-300"}`}
              >
                {m === "signin" ? "Log in" : "Sign up"}
              </Link>
            ))}
          </div>

          {mode === "forgot" ? <ForgotForm /> : mode === "signup" ? <SignUpForm key="signup" to={to} /> : <SignInForm key="signin" to={to} />}

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            or
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleBusy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
            aria-label="Continue with Google"
            title="Continue with Google"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.07-1.1-.16-1.6H12z" /></svg>
            {googleBusy ? "Connecting…" : "Continue with Google"}
          </button>

          {mode !== "forgot" && (
            <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              <Link to="/auth" search={{ mode: "forgot" }} className="hover:text-blue-600">Forgot password?</Link>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

function PasswordInput({ id, autoComplete, register }: { id: string; autoComplete: string; register: ReturnType<typeof useForm>["register"] }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        maxLength={20}
        {...register(id)}
        className={inputCls + " pr-10"}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.8 19.8 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.8 19.8 0 0 1-4.2 5.19M1 1l22 22M9.88 9.88a3 3 0 1 0 4.24 4.24" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  );
}

function SignInForm({ to }: { to: string }) {
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: z.infer<typeof signInSchema>) => {
    const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
    if (error) {
      toast.error(error.message || "Sign-in failed");
      return;
    }
    reset({ email: "", password: "" });
    toast.success("Signed in");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Welcome back</h1>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" maxLength={50} {...register("email")} className={inputCls} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <PasswordInput id="password" autoComplete="current-password" register={register as never} />
      </Field>
      <button type="submit" disabled={isSubmitting} className={btnPrimary}>{isSubmitting ? "Signing in…" : "Log in"}</button>
    </form>
  );
}

function SignUpForm({ to }: { to: string }) {
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof signUpSchema>>({ resolver: zodResolver(signUpSchema), defaultValues: { email: "", password: "", display_name: "" } });

  const onSubmit = async (values: z.infer<typeof signUpSchema>) => {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { display_name: values.display_name },
      },
    });
    if (error) {
      toast.error(error.message || "Sign-up failed");
      return;
    }
    reset({ email: "", password: "", display_name: "" });
    toast.success("Account created");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create your account</h1>
      <Field label="Name" htmlFor="display_name" error={errors.display_name?.message}>
        <input id="display_name" autoComplete="name" maxLength={50} {...register("display_name")} className={inputCls} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" maxLength={50} {...register("email")} className={inputCls} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <PasswordInput id="password" autoComplete="new-password" register={register as never} />
      </Field>
      <p className="text-xs text-slate-500 dark:text-slate-400">8–20 chars with uppercase, lowercase, number & special character.</p>
      <button type="submit" disabled={isSubmitting} className={btnPrimary}>{isSubmitting ? "Creating account…" : "Sign up"}</button>
    </form>
  );
}

function ForgotForm() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  const onSubmit = async (values: z.infer<typeof forgotSchema>) => {
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message || "Could not send reset email");
      return;
    }
    setSent(true);
    toast.success("Password reset email sent");
  };

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Check your email</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">We sent a reset link. It expires in 1 hour.</p>
        <Link to="/auth" className="inline-block text-sm font-semibold text-blue-600">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset password</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">Enter your account email and we'll send you a link.</p>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" maxLength={50} {...register("email")} className={inputCls} />
      </Field>
      <button type="submit" disabled={isSubmitting} className={btnPrimary}>{isSubmitting ? "Sending…" : "Send reset link"}</button>
      <div className="text-center">
        <Link to="/auth" className="text-xs text-slate-500 hover:text-blue-600">Back to sign in</Link>
      </div>
    </form>
  );
}

const inputCls = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
const btnPrimary = "inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60";

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600" aria-live="polite">{error}</p>}
    </div>
  );
}
