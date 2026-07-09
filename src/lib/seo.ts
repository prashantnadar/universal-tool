export const SITE_URL = "https://universaltools.in";
export const SITE_NAME = "UniversalTools";
export const OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f3c5fee4-ae85-4a7b-8cdd-ec6cb98cb1d0/id-preview-452bdf43--a3d605dc-67ee-44fc-89bf-14e53a6b13d3.lovable.app-1782811772799.png";

export function imageMeta() {
  return [
    { property: "og:image", content: OG_IMAGE },
    { property: "og:image:alt", content: "UniversalTools — all-in-one online toolbox" },
    { name: "twitter:image", content: OG_IMAGE },
  ];
}
