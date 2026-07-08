import { SITE_URL, SITE_NAME } from "./seo";

export function toolCategoryJsonLd(opts: {
  path: string; // "/tools/text"
  name: string; // "Text Tools"
  description: string;
  keywords: string[];
  tools: { name: string; url: string; description?: string }[];
}) {
  const url = `${SITE_URL}${opts.path}`;
  return [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: opts.name,
        url,
        description: opts.description,
        keywords: opts.keywords.join(", "),
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      }),
    },
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: opts.name,
        url,
        numberOfItems: opts.tools.length,
        itemListElement: opts.tools.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: t.name,
          url: `${SITE_URL}${t.url}`,
          ...(t.description ? { description: t.description } : {}),
        })),
      }),
    },
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: opts.name, item: url },
        ],
      }),
    },
  ];
}
