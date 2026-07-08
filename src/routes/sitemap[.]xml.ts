import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://universal-tool.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/tools/text", changefreq: "weekly", priority: "0.9" },
  { path: "/tools/pdf", changefreq: "weekly", priority: "0.9" },
  { path: "/tools/image", changefreq: "weekly", priority: "0.9" },
  { path: "/tools/code", changefreq: "weekly", priority: "0.9" },
  { path: "/tools/color", changefreq: "weekly", priority: "0.9" },
  { path: "/tools/password", changefreq: "weekly", priority: "0.9" },
  { path: "/tools/productivity", changefreq: "weekly", priority: "0.9" },
  // Per-tool deep links inside the Productivity page — indexed so specific
  // calculators/converters surface directly in search results.
  { path: "/tools/productivity#timer", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#todo", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#calculator", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#currency", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#timezone", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#unit", changefreq: "monthly", priority: "0.6" },
  { path: "/tools/productivity#length", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#mass", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#area", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#time", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#data", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#temperature", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#finance", changefreq: "monthly", priority: "0.8" },
  { path: "/tools/productivity#date-diff", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#discount", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#bmi", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#gst", changefreq: "monthly", priority: "0.8" },
  { path: "/tools/productivity#volume", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#speed", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/productivity#numeral", changefreq: "monthly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/why-choose-us", changefreq: "monthly", priority: "0.6" },
  { path: "/pricing", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/login", changefreq: "yearly", priority: "0.3" },
  { path: "/signup", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const lastmod = new Date().toISOString().slice(0, 10);
        const urls = entries
          .map((e) =>
            [
              `  <url>`,
              `    <loc>${BASE_URL}${e.path}</loc>`,
              `    <lastmod>${lastmod}</lastmod>`,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              `  </url>`,
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
