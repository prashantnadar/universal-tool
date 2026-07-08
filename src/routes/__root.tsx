import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { NotFound } from "@/components/NotFound";
import { AuthProvider } from "@/lib/auth-context";

function NotFoundComponent() {
  return <NotFound />;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-slate-950">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">This page didn't load</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Something went wrong on our end.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Try again</button>
          <a href="/" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 dark:border-slate-700 dark:text-white">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "UniversalTools — All-in-one Text, PDF & Image Tools" },
      { name: "description", content: "30+ free online tools for text, PDF and image — word counter, PDF merger, image resizer and more. Fast, private, runs in your browser." },
      { name: "author", content: "UniversalTools" },
      { name: "keywords", content: "online tools, text tools, pdf tools, image tools, word counter, merge pdf, resize image, free tools" },
      { name: "theme-color", content: "#2563eb" },
      { property: "og:site_name", content: "UniversalTools" },
      { property: "og:title", content: "UniversalTools — All-in-one Text, PDF & Image Tools" },
      { property: "og:description", content: "30+ free online tools for text, PDF and image — word counter, PDF merger, image resizer and more. Fast, private, runs in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "UniversalTools — All-in-one Text, PDF & Image Tools" },
      { name: "twitter:description", content: "30+ free online tools for text, PDF and image — word counter, PDF merger, image resizer and more. Fast, private, runs in your browser." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "UniversalTools",
          description: "30+ free online tools for text, PDF and image.",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Outlet />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
