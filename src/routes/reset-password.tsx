import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — UniversalTools" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z.object({
  password: z.string().min(8, "At least 8 characters").max(100),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords must match", path: ["confirm"] });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  useEffect(() => {
    // Supabase auto-processes the recovery URL and fires PASSWORD_RECOVERY event
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Layout>
      <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Set a new password</h1>
          {!ready ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Validating reset link…</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">New password</label>
                <input id="password" type="password" autoComplete="new-password" {...register("password")} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                {errors.password && <p className="mt-1 text-xs text-red-600" aria-live="polite">{errors.password.message}</p>}
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Confirm password</label>
                <input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                {errors.confirm && <p className="mt-1 text-xs text-red-600" aria-live="polite">{errors.confirm.message}</p>}
              </div>
              <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">{isSubmitting ? "Saving…" : "Update password"}</button>
              <div className="text-center"><Link to="/auth" className="text-xs text-slate-500 hover:text-blue-600">Back to sign in</Link></div>
            </form>
          )}
        </div>
      </section>
    </Layout>
  );
}
