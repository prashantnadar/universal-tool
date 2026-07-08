import { useEffect, useRef, useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { Reveal } from "@/components/Reveal";
import { InlineSpinner, SkeletonLines } from "@/components/Skeleton";
import { trackUse } from "@/lib/usage-tracking";

/* ---------- shared UI ---------- */

const inputCls =
  "block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white file:hover:bg-blue-700 dark:text-slate-200";
const btnCls =
  "mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60";
const fieldCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function ToolShell({
  id,
  title,
  desc,
  busy,
  onCancel,
  canClear,
  onClear,
  className = "",
  children,
}: {
  id: string;
  title: string;
  desc: string;
  busy: boolean;
  onCancel: () => void;
  canClear: boolean;
  onClear: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal as="section" className={className}>
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id={`${id}-title`} className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {title}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
          </div>
          {canClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label={`Clear ${title}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-4" aria-busy={busy || undefined}>{children}</div>
        {busy && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40" role="status" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <InlineSpinner /> Processing…
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label={`Cancel ${title}`}
                className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
              >
                Cancel
              </button>
            </div>
            <div className="mt-3"><SkeletonLines count={3} /></div>
          </div>
        )}
      </section>
    </Reveal>
  );
}

function saveBlob(bytes: BlobPart, name: string, type = "application/pdf") {
  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =========================================================
   1) HTML to PDF
   ========================================================= */
export function HtmlToPdfCard() {
  const [html, setHtml] = useState(
    '<h1 style="font-family:Inter,system-ui;color:#1e293b">Hello 👋</h1>\n<p>Type any HTML here and turn it into a PDF.</p>',
  );
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef(0);

  const cancel = () => { tokenRef.current++; setBusy(false); };
  const clear = () => setHtml("");

  const convert = async () => {
    trackUse("pdf-html-to-pdf");
    if (!html.trim()) return;
    const tk = ++tokenRef.current;
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      if (tk !== tokenRef.current) return;

      // Offscreen container sized to A4 width @ 96dpi ≈ 794px.
      const A4_WIDTH_PX = 794;
      const host = document.createElement("div");
      host.style.cssText =
        `position:fixed;left:-99999px;top:0;width:${A4_WIDTH_PX}px;padding:40px;background:#ffffff;color:#0f172a;font-family:system-ui,Segoe UI,Roboto,sans-serif;line-height:1.5;`;
      host.innerHTML = html;
      document.body.appendChild(host);

      try {
        const canvas = await html2canvas(host, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        if (tk !== tokenRef.current) return;

        const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = (canvas.height * imgW) / canvas.width;

        if (imgH <= pageH) {
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, imgW, imgH);
        } else {
          // Paginate by slicing the tall canvas into page-height slices.
          const pxPerPt = canvas.width / pageW;
          const sliceHeightPx = Math.floor(pageH * pxPerPt);
          let y = 0;
          let first = true;
          while (y < canvas.height) {
            const h = Math.min(sliceHeightPx, canvas.height - y);
            const slice = document.createElement("canvas");
            slice.width = canvas.width;
            slice.height = h;
            const ctx = slice.getContext("2d")!;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, slice.width, slice.height);
            ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
            if (!first) pdf.addPage();
            first = false;
            const outH = (h / canvas.width) * pageW;
            pdf.addImage(slice.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, pageW, outH);
            y += h;
          }
        }

        pdf.save("html.pdf");
      } finally {
        host.remove();
      }
    } catch (e) {
      alert("HTML to PDF failed: " + (e as Error).message);
    } finally {
      if (tk === tokenRef.current) setBusy(false);
    }
  };

  return (
    <ToolShell id="html-to-pdf" title="HTML to PDF" desc="Paste HTML (with inline CSS) and download it as a PDF — rendered right in your browser." busy={busy} onCancel={cancel} canClear={html.length > 0} onClear={clear}>
      <label className="block">
        <span className="sr-only">HTML source</span>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={8}
          spellCheck={false}
          aria-label="HTML source"
          className={`${fieldCls} font-mono text-xs`}
          placeholder="<h1>Hello</h1>"
        />
      </label>
      <button type="button" onClick={convert} disabled={busy || !html.trim()} className={btnCls}>
        {busy && <InlineSpinner />} {busy ? "Rendering…" : "Convert & download"}
      </button>
    </ToolShell>
  );
}

/* =========================================================
   2) Sign PDF
   =========================================================
   Features:
   - Signature pad with undo, redo, clear (stroke-based history).
   - Drag & drop: rendered preview of the target PDF page with a
     draggable signature overlay so the user places their signature
     exactly where they want it.
   ========================================================= */
type Pt = { x: number; y: number };

export function SignPdfCard() {
  const [file, setFile] = useState<File | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [sigWidth, setSigWidth] = useState(180); // in PDF points
  const [busy, setBusy] = useState(false);

  // Stroke-based signature so we can undo/redo/clear individual strokes.
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [redoStack, setRedoStack] = useState<Pt[][]>([]);
  const drawing = useRef(false);
  const currentStroke = useRef<Pt[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const CW = 600;
  const CH = 180;

  // Page preview + drag-drop state.
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pagePts, setPagePts] = useState<{ w: number; h: number } | null>(null);
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number } | null>(null);
  // Normalized position from top-left of the page (0..1). Default: bottom-right.
  const [nx, setNx] = useState(0.7);
  const [ny, setNy] = useState(0.85);

  const empty = strokes.length === 0;

  /* ---- redraw signature canvas from strokes ---- */
  const redrawStrokes = (list: Pt[][]) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of list) {
      if (stroke.length < 1) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      if (stroke.length === 1) ctx.lineTo(stroke[0].x + 0.1, stroke[0].y + 0.1);
      ctx.stroke();
    }
  };
  useEffect(() => { redrawStrokes(strokes); }, [strokes]);

  /* ---- signature pointer events ---- */
  const point = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    currentStroke.current = [point(e)];
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const p = point(e);
    currentStroke.current.push(p);
    // Live-draw the last segment for responsiveness.
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const arr = currentStroke.current;
    if (arr.length >= 2) {
      const a = arr[arr.length - 2], b = arr[arr.length - 1];
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  };
  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const stroke = currentStroke.current;
    currentStroke.current = [];
    if (stroke.length > 0) {
      setStrokes((prev) => [...prev, stroke]);
      setRedoStack([]); // any new stroke invalidates redo history
    }
  };

  const undo = () => {
    if (strokes.length === 0) return;
    const next = strokes.slice(0, -1);
    const popped = strokes[strokes.length - 1];
    setStrokes(next);
    setRedoStack((r) => [...r, popped]);
  };
  const redoAction = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setStrokes((s) => [...s, last]);
  };
  const clearPad = () => { setStrokes([]); setRedoStack([]); };

  /* ---- keyboard shortcuts for undo/redo ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redoAction(); else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redoAction();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [strokes, redoStack]);

  /* ---- load file → page count ---- */
  useEffect(() => {
    if (!file) { setTotalPages(0); setPagePts(null); return; }
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        setTotalPages(doc.getPageCount());
        setPageNum(1);
      } catch { setTotalPages(0); }
    })();
  }, [file]);

  /* ---- render current page preview ---- */
  useEffect(() => {
    if (!file || totalPages === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        if (cancelled) return;
        const page = await pdf.getPage(Math.min(pageNum, pdf.numPages));
        // PDF units: 1 pt = 1/72 inch. Render at scale to fit ~640px width.
        const vp0 = page.getViewport({ scale: 1 });
        const scale = Math.min(640 / vp0.width, 2);
        const vp = page.getViewport({ scale });
        const c = previewCanvasRef.current;
        if (!c) return;
        c.width = vp.width;
        c.height = vp.height;
        setPagePts({ w: vp0.width, h: vp0.height });
        setPreviewSize({ w: vp.width, h: vp.height });
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise;
        if (cancelled) return;
      } catch {
        /* render failure — user can still choose page + width and sign blindly */
      }
    })();
    return () => { cancelled = true; };
  }, [file, pageNum, totalPages]);

  /* ---- signature preview data URL for drag overlay ---- */
  const [sigThumb, setSigThumb] = useState<string>("");
  useEffect(() => {
    if (empty) { setSigThumb(""); return; }
    // Reuse the current canvas — trim happens at export; the overlay uses the raw pad image.
    const c = canvasRef.current;
    if (!c) return;
    setSigThumb(c.toDataURL("image/png"));
  }, [strokes, empty]);

  /* ---- drag overlay handlers ---- */
  const dragContainerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const computeOverlaySize = () => {
    if (!pagePts || !previewSize) return { w: 0, h: 0 };
    const renderedWidth = dragContainerRef.current?.getBoundingClientRect().width || previewSize.w;
    const w = (sigWidth / pagePts.w) * renderedWidth;
    return { w, h: w * (CH / CW) };
  };

  const updateFromClient = (clientX: number, clientY: number) => {
    const container = dragContainerRef.current;
    if (!container || !previewSize) return;
    const rect = container.getBoundingClientRect();
    const { w: oW, h: oH } = computeOverlaySize();
    const rawX = clientX - rect.left - dragOffset.current.dx;
    const rawY = clientY - rect.top - dragOffset.current.dy;
    const clampedX = Math.max(0, Math.min(rect.width - oW, rawX));
    const clampedY = Math.max(0, Math.min(rect.height - oH, rawY));
    setNx(clampedX / rect.width);
    setNy(clampedY / rect.height);
  };

  const onOverlayDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!previewSize) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
  };
  const onOverlayMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    e.preventDefault();
    updateFromClient(e.clientX, e.clientY);
  };
  const onOverlayUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  // Click on the preview canvas to place the signature at the clicked point.
  const onPreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewSize || empty) return;
    const container = dragContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const { w: oW, h: oH } = computeOverlaySize();
    dragOffset.current = { dx: oW / 2, dy: oH / 2 };
    updateFromClient(e.clientX, e.clientY);
  };

  const onOverlayKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!previewSize) return;
    const step = e.shiftKey ? 0.05 : 0.01;
    let dx = 0, dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    setNx((v) => Math.max(0, Math.min(1, v + dx)));
    setNy((v) => Math.max(0, Math.min(1, v + dy)));
  };

  const clearAll = () => {
    setFile(null); setTotalPages(0); setPagePts(null); setPreviewSize(null);
    clearPad();
    const el = document.getElementById("sign-pdf-in") as HTMLInputElement | null;
    if (el) el.value = "";
  };

  const cancelRun = () => setBusy(false);

  const apply = async () => {
    trackUse("pdf-sign");
    if (!file) return alert("Choose a PDF first");
    if (empty) return alert("Please draw your signature");
    setBusy(true);
    try {
      // Keep the full signature pad ratio so the visible placement box matches
      // the exact space that will be written into the PDF.
      const src = canvasRef.current!;
      const ctx = src.getContext("2d")!;
      const data = ctx.getImageData(0, 0, src.width, src.height);
      const out = document.createElement("canvas");
      out.width = src.width; out.height = src.height;
      const octx = out.getContext("2d")!;
      octx.putImageData(data, 0, 0);
      const od = octx.getImageData(0, 0, out.width, out.height);
      for (let i = 0; i < od.data.length; i += 4) {
        const r = od.data[i], g = od.data[i + 1], b = od.data[i + 2];
        if (r > 240 && g > 240 && b > 240) od.data[i + 3] = 0;
      }
      octx.putImageData(od, 0, 0);
      const pngUrl = out.toDataURL("image/png");
      const pngBytes = Uint8Array.from(atob(pngUrl.split(",")[1]), (c) => c.charCodeAt(0));

      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const png = await doc.embedPng(pngBytes);
      const pageIdx = Math.min(Math.max(1, pageNum), doc.getPageCount()) - 1;
      const page = doc.getPage(pageIdx);
      const { width, height } = page.getSize();
      const drawW = Math.min(sigWidth, width - 20);
      const drawH = (CH / CW) * drawW;
      // Convert normalized (top-left origin) to PDF coords (bottom-left origin).
      const x = Math.max(0, Math.min(width - drawW, nx * width));
      const yTop = ny * height;
      const y = Math.max(0, Math.min(height - drawH, height - yTop - drawH));
      page.drawImage(png, { x, y, width: drawW, height: drawH });

      saveBlob((await doc.save()) as BlobPart, "signed.pdf");
    } catch (e) {
      alert("Sign failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const renderedPreviewW = dragContainerRef.current?.getBoundingClientRect().width || previewSize?.w || 0;
  const renderedPreviewH = dragContainerRef.current?.getBoundingClientRect().height || previewSize?.h || 0;
  const overlayW = pagePts && previewSize ? (sigWidth / pagePts.w) * renderedPreviewW : 0;
  const overlayH = overlayW * (CH / CW);
  const overlayLeft = renderedPreviewW ? Math.min(nx * renderedPreviewW, Math.max(0, renderedPreviewW - overlayW)) : 0;
  const overlayTop = renderedPreviewH ? Math.min(ny * renderedPreviewH, Math.max(0, renderedPreviewH - overlayH)) : 0;

  return (
    <ToolShell id="sign" title="Sign PDF" desc="Draw your signature, then drag it onto any page — everything happens in your browser." busy={busy} onCancel={cancelRun} canClear={!!file || !empty} onClear={clearAll} className="lg:col-span-2">
      <input
        id="sign-pdf-in"
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        aria-label="PDF to sign"
        className={inputCls}
      />

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(280px,420px)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p id="sign-pad-label" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Draw your signature</p>
              <div role="toolbar" aria-label="Signature editing actions" aria-controls="sign-pad-canvas" className="flex items-center gap-2">
                <button type="button" onClick={undo} disabled={strokes.length === 0} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" aria-label={`Undo last stroke (Ctrl+Z). ${strokes.length} stroke${strokes.length === 1 ? "" : "s"} on canvas.`} aria-keyshortcuts="Control+Z Meta+Z" title="Undo (Ctrl+Z)">
                  <span aria-hidden="true">↶</span> Undo
                </button>
                <button type="button" onClick={redoAction} disabled={redoStack.length === 0} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" aria-label={`Redo stroke (Ctrl+Shift+Z). ${redoStack.length} stroke${redoStack.length === 1 ? "" : "s"} available.`} aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z" title="Redo (Ctrl+Shift+Z)">
                  <span aria-hidden="true">↷</span> Redo
                </button>
                <button type="button" onClick={clearPad} disabled={empty} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-rose-600 hover:border-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950" aria-label="Clear signature canvas — remove all strokes">
                  <span aria-hidden="true">✕</span> Clear
                </button>
              </div>
            </div>
            <canvas
              id="sign-pad-canvas"
              ref={canvasRef}
              width={CW}
              height={CH}
              role="img"
              tabIndex={0}
              aria-labelledby="sign-pad-label"
              aria-describedby="sign-pad-hint"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className="w-full touch-none rounded-lg border border-dashed border-slate-300 bg-white focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-600"
              style={{ aspectRatio: `${CW} / ${CH}` }}
            />
            <p id="sign-pad-hint" className="mt-1 text-[11px] text-slate-500">Tip: Ctrl/⌘+Z to undo, Ctrl/⌘+Shift+Z to redo. Draw with mouse, pen, or finger.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Page
              <input
                type="number"
                min={1}
                max={totalPages || 1}
                value={pageNum}
                onChange={(e) => setPageNum(Math.max(1, Math.min(totalPages || 1, parseInt(e.target.value || "1", 10))))}
                className={`${fieldCls} mt-1`}
                aria-label="Page number to sign"
              />
              {totalPages > 0 && <span className="mt-0.5 block text-[10px] text-slate-500">of {totalPages}</span>}
            </label>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Signature width (pt)
              <input
                type="number"
                min={40}
                max={500}
                value={sigWidth}
                onChange={(e) => setSigWidth(parseInt(e.target.value || "180", 10))}
                className={`${fieldCls} mt-1`}
                aria-label="Signature width in points"
              />
            </label>
          </div>

          <button type="button" onClick={apply} disabled={busy || !file || empty} className={btnCls}>
            {busy && <InlineSpinner />} {busy ? "Signing…" : "Sign & download"}
          </button>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p id="sign-drop-label" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Drag signature onto PDF page
            </p>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              Box = final signature space
            </span>
          </div>

          {file && (
            <div
              id="sign-drop-hint"
              role="note"
              className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-[11px] font-medium text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              <span><strong className="font-semibold">Drag</strong> the blue box, <strong className="font-semibold">click</strong> anywhere on the page to snap it there, or <strong className="font-semibold">focus</strong> the box and use <kbd className="rounded border border-blue-300 bg-white px-1 py-[1px] font-mono text-[10px] dark:border-blue-800 dark:bg-slate-900">Arrow</kbd> keys (hold <kbd className="rounded border border-blue-300 bg-white px-1 py-[1px] font-mono text-[10px] dark:border-blue-800 dark:bg-slate-900">Shift</kbd> to move faster).</span>
            </div>
          )}

          {file ? (
            <div className="overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-900">
              <div
                ref={dragContainerRef}
                role="application"
                aria-labelledby="sign-drop-label"
                aria-describedby="sign-drop-hint"
                className="relative mx-auto max-w-full overflow-hidden rounded bg-white shadow-sm"
                style={{ width: previewSize ? `${previewSize.w}px` : undefined }}
                onClick={onPreviewClick}
                onPointerMove={onOverlayMove}
                onPointerUp={onOverlayUp}
                onPointerCancel={onOverlayUp}
              >
                <canvas ref={previewCanvasRef} className="block h-auto w-full" aria-label={`Preview of page ${pageNum}`} />
                {previewSize && (
                  <div
                    role={sigThumb ? "button" : undefined}
                    tabIndex={sigThumb ? 0 : -1}
                    aria-label={sigThumb ? `Signature placement box on page ${pageNum}. Drag or use arrow keys to reposition. Hold Shift for larger steps.` : "Signature placement box (draw a signature first to enable)."}
                    aria-describedby="sign-drop-hint"
                    aria-grabbed={sigThumb ? false : undefined}
                    aria-keyshortcuts={sigThumb ? "ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown" : undefined}
                    onPointerDown={sigThumb ? onOverlayDown : undefined}
                    onPointerMove={sigThumb ? onOverlayMove : undefined}
                    onPointerUp={sigThumb ? onOverlayUp : undefined}
                    onPointerCancel={sigThumb ? onOverlayUp : undefined}
                    onKeyDown={sigThumb ? onOverlayKey : undefined}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute touch-none overflow-hidden rounded border-2 border-dashed border-blue-600 bg-blue-50/25 shadow-[0_0_0_9999px_rgba(37,99,235,0.04)] outline-none ring-blue-400 focus-visible:ring-2 ${sigThumb ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
                    style={{
                      left: `${overlayLeft}px`,
                      top: `${overlayTop}px`,
                      width: `${overlayW}px`,
                      height: `${overlayH}px`,
                    }}
                  >
                    <div className="pointer-events-none absolute inset-1 rounded border border-emerald-500/80" aria-hidden="true" />
                    <div className="pointer-events-none absolute left-1/2 top-0 h-full border-l border-dashed border-blue-500/60" aria-hidden="true" />
                    <div className="pointer-events-none absolute left-0 top-1/2 w-full border-t border-dashed border-blue-500/60" aria-hidden="true" />
                    {sigThumb ? (
                      <img src={sigThumb} alt="" className="pointer-events-none relative z-10 h-full w-full object-contain" />
                    ) : (
                      <span className="pointer-events-none absolute inset-0 grid place-items-center px-2 text-center text-[10px] font-semibold text-blue-700">
                        Draw signature first
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              Upload a PDF to preview the page and place your signature.
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}

/* =========================================================
   3) Compare PDF
   ========================================================= */
type ComparePage = { a?: string; b?: string; diff?: string; changed: number };

export function ComparePdfCard() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [pages, setPages] = useState<ComparePage[]>([]);
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef(0);

  const cancelRun = () => { tokenRef.current++; setBusy(false); };
  const clearAll = () => {
    setFileA(null); setFileB(null); setPages([]);
    ["cmp-a", "cmp-b"].forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = "";
    });
  };

  const renderPage = async (pdfjs: any, buf: ArrayBuffer, page: number, scale = 1.4) => {
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    if (page < 1 || page > doc.numPages) return null;
    const p = await doc.getPage(page);
    const vp = p.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width; canvas.height = vp.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await p.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    return canvas;
  };

  const diffCanvas = (a: HTMLCanvasElement, b: HTMLCanvasElement) => {
    const w = Math.max(a.width, b.width);
    const h = Math.max(a.height, b.height);
    const A = document.createElement("canvas"); A.width = w; A.height = h;
    const B = document.createElement("canvas"); B.width = w; B.height = h;
    const ac = A.getContext("2d")!; const bc = B.getContext("2d")!;
    ac.fillStyle = "#ffffff"; ac.fillRect(0, 0, w, h); ac.drawImage(a, 0, 0);
    bc.fillStyle = "#ffffff"; bc.fillRect(0, 0, w, h); bc.drawImage(b, 0, 0);
    const ad = ac.getImageData(0, 0, w, h); const bd = bc.getImageData(0, 0, w, h);
    const out = ac.createImageData(w, h);
    let changed = 0;
    for (let i = 0; i < ad.data.length; i += 4) {
      const dr = Math.abs(ad.data[i] - bd.data[i]);
      const dg = Math.abs(ad.data[i + 1] - bd.data[i + 1]);
      const db = Math.abs(ad.data[i + 2] - bd.data[i + 2]);
      const delta = dr + dg + db;
      // Base: desaturated A page (so diffs stand out).
      const gray = 0.299 * ad.data[i] + 0.587 * ad.data[i + 1] + 0.114 * ad.data[i + 2];
      const soft = 220 + (gray - 220) * 0.35;
      out.data[i] = soft; out.data[i + 1] = soft; out.data[i + 2] = soft; out.data[i + 3] = 255;
      if (delta > 30) {
        out.data[i] = 239; out.data[i + 1] = 68; out.data[i + 2] = 68; out.data[i + 3] = 255;
        changed++;
      }
    }
    const O = document.createElement("canvas"); O.width = w; O.height = h;
    O.getContext("2d")!.putImageData(out, 0, 0);
    return { canvas: O, changed, total: w * h };
  };

  const compare = async () => {
    trackUse("pdf-compare");
    if (!fileA || !fileB) return alert("Choose two PDFs to compare");
    const tk = ++tokenRef.current;
    setBusy(true);
    setPages([]);
    try {
      const pdfjs: any = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

      const [bufA, bufB] = await Promise.all([fileA.arrayBuffer(), fileB.arrayBuffer()]);
      const docA = await pdfjs.getDocument({ data: bufA.slice(0) }).promise;
      const docB = await pdfjs.getDocument({ data: bufB.slice(0) }).promise;
      const pageCount = Math.max(docA.numPages, docB.numPages);

      const results: ComparePage[] = [];
      for (let i = 1; i <= pageCount; i++) {
        if (tk !== tokenRef.current) return;
        const [ca, cb] = await Promise.all([
          renderPage(pdfjs, bufA.slice(0), i),
          renderPage(pdfjs, bufB.slice(0), i),
        ]);
        let diffUrl: string | undefined;
        let changed = 0;
        if (ca && cb) {
          const d = diffCanvas(ca, cb);
          diffUrl = d.canvas.toDataURL("image/png");
          changed = Math.round((d.changed / d.total) * 10000) / 100; // %
        } else if (ca && !cb) {
          changed = 100;
        } else if (!ca && cb) {
          changed = 100;
        }
        results.push({
          a: ca?.toDataURL("image/png"),
          b: cb?.toDataURL("image/png"),
          diff: diffUrl,
          changed,
        });
        setPages([...results]);
      }
    } catch (e) {
      alert("Compare failed: " + (e as Error).message);
    } finally {
      if (tk === tokenRef.current) setBusy(false);
    }
  };

  return (
    <ToolShell id="compare" title="Compare PDF" desc="Render both PDFs side-by-side and highlight visual differences in red — page by page." busy={busy} onCancel={cancelRun} canClear={!!fileA || !!fileB || pages.length > 0} onClear={clearAll}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
          PDF A
          <input id="cmp-a" type="file" accept="application/pdf" onChange={(e) => setFileA(e.target.files?.[0] ?? null)} className={`${inputCls} mt-1`} aria-label="First PDF" />
        </label>
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
          PDF B
          <input id="cmp-b" type="file" accept="application/pdf" onChange={(e) => setFileB(e.target.files?.[0] ?? null)} className={`${inputCls} mt-1`} aria-label="Second PDF" />
        </label>
      </div>
      <button type="button" onClick={compare} disabled={busy || !fileA || !fileB} className={btnCls}>
        {busy && <InlineSpinner />} {busy ? "Comparing…" : "Compare"}
      </button>

      {pages.length > 0 && (
        <ol className="mt-5 space-y-6" aria-label="Comparison results">
          {pages.map((p, i) => (
            <li key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Page {i + 1}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    p.changed > 0.05
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  }`}
                >
                  {p.changed > 0.05 ? `${p.changed}% changed` : "Identical"}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <figure>
                  <figcaption className="mb-1 text-[10px] font-semibold uppercase text-slate-500">A</figcaption>
                  {p.a ? <img src={p.a} alt={`PDF A page ${i + 1}`} className="w-full rounded border border-slate-200" loading="lazy" /> : <div className="rounded border border-dashed border-slate-300 p-4 text-center text-[10px] text-slate-500">missing</div>}
                </figure>
                <figure>
                  <figcaption className="mb-1 text-[10px] font-semibold uppercase text-slate-500">B</figcaption>
                  {p.b ? <img src={p.b} alt={`PDF B page ${i + 1}`} className="w-full rounded border border-slate-200" loading="lazy" /> : <div className="rounded border border-dashed border-slate-300 p-4 text-center text-[10px] text-slate-500">missing</div>}
                </figure>
                <figure>
                  <figcaption className="mb-1 text-[10px] font-semibold uppercase text-slate-500">Diff</figcaption>
                  {p.diff ? <img src={p.diff} alt={`Difference on page ${i + 1}`} className="w-full rounded border border-slate-200" loading="lazy" /> : <div className="rounded border border-dashed border-slate-300 p-4 text-center text-[10px] text-slate-500">—</div>}
                </figure>
              </div>
            </li>
          ))}
        </ol>
      )}

    </ToolShell>
  );
}

/* =========================================================
   4) Word to PDF (text-only, layout approximated)
   ========================================================= */
export function WordToPdfCard() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef(0);
  const cancel = () => { tokenRef.current++; setBusy(false); };
  const clear = () => { setFile(null); const el = document.getElementById("w2p-in") as HTMLInputElement | null; if (el) el.value = ""; };

  const convert = async () => {
    if (!file) return;
    trackUse("pdf-word-to-pdf");
    const tk = ++tokenRef.current;
    setBusy(true);
    try {
      const [{ default: mammoth }, { default: html2canvas }, { jsPDF }] = await Promise.all([
        import("mammoth"),
        import("html2canvas"),
        import("jspdf"),
      ]);
      if (tk !== tokenRef.current) return;
      const buf = await file.arrayBuffer();
      const { value: htmlBody } = await mammoth.convertToHtml({ arrayBuffer: buf });
      if (tk !== tokenRef.current) return;

      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-99999px;top:0;width:794px;padding:48px;background:#fff;color:#0f172a;font-family:Georgia,serif;line-height:1.55;font-size:14px;";
      host.innerHTML = htmlBody;
      document.body.appendChild(host);
      try {
        const canvas = await html2canvas(host, { scale: 2, backgroundColor: "#ffffff" });
        if (tk !== tokenRef.current) return;
        const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const pxPerPt = canvas.width / pageW;
        const sliceHeightPx = Math.floor(pageH * pxPerPt);
        let y = 0, first = true;
        while (y < canvas.height) {
          const h = Math.min(sliceHeightPx, canvas.height - y);
          const slice = document.createElement("canvas");
          slice.width = canvas.width; slice.height = h;
          const ctx = slice.getContext("2d")!;
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
          if (!first) pdf.addPage();
          first = false;
          pdf.addImage(slice.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, pageW, (h / canvas.width) * pageW);
          y += h;
        }
        pdf.save(file.name.replace(/\.docx?$/i, "") + ".pdf");
      } finally { host.remove(); }
    } catch (e) {
      alert("Word to PDF failed: " + (e as Error).message);
    } finally { if (tk === tokenRef.current) setBusy(false); }
  };

  return (
    <ToolShell id="word-to-pdf" title="Word to PDF" desc="Convert .docx documents to PDF. Text and basic formatting are preserved; complex layouts, images and shapes may be approximated." busy={busy} onCancel={cancel} canClear={!!file} onClear={clear}>
      <input id="w2p-in" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={inputCls} />
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Note: only .docx is supported. Legacy .doc files need to be saved as .docx first.</p>
      <button type="button" onClick={convert} disabled={busy || !file} className={btnCls}>{busy && <InlineSpinner />} {busy ? "Converting…" : "Convert to PDF"}</button>
    </ToolShell>
  );
}

/* =========================================================
   5) Excel to PDF
   ========================================================= */
export function ExcelToPdfCard() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef(0);
  const cancel = () => { tokenRef.current++; setBusy(false); };
  const clear = () => { setFile(null); const el = document.getElementById("x2p-in") as HTMLInputElement | null; if (el) el.value = ""; };

  const convert = async () => {
    if (!file) return;
    trackUse("pdf-excel-to-pdf");
    const tk = ++tokenRef.current;
    setBusy(true);
    try {
      const [XLSX, { default: html2canvas }, { jsPDF }] = await Promise.all([
        import("xlsx"),
        import("html2canvas"),
        import("jspdf"),
      ]);
      if (tk !== tokenRef.current) return;
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape", compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      let firstSheet = true;
      for (const name of wb.SheetNames) {
        if (tk !== tokenRef.current) return;
        const ws = wb.Sheets[name];
        const html = XLSX.utils.sheet_to_html(ws, { editable: false });
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;left:-99999px;top:0;width:1400px;padding:24px;background:#fff;color:#0f172a;font-family:system-ui,sans-serif;font-size:12px;";
        host.innerHTML = `<h2 style="margin:0 0 12px;font-family:system-ui">${name}</h2>` + html;
        host.querySelectorAll("table").forEach((t) => { (t as HTMLElement).style.cssText = "border-collapse:collapse;width:100%;"; });
        host.querySelectorAll("td,th").forEach((c) => { (c as HTMLElement).style.cssText = "border:1px solid #cbd5e1;padding:4px 6px;"; });
        document.body.appendChild(host);
        try {
          const canvas = await html2canvas(host, { scale: 2, backgroundColor: "#ffffff" });
          if (tk !== tokenRef.current) return;
          if (!firstSheet) pdf.addPage();
          firstSheet = false;
          const pxPerPt = canvas.width / pageW;
          const sliceHeightPx = Math.floor(pageH * pxPerPt);
          let y = 0, firstSlice = true;
          while (y < canvas.height) {
            const h = Math.min(sliceHeightPx, canvas.height - y);
            const slice = document.createElement("canvas");
            slice.width = canvas.width; slice.height = h;
            const ctx = slice.getContext("2d")!;
            ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, slice.width, slice.height);
            ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
            if (!firstSlice) pdf.addPage();
            firstSlice = false;
            pdf.addImage(slice.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, pageW, (h / canvas.width) * pageW);
            y += h;
          }
        } finally { host.remove(); }
      }
      pdf.save(file.name.replace(/\.xlsx?$/i, "") + ".pdf");
    } catch (e) {
      alert("Excel to PDF failed: " + (e as Error).message);
    } finally { if (tk === tokenRef.current) setBusy(false); }
  };

  return (
    <ToolShell id="excel-to-pdf" title="Excel to PDF" desc="Convert .xlsx and .xls spreadsheets to PDF (one sheet per section). Formulas are evaluated; charts and images are not exported." busy={busy} onCancel={cancel} canClear={!!file} onClear={clear}>
      <input id="x2p-in" type="file" accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={inputCls} />
      <button type="button" onClick={convert} disabled={busy || !file} className={btnCls}>{busy && <InlineSpinner />} {busy ? "Converting…" : "Convert to PDF"}</button>
    </ToolShell>
  );
}

/* =========================================================
   6) PDF → Word (layout-preserving .docx)
   ========================================================= */
export function PdfToWordCard() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef(0);
  const cancel = () => { tokenRef.current++; setBusy(false); };
  const clear = () => { setFile(null); const el = document.getElementById("p2w-in") as HTMLInputElement | null; if (el) el.value = ""; };

  const convert = async () => {
    if (!file) return;
    trackUse("pdf-to-word");
    const tk = ++tokenRef.current;
    setBusy(true);
    try {
      const [pdfjs, worker, docxLib]: [any, any, any] = await Promise.all([
        import("pdfjs-dist"),
        import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        import("docx"),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      if (tk !== tokenRef.current) return;
      const { Document, Packer, Paragraph, TextRun, PageBreak } = docxLib;

      const children: any[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        if (tk !== tokenRef.current) return;
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // Group text items into rows by their Y position, then order each row
        // left-to-right by X. This preserves reading order and produces
        // selectable, editable text (not page images).
        const rowMap = new Map<number, { x: number; s: string }[]>();
        for (const it of content.items as any[]) {
          const y = Math.round((it.transform?.[5] || 0) / 2) * 2; // quantise
          const x = it.transform?.[4] || 0;
          const s = String(it.str || "");
          if (!s) continue;
          if (!rowMap.has(y)) rowMap.set(y, []);
          rowMap.get(y)!.push({ x, s });
        }
        const rows = Array.from(rowMap.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([, cells]) => cells.sort((a, b) => a.x - b.x).map((c) => c.s).join(" ").trim())
          .filter((line) => line.length > 0);

        for (const line of rows) {
          children.push(new Paragraph({ children: [new TextRun(line)] }));
        }
        if (i < pdf.numPages) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }
      }
      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      saveBlob(blob, file.name.replace(/\.pdf$/i, "") + ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    } catch (e) {
      alert("PDF to Word failed: " + (e as Error).message);
    } finally { if (tk === tokenRef.current) setBusy(false); }
  };


  return (
    <ToolShell id="pdf-to-word" title="PDF to Word" desc="Extract editable text from each PDF page and place it into a Word document — the result is selectable, searchable and editable." busy={busy} onCancel={cancel} canClear={!!file} onClear={clear}>
      <input id="p2w-in" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={inputCls} />
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Text is extracted directly from the PDF, so images and complex visual layout are not preserved — but the output is fully editable.</p>
      <button type="button" onClick={convert} disabled={busy || !file} className={btnCls}>{busy && <InlineSpinner />} {busy ? "Converting…" : "Convert to Word"}</button>

    </ToolShell>
  );
}

/* =========================================================
   7) PDF → Excel (text-only .xlsx)
   ========================================================= */
export function PdfToExcelCard() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef(0);
  const cancel = () => { tokenRef.current++; setBusy(false); };
  const clear = () => { setFile(null); const el = document.getElementById("p2x-in") as HTMLInputElement | null; if (el) el.value = ""; };

  const convert = async () => {
    if (!file) return;
    trackUse("pdf-to-excel");
    const tk = ++tokenRef.current;
    setBusy(true);
    try {
      const [pdfjs, worker, XLSX]: [any, any, any] = await Promise.all([
        import("pdfjs-dist"),
        import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        import("xlsx"),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const wb = XLSX.utils.book_new();
      for (let i = 1; i <= pdf.numPages; i++) {
        if (tk !== tokenRef.current) return;
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Group by row (Y), then sort by X. Each item becomes a cell.
        const rowMap = new Map<number, { x: number; s: string }[]>();
        for (const it of content.items as any[]) {
          const y = Math.round((it.transform?.[5] || 0) / 2) * 2; // quantise
          const x = it.transform?.[4] || 0;
          const s = String(it.str || "");
          if (!s.trim()) continue;
          if (!rowMap.has(y)) rowMap.set(y, []);
          rowMap.get(y)!.push({ x, s });
        }
        const rows = Array.from(rowMap.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([, cells]) => cells.sort((a, b) => a.x - b.x).map((c) => c.s));
        const ws = XLSX.utils.aoa_to_sheet(rows.length ? rows : [[""]]);
        XLSX.utils.book_append_sheet(wb, ws, `Page ${i}`.slice(0, 31));
      }
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      saveBlob(out, file.name.replace(/\.pdf$/i, "") + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e) {
      alert("PDF to Excel failed: " + (e as Error).message);
    } finally { if (tk === tokenRef.current) setBusy(false); }
  };

  return (
    <ToolShell id="pdf-to-excel" title="PDF to Excel" desc="Extract text from every page into an .xlsx workbook (one sheet per page). Best for text-heavy PDFs — true table detection needs a server." busy={busy} onCancel={cancel} canClear={!!file} onClear={clear}>
      <input id="p2x-in" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={inputCls} />
      <button type="button" onClick={convert} disabled={busy || !file} className={btnCls}>{busy && <InlineSpinner />} {busy ? "Converting…" : "Convert to Excel"}</button>
    </ToolShell>
  );
}

/* =========================================================
   8) Redact PDF (draw opaque black rectangles)
   ========================================================= */
type RedactBox = { page: number; x: number; y: number; w: number; h: number };
export function RedactPdfCard() {
  const [file, setFile] = useState<File | null>(null);
  const [boxes, setBoxes] = useState<RedactBox[]>([{ page: 1, x: 50, y: 50, w: 200, h: 30 }]);
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef(0);

  const cancel = () => { tokenRef.current++; setBusy(false); };
  const clear = () => { setFile(null); setBoxes([{ page: 1, x: 50, y: 50, w: 200, h: 30 }]); const el = document.getElementById("rd-in") as HTMLInputElement | null; if (el) el.value = ""; };

  const updateBox = (i: number, patch: Partial<RedactBox>) => setBoxes((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const addBox = () => setBoxes((prev) => [...prev, { page: 1, x: 50, y: 50, w: 200, h: 30 }]);
  const removeBox = (i: number) => setBoxes((prev) => prev.filter((_, idx) => idx !== i));

  const run = async () => {
    if (!file) return;
    trackUse("pdf-redact");
    const tk = ++tokenRef.current;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      if (tk !== tokenRef.current) return;
      const pages = pdfDoc.getPages();
      for (const b of boxes) {
        const idx = Math.max(1, Math.min(pages.length, b.page)) - 1;
        const page = pages[idx];
        const ph = page.getHeight();
        // User Y is measured from the top; pdf-lib origin is bottom-left.
        page.drawRectangle({
          x: b.x,
          y: ph - b.y - b.h,
          width: b.w,
          height: b.h,
          color: rgb(0, 0, 0),
          opacity: 1,
        });
      }
      const bytes = await pdfDoc.save();
      saveBlob(bytes as BlobPart, file.name.replace(/\.pdf$/i, "") + "-redacted.pdf");
    } catch (e) {
      alert("Redact failed: " + (e as Error).message);
    } finally { if (tk === tokenRef.current) setBusy(false); }
  };

  return (
    <ToolShell id="redact" title="Redact PDF" desc="Cover sensitive regions with opaque black rectangles. Coordinates are in points (72 pt = 1 inch), measured from the top-left of the page." busy={busy} onCancel={cancel} canClear={!!file || boxes.length > 1} onClear={clear}>
      <input id="rd-in" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={inputCls} />
      <div className="mt-3 space-y-2">
        {boxes.map((b, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-6 dark:border-slate-700">
            <label className="text-xs">Page<input type="number" min={1} value={b.page} onChange={(e) => updateBox(i, { page: parseInt(e.target.value || "1", 10) })} className={fieldCls} /></label>
            <label className="text-xs">X<input type="number" value={b.x} onChange={(e) => updateBox(i, { x: parseFloat(e.target.value || "0") })} className={fieldCls} /></label>
            <label className="text-xs">Y<input type="number" value={b.y} onChange={(e) => updateBox(i, { y: parseFloat(e.target.value || "0") })} className={fieldCls} /></label>
            <label className="text-xs">Width<input type="number" value={b.w} onChange={(e) => updateBox(i, { w: parseFloat(e.target.value || "0") })} className={fieldCls} /></label>
            <label className="text-xs">Height<input type="number" value={b.h} onChange={(e) => updateBox(i, { h: parseFloat(e.target.value || "0") })} className={fieldCls} /></label>
            <button type="button" onClick={() => removeBox(i)} disabled={boxes.length <= 1} className="self-end rounded-lg border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-50 dark:bg-slate-950">Remove</button>
          </div>
        ))}
        <button type="button" onClick={addBox} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">+ Add region</button>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Note: this visually covers the region. For guaranteed removal of the underlying text stream, use a server-side redaction tool.</p>
      <button type="button" onClick={run} disabled={busy || !file} className={btnCls}>{busy && <InlineSpinner />} {busy ? "Redacting…" : "Redact & download"}</button>
    </ToolShell>
  );
}
