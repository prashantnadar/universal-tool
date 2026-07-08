import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { trackUse } from "@/lib/usage-tracking";
import { CopyButton, DownloadButton } from "@/components/CopyDownload";
import { imageMeta } from "@/lib/seo";
import { toolCategoryJsonLd } from "@/lib/tool-seo";



import { SkeletonLines } from "@/components/Skeleton";

export const Route = createFileRoute("/tools/text")({
  head: () => ({
    meta: [
      { title: "Text Tools — Word Counter, Case Converter, Cleaner & Encoder | UniversalTools" },
      { name: "description", content: "Free online text tools: word & character counter, reading time, uppercase/lowercase & title case converter, whitespace cleaner, remove special characters, base64/URL encoder, slug generator, find & replace, ROT13, binary converter and text compare." },
      { name: "keywords", content: "word counter, character counter, reading time, uppercase, lowercase, title case, sentence case, remove extra spaces, remove special characters, base64 encoder, url encoder, slug generator, find and replace, rot13, text to binary, text compare, text tools online" },
      { property: "og:title", content: "Text Tools — Word Counter, Case Converter & Cleaner" },
      { property: "og:description", content: "Word & character counter, case converters, whitespace cleaner, encoders and more — all in your browser." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://universal-tool.lovable.app/tools/text" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Text Tools — UniversalTools" },
      { name: "twitter:description", content: "Word & character counter, case converters, cleaners and encoders — all in your browser." },
      ...imageMeta(),
    ],
    links: [{ rel: "canonical", href: "https://universal-tool.lovable.app/tools/text" }],
    scripts: toolCategoryJsonLd({
      path: "/tools/text",
      name: "Text Tools",
      description: "Free browser-based text utilities: counters, case converters, cleaners, encoders and comparators.",
      keywords: ["word counter", "character counter", "reading time", "case converter", "remove special characters", "base64 encoder", "slug generator", "find and replace", "text compare"],
      tools: [
        { name: "Word & Character Counter", url: "/tools/text#word-count", description: "Count words, characters, sentences and reading time." },
        { name: "Case Converter", url: "/tools/text#transform", description: "UPPERCASE, lowercase, Title Case, Sentence case, reverse and invert." },
        { name: "Text Cleaner", url: "/tools/text#clean", description: "Remove extra spaces, special characters, numbers and empty lines." },
        { name: "Base64 / URL Encoder", url: "/tools/text#encode", description: "Encode and decode Base64 and URL strings." },
        { name: "Slug Generator", url: "/tools/text#slug", description: "Turn any text into a URL-safe slug." },
        { name: "Find & Replace", url: "/tools/text#find-replace", description: "Bulk replace text with optional regex." },
        { name: "Text Compare", url: "/tools/text#compare", description: "Compare two texts line by line." },
      ],
    }),
  }),
  component: TextTools,
});


function titleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function sentenceCase(s: string) {
  return s.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
}
function safeBtoa(s: string) { try { return btoa(unescape(encodeURIComponent(s))); } catch { return ""; } }
function safeAtob(s: string) { try { return decodeURIComponent(escape(atob(s))); } catch { return "Invalid base64"; } }
function safeUrlDecode(s: string) { try { return decodeURIComponent(s); } catch { return s; } }
function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function Section({ id, title, children }: { id: string; toolId?: string; title: string; children: React.ReactNode }) {
  return (
    <Reveal as="section">
      <section id={id} className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </Reveal>
  );
}

function Btn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className={`rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-400 ${p.className ?? ""}`}>{children}</button>
  );
}

function rot13(s: string) {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}
function textToBinary(s: string) {
  return Array.from(s).map((c) => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
}
function binaryToText(s: string) {
  return s.trim().split(/\s+/).map((b) => String.fromCharCode(parseInt(b, 2))).join("");
}
function lineDiff(a: string, b: string) {
  const A = a.split("\n"), B = b.split("\n");
  const max = Math.max(A.length, B.length);
  const out: { sign: "=" | "-" | "+"; line: string }[] = [];
  for (let i = 0; i < max; i++) {
    if (A[i] === B[i]) out.push({ sign: "=", line: A[i] ?? "" });
    else {
      if (A[i] !== undefined) out.push({ sign: "-", line: A[i] });
      if (B[i] !== undefined) out.push({ sign: "+", line: B[i] });
    }
  }
  return out;
}

function WordFrequency({ text }: { text: string }) {
  const top = useMemo(() => {
    const map = new Map<string, number>();
    text.toLowerCase().split(/[^a-z0-9']+/i).filter(Boolean).forEach((w) => map.set(w, (map.get(w) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [text]);
  if (!top.length) return <p className="text-sm text-slate-500">No words yet.</p>;
  const max = top[0][1];
  return (
    <ul className="space-y-1.5">
      {top.map(([w, n]) => (
        <li key={w} className="flex items-center gap-3 text-sm">
          <span className="w-32 truncate font-mono text-slate-700 dark:text-slate-200">{w}</span>
          <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <span className="absolute inset-y-0 left-0 rounded-full bg-blue-500" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="w-10 text-right text-xs font-semibold text-slate-500">{n}</span>
        </li>
      ))}
    </ul>
  );
}


function TextTools() {
  const [text, setText] = useState("Type or paste text here. The Universal Text Toolkit gives you instant counts, transforms, cleaning utilities, and encoders — all in one place.");
  // find/replace
  const [findStr, setFindStr] = useState("");
  const [replStr, setReplStr] = useState("");
  const [useRe, setUseRe] = useState(false);
  // repeat
  const [repN, setRepN] = useState(3);
  // diff
  const [diffB, setDiffB] = useState("");
  // computing flash (skeleton while results recompute)
  const [computing, setComputing] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => { trackUse("word-count"); }, []);

  // Cancelable: each input change aborts the previous pending compute window.
  // The cleanup clearTimeout + AbortController.abort() pattern ensures stale
  // runs never flip busy back off after a newer run already started.
  // A monotonic cancelToken lets an explicit Cancel button (or unmount) abort
  // the same window without waiting for the next input.
  const cancelTokenRef = useRef(0);
  useEffect(() => {
    const ac = new AbortController();
    const myToken = ++cancelTokenRef.current;
    setComputing(true);
    const t = setTimeout(() => {
      if (ac.signal.aborted || myToken !== cancelTokenRef.current) return;
      setComputing(false);
      setStatus("Results updated");
    }, 200);
    return () => {
      ac.abort();
      clearTimeout(t);
    };
  }, [text, diffB]);

  // Abort any pending compute when the user navigates away from this tool.
  useEffect(() => {
    return () => {
      cancelTokenRef.current++;
    };
  }, []);

  const cancelCompute = () => {
    cancelTokenRef.current++;
    setComputing(false);
    setStatus("Canceled");
    // Restore focus to the editor (the initiating control for text compute).
    requestAnimationFrame(() => document.getElementById("ta")?.focus());
  };



  const stats = useMemo(() => {
    const t = text;
    const words = t.trim() ? t.trim().split(/\s+/).length : 0;
    const chars = t.length;
    const charsNoSpace = t.replace(/\s/g, "").length;
    const sentences = t.split(/[.!?]+\s/).filter(Boolean).length;
    const paragraphs = t.split(/\n\s*\n/).filter((p) => p.trim()).length;
    // Reading time based on ~220 words/min. Show seconds for short text so it
    // updates visibly as the user types.
    const totalSec = Math.round((words / 220) * 60);
    const readTime = totalSec < 60
      ? `${totalSec}s`
      : `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
    return { words, chars, charsNoSpace, sentences, paragraphs, readTime };
  }, [text]);

  const apply = (id: string, fn: (s: string) => string) => {
    setText((t) => fn(t));
    trackUse(id);
    setStatus("Applied");
  };


  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Reveal>
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Text tools</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>The all-in-one text workbench</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Edit once. Count, transform, clean and encode — instantly.</p>
          </header>
        </Reveal>




        <Reveal delay={0.05}>
          <div className="relative">
            <label htmlFor="ta" className="sr-only">Editor</label>
            <textarea
              id="ta"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 pr-24 font-mono text-sm leading-relaxed text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Paste your text…"
            />
            {text && (
              <button
                type="button"
                onClick={() => { setText(""); requestAnimationFrame(() => document.getElementById("ta")?.focus()); }}
                aria-label="Clear text"
                className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-300"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                Clear
              </button>
            )}
          </div>
        </Reveal>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div role="status" aria-live="polite" className="text-xs text-slate-500 dark:text-slate-400">
            {computing ? "Recomputing results…" : status}
          </div>
          {computing && (
            <button
              type="button"
              onClick={cancelCompute}
              aria-label="Cancel current text processing"
              className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
            >
              Cancel
            </button>
          )}
        </div>



        <div className="mt-8 grid gap-6">
          <Section id="word-count" toolId="word-count" title="Counts & reading time">
            <div aria-live="polite" aria-atomic="false">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Words", stats.words],
                  ["Characters", stats.chars],
                  ["No spaces", stats.charsNoSpace],
                  ["Sentences", stats.sentences],
                  ["Paragraphs", stats.paragraphs],
                  ["Read time", stats.readTime],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-blue-50 p-3 text-center dark:bg-blue-950/40">
                    <div className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-300">{v}</div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{k}</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section id="transform" toolId="uppercase" title="Transform">
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => apply("uppercase", (t) => t.toUpperCase())}>UPPERCASE</Btn>
              <Btn onClick={() => apply("lowercase", (t) => t.toLowerCase())}>lowercase</Btn>
              <Btn onClick={() => apply("title-case", titleCase)}>Title Case</Btn>
              <Btn onClick={() => apply("sentence-case", sentenceCase)}>Sentence case</Btn>
              <Btn onClick={() => apply("reverse", (t) => t.split("").reverse().join(""))}>Reverse</Btn>
              <Btn onClick={() => apply("reverse", (t) => t.split("").map((c) => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(""))}>iNVERT cASE</Btn>
            </div>
          </Section>

          <Section id="clean" toolId="trim-spaces" title="Clean">
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => apply("trim-spaces", (t) => t.replace(/[ \t]+/g, " ").replace(/ +\n/g, "\n").trim())}>Remove extra spaces</Btn>
              <Btn onClick={() => apply("remove-special", (t) => t.replace(/[^\w\s]|_/g, ""))}>Remove special chars</Btn>
              <Btn onClick={() => apply("remove-numbers", (t) => t.replace(/\d+/g, ""))}>Remove numbers</Btn>
              <Btn onClick={() => apply("remove-lines", (t) => t.replace(/^\s*$(?:\r\n?|\n)/gm, ""))}>Remove empty lines</Btn>
              <Btn onClick={() => apply("trim-spaces", (t) => t.replace(/\s+/g, ""))}>Strip all whitespace</Btn>
            </div>
          </Section>

          <Section id="encode" toolId="base64-encode" title="Encode / Decode">
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => apply("base64-encode", safeBtoa)}>Base64 encode</Btn>
              <Btn onClick={() => apply("base64-decode", safeAtob)}>Base64 decode</Btn>
              <Btn onClick={() => apply("url-encode", encodeURIComponent)}>URL encode</Btn>
              <Btn onClick={() => apply("url-encode", safeUrlDecode)}>URL decode</Btn>
              <Btn onClick={() => apply("slugify", slugify)}>Slugify</Btn>
              <Btn onClick={() => apply("rot13", rot13)}>ROT13</Btn>
            </div>
          </Section>

          <Section id="find-replace" toolId="find-replace" title="Find & Replace">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input value={findStr} onChange={(e) => setFindStr(e.target.value)} placeholder="Find" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              <input value={replStr} onChange={(e) => setReplStr(e.target.value)} placeholder="Replace with" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <input type="checkbox" checked={useRe} onChange={(e) => setUseRe(e.target.checked)} /> Regex
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn onClick={() => apply("find-replace", (t) => {
                if (!findStr) return t;
                try {
                  const pattern = useRe ? new RegExp(findStr, "g") : new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
                  return t.replace(pattern, replStr);
                } catch { return t; }
              })}>Replace all</Btn>
              <Btn onClick={() => apply("html-strip", (t) => t.replace(/<[^>]*>/g, ""))}>Strip HTML</Btn>
            </div>
          </Section>

          <Section id="repeat" toolId="text-repeat" title="Repeat Text">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-slate-600 dark:text-slate-400">Times <input type="number" min={1} max={1000} value={repN} onChange={(e) => setRepN(Math.max(1, parseInt(e.target.value || "1", 10)))} className="ml-2 w-20 rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950" /></label>
              <Btn onClick={() => apply("text-repeat", (t) => Array(repN).fill(t).join("\n"))}>Repeat</Btn>
            </div>
          </Section>

          <Section id="binary" toolId="binary-convert" title="Text ↔ Binary">
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => apply("binary-convert", textToBinary)}>Text → Binary</Btn>
              <Btn onClick={() => apply("binary-convert", binaryToText)}>Binary → Text</Btn>
            </div>
          </Section>

          <Section id="frequency" toolId="word-frequency" title="Word Frequency">
            <div aria-busy={computing} aria-live="polite">
              {computing ? <SkeletonLines count={5} /> : <WordFrequency text={text} />}
            </div>
          </Section>

          <Section id="diff" toolId="text-diff" title="Compare Two Texts">
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Top text above is "A". Paste "B" below.</p>
            <textarea value={diffB} onChange={(e) => setDiffB(e.target.value)} rows={5} placeholder="Paste second text…" className="w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            {diffB && (
              <div aria-busy={computing} aria-live="polite" className="mt-3">
                {computing ? <SkeletonLines count={6} /> : (
                  <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-950">
                    {lineDiff(text, diffB).map((d, i) => (
                      <div key={i} className={d.sign === "+" ? "text-emerald-600 dark:text-emerald-400" : d.sign === "-" ? "text-rose-600 dark:text-rose-400" : "text-slate-500"}>
                        {d.sign} {d.line}
                      </div>
                    ))}
                  </pre>
                )}
              </div>
            )}
          </Section>

          <Section id="lines" toolId="sort-lines" title="Lines">
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => apply("sort-lines", (t) => t.split("\n").sort((a, b) => a.localeCompare(b)).join("\n"))}>Sort A→Z</Btn>
              <Btn onClick={() => apply("sort-lines", (t) => t.split("\n").sort((a, b) => b.localeCompare(a)).join("\n"))}>Sort Z→A</Btn>
              <Btn onClick={() => apply("dedupe", (t) => Array.from(new Set(t.split("\n"))).join("\n"))}>Deduplicate</Btn>
              <Btn onClick={() => apply("sort-lines", (t) => t.split("\n").reverse().join("\n"))}>Reverse lines</Btn>
            </div>
          </Section>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <CopyButton getText={() => text} label="Copy output" busy={computing} />
            <DownloadButton getText={() => text} filename="text.txt" label="Download .txt" busy={computing} />
            <Btn onClick={() => setText("")}>Clear</Btn>
          </div>
        </div>
      </section>
    </Layout>
  );
}
