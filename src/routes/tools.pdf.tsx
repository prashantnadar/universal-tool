import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { imageMeta } from "@/lib/seo";
import { toolCategoryJsonLd } from "@/lib/tool-seo";

import { PDFDocument, degrees, StandardFonts, rgb } from "pdf-lib";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { trackUse, getCounts, subscribeUsage } from "@/lib/usage-tracking";
import { useMeteredCategory } from "@/lib/use-metered-category";
import { TOOLS } from "@/lib/tools-registry";

import { InlineSpinner, SkeletonLines } from "@/components/Skeleton";
import { HtmlToPdfCard, SignPdfCard, ComparePdfCard, WordToPdfCard, ExcelToPdfCard, PdfToWordCard, PdfToExcelCard, RedactPdfCard } from "@/components/pdf-advanced";

export const Route = createFileRoute("/tools/pdf")({
  // pdf-lib (and pdfjs-dist) are browser-only libs with tslib CJS/ESM interop
  // issues under Vite SSR. Skip SSR for this route — the tools require the
  // browser (File, canvas, Blob) anyway.
  ssr: false,
  head: () => ({
    meta: [
      { title: "PDF Tools — Merge, Split, Compress, Rotate, Watermark & Unlock | UniversalTools" },
      { name: "description", content: "Free in-browser PDF tools: merge PDFs, split PDF, compress PDF, rotate pages, remove & extract pages, add page numbers, add watermark, crop PDF, unlock PDF, convert JPG/PNG to PDF and PDF to JPG — files never leave your device." },
      { name: "keywords", content: "merge pdf, split pdf, compress pdf, rotate pdf, watermark pdf, page numbers pdf, extract pdf pages, remove pdf pages, unlock pdf, protect pdf, jpg to pdf, png to pdf, pdf to jpg, crop pdf, online pdf tools" },
      { property: "og:title", content: "PDF Tools — Merge, Split, Compress & More" },
      { property: "og:description", content: "Merge, split, rotate, protect, watermark and compress PDFs — 100% in your browser." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://universal-tool.lovable.app/tools/pdf" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PDF Tools — UniversalTools" },
      { name: "twitter:description", content: "Merge, split, rotate, protect and watermark PDFs — 100% in your browser." },
      ...imageMeta(),
    ],
    links: [{ rel: "canonical", href: "https://universal-tool.lovable.app/tools/pdf" }],
    scripts: toolCategoryJsonLd({
      path: "/tools/pdf",
      name: "PDF Tools",
      description: "Free browser-based PDF utilities: merge, split, compress, rotate, watermark, unlock and convert.",
      keywords: ["merge pdf", "split pdf", "compress pdf", "rotate pdf", "unlock pdf", "watermark pdf", "jpg to pdf", "pdf to jpg"],
      tools: [
        { name: "Merge PDF", url: "/tools/pdf#merge", description: "Combine multiple PDF files into one." },
        { name: "Split PDF", url: "/tools/pdf#split", description: "Split a PDF by page ranges." },
        { name: "Compress PDF", url: "/tools/pdf#compress", description: "Reduce PDF file size." },
        { name: "Rotate PDF", url: "/tools/pdf#rotate", description: "Rotate PDF pages 90°, 180° or 270°." },
        { name: "Remove Pages", url: "/tools/pdf#remove-pages", description: "Delete specific pages from a PDF." },
        { name: "Extract Pages", url: "/tools/pdf#extract-pages", description: "Keep only selected pages." },
        { name: "Add Page Numbers", url: "/tools/pdf#page-numbers", description: "Number the pages of a PDF." },
        { name: "Add Watermark", url: "/tools/pdf#watermark", description: "Stamp a text watermark on every page." },
        { name: "Crop PDF", url: "/tools/pdf#crop", description: "Crop margins from a PDF." },
        { name: "Unlock PDF", url: "/tools/pdf#unlock", description: "Remove password protection from a PDF." },
        { name: "Protect PDF", url: "/tools/pdf#protect", description: "Add a password to a PDF." },
        { name: "JPG / PNG to PDF", url: "/tools/pdf#jpg-to-pdf", description: "Convert images into a single PDF." },
        { name: "PDF to JPG", url: "/tools/pdf#pdf-to-jpg", description: "Render PDF pages as JPG images." },
        { name: "Word to PDF", url: "/tools/pdf#word-to-pdf", description: "Convert Word documents to PDF." },
        { name: "PowerPoint to PDF", url: "/tools/pdf#powerpoint-to-pdf", description: "Convert PowerPoint presentations to PDF." },
        { name: "Excel to PDF", url: "/tools/pdf#excel-to-pdf", description: "Convert Excel spreadsheets to PDF." },
        { name: "HTML to PDF", url: "/tools/pdf#html-to-pdf", description: "Convert HTML pages to PDF." },
        { name: "PDF to Word", url: "/tools/pdf#pdf-to-word", description: "Convert PDF into editable Word documents." },
        { name: "PDF to PowerPoint", url: "/tools/pdf#pdf-to-powerpoint", description: "Convert PDF into editable PowerPoint presentations." },
        { name: "PDF to Excel", url: "/tools/pdf#pdf-to-excel", description: "Extract PDF tables into Excel spreadsheets." },
        { name: "PDF to PDF/A", url: "/tools/pdf#pdf-to-pdfa", description: "Convert a PDF to the PDF/A archival standard." },
        { name: "Sign PDF", url: "/tools/pdf#sign", description: "Add a digital signature to a PDF." },
        { name: "Redact PDF", url: "/tools/pdf#redact", description: "Permanently redact sensitive content from a PDF." },
        { name: "Compare PDF", url: "/tools/pdf#compare", description: "Compare two PDFs and highlight differences." },
      ],
    }),
  }),
  component: PdfTools,
});


function makeDownloader(setStatus: (s: string) => void) {
  return function download(bytes: Uint8Array, name: string) {
    try {
      setStatus(`Preparing download: ${name}…`);
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name;
      setStatus(`Download in progress: ${name}`);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`Download completed: ${name} (${blob.size} bytes)`);
    } catch (err) {
      const reason = (err as Error)?.message || "browser blocked the download";
      setStatus(`Download failed: ${reason}`);
      throw err;
    }
  };
}

function Card({ id, title, desc, busy, onCancel, onClear, canClear, children }: { id: string; toolId: string; title: string; desc: string; busy?: boolean; onCancel?: () => void; onClear?: () => void; canClear?: boolean; children: React.ReactNode }) {
  return (
    <Reveal as="section">
      <section id={id} className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
          </div>
          {onClear && canClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label={`Clear ${title}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
              Clear
            </button>
          )}
        </div>
        <div className="mt-4" aria-busy={busy ? true : undefined}>{children}</div>
        {busy && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40" role="status" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <InlineSpinner /> Processing PDF…
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
            <div className="mt-3"><SkeletonLines count={3} /></div>
          </div>
        )}
      </section>
    </Reveal>
  );
}


function BtnLabel({ busy, idle, working }: { busy: boolean; idle: string; working: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {busy && <InlineSpinner />}
      {busy ? working : idle}
    </span>
  );
}

function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm" aria-label="Premium feature">
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      Pro
    </span>
  );
}

function PremiumCard({ id, title, desc, icon }: { id: string; title: string; desc: string; icon?: React.ReactNode }) {
  return (
    <Reveal as="section">
      <section id={id} className="scroll-mt-32 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-amber-50/40 p-6 dark:border-slate-800 dark:from-slate-900 dark:to-amber-950/20" aria-labelledby={`${id}-title`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-0.5 text-amber-600" aria-hidden="true">{icon}</div>}
            <div>
              <div className="flex items-center gap-2">
                <h3 id={`${id}-title`} className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
                <PremiumBadge />
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Premium feature — available with Pro"
          className="mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          Unlock with Pro
        </button>
      </section>
    </Reveal>
  );
}

function ComingSoonCard({ id, title, desc }: { id: string; title: string; desc: string }) {
  return (
    <Reveal as="section">
      <section id={id} className="scroll-mt-32 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6 dark:border-slate-700 dark:bg-slate-900/40" aria-labelledby={`${id}-title`}>
        <div className="flex items-center gap-2">
          <h3 id={`${id}-title`} className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
          <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">Coming soon</span>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">Free when it launches. We're building this in-browser so your files never leave your device.</p>
      </section>
    </Reveal>
  );
}

function MostUsedPdfTools() {
  const [top, setTop] = useState<{ id: string; count: number; meta: typeof TOOLS[number] }[]>([]);
  useEffect(() => {
    const compute = () => {
      const counts = getCounts();
      const ranked = TOOLS
        .filter((t) => t.category === "pdf")
        .map((meta) => ({ id: meta.id, count: counts[meta.id] || 0, meta }))
        .filter((t) => t.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      setTop(ranked);
    };
    compute();
    return subscribeUsage(compute);
  }, []);
  if (top.length === 0) return null;
  return (
    <Reveal as="section">
      <section aria-labelledby="most-used-pdf" className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-slate-900">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <h2 id="most-used-pdf" className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Most used in PDF tools</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Your top PDF tools based on real usage.</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {top.map((t, i) => (
            <li key={t.id}>
              <a
                href={t.meta.route}
                aria-label={`${t.meta.name} — used ${t.count} time${t.count === 1 ? "" : "s"}`}
                className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">#{i + 1}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400" aria-hidden="true">{t.count} use{t.count === 1 ? "" : "s"}</span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-blue-700 dark:text-white">{t.meta.name}</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t.meta.description}</p>
              </a>
            </li>
          ))}
        </ol>
      </section>
    </Reveal>
  );
}

const inputCls = "block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white file:hover:bg-blue-700 dark:text-slate-200";
const btnCls = "mt-3 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60";

function SectionHeader({ id, kicker, title, desc }: { id: string; kicker: string; title: string; desc?: string }) {
  return (
    <div id={id} className="col-span-full mt-2 scroll-mt-32">
      <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{kicker}</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
      {desc && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>}
    </div>
  );
}

function PdfTools() {
  const { banner, guardClick } = useMeteredCategory();
  useEffect(() => { trackUse("pdf-merge"); }, []);


  // merge
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const cancelTokenRef = useRef(0);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  // Abort any in-flight op when the route unmounts so skeletons don't linger.
  useEffect(() => () => { cancelTokenRef.current++; }, []);
  const cancelRun = () => {
    cancelTokenRef.current++;
    setBusy(null);
    setStatus("Canceled");
    requestAnimationFrame(() => lastTriggerRef.current?.focus());
  };
  const download = makeDownloader(setStatus);
  // Track the most recently clicked button as the "initiating control" so we
  // can restore focus after a run finishes, fails, or is canceled.
  const rememberTrigger = (e: React.MouseEvent<HTMLElement>) => {
    const t = (e.target as HTMLElement).closest("button");
    if (t) lastTriggerRef.current = t as HTMLElement;
  };


  // split
  const [splitFile, setSplitFile] = useState<File | null>(null);
  // password
  const [pwFile, setPwFile] = useState<File | null>(null);
  const [pw, setPw] = useState("");
  // rotate
  const [rotFile, setRotFile] = useState<File | null>(null);
  const [rotDeg, setRotDeg] = useState(90);
  // reorder
  const [reFile, setReFile] = useState<File | null>(null);
  const [reOrder, setReOrder] = useState("");
  // compress
  const [cpFile, setCpFile] = useState<File | null>(null);
  // remove pages
  const [rmFile, setRmFile] = useState<File | null>(null);
  const [rmPages, setRmPages] = useState("");
  // extract pages
  const [exFile, setExFile] = useState<File | null>(null);
  const [exPages, setExPages] = useState("");
  // images to pdf
  const [imgFiles, setImgFiles] = useState<File[]>([]);
  // pdf to jpg
  const [p2jFile, setP2jFile] = useState<File | null>(null);
  // page numbers
  const [pnFile, setPnFile] = useState<File | null>(null);
  // watermark
  const [wmFile, setWmFile] = useState<File | null>(null);
  const [wmText, setWmText] = useState("CONFIDENTIAL");
  // crop
  const [crFile, setCrFile] = useState<File | null>(null);
  const [crMargin, setCrMargin] = useState(36);
  // unlock
  const [unFile, setUnFile] = useState<File | null>(null);
  const [unPw, setUnPw] = useState("");

  const doMerge = async () => { trackUse("pdf-merge");
    if (mergeFiles.length < 2) return alert("Choose at least 2 PDFs");
    const tk = ++cancelTokenRef.current; setBusy("merge"); setStatus("Processing started");
    try {
      const out = await PDFDocument.create();
      for (const f of mergeFiles) {
        const src = await PDFDocument.load(await f.arrayBuffer());
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      download(await out.save(), "merged.pdf");
    } catch (err) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); throw err; } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doSplit = async () => { trackUse("pdf-split");
    if (!splitFile) return;
    const tk = ++cancelTokenRef.current; setBusy("split"); setStatus("Processing started");
    try {
      const src = await PDFDocument.load(await splitFile.arrayBuffer());
      for (let i = 0; i < src.getPageCount(); i++) {
        const out = await PDFDocument.create();
        const [p] = await out.copyPages(src, [i]);
        out.addPage(p);
        download(await out.save(), `page-${i + 1}.pdf`);
      }
    } catch (err) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); throw err; } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doPw = async () => { trackUse("pdf-password");
    if (!pwFile || pw.length < 4) return alert("Choose a PDF and a 4+ char password");
    const tk = ++cancelTokenRef.current; setBusy("pw"); setStatus("Processing started");
    try {
      // pdf-lib doesn't natively encrypt — we re-save with metadata flag warning to user
      const src = await PDFDocument.load(await pwFile.arrayBuffer());
      src.setTitle(`${src.getTitle() ?? "Protected"} — password: set by viewer`);
      const bytes = await src.save();
      alert("Note: true PDF encryption needs a server. This downloads a copy with metadata flag — for real encryption use Pro.");
      download(bytes, "protected.pdf");
    } catch (err) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); throw err; } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doRotate = async () => { trackUse("pdf-rotate");
    if (!rotFile) return;
    const tk = ++cancelTokenRef.current; setBusy("rot"); setStatus("Processing started");
    try {
      const src = await PDFDocument.load(await rotFile.arrayBuffer());
      src.getPages().forEach((p) => p.setRotation(degrees(rotDeg)));
      download(await src.save(), `rotated-${rotDeg}.pdf`);
    } catch (err) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); throw err; } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doReorder = async () => { trackUse("pdf-reorder");
    if (!reFile || !reOrder.trim()) return;
    const tk = ++cancelTokenRef.current; setBusy("re"); setStatus("Processing started");
    try {
      const src = await PDFDocument.load(await reFile.arrayBuffer());
      const total = src.getPageCount();
      const order = reOrder.split(",").map((s) => parseInt(s.trim(), 10) - 1).filter((n) => n >= 0 && n < total);
      if (!order.length) return alert("Invalid order");
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, order);
      pages.forEach((p) => out.addPage(p));
      download(await out.save(), "reordered.pdf");
    } catch (err) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); throw err; } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doCompress = async () => { trackUse("pdf-compress");
    if (!cpFile) return;
    const tk = ++cancelTokenRef.current; setBusy("cp"); setStatus("Processing started");
    try {
      const src = await PDFDocument.load(await cpFile.arrayBuffer());
      const bytes = await src.save({ useObjectStreams: true });
      download(bytes, "compressed.pdf");
    } catch (err) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); throw err; } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const parsePageList = (input: string, total: number): number[] => {
    const out = new Set<number>();
    input.split(",").map((s) => s.trim()).filter(Boolean).forEach((part) => {
      const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const a = Math.max(1, parseInt(m[1], 10));
        const b = Math.min(total, parseInt(m[2], 10));
        for (let i = a; i <= b; i++) out.add(i - 1);
      } else {
        const n = parseInt(part, 10);
        if (n >= 1 && n <= total) out.add(n - 1);
      }
    });
    return [...out].sort((a, b) => a - b);
  };

  const doRemove = async () => { trackUse("pdf-remove-pages");
    if (!rmFile || !rmPages.trim()) return;
    const tk = ++cancelTokenRef.current; setBusy("rm"); setStatus("Processing started");
    try {
      const src = await PDFDocument.load(await rmFile.arrayBuffer());
      const total = src.getPageCount();
      const remove = new Set(parsePageList(rmPages, total));
      if (!remove.size) return alert("No valid pages");
      const keep = Array.from({ length: total }, (_, i) => i).filter((i) => !remove.has(i));
      if (!keep.length) return alert("Cannot remove every page");
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, keep);
      pages.forEach((p) => out.addPage(p));
      download(await out.save(), "pages-removed.pdf");
    } catch (err) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); throw err; } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doExtract = async () => { trackUse("pdf-extract-pages");
    if (!exFile || !exPages.trim()) return;
    const tk = ++cancelTokenRef.current; setBusy("ex"); setStatus("Processing started");
    try {
      const src = await PDFDocument.load(await exFile.arrayBuffer());
      const total = src.getPageCount();
      const idx = parsePageList(exPages, total);
      if (!idx.length) return alert("No valid pages");
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, idx);
      pages.forEach((p) => out.addPage(p));
      download(await out.save(), "extracted.pdf");
    } catch (err) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); throw err; } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doImagesToPdf = async () => { trackUse("pdf-jpg-to-pdf");
    if (!imgFiles.length) return;
    const tk = ++cancelTokenRef.current; setBusy("img"); setStatus("Processing started");
    try {
      const out = await PDFDocument.create();
      for (const f of imgFiles) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const isPng = f.type.includes("png") || f.name.toLowerCase().endsWith(".png");
        const img = isPng ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const page = out.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      download(await out.save(), "images.pdf");
    } catch (e) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); alert("Image conversion failed. Use standard JPG or PNG files."); } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doPdfToJpg = async () => { trackUse("pdf-to-jpg");
    if (!p2jFile) return;
    const tk = ++cancelTokenRef.current; setBusy("p2j"); setStatus("Processing started");
    try {
      const pdfjs: any = await import("pdfjs-dist");
      // @ts-ignore
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const data = await p2jFile.arrayBuffer();
      const doc = await pdfjs.getDocument({ data }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const url = canvas.toDataURL("image/jpeg", 0.92);
        const name = `page-${i}.jpg`;
        setStatus(`Download in progress: ${name} (page ${i} of ${doc.numPages})`);
        const a = document.createElement("a");
        a.href = url; a.download = name; a.click();
        setStatus(`Download completed: ${name}`);
      }
    } catch (e) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); alert("Render failed: " + (e as Error).message); } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doPageNumbers = async () => { trackUse("pdf-page-numbers");
    if (!pnFile) return;
    const tk = ++cancelTokenRef.current; setBusy("pn"); setStatus("Processing started");
    try {
      const src = await PDFDocument.load(await pnFile.arrayBuffer());
      const font = await src.embedFont(StandardFonts.Helvetica);
      const pages = src.getPages();
      pages.forEach((p, i) => {
        const { width } = p.getSize();
        const text = `${i + 1} / ${pages.length}`;
        const size = 10;
        const tw = font.widthOfTextAtSize(text, size);
        p.drawText(text, { x: width / 2 - tw / 2, y: 18, size, font, color: rgb(0.3, 0.3, 0.3) });
      });
      download(await src.save(), "numbered.pdf");
    } catch (err) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); throw err; } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doWatermark = async () => { trackUse("pdf-watermark");
    if (!wmFile || !wmText.trim()) return;
    const tk = ++cancelTokenRef.current; setBusy("wm"); setStatus("Processing started");
    try {
      const src = await PDFDocument.load(await wmFile.arrayBuffer());
      const font = await src.embedFont(StandardFonts.HelveticaBold);
      src.getPages().forEach((p) => {
        const { width, height } = p.getSize();
        const size = Math.min(width, height) / 8;
        const tw = font.widthOfTextAtSize(wmText, size);
        p.drawText(wmText, {
          x: width / 2 - tw / 2,
          y: height / 2 - size / 2,
          size,
          font,
          color: rgb(0.85, 0.1, 0.1),
          opacity: 0.25,
          rotate: degrees(-30),
        });
      });
      download(await src.save(), "watermarked.pdf");
    } catch (err) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); throw err; } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doCrop = async () => { trackUse("pdf-crop");
    if (!crFile) return;
    const tk = ++cancelTokenRef.current; setBusy("cr"); setStatus("Processing started");
    try {
      const src = await PDFDocument.load(await crFile.arrayBuffer());
      src.getPages().forEach((p) => {
        const { width, height } = p.getSize();
        const m = Math.max(0, Math.min(crMargin, Math.min(width, height) / 2 - 10));
        p.setCropBox(m, m, width - 2 * m, height - 2 * m);
      });
      download(await src.save(), "cropped.pdf");
    } catch (err) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); throw err; } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  const doUnlock = async () => { trackUse("pdf-unlock");
    if (!unFile) return;
    const tk = ++cancelTokenRef.current; setBusy("un"); setStatus("Processing started");
    try {
      const src = await PDFDocument.load(await unFile.arrayBuffer(), { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
      download(await out.save(), "unlocked.pdf");
    } catch (e) { if (tk === cancelTokenRef.current) setStatus("Operation failed"); alert("Unable to unlock. Only PDFs you own and remember the password for should be unlocked."); } finally { if (tk === cancelTokenRef.current) { setBusy(null); setStatus((s) => s === "Canceled" || s.startsWith("Download") ? s : "Operation complete"); } requestAnimationFrame(() => lastTriggerRef.current?.focus()); }
  };

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Reveal>
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">PDF tools</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Edit PDFs without uploading</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Everything runs in your browser. Files never leave your device.</p>
          </header>
        </Reveal>

        <MostUsedPdfTools />

        {banner}

        <div role="status" aria-live="polite" className="sr-only">{status}</div>


        <div className="grid gap-5 lg:grid-cols-2" onClickCapture={(e) => { guardClick(e); if (!e.defaultPrevented) rememberTrigger(e); }}>


          {/* ============= ORGANIZE PDF ============= */}
          <SectionHeader id="organize" kicker="Organize" title="Organize PDF" desc="Merge, split, rearrange and clean up pages." />

          <Card busy={busy === "merge"} onCancel={cancelRun} onClear={() => { setMergeFiles([]); const el = document.getElementById("pdf-merge-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={mergeFiles.length > 0} id="merge" toolId="pdf-merge" title="Merge PDFs" desc="Combine multiple PDFs into one.">
            <input id="pdf-merge-in" type="file" accept="application/pdf" multiple onChange={(e) => setMergeFiles(Array.from(e.target.files ?? []))} className={inputCls} />
            <button onClick={doMerge} disabled={busy !== null} className={btnCls}><BtnLabel busy={busy === "merge"} idle="Merge & download" working="Merging…" /></button>
          </Card>

          <Card busy={busy === "split"} onCancel={cancelRun} onClear={() => { setSplitFile(null); const el = document.getElementById("pdf-split-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={!!splitFile} id="split" toolId="pdf-split" title="Split PDF" desc="Split a PDF into one file per page.">
            <input id="pdf-split-in" type="file" accept="application/pdf" onChange={(e) => setSplitFile(e.target.files?.[0] ?? null)} className={inputCls} />
            <button onClick={doSplit} disabled={busy !== null} className={btnCls}><BtnLabel busy={busy === "split"} idle="Split" working="Splitting…" /></button>
          </Card>

          <Card onClear={() => { setRotFile(null); const el = document.getElementById("pdf-rot-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={!!rotFile} id="rotate" toolId="pdf-rotate" title="Rotate PDF" desc="Rotate every page.">
            <input id="pdf-rot-in" type="file" accept="application/pdf" onChange={(e) => setRotFile(e.target.files?.[0] ?? null)} className={inputCls} />
            <div className="mt-3 flex gap-2">
              {[90, 180, 270].map((d) => (
                <button key={d} onClick={() => setRotDeg(d)} className={`rounded-lg border px-3 py-1.5 text-sm ${rotDeg === d ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" : "border-slate-200 dark:border-slate-700"}`}>{d}°</button>
              ))}
            </div>
            <button onClick={doRotate} disabled={busy !== null} className={btnCls}>Rotate</button>
          </Card>

          <Card onClear={() => { setReFile(null); setReOrder(""); const el = document.getElementById("pdf-re-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={!!reFile || !!reOrder} id="reorder" toolId="pdf-reorder" title="Reorder Pages" desc="Enter the page order as comma-separated numbers (e.g. 3,1,2).">
            <input id="pdf-re-in" type="file" accept="application/pdf" onChange={(e) => setReFile(e.target.files?.[0] ?? null)} className={inputCls} />
            <input value={reOrder} onChange={(e) => setReOrder(e.target.value)} placeholder="3,1,2" className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button onClick={doReorder} disabled={busy !== null} className={btnCls}>Reorder</button>
          </Card>

          <Card busy={busy === "rm"} onCancel={cancelRun} onClear={() => { setRmFile(null); setRmPages(""); const el = document.getElementById("pdf-rm-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={!!rmFile || !!rmPages} id="remove-pages" toolId="pdf-remove-pages" title="Remove Pages" desc="Delete specific pages. Use commas and ranges, e.g. 2,4-6.">
            <input id="pdf-rm-in" type="file" accept="application/pdf" onChange={(e) => setRmFile(e.target.files?.[0] ?? null)} className={inputCls} />
            <input value={rmPages} onChange={(e) => setRmPages(e.target.value)} placeholder="2,4-6" className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button onClick={doRemove} disabled={busy !== null} className={btnCls}><BtnLabel busy={busy === "rm"} idle="Remove pages" working="Removing…" /></button>
          </Card>

          <Card busy={busy === "ex"} onCancel={cancelRun} onClear={() => { setExFile(null); setExPages(""); const el = document.getElementById("pdf-ex-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={!!exFile || !!exPages} id="extract-pages" toolId="pdf-extract-pages" title="Extract Pages" desc="Save selected pages as a new PDF.">
            <input id="pdf-ex-in" type="file" accept="application/pdf" onChange={(e) => setExFile(e.target.files?.[0] ?? null)} className={inputCls} />
            <input value={exPages} onChange={(e) => setExPages(e.target.value)} placeholder="1,3-5" className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button onClick={doExtract} disabled={busy !== null} className={btnCls}><BtnLabel busy={busy === "ex"} idle="Extract" working="Extracting…" /></button>
          </Card>

          <Card onClear={() => { setCpFile(null); const el = document.getElementById("pdf-cp-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={!!cpFile} id="compress" toolId="pdf-compress" title="Compress PDF" desc="Basic recompression using object streams.">
            <input id="pdf-cp-in" type="file" accept="application/pdf" onChange={(e) => setCpFile(e.target.files?.[0] ?? null)} className={inputCls} />
            <button onClick={doCompress} disabled={busy !== null} className={btnCls}>Compress</button>
          </Card>

          <Card busy={busy === "pn"} onCancel={cancelRun} onClear={() => { setPnFile(null); const el = document.getElementById("pdf-pn-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={!!pnFile} id="page-numbers" toolId="pdf-page-numbers" title="Add Page Numbers" desc="Add centered footer page numbers to every page.">
            <input id="pdf-pn-in" type="file" accept="application/pdf" onChange={(e) => setPnFile(e.target.files?.[0] ?? null)} className={inputCls} />
            <button onClick={doPageNumbers} disabled={busy !== null} className={btnCls}><BtnLabel busy={busy === "pn"} idle="Add numbers" working="Adding…" /></button>
          </Card>

          <Card busy={busy === "wm"} onCancel={cancelRun} onClear={() => { setWmFile(null); const el = document.getElementById("pdf-wm-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={!!wmFile} id="watermark" toolId="pdf-watermark" title="Add Watermark" desc="Stamp a diagonal text watermark on every page.">
            <input id="pdf-wm-in" type="file" accept="application/pdf" onChange={(e) => setWmFile(e.target.files?.[0] ?? null)} className={inputCls} />
            <input value={wmText} onChange={(e) => setWmText(e.target.value)} placeholder="CONFIDENTIAL" className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button onClick={doWatermark} disabled={busy !== null} className={btnCls}><BtnLabel busy={busy === "wm"} idle="Add watermark" working="Stamping…" /></button>
          </Card>

          <Card busy={busy === "cr"} onCancel={cancelRun} onClear={() => { setCrFile(null); const el = document.getElementById("pdf-cr-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={!!crFile} id="crop" toolId="pdf-crop" title="Crop PDF" desc="Trim margins from every page (in points; 72pt = 1 inch).">
            <input id="pdf-cr-in" type="file" accept="application/pdf" onChange={(e) => setCrFile(e.target.files?.[0] ?? null)} className={inputCls} />
            <input type="number" min={0} value={crMargin} onChange={(e) => setCrMargin(parseInt(e.target.value || "0", 10))} placeholder="36" className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button onClick={doCrop} disabled={busy !== null} className={btnCls}><BtnLabel busy={busy === "cr"} idle="Crop" working="Cropping…" /></button>
          </Card>

          {/* ============= CONVERT TO PDF ============= */}
          <SectionHeader id="convert-to-pdf" kicker="Convert to PDF" title="Convert to PDF" desc="Turn images and Office documents into PDF files." />

          <Card busy={busy === "img"} onCancel={cancelRun} onClear={() => { setImgFiles([]); const el = document.getElementById("pdf-img-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={imgFiles.length > 0} id="jpg-to-pdf" toolId="pdf-jpg-to-pdf" title="JPG / PNG to PDF" desc="Combine images into a single PDF.">
            <input id="pdf-img-in" type="file" accept="image/jpeg,image/png" multiple onChange={(e) => setImgFiles(Array.from(e.target.files ?? []))} className={inputCls} />
            <button onClick={doImagesToPdf} disabled={busy !== null} className={btnCls}><BtnLabel busy={busy === "img"} idle="Build PDF" working="Converting…" /></button>
          </Card>

          <WordToPdfCard />
          <ExcelToPdfCard />
          <ComingSoonCard id="powerpoint-to-pdf" title="PowerPoint to PDF" desc="Convert .pptx presentations into a PDF. Requires a server for accurate slide rendering — coming soon." />
          <HtmlToPdfCard />


          {/* ============= CONVERT FROM PDF ============= */}
          <SectionHeader id="convert-from-pdf" kicker="Convert from PDF" title="Convert from PDF" desc="Export a PDF to images or editable Office formats." />

          <Card busy={busy === "p2j"} onCancel={cancelRun} onClear={() => { setP2jFile(null); const el = document.getElementById("pdf-p2j-in") as HTMLInputElement | null; if (el) el.value = ""; }} canClear={!!p2jFile} id="pdf-to-jpg" toolId="pdf-to-jpg" title="PDF to JPG" desc="Export each page as a high-quality JPG image.">
            <input id="pdf-p2j-in" type="file" accept="application/pdf" onChange={(e) => setP2jFile(e.target.files?.[0] ?? null)} className={inputCls} />
            <button onClick={doPdfToJpg} disabled={busy !== null} className={btnCls}><BtnLabel busy={busy === "p2j"} idle="Convert" working="Rendering…" /></button>
          </Card>

          <PdfToWordCard />
          <PdfToExcelCard />
          <ComingSoonCard id="pdf-to-powerpoint" title="PDF to PowerPoint" desc="Turn a PDF into an editable .pptx presentation. Needs a server for real slide reconstruction — coming soon." />
          <ComingSoonCard id="pdf-to-pdfa" title="PDF to PDF/A" desc="Convert to the ISO PDF/A archival standard. Requires font-embedding validation and ICC profiles that only a server can produce — coming soon." />


          {/* ============= SECURITY & REVIEW ============= */}
          <SectionHeader id="security" kicker="Security & Review" title="Security &amp; Review" desc="Protect, sign, redact and compare PDFs." />

          <PremiumCard id="protect" title="Protect PDF" desc="Add a strong password and encryption to a PDF." />
          <PremiumCard id="unlock" title="Unlock PDF" desc="Remove a password from a PDF you own." />
          <SignPdfCard />
          <RedactPdfCard />
          <ComparePdfCard />

        </div>
      </section>
    </Layout>
  );
}
