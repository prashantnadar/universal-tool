import { useEffect, useMemo, useState, type ChangeEvent, } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import Swal from "sweetalert2";

import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";

import {
    getProfile,
    updateProfile,
    uploadAvatar,
    changePassword,
    deleteAccount,
    getUsageStats,
    type UsageStats,
} from "@/lib/profile-api";

export const Route = createFileRoute("/_authenticated/_admin/profile")({
    head: () => ({
        meta: [
            {
                title: "My Profile — UniversalTools",
            },
            {
                name: "robots",
                content: "noindex",
            },
        ],
    }),
    component: ProfilePage,
});

interface Profile {
    id: string;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

function ProfilePage() {
    const {
        user,
        role,
        plan,
        isAdmin,
        signOut,
        refresh,
    } = useAuth();

    const [profile, setProfile] = useState<Profile | null>(null);

    const [displayName, setDisplayName] = useState("");

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [uploading, setUploading] = useState(false);

    const [usage, setUsage] = useState<UsageStats>({
        totalToolsUsed: 0,
        todayUsage: 0,
        lastToolUsed: null,
    });

    const SUPER_ADMIN_ID =
        "f0a17059-c9ac-46e1-859c-82bd1487f069";

    const isSuperAdmin =
        user?.id === SUPER_ADMIN_ID;

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            setLoading(true);

            const [profileData, usageData] = await Promise.all([
                getProfile(),
                getUsageStats(),
            ]);

            setProfile(profileData);

            setUsage(usageData);

            setDisplayName(
                profileData.display_name ??
                user?.user_metadata?.display_name ??
                ""
            );
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "Unable to load profile",
                text: err.message,
            });
        } finally {
            setLoading(false);
        }
    }

    const avatar = useMemo(() => {
        if (profile?.avatar_url)
            return profile.avatar_url;

        return null;
    }, [profile]);

    async function handleSaveProfile() {
        if (!displayName.trim()) {
            Swal.fire({
                icon: "warning",
                title: "Display name required",
            });

            return;
        }

        try {
            setSaving(true);

            await updateProfile(displayName);

            await refresh();

            await loadProfile();

            Swal.fire({
                icon: "success",
                title: "Profile Updated",
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "Update Failed",
                text: err.message,
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleAvatar(
        e: ChangeEvent<HTMLInputElement>,
    ) {
        const file = e.target.files?.[0];

        if (!file) return;
        try {
            setUploading(true);
            console.log("1");

            const avatarUrl = await uploadAvatar(file);
            window.dispatchEvent(new Event("avatar-updated"));
            console.log("2");

            setProfile((prev) =>
                prev
                    ? {
                        ...prev,
                        avatar_url: avatarUrl,
                    }
                    : prev,
            );

            console.log("3");

            await refresh();
            window.dispatchEvent(new Event("avatar-updated"));

            console.log("4");

            Swal.fire({
                icon: "success",
                title: "Avatar Updated",
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (err) {
            console.error(err);

            Swal.fire({
                icon: "error",
                title: "Upload Failed",
                text: String(err),
            });
        } finally {
            console.log("5");
            setUploading(false);
        }
    }

    // async function handlePassword() {
    //     const { value: password } =
    //         await Swal.fire({
    //             title: "Change Password",
    //             input: "password",
    //             inputLabel: "New Password",
    //             inputPlaceholder: "Minimum 8 characters",
    //             showCancelButton: true,
    //         });

    //     if (!password) return;

    //     const passwordRegex =
    //         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    //     if (!passwordRegex.test(password)) {
    //         await Swal.fire({
    //             icon: "warning",
    //             title: "Weak Password",
    //             text:
    //                 "Password must contain at least 8 characters, one uppercase letter, one lowercase letter and one number.",
    //         });

    //         return;
    //     }

    //     try {
    //         await changePassword(password);

    //         Swal.fire({
    //             icon: "success",
    //             title: "Password Changed",
    //         });
    //     } catch (err: any) {
    //         Swal.fire({
    //             icon: "error",
    //             title: "Unable to change password",
    //             text: err.message,
    //         });
    //     }
    // }
    async function handlePassword() {
        const { value: password } = await Swal.fire({
            title: "Change Password",
            html: `
      <div style="text-align:left">

        <div style="position:relative;margin-bottom:12px;">
          <input
            id="new-password"
            type="password"
            class="swal2-input"
            placeholder="New Password"
            style="width:100%;margin:0;padding-right:45px;"
          />
       <button
  id="toggle-new-password"
  type="button"
  style="
    position:absolute;
    right:12px;
    top:50%;
    transform:translateY(-50%);
    border:none;
    background:none;
    cursor:pointer;
    color:#64748b;
  "
  aria-label="Show password"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
</button>
        </div>

        <div style="position:relative;">
          <input
            id="confirm-password"
            type="password"
            class="swal2-input"
            placeholder="Confirm Password"
            style="width:100%;margin:0;padding-right:45px;"
          />
          <button
  id="toggle-confirm-password"
  type="button"
  style="
    position:absolute;
    right:12px;
    top:50%;
    transform:translateY(-50%);
    border:none;
    background:none;
    cursor:pointer;
    color:#64748b;
  "
  aria-label="Show password"
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
</button>
        </div>

        <p style="margin-top:12px;font-size:12px;color:#64748b;">
          8–20 characters with uppercase, lowercase, number & special character.
        </p>

      </div>
    `,
            showCancelButton: true,
            confirmButtonText: "Update Password",
            focusConfirm: false,

            didOpen: () => {
                const newPassword =
                    document.getElementById("new-password") as HTMLInputElement;

                const confirmPassword =
                    document.getElementById("confirm-password") as HTMLInputElement;

                document
                    .getElementById("toggle-new-password")
                    ?.addEventListener("click", () => {
                        newPassword.type =
                            newPassword.type === "password"
                                ? "text"
                                : "password";
                    });

                document
                    .getElementById("toggle-confirm-password")
                    ?.addEventListener("click", () => {
                        confirmPassword.type =
                            confirmPassword.type === "password"
                                ? "text"
                                : "password";
                    });
            },

            preConfirm: () => {
                const password = (
                    document.getElementById(
                        "new-password"
                    ) as HTMLInputElement
                ).value.trim();

                const confirmPassword = (
                    document.getElementById(
                        "confirm-password"
                    ) as HTMLInputElement
                ).value.trim();

                const passwordRegex =
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]).{8,20}$/;

                if (!passwordRegex.test(password)) {
                    Swal.showValidationMessage(
                        "Password must be 8–20 characters and include uppercase, lowercase, number and special character."
                    );
                    return;
                }

                if (password !== confirmPassword) {
                    Swal.showValidationMessage(
                        "Passwords do not match."
                    );
                    return;
                }

                return password;
            },
        });

        if (!password) return;

        try {
            await changePassword(password);

            await Swal.fire({
                icon: "success",
                title: "Password Changed",
                text: "Your password has been updated successfully.",
            });
        } catch (err: any) {
            await Swal.fire({
                icon: "error",
                title: "Unable to change password",
                text: err.message,
            });
        }
    }

    async function handleLogout() {
        const result =
            await Swal.fire({
                title: "Logout?",
                text: "You will need to login again.",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Logout",
            });

        if (!result.isConfirmed)
            return;

        await signOut();
    }


    // async function handleDeleteAccount() {
    //     const { value } = await Swal.fire({
    //         icon: "warning",
    //         title: "Delete Account",
    //         html: `
    //         <p style="margin-bottom:12px">
    //             This action is permanent and cannot be undone.
    //         </p>

    //         <p style="margin-bottom:12px">
    //             Type <b>DELETE</b> below to continue.
    //         </p>
    //     `,
    //         input: "text",
    //         inputPlaceholder: "Type DELETE",
    //         confirmButtonText: "Delete Account",
    //         confirmButtonColor: "#dc2626",
    //         showCancelButton: true,
    //     });

    //     if (value !== "DELETE") {
    //         return;
    //     }

    //     try {
    //         await deleteAccount();

    //         await Swal.fire({
    //             icon: "success",
    //             title: "Account Deleted",
    //             text: "Your account has been deleted successfully.",
    //         });

    //         await signOut();

    //     } catch (err: any) {

    //         Swal.fire({
    //             icon: "error",
    //             title: "Delete Failed",
    //             text: err.message,
    //         });

    //     }
    // }

    if (loading) {
        return (
            <Layout>
                <section className="mx-auto max-w-5xl px-4 py-10">
                    <div className="space-y-4 animate-pulse">

                        <div className="h-10 w-64 rounded bg-slate-200 dark:bg-slate-700" />

                        <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-700" />

                        <div className="h-60 rounded-xl bg-slate-200 dark:bg-slate-700" />

                    </div>
                </section>
            </Layout>
        );
    }

    return (
        <Layout>
            <section className="mx-auto max-w-5xl px-4 py-10">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1
                            className="text-3xl font-bold text-slate-900 dark:text-white"
                            style={{
                                fontFamily:
                                    "'Space Grotesk', sans-serif",
                            }}
                        >
                            My Profile
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Manage your Universal Tools account.
                        </p>
                    </div>

                    <div className="flex gap-3">

                        <button
                            onClick={handleLogout}
                            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                        >
                            Logout
                        </button>

                        <Link
                            to="/dashboard"
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                            Back
                        </Link>

                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* LEFT COLUMN */}

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                        <div className="flex flex-col items-center">

                            {avatar ? (
                                <img
                                    src={avatar}
                                    alt="Avatar"
                                    className="h-28 w-28 rounded-full border-4 border-blue-500 object-cover"
                                />
                            ) : (

                                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-600 text-4xl font-bold text-white">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>

                            )}

                            <label className="mt-4 cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">

                                {uploading
                                    ? "Uploading..."
                                    : "Upload Avatar"}

                                <input
                                    hidden
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatar}
                                />

                            </label>

                            <h2 className="mt-6 text-center text-xl font-bold text-slate-900 dark:text-white">
                                {displayName}
                            </h2>

                            <p className="mt-2 break-all text-center text-sm text-slate-500">
                                {user?.email}
                            </p>

                            <div className="mt-5 flex flex-wrap justify-center gap-2">

                                {isSuperAdmin ? (

                                    <span className="rounded-full bg-blue-400 dark:bg-blue-500 px-2 py-1 text-xs font-bold text-white dark:text-white animate-pulse">
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

                    </div>

                    {/* RIGHT COLUMN */}

                    <div className="space-y-6 lg:col-span-2">

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Account Information
                            </h2>

                            <div className="mt-6 grid gap-5">

                                <div>

                                    <label className="text-xs font-semibold uppercase text-slate-500">
                                        Name&nbsp;<span>{`(${displayName.length} / 20)`}</span>
                                    </label>

                                    <input
                                        value={displayName}
                                        placeholder="Enter your name"
                                        maxLength={20}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                                    />

                                </div>

                                <div>

                                    <label className="text-xs font-semibold uppercase text-slate-500">
                                        Email
                                    </label>

                                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 break-all dark:border-slate-700 dark:bg-slate-800 cursor-not-allowed">
                                        {profile?.email ??
                                            user?.email}
                                    </div>

                                </div>

                                <div className="grid gap-4 md:grid-cols-2">

                                    <div>

                                        <label className="text-xs font-semibold uppercase text-slate-500">
                                            Role
                                        </label>

                                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800 cursor-not-allowed">
                                            {role?.toUpperCase()}
                                        </div>

                                    </div>

                                    <div>

                                        <label className="text-xs font-semibold uppercase text-slate-500">
                                            Current Plan
                                        </label>

                                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800 cursor-not-allowed">
                                            {plan.toUpperCase()}
                                        </div>

                                    </div>

                                </div>

                                {/* <div>

                                    <label className="text-xs font-semibold uppercase text-slate-500">
                                        User ID
                                    </label>

                                    <div className="mt-2 break-all rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-700 dark:bg-slate-800 cursor-not-allowed">
                                        {user?.id}
                                    </div>

                                </div> */}

                                <button
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                    className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Save Profile"}
                                </button>

                            </div>

                        </div>
                        {/* Subscription */}

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <div className="flex items-center justify-between">

                                <div>

                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        Subscription
                                    </h2>

                                    <p className="mt-2 text-sm text-slate-500">
                                        Your current subscription plan.
                                    </p>

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

                            <div className="mt-6 grid gap-4 sm:grid-cols-2">

                                <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">

                                    <p className="text-xs uppercase text-slate-500">
                                        Current Plan
                                    </p>

                                    <h3 className="mt-2 text-2xl font-bold">

                                        {plan === "premium"
                                            ? "💎 Premium"
                                            : "🆓 Free"}

                                    </h3>

                                </div>

                                <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">

                                    <p className="text-xs uppercase text-slate-500">
                                        Account Status
                                    </p>

                                    <h3 className="mt-2 text-2xl font-bold text-emerald-600">
                                        Active
                                    </h3>

                                </div>

                            </div>

                        </div>

                        {/* Security */}

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Security
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                Change your account password securely.
                            </p>

                            <button
                                onClick={handlePassword}
                                className="mt-5 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                                Change Password
                            </button>

                        </div>

                        {/* Usage */}

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Usage Information
                            </h2>

                            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">

                                    <div className="text-xs uppercase text-slate-500">
                                        Total Tools Used
                                    </div>

                                    <div className="mt-2 text-2xl font-bold">
                                        {usage.totalToolsUsed}
                                    </div>

                                </div>

                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">

                                    <div className="text-xs uppercase text-slate-500">
                                        Today's Usage
                                    </div>

                                    <div className="mt-2 text-2xl font-bold">
                                        {usage.todayUsage}
                                    </div>

                                </div>

                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">

                                    <div className="text-xs uppercase text-slate-500">
                                        Last Tool Used
                                    </div>

                                    <div className="mt-2 break-words text-sm font-semibold">
                                        {usage.lastToolUsed ?? "No usage yet"}
                                    </div>

                                </div>

                                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">

                                    <div className="text-xs uppercase text-slate-500">
                                        Current Plan
                                    </div>

                                    <div className="mt-2 text-xl font-bold">
                                        {plan === "premium" ? "💎 Premium" : "🆓 Free"}
                                    </div>

                                </div>

                            </div>

                        </div>
                        {/* Danger Zone */}

                        {/* <div className="rounded-2xl border border-red-300 bg-red-50 p-6 shadow-sm dark:border-red-900 dark:bg-red-950/20">

                            <h2 className="text-lg font-bold text-red-600">
                                ⚠ Danger Zone
                            </h2>

                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                Permanently delete your account, avatar, profile,
                                subscriptions, usage history and all associated data.
                                This action cannot be undone.
                            </p>

                            <button
                                onClick={handleDeleteAccount}
                                className="mt-6 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
                            >
                                Delete Account
                            </button>

                        </div> */}
                    </div>

                </div>

            </section>

        </Layout>

    );

}