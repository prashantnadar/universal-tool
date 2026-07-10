import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/_admin/profile")({
    head: () => ({
        meta: [
            { title: "My Profile — UniversalTools" },
            { name: "robots", content: "noindex" },
        ],
    }),
    component: ProfilePage,
});

function ProfilePage() {
    const { user, role, plan, isAdmin } = useAuth();

    const SUPER_ADMIN_ID = "f0a17059-c9ac-46e1-859c-82bd1487f069";
    const isSuperAdmin = user?.id === SUPER_ADMIN_ID;

    const displayName =
        (user?.user_metadata?.display_name as string | undefined) ??
        "User";

    return (
        <Layout>
            <section className="mx-auto max-w-5xl px-4 py-10">

                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1
                            className="text-3xl font-bold text-slate-900 dark:text-white"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            My Profile
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Manage your Universal Tools account.
                        </p>
                    </div>

                    <Link
                        to="/dashboard"
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                        Back
                    </Link>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-3xl font-bold text-white">
                            {displayName.charAt(0).toUpperCase()}
                        </div>

                        <h2 className="text-center text-xl font-semibold text-slate-900 dark:text-white">
                            {displayName}
                        </h2>

                        <p className="mt-2 break-all text-center text-sm text-slate-500">
                            {user?.email}
                        </p>

                        <div className="mt-5 flex justify-center gap-2">

                            {isSuperAdmin ? (
                                <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
                                    👑 SUPER ADMIN
                                </span>
                            ) : isAdmin ? (
                                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                                    ADMIN
                                </span>
                            ) : (
                                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold dark:bg-slate-700">
                                    USER
                                </span>
                            )}

                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${plan === "premium"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 dark:bg-slate-700"
                                    }`}
                            >
                                {plan.toUpperCase()}
                            </span>

                        </div>

                    </div>
                    <div className="space-y-6 lg:col-span-2">

                        {/* Account Information */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Account Information
                            </h2>

                            <div className="mt-6 grid gap-4 sm:grid-cols-2">

                                <div>
                                    <label className="text-xs font-semibold uppercase text-slate-500">
                                        Display Name
                                    </label>

                                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                                        {displayName}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase text-slate-500">
                                        Email
                                    </label>

                                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 break-all dark:border-slate-700 dark:bg-slate-800">
                                        {user?.email}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase text-slate-500">
                                        User ID
                                    </label>

                                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 break-all text-xs dark:border-slate-700 dark:bg-slate-800">
                                        {user?.id}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase text-slate-500">
                                        Role
                                    </label>

                                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                                        {role?.toUpperCase()}
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Subscription */}

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Subscription
                            </h2>

                            <div className="mt-5 flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-slate-500">
                                        Current Plan
                                    </p>

                                    <h3 className="mt-1 text-2xl font-bold">

                                        {plan === "premium"
                                            ? "💎 Premium"
                                            : "🆓 Free"}

                                    </h3>

                                </div>

                                {plan !== "premium" && (

                                    <Link
                                        to="/pricing"
                                        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                    >
                                        Upgrade
                                    </Link>

                                )}

                            </div>

                        </div>

                        {/* Security */}

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Security
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                Manage your account security.
                            </p>

                            <button
                                className="mt-5 rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                                Change Password
                            </button>

                        </div>
                        {/* Usage */}

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Usage
                            </h2>

                            <div className="mt-5 grid gap-4 sm:grid-cols-3">

                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs uppercase text-slate-500">
                                        Plan
                                    </div>
                                    <div className="mt-2 text-xl font-bold">
                                        {plan.toUpperCase()}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs uppercase text-slate-500">
                                        Role
                                    </div>
                                    <div className="mt-2 text-xl font-bold">
                                        {role?.toUpperCase()}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="text-xs uppercase text-slate-500">
                                        Status
                                    </div>
                                    <div className="mt-2 text-xl font-bold text-emerald-600">
                                        Active
                                    </div>
                                </div>

                            </div>

                        </div>

                        {/* Danger Zone */}

                        <div className="rounded-2xl border border-red-300 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">

                            <h2 className="text-lg font-bold text-red-700 dark:text-red-400">
                                ⚠️ Danger Zone
                            </h2>

                            <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                                Permanently delete your Universal Tools account. This action
                                cannot be undone.
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    alert("Delete Account functionality will be connected in the next step.");
                                }}
                                className="mt-5 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                                Delete My Account
                            </button>

                        </div>

                    </div>

                </div>

            </section>
        </Layout>
    );
}