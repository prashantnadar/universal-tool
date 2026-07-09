import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { CopyButton } from "@/components/CopyDownload";
import { trackUse } from "@/lib/usage-tracking";
import { imageMeta } from "@/lib/seo";
import { toolCategoryJsonLd } from "@/lib/tool-seo";

export const Route = createFileRoute("/tools/color")({
  head: () => ({
    meta: [
      { title: "Color Tools — Picker, Converter, Contrast, Gradient, Tailwind Finder | UniversalTools" },
      { name: "description", content: "Free color tools: color picker, HEX ↔ RGB ↔ HSL ↔ HWB ↔ CMYK converter, blender, shades and tints, WCAG contrast analyzer, multi-stop gradient builder and nearest Tailwind color class finder." },
      { name: "keywords", content: "color picker, color converter, hex to rgb, rgb to hex, hsl, hwb, cmyk, color mixer, color blender, wcag contrast checker, contrast analyzer, gradient generator, css gradient, tailwind color finder, nearest tailwind class, shades and tints" },
      { property: "og:title", content: "Color Tools — Picker, Converter, Contrast & Gradient" },
      { property: "og:description", content: "Everything you need for colors in the browser: picker, converters, WCAG contrast checker, gradient builder and Tailwind finder." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://universaltools.in/tools/color" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Color Tools — UniversalTools" },
      { name: "twitter:description", content: "Pick, convert, blend and check colors — free and in your browser." },
      ...imageMeta(),
    ],
    links: [{ rel: "canonical", href: "https://universaltools.in/tools/color" }],
    scripts: toolCategoryJsonLd({
      path: "/tools/color",
      name: "Color Tools",
      description: "Free browser-based color utilities: picker, converters, mixer, WCAG contrast, gradients and Tailwind finder.",
      keywords: ["color picker", "color converter", "hex rgb hsl hwb cmyk", "color mixer", "wcag contrast", "gradient builder", "tailwind color finder"],
      tools: [
        { name: "Color Picker", url: "/tools/color#picker", description: "Pick a color and grab HEX / RGB / HSL." },
        { name: "Color Converter", url: "/tools/color#converter", description: "Convert between HEX, RGB, HSL, HWB and CMYK." },
        { name: "Color Mixer", url: "/tools/color#mixer", description: "Blend two colors to find the in-between." },
        { name: "Color HEX Explorer", url: "/tools/color#hex", description: "Hex breakdown, shades and tints." },
        { name: "HSL Explorer", url: "/tools/color#hsl", description: "Hue, saturation, lightness." },
        { name: "HWB Explorer", url: "/tools/color#hwb", description: "Hue, whiteness, blackness (CSS4)." },
        { name: "CMYK Explorer", url: "/tools/color#cmyk", description: "Print-ready CMYK values." },
        { name: "RGB Channels", url: "/tools/color#rgb", description: "Red, green, blue channel breakdown." },
        { name: "Contrast Analyzer", url: "/tools/color#contrast", description: "WCAG AA/AAA contrast checker." },
        { name: "Gradient Builder", url: "/tools/color#gradient", description: "Multi-stop CSS gradients." },
        { name: "Tailwind Color Finder", url: "/tools/color#tailwind", description: "Nearest Tailwind class for any color." },
      ],
    }),
  }),
  component: ColorTools,
});

// ---------------- helpers ----------------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("");
}
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const conv = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: Math.round(conv(h + 1 / 3) * 255), g: Math.round(conv(h) * 255), b: Math.round(conv(h - 1 / 3) * 255) };
}
function rgbToHwb(r: number, g: number, b: number): { h: number; w: number; bl: number } {
  const { h } = rgbToHsl(r, g, b);
  const w = Math.round((Math.min(r, g, b) / 255) * 100);
  const bl = Math.round((1 - Math.max(r, g, b) / 255) * 100);
  return { h, w, bl };
}
function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - rr - k) / (1 - k)) * 100),
    m: Math.round(((1 - gg - k) / (1 - k)) * 100),
    y: Math.round(((1 - bb - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}
function relLum({ r, g, b }: { r: number; g: number; b: number }) {
  const conv = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
}
function contrastRatio(a: string, b: string) {
  const la = relLum(hexToRgb(a)), lb = relLum(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Minimal Tailwind palette (v3 core) for nearest match
const TAILWIND_COLORS: [string, string][] = [
  ["slate-50", "#f8fafc"], ["slate-100", "#f1f5f9"], ["slate-200", "#e2e8f0"], ["slate-300", "#cbd5e1"], ["slate-400", "#94a3b8"], ["slate-500", "#64748b"], ["slate-600", "#475569"], ["slate-700", "#334155"], ["slate-800", "#1e293b"], ["slate-900", "#0f172a"],
  ["gray-500", "#6b7280"], ["gray-700", "#374151"], ["gray-900", "#111827"],
  ["red-400", "#f87171"], ["red-500", "#ef4444"], ["red-600", "#dc2626"], ["red-700", "#b91c1c"],
  ["orange-500", "#f97316"], ["amber-500", "#f59e0b"], ["yellow-400", "#facc15"], ["yellow-500", "#eab308"],
  ["lime-500", "#84cc16"], ["green-500", "#22c55e"], ["green-600", "#16a34a"], ["emerald-500", "#10b981"], ["teal-500", "#14b8a6"],
  ["cyan-500", "#06b6d4"], ["sky-400", "#38bdf8"], ["sky-500", "#0ea5e9"], ["sky-600", "#0284c7"],
  ["blue-400", "#60a5fa"], ["blue-500", "#3b82f6"], ["blue-600", "#2563eb"], ["blue-700", "#1d4ed8"],
  ["indigo-500", "#6366f1"], ["indigo-600", "#4f46e5"], ["violet-500", "#8b5cf6"], ["purple-500", "#a855f7"], ["purple-600", "#9333ea"],
  ["fuchsia-500", "#d946ef"], ["pink-500", "#ec4899"], ["rose-500", "#f43f5e"],
  ["stone-500", "#78716c"], ["zinc-500", "#71717a"], ["neutral-500", "#737373"],
  ["white", "#ffffff"], ["black", "#000000"],
];
function nearestTailwind(hex: string) {
  const t = hexToRgb(hex);
  let best = TAILWIND_COLORS[0], dist = Infinity;
  for (const [, h] of TAILWIND_COLORS) {
    const c = hexToRgb(h);
    const d = (c.r - t.r) ** 2 + (c.g - t.g) ** 2 + (c.b - t.b) ** 2;
    if (d < dist) { dist = d; best = TAILWIND_COLORS.find((x) => x[1] === h)!; }
  }
  return { name: best[0], hex: best[1], distance: Math.sqrt(dist) };
}

// ---------------- UI ----------------

function Card({ id, title, desc, children }: { id: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <Reveal as="section">
      <section id={id} className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
        <div className="mt-4">{children}</div>
      </section>
    </Reveal>
  );
}

const inputCls = "rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white";
const runBtn = "inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700";

function Swatch({ color, size = "h-10 w-10" }: { color: string; size?: string }) {
  return <span aria-hidden="true" className={`inline-block rounded-lg border border-slate-200 dark:border-slate-700 ${size}`} style={{ background: color }} />;
}

function ColorTools() {
  // Picker
  const [pick, setPick] = useState("#2563eb");
  const pickRgb = hexToRgb(pick);
  const pickHsl = rgbToHsl(pickRgb.r, pickRgb.g, pickRgb.b);

  // Converter — driven by hex
  const [conv, setConv] = useState("#22c55e");
  const cRgb = hexToRgb(conv);
  const cHsl = rgbToHsl(cRgb.r, cRgb.g, cRgb.b);
  const cHwb = rgbToHwb(cRgb.r, cRgb.g, cRgb.b);
  const cCmyk = rgbToCmyk(cRgb.r, cRgb.g, cRgb.b);

  // Mixer
  const [mixA, setMixA] = useState("#2563eb");
  const [mixB, setMixB] = useState("#f97316");
  const [mixPct, setMixPct] = useState(50);
  const mixed = useMemo(() => {
    const a = hexToRgb(mixA), b = hexToRgb(mixB), t = mixPct / 100;
    return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
  }, [mixA, mixB, mixPct]);

  // Hex shades / tints
  const [hexBase, setHexBase] = useState("#2563eb");
  const shades = useMemo(() => {
    const rgb = hexToRgb(hexBase);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return [95, 85, 70, 55, 40, 25, 15].map((l) => {
      const c = hslToRgb(hsl.h, hsl.s, l);
      return { l, hex: rgbToHex(c.r, c.g, c.b) };
    });
  }, [hexBase]);

  // HSL explorer
  const [hslH, setHslH] = useState(220);
  const [hslS, setHslS] = useState(90);
  const [hslL, setHslL] = useState(50);
  const hslRgb = hslToRgb(hslH, hslS, hslL);
  const hslHex = rgbToHex(hslRgb.r, hslRgb.g, hslRgb.b);

  // HWB
  const [hwbSrc, setHwbSrc] = useState("#0ea5e9");
  const hwbVal = (() => { const r = hexToRgb(hwbSrc); return rgbToHwb(r.r, r.g, r.b); })();

  // CMYK
  const [cmykSrc, setCmykSrc] = useState("#ef4444");
  const cmykVal = (() => { const r = hexToRgb(cmykSrc); return rgbToCmyk(r.r, r.g, r.b); })();

  // RGB channels
  const [rgbR, setRgbR] = useState(37);
  const [rgbG, setRgbG] = useState(99);
  const [rgbB, setRgbB] = useState(235);
  const rgbHex = rgbToHex(rgbR, rgbG, rgbB);

  // Contrast
  const [cFg, setCFg] = useState("#ffffff");
  const [cBg, setCBg] = useState("#2563eb");
  const ratio = contrastRatio(cFg, cBg);
  const wcag = {
    aaNormal: ratio >= 4.5, aaLarge: ratio >= 3, aaaNormal: ratio >= 7, aaaLarge: ratio >= 4.5,
  };

  // Gradient
  const [gStops, setGStops] = useState<string[]>(["#2563eb", "#a855f7", "#ec4899"]);
  const [gAngle, setGAngle] = useState(90);
  const gradCss = `linear-gradient(${gAngle}deg, ${gStops.join(", ")})`;

  // Tailwind finder
  const [twHex, setTwHex] = useState("#3ab0ff");
  const tw = nearestTailwind(twHex);

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Reveal>
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Color tools</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Pick, convert and check colors
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              11 free color tools — picker, converter, blender, WCAG contrast, gradient builder and Tailwind finder.
            </p>
          </header>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card id="picker" title="Color Picker" desc="Pick a color and copy any format.">
            <div className="flex flex-wrap items-center gap-3">
              <input type="color" value={pick} onChange={(e) => { setPick(e.target.value); trackUse("color-picker"); }} aria-label="Color picker" className="h-12 w-16 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700" />
              <input value={pick} onChange={(e) => setPick(e.target.value)} className={inputCls} aria-label="Hex value" />
              <Swatch color={pick} size="h-12 w-12" />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-slate-500">HEX</dt><dd className="font-mono">{pick}</dd></div>
              <div><dt className="text-xs text-slate-500">RGB</dt><dd className="font-mono">rgb({pickRgb.r}, {pickRgb.g}, {pickRgb.b})</dd></div>
              <div><dt className="text-xs text-slate-500">HSL</dt><dd className="font-mono">hsl({pickHsl.h}, {pickHsl.s}%, {pickHsl.l}%)</dd></div>
            </dl>
            <div className="mt-2"><CopyButton getText={() => `${pick}\nrgb(${pickRgb.r}, ${pickRgb.g}, ${pickRgb.b})\nhsl(${pickHsl.h}, ${pickHsl.s}%, ${pickHsl.l}%)`} /></div>
          </Card>

          <Card id="converter" title="Color Converter" desc="HEX ↔ RGB ↔ HSL ↔ HWB ↔ CMYK.">
            <div className="flex flex-wrap items-center gap-3">
              <input type="color" value={conv} onChange={(e) => { setConv(e.target.value); trackUse("color-converter"); }} aria-label="Source color" className="h-12 w-16 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700" />
              <input value={conv} onChange={(e) => setConv(e.target.value)} className={inputCls} aria-label="Hex" />
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-slate-500">HEX</dt><dd className="font-mono">{conv.toUpperCase()}</dd></div>
              <div><dt className="text-xs text-slate-500">RGB</dt><dd className="font-mono">rgb({cRgb.r}, {cRgb.g}, {cRgb.b})</dd></div>
              <div><dt className="text-xs text-slate-500">HSL</dt><dd className="font-mono">hsl({cHsl.h}, {cHsl.s}%, {cHsl.l}%)</dd></div>
              <div><dt className="text-xs text-slate-500">HWB</dt><dd className="font-mono">hwb({cHwb.h} {cHwb.w}% {cHwb.bl}%)</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-slate-500">CMYK</dt><dd className="font-mono">cmyk({cCmyk.c}%, {cCmyk.m}%, {cCmyk.y}%, {cCmyk.k}%)</dd></div>
            </dl>
            <div className="mt-2"><CopyButton getText={() => `HEX ${conv}\nRGB rgb(${cRgb.r}, ${cRgb.g}, ${cRgb.b})\nHSL hsl(${cHsl.h}, ${cHsl.s}%, ${cHsl.l}%)\nHWB hwb(${cHwb.h} ${cHwb.w}% ${cHwb.bl}%)\nCMYK cmyk(${cCmyk.c}%, ${cCmyk.m}%, ${cCmyk.y}%, ${cCmyk.k}%)`} /></div>
          </Card>

          <Card id="mixer" title="Color Mixer" desc="Blend two colors at any ratio.">
            <div className="flex flex-wrap items-center gap-3">
              <input type="color" value={mixA} onChange={(e) => { setMixA(e.target.value); trackUse("color-mixer"); }} aria-label="Color A" className="h-10 w-14 rounded border border-slate-200 dark:border-slate-700" />
              <input type="color" value={mixB} onChange={(e) => setMixB(e.target.value)} aria-label="Color B" className="h-10 w-14 rounded border border-slate-200 dark:border-slate-700" />
              <label className="flex items-center gap-2 text-sm">Blend
                <input type="range" min={0} max={100} value={mixPct} onChange={(e) => setMixPct(+e.target.value)} aria-label="Blend ratio" />
                <span className="font-mono">{mixPct}%</span>
              </label>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Swatch color={mixA} /><span aria-hidden>→</span><Swatch color={mixed} size="h-14 w-14" /><span aria-hidden>→</span><Swatch color={mixB} />
              <span className="font-mono text-sm">{mixed}</span>
            </div>
            <div className="mt-2"><CopyButton getText={() => mixed} label="Copy blended HEX" /></div>
          </Card>

          <Card id="hex" title="Color HEX Explorer" desc="Shades and tints from a base color.">
            <div className="flex items-center gap-3">
              <input type="color" value={hexBase} onChange={(e) => { setHexBase(e.target.value); trackUse("color-hex"); }} aria-label="Base color" className="h-10 w-14 rounded border border-slate-200 dark:border-slate-700" />
              <input value={hexBase} onChange={(e) => setHexBase(e.target.value)} className={inputCls} aria-label="Hex" />
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {shades.map((s) => (
                <div key={s.l} className="text-center">
                  <div className="h-10 w-full rounded" style={{ background: s.hex }} aria-label={`Lightness ${s.l}%`} />
                  <div className="mt-1 font-mono text-[10px] text-slate-500">{s.hex}</div>
                </div>
              ))}
            </div>
            <div className="mt-2"><CopyButton getText={() => shades.map((s) => s.hex).join("\n")} /></div>
          </Card>

          <Card id="hsl" title="Colors HSL" desc="Explore by hue, saturation, lightness.">
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="text-sm">Hue <input type="range" min={0} max={360} value={hslH} onChange={(e) => { setHslH(+e.target.value); trackUse("color-hsl"); }} aria-label="Hue" className="w-full" /><span className="ml-1 font-mono">{hslH}°</span></label>
              <label className="text-sm">Saturation <input type="range" min={0} max={100} value={hslS} onChange={(e) => setHslS(+e.target.value)} aria-label="Saturation" className="w-full" /><span className="ml-1 font-mono">{hslS}%</span></label>
              <label className="text-sm">Lightness <input type="range" min={0} max={100} value={hslL} onChange={(e) => setHslL(+e.target.value)} aria-label="Lightness" className="w-full" /><span className="ml-1 font-mono">{hslL}%</span></label>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Swatch color={hslHex} size="h-14 w-14" />
              <span className="font-mono text-sm">hsl({hslH}, {hslS}%, {hslL}%) — {hslHex}</span>
            </div>
            <div className="mt-2"><CopyButton getText={() => `hsl(${hslH}, ${hslS}%, ${hslL}%)`} /></div>
          </Card>

          <Card id="hwb" title="Colors HWB" desc="CSS4 hue / whiteness / blackness notation.">
            <div className="flex items-center gap-3">
              <input type="color" value={hwbSrc} onChange={(e) => { setHwbSrc(e.target.value); trackUse("color-hwb"); }} aria-label="Color" className="h-10 w-14 rounded border border-slate-200 dark:border-slate-700" />
              <span className="font-mono text-sm">hwb({hwbVal.h} {hwbVal.w}% {hwbVal.bl}%)</span>
            </div>
            <div className="mt-2"><CopyButton getText={() => `hwb(${hwbVal.h} ${hwbVal.w}% ${hwbVal.bl}%)`} /></div>
          </Card>

          <Card id="cmyk" title="Colors CMYK" desc="Print-ready CMYK values.">
            <div className="flex items-center gap-3">
              <input type="color" value={cmykSrc} onChange={(e) => { setCmykSrc(e.target.value); trackUse("color-cmyk"); }} aria-label="Color" className="h-10 w-14 rounded border border-slate-200 dark:border-slate-700" />
              <span className="font-mono text-sm">cmyk({cmykVal.c}%, {cmykVal.m}%, {cmykVal.y}%, {cmykVal.k}%)</span>
            </div>
            <div className="mt-2"><CopyButton getText={() => `cmyk(${cmykVal.c}%, ${cmykVal.m}%, ${cmykVal.y}%, ${cmykVal.k}%)`} /></div>
          </Card>

          <Card id="rgb" title="Colors RGB" desc="Tune red, green and blue channels.">
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="text-sm">Red <input type="range" min={0} max={255} value={rgbR} onChange={(e) => { setRgbR(+e.target.value); trackUse("color-rgb"); }} aria-label="Red" className="w-full" /><span className="ml-1 font-mono">{rgbR}</span></label>
              <label className="text-sm">Green <input type="range" min={0} max={255} value={rgbG} onChange={(e) => setRgbG(+e.target.value)} aria-label="Green" className="w-full" /><span className="ml-1 font-mono">{rgbG}</span></label>
              <label className="text-sm">Blue <input type="range" min={0} max={255} value={rgbB} onChange={(e) => setRgbB(+e.target.value)} aria-label="Blue" className="w-full" /><span className="ml-1 font-mono">{rgbB}</span></label>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Swatch color={rgbHex} size="h-14 w-14" />
              <span className="font-mono text-sm">{rgbHex} — rgb({rgbR}, {rgbG}, {rgbB})</span>
            </div>
            <div className="mt-2"><CopyButton getText={() => rgbHex} /></div>
          </Card>

          <Card id="contrast" title="Color Contrast Analyzer" desc="WCAG 2.1 contrast for text and UI pairs.">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">Foreground <input type="color" value={cFg} onChange={(e) => { setCFg(e.target.value); trackUse("color-contrast"); }} aria-label="Foreground" className="h-10 w-14 rounded border border-slate-200 dark:border-slate-700" /></label>
              <label className="flex items-center gap-2 text-sm">Background <input type="color" value={cBg} onChange={(e) => setCBg(e.target.value)} aria-label="Background" className="h-10 w-14 rounded border border-slate-200 dark:border-slate-700" /></label>
            </div>
            <div className="mt-3 rounded-lg p-6 text-center text-lg font-semibold" style={{ background: cBg, color: cFg }}>
              The quick brown fox jumps over the lazy dog.
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-mono">Ratio {ratio.toFixed(2)}:1</span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${wcag.aaNormal ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>AA text {wcag.aaNormal ? "pass" : "fail"}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${wcag.aaLarge ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>AA large {wcag.aaLarge ? "pass" : "fail"}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${wcag.aaaNormal ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>AAA text {wcag.aaaNormal ? "pass" : "fail"}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${wcag.aaaLarge ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>AAA large {wcag.aaaLarge ? "pass" : "fail"}</span>
            </div>
            <div className="mt-2"><CopyButton getText={() => `Ratio ${ratio.toFixed(2)}:1 — FG ${cFg} / BG ${cBg}`} /></div>
          </Card>

          <Card id="gradient" title="Color Gradient Builder" desc="Compose multi-stop linear gradients.">
            <div className="flex flex-wrap items-center gap-2">
              {gStops.map((s, i) => (
                <input key={i} type="color" value={s} onChange={(e) => { const c = [...gStops]; c[i] = e.target.value; setGStops(c); trackUse("color-gradient"); }} aria-label={`Stop ${i + 1}`} className="h-10 w-14 rounded border border-slate-200 dark:border-slate-700" />
              ))}
              <button className={runBtn} onClick={() => setGStops([...gStops, "#ffffff"])}>Add stop</button>
              {gStops.length > 2 && <button className={runBtn} onClick={() => setGStops(gStops.slice(0, -1))}>Remove</button>}
              <label className="ml-2 text-sm">Angle <input type="number" min={0} max={360} value={gAngle} onChange={(e) => setGAngle(+e.target.value)} className="ml-1 w-20 rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Gradient angle" />°</label>
            </div>
            <div className="mt-3 h-24 rounded-lg border border-slate-200 dark:border-slate-700" style={{ background: gradCss }} />
            <pre className="mt-2 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">background: {gradCss};</pre>
            <div className="mt-2"><CopyButton getText={() => `background: ${gradCss};`} label="Copy CSS" /></div>
          </Card>

          <Card id="tailwind" title="Tailwind Color Finder" desc="Nearest Tailwind class for any color.">
            <div className="flex items-center gap-3">
              <input type="color" value={twHex} onChange={(e) => { setTwHex(e.target.value); trackUse("color-tailwind"); }} aria-label="Any color" className="h-10 w-14 rounded border border-slate-200 dark:border-slate-700" />
              <input value={twHex} onChange={(e) => setTwHex(e.target.value)} className={inputCls} aria-label="Hex" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Swatch color={tw.hex} size="h-12 w-12" />
              <div>
                <div className="font-mono text-sm">bg-{tw.name} · text-{tw.name}</div>
                <div className="text-xs text-slate-500">{tw.hex.toUpperCase()} · distance {tw.distance.toFixed(1)}</div>
              </div>
            </div>
            <div className="mt-2"><CopyButton getText={() => `bg-${tw.name}`} label={`Copy class`} /></div>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
