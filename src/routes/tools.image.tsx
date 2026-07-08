import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { trackUse } from "@/lib/usage-tracking";
import { useMeteredCategory } from "@/lib/use-metered-category";
import { imageMeta } from "@/lib/seo";
import { toolCategoryJsonLd } from "@/lib/tool-seo";

import { Skeleton, SkeletonLines, InlineSpinner } from "@/components/Skeleton";

export const Route = createFileRoute("/tools/image")({
  head: () => ({
    meta: [
      { title: "Image Tools — Resize, Crop, Compress, Convert JPG/PNG/WebP | UniversalTools" },
      { name: "description", content: "Free in-browser image tools: resize, crop, rotate, flip, compress, apply filters, adjust brightness & contrast, add watermark, convert JPG/PNG/WebP, view EXIF metadata and convert images to Base64." },
      { name: "keywords", content: "image resizer, image compressor, image cropper, rotate image, flip image, image converter, jpg to png, png to webp, image watermark, brightness contrast, image to base64, exif metadata, online image tools" },
      { property: "og:title", content: "Image Tools — Resize, Crop, Compress & Convert" },
      { property: "og:description", content: "Resize, crop, rotate, filter and convert JPG/PNG/WebP images — no uploads, no wait." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://universal-tool.lovable.app/tools/image" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Image Tools — UniversalTools" },
      { name: "twitter:description", content: "Resize, crop, rotate, filter and convert JPG/PNG/WebP images in your browser." },
      ...imageMeta(),
    ],
    links: [{ rel: "canonical", href: "https://universal-tool.lovable.app/tools/image" }],
    scripts: toolCategoryJsonLd({
      path: "/tools/image",
      name: "Image Tools",
      description: "Free browser-based image utilities: resize, crop, compress, convert, watermark and inspect.",
      keywords: ["image resizer", "image compressor", "image converter", "image cropper", "image watermark", "jpg to png", "png to webp", "image to base64"],
      tools: [
        { name: "Resize Image", url: "/tools/image#resize", description: "Resize by pixels or percentage." },
        { name: "Crop Image", url: "/tools/image#crop", description: "Crop image to any region." },
        { name: "Rotate Image", url: "/tools/image#rotate", description: "Rotate 90°, 180° or 270°." },
        { name: "Flip Image", url: "/tools/image#flip", description: "Flip horizontally or vertically." },
        { name: "Compress Image", url: "/tools/image#compress", description: "Reduce JPG/PNG file size." },
        { name: "Convert Format", url: "/tools/image#convert", description: "Convert between JPG, PNG and WebP." },
        { name: "Brightness & Contrast", url: "/tools/image#adjust", description: "Adjust brightness and contrast." },
        { name: "Add Watermark", url: "/tools/image#watermark", description: "Overlay a text watermark." },
        { name: "Image to Base64", url: "/tools/image#base64", description: "Encode any image as a Base64 data URI." },
        { name: "Image Metadata", url: "/tools/image#meta", description: "View width, height and EXIF details." },
      ],
    }),
  }),
  component: ImageTools,
});


type Meta = { width: number; height: number; type: string; sizeKb: number; name: string };

function Card({ id, title, desc, busy, onCancel, children }: { id: string; toolId: string; title: string; desc: string; busy?: boolean; onCancel?: () => void; children: React.ReactNode }) {
  return (
    <Reveal as="section">
      <section id={id} className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
        </div>
        <div className="mt-4" aria-busy={busy ? true : undefined}>{children}</div>
        {busy && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40" role="status" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <InlineSpinner /> Processing image…
              </div>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  aria-label={`Cancel ${title}`}
                  className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="mt-3"><Skeleton className="h-32 w-full" /></div>
            <div className="mt-3"><SkeletonLines count={2} /></div>
          </div>
        )}
      </section>
    </Reveal>
  );
}



const inputCls = "block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white file:hover:bg-blue-700 dark:text-slate-200";
const btnCls = "mt-3 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60";

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function downloadCanvas(
  canvas: HTMLCanvasElement,
  name: string,
  type = "image/png",
  quality = 0.92,
  setStatus?: (s: string) => void,
) {
  setStatus?.(`Preparing download: ${name}…`);
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus?.(`Download failed: ${name} (canvas produced no data)`);
      return;
    }
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = name;
      setStatus?.(`Download in progress: ${name}`);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus?.(`Download completed: ${name} (${blob.size} bytes)`);
    } catch (err) {
      const reason = (err as Error)?.message || "browser blocked the download";
      setStatus?.(`Download failed: ${reason}`);
    }
  }, type, quality);
}

function ImageTools() {
  const { banner, guardClick } = useMeteredCategory();
  useEffect(() => { trackUse("img-resize"); }, []);

  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const imgRef = useRef<HTMLImageElement | null>(null);
  // Monotonic run token — incrementing it cancels any in-flight run's
  // post-completion state updates (image processing on canvas is synchronous
  // but the post-flush tick and status are guarded).
  const runTokenRef = useRef(0);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  // Abort any in-flight run when this route unmounts (user navigated away
  // or switched tool category). Prevents lingering skeletons / stale state.
  useEffect(() => {
    return () => {
      runTokenRef.current++;
    };
  }, []);

  const cancelRun = () => {
    runTokenRef.current++;
    setBusyId(null);
    setStatus("Canceled");
    requestAnimationFrame(() => lastTriggerRef.current?.focus());
  };

  const runBusy = async (
    id: string,
    label: string,
    fn: () => void | Promise<void>,
    e?: React.MouseEvent<HTMLElement>,
  ) => {
    // Capture the triggering button so we can restore focus afterwards.
    if (e?.currentTarget) lastTriggerRef.current = e.currentTarget as HTMLElement;
    const token = ++runTokenRef.current;
    setBusyId(id);
    setStatus(`${label} started`);
    try {
      await Promise.resolve(fn());
      await new Promise((r) => setTimeout(r, 250));
      if (token !== runTokenRef.current) return; // canceled
      setStatus((s) => s.startsWith("Download") ? s : `${label} complete`);
    } catch (err) {
      if (token !== runTokenRef.current) return;
      const reason = (err as Error)?.message || "unknown error";
      setStatus(`${label} failed: ${reason}`);
    } finally {
      if (token === runTokenRef.current) setBusyId(null);
      requestAnimationFrame(() => lastTriggerRef.current?.focus());
    }
  };


  // resize
  const [rw, setRw] = useState(800);
  const [rh, setRh] = useState(600);
  // crop
  const [cx, setCx] = useState(0); const [cy, setCy] = useState(0);
  const [cw, setCw] = useState(400); const [ch, setCh] = useState(300);
  // filter
  const [filter, setFilter] = useState("none");
  // rotate
  const [rotDeg, setRotDeg] = useState(90);
  // format
  const [fmt, setFmt] = useState<"image/png" | "image/jpeg" | "image/webp">("image/png");
  // compress
  const [quality, setQuality] = useState(0.7);
  // watermark
  const [wmText, setWmText] = useState("© UniversalTools");
  // adjust
  const [bright, setBright] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [satur, setSatur] = useState(100);
  // base64
  const [b64, setB64] = useState<string>("");

  const onPick = async (f: File | null) => {
    // New input cancels any in-flight run and clears busy immediately.
    runTokenRef.current++;
    setBusyId(null);
    setStatus(f ? "New image loaded" : "");
    setFile(f);
    if (!f) { setMeta(null); setPreview(null); return; }
    const img = await loadImage(f);
    imgRef.current = img;
    setPreview(img.src);
    setMeta({ width: img.naturalWidth, height: img.naturalHeight, type: f.type || "unknown", sizeKb: Math.round(f.size / 1024), name: f.name });
    setRw(img.naturalWidth); setRh(img.naturalHeight);
    setCw(Math.min(400, img.naturalWidth)); setCh(Math.min(300, img.naturalHeight));
  };

  const draw = (w: number, h: number, fn: (ctx: CanvasRenderingContext2D) => void, name: string, type = "image/png", q = 0.92) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d")!; fn(ctx);
    downloadCanvas(c, name, type, q, setStatus);
  };

  const doResize = () => { trackUse("img-resize");
    if (!imgRef.current) return;
    draw(rw, rh, (ctx) => ctx.drawImage(imgRef.current!, 0, 0, rw, rh), `resized-${rw}x${rh}.png`);
  };
  const doCrop = () => { trackUse("img-crop");
    if (!imgRef.current) return;
    draw(cw, ch, (ctx) => ctx.drawImage(imgRef.current!, cx, cy, cw, ch, 0, 0, cw, ch), `cropped.png`);
  };
  const doFilter = () => { trackUse("img-filter");
    if (!imgRef.current) return;
    const img = imgRef.current;
    draw(img.naturalWidth, img.naturalHeight, (ctx) => { ctx.filter = filter; ctx.drawImage(img, 0, 0); }, `filtered.png`);
  };
  const doRotate = () => { trackUse("img-rotate");
    if (!imgRef.current) return;
    const img = imgRef.current;
    const swap = rotDeg % 180 !== 0;
    const w = swap ? img.naturalHeight : img.naturalWidth;
    const h = swap ? img.naturalWidth : img.naturalHeight;
    draw(w, h, (ctx) => {
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rotDeg * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    }, `rotated-${rotDeg}.png`);
  };
  const doFormat = () => { trackUse("img-convert");
    if (!imgRef.current) return;
    const img = imgRef.current;
    const ext = fmt.split("/")[1];
    draw(img.naturalWidth, img.naturalHeight, (ctx) => ctx.drawImage(img, 0, 0), `image.${ext}`, fmt);
  };

  const doCompress = () => { trackUse("img-compress");
    if (!imgRef.current) return;
    const img = imgRef.current;
    draw(img.naturalWidth, img.naturalHeight, (ctx) => ctx.drawImage(img, 0, 0), `compressed-q${Math.round(quality * 100)}.jpg`, "image/jpeg", quality);
  };
  const doFlip = (axis: "x" | "y") => { trackUse("img-flip");
    if (!imgRef.current) return;
    const img = imgRef.current;
    draw(img.naturalWidth, img.naturalHeight, (ctx) => {
      if (axis === "x") { ctx.translate(img.naturalWidth, 0); ctx.scale(-1, 1); }
      else { ctx.translate(0, img.naturalHeight); ctx.scale(1, -1); }
      ctx.drawImage(img, 0, 0);
    }, `flipped-${axis}.png`);
  };
  const doWatermark = () => { trackUse("img-watermark");
    if (!imgRef.current || !wmText.trim()) return;
    const img = imgRef.current;
    draw(img.naturalWidth, img.naturalHeight, (ctx) => {
      ctx.drawImage(img, 0, 0);
      const fs = Math.max(16, Math.min(img.naturalWidth, img.naturalHeight) / 18);
      ctx.font = `bold ${fs}px sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = Math.max(1, fs / 14);
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      const pad = fs * 0.6;
      ctx.strokeText(wmText, img.naturalWidth - pad, img.naturalHeight - pad);
      ctx.fillText(wmText, img.naturalWidth - pad, img.naturalHeight - pad);
    }, `watermarked.png`);
  };
  const doAdjust = () => { trackUse("img-adjust");
    if (!imgRef.current) return;
    const img = imgRef.current;
    draw(img.naturalWidth, img.naturalHeight, (ctx) => {
      ctx.filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${satur}%)`;
      ctx.drawImage(img, 0, 0);
    }, `adjusted.png`);
  };
  const doBase64 = async () => { trackUse("img-to-base64");
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setB64(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Reveal>
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Image tools</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Resize, crop, filter & convert</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Drop one image and use it across every tool.</p>
          </header>
        </Reveal>

        {banner}

        <div role="status" aria-live="polite" className="sr-only">{status}</div>

        <div onClickCapture={guardClick}>



        <Reveal delay={0.05}>
          <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50/40 p-6 dark:border-blue-900 dark:bg-blue-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="img" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Choose an image</label>
              {file && (
                <button
                  type="button"
                  onClick={() => {
                    onPick(null);
                    setB64("");
                    const el = document.getElementById("img") as HTMLInputElement | null;
                    if (el) el.value = "";
                  }}
                  aria-label="Clear selected image"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  Clear image
                </button>
              )}
            </div>
            <input id="img" type="file" accept="image/*" onChange={(e) => onPick(e.target.files?.[0] ?? null)} className={`mt-2 ${inputCls}`} />
            {preview && (
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                <img src={preview} alt="preview" className="max-h-64 rounded-lg border border-slate-200 dark:border-slate-700" />
                {meta && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-300">
                    <dt className="font-medium">Name</dt><dd className="truncate">{meta.name}</dd>
                    <dt className="font-medium">Dimensions</dt><dd>{meta.width}×{meta.height}</dd>
                    <dt className="font-medium">Type</dt><dd>{meta.type}</dd>
                    <dt className="font-medium">Size</dt><dd>{meta.sizeKb} KB</dd>
                  </dl>
                )}
              </div>
            )}
          </div>
        </Reveal>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card busy={busyId === "img-resize"} onCancel={cancelRun} id="resize" toolId="img-resize" title="Resize" desc="Set new width and height.">
            <div className="flex flex-wrap gap-3">
              <label className="text-sm">W <input type="number" value={rw} onChange={(e) => setRw(+e.target.value)} className="ml-1 w-24 rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950" /></label>
              <label className="text-sm">H <input type="number" value={rh} onChange={(e) => setRh(+e.target.value)} className="ml-1 w-24 rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950" /></label>
            </div>
            <button onClick={(e) => runBusy("img-resize", "Resize", doResize, e)} disabled={!file || busyId !== null} className={btnCls}>Resize & download</button>
          </Card>

          <Card busy={busyId === "img-crop"} onCancel={cancelRun} id="crop" toolId="img-crop" title="Crop" desc="Crop to a rectangle.">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label>X <input type="number" value={cx} onChange={(e) => setCx(+e.target.value)} className="ml-1 w-full rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950" /></label>
              <label>Y <input type="number" value={cy} onChange={(e) => setCy(+e.target.value)} className="ml-1 w-full rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950" /></label>
              <label>W <input type="number" value={cw} onChange={(e) => setCw(+e.target.value)} className="ml-1 w-full rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950" /></label>
              <label>H <input type="number" value={ch} onChange={(e) => setCh(+e.target.value)} className="ml-1 w-full rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950" /></label>
            </div>
            <button onClick={(e) => runBusy("img-crop", "Crop", doCrop, e)} disabled={!file || busyId !== null} className={btnCls}>Crop & download</button>
          </Card>

          <Card busy={busyId === "img-filter"} onCancel={cancelRun} id="filter" toolId="img-filter" title="Filters" desc="Apply CSS-style filters.">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full rounded border border-slate-200 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="none">None</option>
              <option value="grayscale(1)">Grayscale</option>
              <option value="sepia(1)">Sepia</option>
              <option value="blur(3px)">Blur</option>
              <option value="contrast(1.5)">High contrast</option>
              <option value="brightness(1.3)">Brighten</option>
              <option value="invert(1)">Invert</option>
            </select>
            <button onClick={(e) => runBusy("img-filter", "Filter", doFilter, e)} disabled={!file || busyId !== null} className={btnCls}>Apply & download</button>
          </Card>

          <Card busy={busyId === "img-rotate"} onCancel={cancelRun} id="rotate" toolId="img-rotate" title="Rotate" desc="Rotate the image.">
            <div className="flex gap-2">
              {[90, 180, 270].map((d) => (
                <button key={d} onClick={() => setRotDeg(d)} className={`rounded-lg border px-3 py-1.5 text-sm ${rotDeg === d ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" : "border-slate-200 dark:border-slate-700"}`}>{d}°</button>
              ))}
            </div>
            <button onClick={(e) => runBusy("img-rotate", "Rotate", doRotate, e)} disabled={!file || busyId !== null} className={btnCls}>Rotate & download</button>
          </Card>

          <Card busy={busyId === "img-convert"} onCancel={cancelRun} id="format" toolId="img-convert" title="Convert format" desc="Re-encode as JPG, PNG or WebP.">
            <select value={fmt} onChange={(e) => setFmt(e.target.value as typeof fmt)} className="w-full rounded border border-slate-200 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPG</option>
              <option value="image/webp">WebP</option>
            </select>
            <button onClick={(e) => runBusy("img-convert", "Convert", doFormat, e)} disabled={!file || busyId !== null} className={btnCls}>Convert & download</button>
          </Card>

          <Card id="metadata" toolId="img-metadata" title="Metadata" desc="Quick info about the image.">
            {meta ? (
              <ul className="text-sm text-slate-700 dark:text-slate-300">
                <li><strong>Filename:</strong> {meta.name}</li>
                <li><strong>Dimensions:</strong> {meta.width}×{meta.height}</li>
                <li><strong>Aspect:</strong> {(meta.width / meta.height).toFixed(2)}</li>
                <li><strong>Type:</strong> {meta.type}</li>
                <li><strong>Size:</strong> {meta.sizeKb} KB</li>
              </ul>
            ) : <p className="text-sm text-slate-500">Upload an image to view metadata.</p>}
          </Card>

          <Card busy={busyId === "img-compress"} onCancel={cancelRun} id="compress" toolId="img-compress" title="Compress" desc="Re-encode as JPG with a quality slider.">
            <label className="block text-sm text-slate-600 dark:text-slate-400">
              Quality: <span className="font-semibold text-slate-900 dark:text-white">{Math.round(quality * 100)}%</span>
              <input type="range" min={10} max={100} value={Math.round(quality * 100)} onChange={(e) => setQuality(parseInt(e.target.value, 10) / 100)} className="mt-2 w-full accent-blue-600" />
            </label>
            <button onClick={(e) => runBusy("img-compress", "Compress", doCompress, e)} disabled={!file || busyId !== null} className={btnCls}>Compress & download</button>
          </Card>

          <Card busy={busyId === "img-flip"} onCancel={cancelRun} id="flip" toolId="img-flip" title="Flip" desc="Mirror horizontally or vertically.">
            <div className="flex flex-wrap gap-2">
              <button onClick={(e) => runBusy("img-flip", "Flip", () => doFlip("x"), e)} disabled={!file || busyId !== null} className={btnCls}>Flip horizontal</button>
              <button onClick={(e) => runBusy("img-flip", "Flip", () => doFlip("y"), e)} disabled={!file || busyId !== null} className={btnCls}>Flip vertical</button>
            </div>
          </Card>

          <Card busy={busyId === "img-watermark"} onCancel={cancelRun} id="watermark" toolId="img-watermark" title="Watermark" desc="Stamp text in the bottom-right corner.">
            <input value={wmText} onChange={(e) => setWmText(e.target.value)} placeholder="© Your brand" className="w-full rounded border border-slate-200 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button onClick={(e) => runBusy("img-watermark", "Watermark", doWatermark, e)} disabled={!file || busyId !== null} className={btnCls}>Apply & download</button>
          </Card>

          <Card busy={busyId === "img-adjust"} onCancel={cancelRun} id="adjust" toolId="img-adjust" title="Brightness & Contrast" desc="Tune exposure, contrast and saturation.">
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <label className="block">Brightness {bright}% <input type="range" min={0} max={200} value={bright} onChange={(e) => setBright(+e.target.value)} className="mt-1 w-full accent-blue-600" /></label>
              <label className="block">Contrast {contrast}% <input type="range" min={0} max={200} value={contrast} onChange={(e) => setContrast(+e.target.value)} className="mt-1 w-full accent-blue-600" /></label>
              <label className="block">Saturation {satur}% <input type="range" min={0} max={200} value={satur} onChange={(e) => setSatur(+e.target.value)} className="mt-1 w-full accent-blue-600" /></label>
            </div>
            <button onClick={(e) => runBusy("img-adjust", "Adjust", doAdjust, e)} disabled={!file || busyId !== null} className={btnCls}>Apply & download</button>
          </Card>

          <Card busy={busyId === "img-to-base64"} onCancel={cancelRun} id="base64" toolId="img-to-base64" title="Image → Base64" desc="Get a data URL you can paste into CSS or HTML.">
            <button onClick={(e) => runBusy("img-to-base64", "Base64", doBase64, e)} disabled={!file || busyId !== null} className={btnCls}>Generate</button>
            {b64 && (
              <>
                <textarea readOnly value={b64} rows={4} className="mt-3 w-full rounded border border-slate-200 bg-slate-50 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
                <button onClick={() => navigator.clipboard.writeText(b64)} className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:border-blue-500 hover:text-blue-700 dark:border-slate-700">Copy data URL</button>
              </>
            )}
          </Card>
        </div>
        </div>
      </section>
    </Layout>
  );
}
