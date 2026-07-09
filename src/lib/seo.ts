export const SITE_URL = "https://universaltools.in";
export const SITE_NAME = "UniversalTools";
export const OG_IMAGE = "https://universaltools.in/og-image.png";

export function imageMeta() {
  return [
    { property: "og:image", content: OG_IMAGE },
    { property: "og:image:alt", content: "UniversalTools — all-in-one online toolbox" },
    { name: "twitter:image", content: OG_IMAGE },
  ];
}