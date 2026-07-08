import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { CopyButton, DownloadButton } from "@/components/CopyDownload";
import { trackUse } from "@/lib/usage-tracking";
import { imageMeta } from "@/lib/seo";
import { toolCategoryJsonLd } from "@/lib/tool-seo";

import { md5 } from "js-md5";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  htmlToJsx, htmlToTsx, jsxToTsx, tsxToJsx,
  cssToTailwind, tailwindToCss, KEYCODES, type KeycodeRow,
} from "@/lib/code-converters";
import { formatHtml as formatHtmlLib, lineDiff, type DiffPart } from "@/lib/html-format";

export const Route = createFileRoute("/tools/code")({
  head: () => ({
    meta: [
      { title: "Code Tools — HTML Editor, JSON, JWT, Regex, Hashes, Markdown | UniversalTools" },
      { name: "description", content: "Free in-browser code tools: HTML/CSS/JS live editor, JSON/XML/HTML/SQL formatters, JWT decoder, regex tester, UUID and hash generator (MD5, SHA-1, SHA-256, SHA-512), Markdown to HTML, number base converter, AES phrase encryption and browser feature detector." },
      { name: "keywords", content: "html live editor, json formatter, xml formatter, sql formatter, jwt decoder, regex tester, uuid generator, md5, sha256, sha512, timestamp converter, color converter, html minifier, html formatter, css beautifier, markdown to html, number base converter, binary hex converter, aes encrypt, php formatter, browser feature detection, online code tools" },
      { property: "og:title", content: "Code Tools — JSON, XML, JWT, Regex & More" },
      { property: "og:description", content: "Format JSON/XML/SQL, decode JWTs, test regex, generate UUIDs and hashes — right in the browser." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://universal-tool.lovable.app/tools/code" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Code Tools — UniversalTools" },
      { name: "twitter:description", content: "Format JSON/XML/SQL, decode JWTs, test regex, generate UUIDs and hashes." },
      ...imageMeta(),
    ],
    links: [{ rel: "canonical", href: "https://universal-tool.lovable.app/tools/code" }],
    scripts: toolCategoryJsonLd({
      path: "/tools/code",
      name: "Code Tools",
      description: "Free browser-based developer utilities: formatters, decoders, regex tester and generators.",
      keywords: ["json formatter", "xml formatter", "jwt decoder", "regex tester", "uuid generator", "md5", "sha256", "timestamp converter", "color converter"],
      tools: [
        { name: "JSON Formatter", url: "/tools/code#json", description: "Format, minify and validate JSON." },
        { name: "XML Formatter", url: "/tools/code#xml", description: "Pretty-print and minify XML." },
        { name: "SQL Formatter", url: "/tools/code#sql", description: "Beautify SQL statements." },
        { name: "HTML Minifier", url: "/tools/code#html", description: "Minify HTML markup." },
        { name: "CSS Beautifier", url: "/tools/code#css", description: "Format CSS rules." },
        { name: "JS Beautifier", url: "/tools/code#js", description: "Format and minify JavaScript." },
        { name: "JWT Decoder", url: "/tools/code#jwt", description: "Inspect JWT header and payload." },
        { name: "Regex Tester", url: "/tools/code#regex", description: "Test regular expressions live." },
        { name: "UUID Generator", url: "/tools/code#uuid", description: "Generate v4 UUIDs." },
        { name: "Hash Generator", url: "/tools/code#hash-gen", description: "MD5, SHA-1, SHA-256, SHA-512 hashes." },
        { name: "Timestamp Converter", url: "/tools/code#timestamp", description: "Convert Unix timestamps." },
        { name: "Color Converter", url: "/tools/code#color-convert", description: "HEX ↔ RGB ↔ HSL." },
        { name: "HTML Live Editor", url: "/tools/code#html-editor", description: "Live HTML/CSS/JS sandbox." },
        { name: "Markdown to HTML", url: "/tools/code#markdown", description: "Render Markdown as HTML." },
        { name: "Number Base Converter", url: "/tools/code#number-base", description: "Binary, octal, decimal, hex." },
        { name: "HTML Formatter", url: "/tools/code#html-format", description: "Pretty-print HTML markup." },
        { name: "PHP Formatter", url: "/tools/code#php-format", description: "Re-indent PHP source." },
        { name: "Phrase Encrypt / Decrypt", url: "/tools/code#phrase-crypt", description: "AES-GCM symmetric encryption with a passphrase." },
        { name: "Browser Feature Detection", url: "/tools/code#browser-features", description: "Report which web APIs are supported." },
      ],
    }),
  }),
  component: CodeTools,
});


function Card({ id, toolId, title, desc, children }: { id: string; toolId: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <Reveal as="section">
      <section id={id} className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </Reveal>
  );
}

const ta = "block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const runBtn = "inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700";

function formatXML(xml: string) {
  const PADDING = "  ";
  let pad = 0;
  return xml
    .replace(/(>)(<)(\/*)/g, "$1\n$2$3")
    .split("\n")
    .map((node) => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) indent = 0;
      else if (node.match(/^<\/\w/)) pad = Math.max(pad - 1, 0);
      else if (node.match(/^<\w[^>]*[^/]>.*$/)) indent = 1;
      const out = PADDING.repeat(pad) + node;
      pad += indent;
      return out;
    })
    .join("\n");
}

function formatSQL(sql: string) {
  const kw = ["SELECT", "FROM", "WHERE", "AND", "OR", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "OUTER JOIN", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET", "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM"];
  let s = sql.replace(/\s+/g, " ").trim();
  kw.forEach((k) => {
    s = s.replace(new RegExp(`\\b${k}\\b`, "gi"), `\n${k}`);
  });
  return s.trim();
}

function CodeTools() {
  // Local-first: these tools run entirely in the browser. Execute immediately;
  // any async work is fire-and-forget so a network hiccup can never swallow
  // the user's action.
  const run = (_id: string, fn: () => unknown | Promise<unknown>) => {
    try { void Promise.resolve(fn()).catch(() => {}); } catch { /* noop */ }
  };
  const banner: React.ReactNode = null;


  // JSON format
  const [jsonIn, setJsonIn] = useState('{"hello":"world","items":[1,2,3]}');
  const [jsonOut, setJsonOut] = useState("");
  const jsonFmt = () => run("json-format", () => {
    try { setJsonOut(JSON.stringify(JSON.parse(jsonIn), null, 2)); trackUse("json-format"); }
    catch (e) { setJsonOut(`/* Invalid JSON: ${(e as Error).message} */`); }
  });
  const jsonMin = () => run("json-minify", () => {
    try { setJsonOut(JSON.stringify(JSON.parse(jsonIn))); trackUse("json-minify"); }
    catch (e) { setJsonOut(`/* Invalid JSON: ${(e as Error).message} */`); }
  });

  // XML
  const [xmlIn, setXmlIn] = useState('<root><item id="1">A</item><item id="2">B</item></root>');
  const [xmlOut, setXmlOut] = useState("");

  // HTML / CSS / JS minify
  const [minIn, setMinIn] = useState("/* paste HTML, CSS or JS */\n.box { color: red;  padding: 10px; }\n");
  const [minOut, setMinOut] = useState("");

  // SQL
  const [sqlIn, setSqlIn] = useState("select id, name from users where active = 1 order by name");
  const [sqlOut, setSqlOut] = useState("");

  // JWT
  const [jwt, setJwt] = useState("");
  const jwtOut = useMemo(() => {
    if (!jwt.trim()) return "";
    const parts = jwt.split(".");
    if (parts.length < 2) return "Invalid JWT (expected 3 parts)";
    try {
      const dec = (s: string) => JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/")));
      return JSON.stringify({ header: dec(parts[0]), payload: dec(parts[1]) }, null, 2);
    } catch (e) {
      return `Decode error: ${(e as Error).message}`;
    }
  }, [jwt]);

  // Regex
  const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
  const [flags, setFlags] = useState("g");
  const [regexInput, setRegexInput] = useState("Contact us at hi@example.com or sales@acme.io for help.");
  const regexResult = useMemo(() => {
    try {
      const re = new RegExp(pattern, flags);
      const matches = regexInput.match(re) || [];
      return matches.length ? `Found ${matches.length} match(es):\n${matches.join("\n")}` : "No matches.";
    } catch (e) {
      return `Invalid regex: ${(e as Error).message}`;
    }
  }, [pattern, flags, regexInput]);

  // UUID
  const [uuids, setUuids] = useState<string[]>([]);
  const [uuidCount, setUuidCount] = useState(5);
  const genUuids = () => run("uuid-gen", () => {
    const out: string[] = [];
    for (let i = 0; i < uuidCount; i++) out.push(crypto.randomUUID());
    setUuids(out);
    trackUse("uuid-gen");
  });

  // Hash
  const [hashIn, setHashIn] = useState("hello world");
  const [hashAlgo, setHashAlgo] = useState<"MD5" | "SHA-1" | "SHA-256" | "SHA-512">("SHA-256");
  const [hashOut, setHashOut] = useState("");
  const doHash = () => run("hash-gen", async () => {
    if (hashAlgo === "MD5") {
      setHashOut(md5(hashIn));
    } else {
      const buf = new TextEncoder().encode(hashIn);
      const digest = await crypto.subtle.digest(hashAlgo, buf);
      setHashOut(Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join(""));
    }
    trackUse("hash-gen");
  });

  // Timestamp
  const [ts, setTs] = useState(Math.floor(Date.now() / 1000).toString());
  const [dt, setDt] = useState(new Date().toISOString().slice(0, 19));
  const tsToDate = () => run("timestamp", () => { setDt(new Date(parseInt(ts) * 1000).toISOString().slice(0, 19)); trackUse("timestamp"); });
  const dateToTs = () => run("timestamp", () => { setTs(Math.floor(new Date(dt).getTime() / 1000).toString()); trackUse("timestamp"); });

  // Color
  const [hex, setHex] = useState("#2563eb");
  const [rgb, setRgb] = useState("rgb(37, 99, 235)");
  const hexToRgb = () => run("color-convert", () => {
    const m = hex.replace("#", "").match(/.{1,2}/g);
    if (!m || m.length < 3) return;
    setRgb(`rgb(${parseInt(m[0], 16)}, ${parseInt(m[1], 16)}, ${parseInt(m[2], 16)})`);
    trackUse("color-convert");
  });
  const rgbToHex = () => run("color-convert", () => {
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return;
    setHex("#" + m.slice(0, 3).map((x) => parseInt(x).toString(16).padStart(2, "0")).join(""));
    trackUse("color-convert");
  });

  // Lorem
  const [paras, setParas] = useState(3);
  const [lorem, setLorem] = useState("");
  const genLorem = () => run("lorem-ipsum", () => {
    const base = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
    setLorem(Array.from({ length: paras }, () => base).join("\n\n"));
    trackUse("lorem-ipsum");
  });

  // HTML live editor
  const [htmlEd, setHtmlEd] = useState("<h1>Hello</h1>\n<p>Edit me!</p>");
  const [cssEd, setCssEd] = useState("h1 { color: #2563eb; font-family: system-ui; }");
  const [jsEd, setJsEd] = useState("console.log('hi from sandbox');");
  const previewSrc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><style>${cssEd}</style></head><body>${htmlEd}<script>try{${jsEd}}catch(e){document.body.insertAdjacentHTML('beforeend','<pre style=\\'color:red\\'>'+e+'</pre>')}<\/script></body></html>`,
    [htmlEd, cssEd, jsEd],
  );

  // Markdown
  const [mdIn, setMdIn] = useState("# Hello\n\nThis is **markdown** with a [link](https://example.com).");
  const mdOut = useMemo(() => {
    try {
      const raw = marked.parse(mdIn, { async: false }) as string;
      // Sanitize to prevent XSS from untrusted Markdown (raw HTML, event handlers, scripts).
      return typeof window !== "undefined" ? DOMPurify.sanitize(raw) : raw;
    } catch (e) { return `<!-- ${(e as Error).message} -->`; }
  }, [mdIn]);

  // Number base
  const [numVal, setNumVal] = useState("255");
  const [numBase, setNumBase] = useState<2 | 8 | 10 | 16>(10);
  const numOut = useMemo(() => {
    try {
      const n = parseInt(numVal, numBase);
      if (isNaN(n)) return { bin: "—", oct: "—", dec: "—", hex: "—" };
      return { bin: n.toString(2), oct: n.toString(8), dec: n.toString(10), hex: n.toString(16).toUpperCase() };
    } catch { return { bin: "—", oct: "—", dec: "—", hex: "—" }; }
  }, [numVal, numBase]);

  // PHP formatter (basic)
  const [phpIn, setPhpIn] = useState("<?php function hi($n){echo 'Hello '.$n;} hi('world');");
  const [phpOut, setPhpOut] = useState("");
  const formatPhp = () => run("php-format", () => {
    let d = 0;
    const out = phpIn
      .replace(/\s*([{};])\s*/g, "$1\n")
      .split("\n")
      .map((line) => {
        const t = line.trim();
        if (!t) return "";
        if (t.startsWith("}")) d = Math.max(d - 1, 0);
        const s = "  ".repeat(d) + t;
        if (t.endsWith("{")) d += 1;
        return s;
      })
      .filter(Boolean)
      .join("\n");
    setPhpOut(out);
    trackUse("php-format");
  });

  // HTML formatter (pretty-print) — uses shared html-format lib for browser-accurate whitespace + validation.
  const [htmlFmtIn, setHtmlFmtIn] = useState("<div><h1>Title</h1><p>Hello <strong>world</strong></p></div>");
  const [htmlFmtOut, setHtmlFmtOut] = useState("");
  const [htmlFmtWarnings, setHtmlFmtWarnings] = useState<{ kind: string; message: string }[]>([]);
  const [htmlFmtDiff, setHtmlFmtDiff] = useState<ReturnType<typeof lineDiff> | null>(null);
  const [htmlFmtDiffSkipped, setHtmlFmtDiffSkipped] = useState(false);
  const [htmlFmtDiffPage, setHtmlFmtDiffPage] = useState(1);
  const [htmlFmtBusy, setHtmlFmtBusy] = useState(false);
  const htmlFmtRunId = useRef(0);
  const htmlFmtTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cap the diff computation for very large inputs to keep the UI responsive.
  // The full formatted output is still available via Copy/Download.
  const DIFF_MAX_CHARS = 50_000;
  const DIFF_PAGE_SIZE = 500; // lines per page
  const runFormatHtml = useCallback((source: string) => {
    const myId = ++htmlFmtRunId.current;
    setHtmlFmtBusy(true);
    // Yield to the browser so the spinner paints before we block on large inputs.
    setTimeout(() => {
      const { output, warnings } = formatHtmlLib(source);
      if (myId !== htmlFmtRunId.current) return; // stale
      setHtmlFmtOut(output);
      setHtmlFmtWarnings(warnings);
      const tooBig = source.length > DIFF_MAX_CHARS || output.length > DIFF_MAX_CHARS;
      setHtmlFmtDiffSkipped(tooBig);
      setHtmlFmtDiff(tooBig ? null : lineDiff(source, output));
      setHtmlFmtDiffPage(1);
      setHtmlFmtBusy(false);
      trackUse("html-format");
    }, 0);
  }, []);
  // Debounce auto-format on input change (200ms for small, 500ms for large).
  useEffect(() => {
    if (htmlFmtTimer.current) clearTimeout(htmlFmtTimer.current);
    const delay = htmlFmtIn.length > 20000 ? 500 : 200;
    htmlFmtTimer.current = setTimeout(() => runFormatHtml(htmlFmtIn), delay);
    return () => {
      if (htmlFmtTimer.current) clearTimeout(htmlFmtTimer.current);
    };
  }, [htmlFmtIn, runFormatHtml]);




  // Phrase encrypt/decrypt (AES-GCM)
  const [phraseText, setPhraseText] = useState("A secret message.");
  const [phrasePass, setPhrasePass] = useState("");
  const [phraseOut, setPhraseOut] = useState("");
  const [phraseErr, setPhraseErr] = useState("");
  const b64ToBuf = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const bufToB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const deriveKey = async (pass: string, salt: Uint8Array) => {
    const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass) as BufferSource, "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt as BufferSource, iterations: 100_000, hash: "SHA-256" },
      km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
    );
  };
  const doEncrypt = () => {
    setPhraseErr("");
    if (!phrasePass) { setPhraseErr("Passphrase required."); return; }
    run("phrase-crypt", async () => {
      try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(phrasePass, salt);
        const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(phraseText) as BufferSource);
        const pack = new Uint8Array(salt.length + iv.length + ct.byteLength);
        pack.set(salt, 0); pack.set(iv, salt.length); pack.set(new Uint8Array(ct), salt.length + iv.length);
        setPhraseOut(bufToB64(pack.buffer as ArrayBuffer));
        trackUse("phrase-crypt");
      } catch (e) { setPhraseErr((e as Error).message); throw e; }
    });
  };
  const doDecrypt = () => {
    setPhraseErr("");
    if (!phrasePass) { setPhraseErr("Passphrase required."); return; }
    run("phrase-crypt", async () => {
      try {
        const pack = b64ToBuf(phraseText.trim());
        const salt = pack.slice(0, 16);
        const iv = pack.slice(16, 28);
        const ct = pack.slice(28);
        const key = await deriveKey(phrasePass, salt);
        const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ct as BufferSource);
        setPhraseOut(new TextDecoder().decode(pt));
        trackUse("phrase-crypt");
      } catch (e) { setPhraseErr("Decryption failed — wrong passphrase or corrupt input."); throw e; }
    });
  };

  // Browser features — detect only after mount to avoid SSR/client hydration mismatch.
  const [features, setFeatures] = useState<{ name: string; ok: boolean }[]>([]);
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const n = navigator as unknown as Record<string, unknown>;
    setFeatures([
      { name: "Clipboard API", ok: !!navigator.clipboard },
      { name: "Service Worker", ok: "serviceWorker" in navigator },
      { name: "WebGL", ok: !!document.createElement("canvas").getContext("webgl") },
      { name: "WebGPU", ok: "gpu" in navigator },
      { name: "IndexedDB", ok: "indexedDB" in w },
      { name: "Web Crypto (Subtle)", ok: !!(w.crypto && (w.crypto as { subtle?: unknown }).subtle) },
      { name: "WebRTC", ok: "RTCPeerConnection" in w },
      { name: "Geolocation", ok: "geolocation" in navigator },
      { name: "Notifications", ok: "Notification" in w },
      { name: "WebSocket", ok: "WebSocket" in w },
      { name: "Intersection Observer", ok: "IntersectionObserver" in w },
      { name: "ResizeObserver", ok: "ResizeObserver" in w },
      { name: "Web Share", ok: "share" in navigator },
      { name: "File System Access", ok: "showOpenFilePicker" in w },
      { name: "Payment Request", ok: "PaymentRequest" in w },
      { name: "Bluetooth", ok: "bluetooth" in n },
      { name: "USB", ok: "usb" in n },
      { name: "Speech Synthesis", ok: "speechSynthesis" in w },
    ]);
  }, []);


  // Converters
  const [htmlSrc, setHtmlSrc] = useState('<div class="card" style="color:red;padding:10px" tabindex="0">\n  <input type="text" readonly>\n  <br>\n  <label for="n">Hi</label>\n</div>');
  const htmlToJsxOut = useMemo(() => { try { return htmlToJsx(htmlSrc); } catch (e) { return `/* ${(e as Error).message} */`; } }, [htmlSrc]);
  const htmlToTsxOut = useMemo(() => { try { return htmlToTsx(htmlSrc, "Converted"); } catch (e) { return `/* ${(e as Error).message} */`; } }, [htmlSrc]);

  const [jsxSrc, setJsxSrc] = useState('const App = () => {\n  return <button onClick={() => alert("hi")}>Click</button>;\n};');
  const jsxToTsxOut = useMemo(() => { try { return jsxToTsx(jsxSrc, "App"); } catch (e) { return `/* ${(e as Error).message} */`; } }, [jsxSrc]);

  const [tsxSrc, setTsxSrc] = useState('import type { FC } from "react";\n\ninterface Props { name: string }\nconst App: FC<Props> = ({ name }: Props) => {\n  const n: number = 1 as number;\n  return <div>{name} {n}</div>;\n};\nexport default App;');
  const tsxToJsxOut = useMemo(() => { try { return tsxToJsx(tsxSrc); } catch (e) { return `/* ${(e as Error).message} */`; } }, [tsxSrc]);

  const [cssSrc, setCssSrc] = useState('.card {\n  display: flex;\n  padding: 16px;\n  background-color: #2563eb;\n  color: #fff;\n  border-radius: 12px;\n  font-weight: bold;\n}');
  const cssToTwOut = useMemo(() => { try { return cssToTailwind(cssSrc); } catch (e) { return `/* ${(e as Error).message} */`; } }, [cssSrc]);

  const [twSrc, setTwSrc] = useState('flex items-center justify-between p-4 bg-[#2563eb] text-[#fff] rounded-lg font-bold shadow');
  const twToCssOut = useMemo(() => { try { return tailwindToCss(twSrc); } catch (e) { return `/* ${(e as Error).message} */`; } }, [twSrc]);

  // Keycode live capture
  const [lastKey, setLastKey] = useState<KeycodeRow | null>(null);
  const [kcFilter, setKcFilter] = useState("");
  const kcRows = useMemo(() => {
    const q = kcFilter.trim().toLowerCase();
    if (!q) return KEYCODES;
    return KEYCODES.filter((r) =>
      r.key.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      String(r.keyCode).includes(q),
    );
  }, [kcFilter]);

  useEffect(() => { /* land */ }, []);

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Reveal>
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Code tools</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Format, decode and generate</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">20+ developer utilities — HTML editor, JSON, XML, JWT, regex, hashes, AES phrase crypto, base converter and more.</p>
          </header>
        </Reveal>

        {banner}

        <div className="grid gap-5 lg:grid-cols-2">
          <Card id="json-format" toolId="json-format" title="JSON Formatter" desc="Beautify or minify JSON.">
            <textarea value={jsonIn} onChange={(e) => setJsonIn(e.target.value)} rows={5} className={ta} aria-label="JSON input" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={jsonFmt} className={runBtn}>Beautify</button>
              <button onClick={jsonMin} className={runBtn}>Minify</button>
              <CopyButton getText={() => jsonOut} />
              <DownloadButton getText={() => jsonOut} filename="formatted.json" type="application/json" />
            </div>
            {jsonOut && <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{jsonOut}</pre>}
          </Card>

          <Card id="xml-format" toolId="xml-format" title="XML Formatter" desc="Pretty-print XML or RSS.">
            <textarea value={xmlIn} onChange={(e) => setXmlIn(e.target.value)} rows={5} className={ta} aria-label="XML input" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => run("xml-format", () => { setXmlOut(formatXML(xmlIn)); trackUse("xml-format"); })} className={runBtn}>Format</button>
              <CopyButton getText={() => xmlOut} />
              <DownloadButton getText={() => xmlOut} filename="formatted.xml" type="application/xml" />
            </div>
            {xmlOut && <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{xmlOut}</pre>}
          </Card>

          <Card id="html-minify" toolId="html-minify" title="HTML / CSS / JS Minifier" desc="Strip whitespace and comments.">
            <textarea value={minIn} onChange={(e) => setMinIn(e.target.value)} rows={5} className={ta} aria-label="Code input" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => run("html-minify", () => { setMinOut(minIn.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim()); trackUse("html-minify"); })} className={runBtn}>HTML</button>
              <button onClick={() => run("css-minify", () => { setMinOut(minIn.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*([{}:;,])\s*/g, "$1").replace(/;}/g, "}").trim()); trackUse("css-minify"); })} className={runBtn}>CSS</button>
              <button onClick={() => run("js-minify", () => { setMinOut(minIn.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/\s{2,}/g, " ").trim()); trackUse("js-minify"); })} className={runBtn}>JS</button>
              <CopyButton getText={() => minOut} />
              <DownloadButton getText={() => minOut} filename="minified.txt" />
            </div>
            {minOut && <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{minOut}</pre>}
          </Card>

          <Card id="sql-format" toolId="sql-format" title="SQL Formatter" desc="Pretty-print SQL queries.">
            <textarea value={sqlIn} onChange={(e) => setSqlIn(e.target.value)} rows={5} className={ta} aria-label="SQL input" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => run("sql-format", () => { setSqlOut(formatSQL(sqlIn)); trackUse("sql-format"); })} className={runBtn}>Format</button>
              <CopyButton getText={() => sqlOut} />
              <DownloadButton getText={() => sqlOut} filename="query.sql" />
            </div>
            {sqlOut && <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{sqlOut}</pre>}
          </Card>

          <Card id="jwt-decode" toolId="jwt-decode" title="JWT Decoder" desc="Inspect the header and payload of a JSON Web Token.">
            <textarea value={jwt} onChange={(e) => { setJwt(e.target.value); if (e.target.value.length > 10) trackUse("jwt-decode"); }} rows={3} placeholder="eyJhbGciOi..." className={ta} aria-label="JWT" />
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyButton getText={() => jwtOut} label="Copy decoded" />
            </div>
            {jwtOut && <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{jwtOut}</pre>}
          </Card>

          <Card id="regex-test" toolId="regex-test" title="Regex Tester" desc="Live test a regular expression.">
            <div className="flex gap-2">
              <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="pattern" aria-label="pattern" className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              <input value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="g" aria-label="flags" className="w-16 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </div>
            <textarea value={regexInput} onChange={(e) => { setRegexInput(e.target.value); trackUse("regex-test"); }} rows={3} className={`${ta} mt-2`} aria-label="Regex input" />
            <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{regexResult}</pre>
            <div className="mt-2"><CopyButton getText={() => regexResult} /></div>
          </Card>

          <Card id="uuid-gen" toolId="uuid-gen" title="UUID Generator" desc="Random v4 identifiers.">
            <div className="flex items-center gap-2">
              <label className="text-sm">Count <input type="number" min={1} max={100} value={uuidCount} onChange={(e) => setUuidCount(+e.target.value)} className="ml-1 w-20 rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
              <button onClick={genUuids} className={runBtn}>Generate</button>
              <CopyButton getText={() => uuids.join("\n")} />
              <DownloadButton getText={() => uuids.join("\n")} filename="uuids.txt" />
            </div>
            {uuids.length > 0 && <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{uuids.join("\n")}</pre>}
          </Card>

          <Card id="hash-gen" toolId="hash-gen" title="Hash Generator" desc="MD5, SHA-1, SHA-256, SHA-512 digests.">
            <textarea value={hashIn} onChange={(e) => setHashIn(e.target.value)} rows={3} className={ta} aria-label="hash input" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select value={hashAlgo} onChange={(e) => setHashAlgo(e.target.value as typeof hashAlgo)} aria-label="Hash algorithm" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option>MD5</option><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option>
              </select>
              <button onClick={doHash} className={runBtn}>Hash</button>
              <CopyButton getText={() => hashOut} />
            </div>
            {hashOut && <pre className="mt-3 break-all rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{hashOut}</pre>}
          </Card>

          <Card id="timestamp" toolId="timestamp" title="Timestamp Converter" desc="Unix epoch ↔ ISO date.">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-500">Unix (sec)</label>
                <input value={ts} onChange={(e) => setTs(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="unix timestamp" />
                <button onClick={tsToDate} className={`${runBtn} mt-2`}>→ Date</button>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Date (ISO)</label>
                <input value={dt} onChange={(e) => setDt(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="iso date" />
                <button onClick={dateToTs} className={`${runBtn} mt-2`}>→ Unix</button>
              </div>
            </div>
            <div className="mt-2"><CopyButton getText={() => `${ts}  ${dt}`} /></div>
          </Card>

          <Card id="color-convert" toolId="color-convert" title="HEX ↔ RGB" desc="Convert color formats.">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#2563eb" aria-label="hex" className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              <input value={rgb} onChange={(e) => setRgb(e.target.value)} placeholder="rgb(37,99,235)" aria-label="rgb" className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              <span className="grid place-items-center rounded-lg border border-slate-200 dark:border-slate-700" style={{ background: hex }} aria-label="color preview">&nbsp;&nbsp;&nbsp;&nbsp;</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={hexToRgb} className={runBtn}>HEX → RGB</button>
              <button onClick={rgbToHex} className={runBtn}>RGB → HEX</button>
              <CopyButton getText={() => `${hex}  ${rgb}`} />
            </div>
          </Card>

          <Card id="lorem-ipsum" toolId="lorem-ipsum" title="Lorem Ipsum" desc="Generate placeholder paragraphs.">
            <div className="flex items-center gap-2">
              <label className="text-sm">Paragraphs <input type="number" min={1} max={20} value={paras} onChange={(e) => setParas(+e.target.value)} className="ml-1 w-20 rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
              <button onClick={genLorem} className={runBtn}>Generate</button>
              <CopyButton getText={() => lorem} />
              <DownloadButton getText={() => lorem} filename="lorem.txt" />
            </div>
            {lorem && <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-200">{lorem}</pre>}
          </Card>

          <Card id="html-editor" toolId="html-editor" title="HTML Live Editor" desc="Edit HTML, CSS and JS with a sandboxed live preview.">
            <div className="grid gap-2 sm:grid-cols-3">
              <div><label className="text-xs font-medium text-slate-500">HTML</label><textarea value={htmlEd} onChange={(e) => { setHtmlEd(e.target.value); trackUse("html-editor"); }} rows={6} className={`${ta} mt-1`} aria-label="HTML" /></div>
              <div><label className="text-xs font-medium text-slate-500">CSS</label><textarea value={cssEd} onChange={(e) => setCssEd(e.target.value)} rows={6} className={`${ta} mt-1`} aria-label="CSS" /></div>
              <div><label className="text-xs font-medium text-slate-500">JS</label><textarea value={jsEd} onChange={(e) => setJsEd(e.target.value)} rows={6} className={`${ta} mt-1`} aria-label="JavaScript" /></div>
            </div>
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <iframe title="HTML preview" sandbox="allow-scripts" srcDoc={previewSrc} className="h-64 w-full bg-white" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyButton getText={() => previewSrc} label="Copy document" />
              <DownloadButton getText={() => previewSrc} filename="playground.html" type="text/html" />
            </div>
          </Card>

          <Card id="markdown" toolId="markdown-html" title="Markdown to HTML" desc="Convert Markdown to HTML on the fly.">
            <textarea value={mdIn} onChange={(e) => { setMdIn(e.target.value); trackUse("markdown-html"); }} rows={6} className={ta} aria-label="Markdown input" />
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyButton getText={() => mdOut} label="Copy HTML" />
              <DownloadButton getText={() => mdOut} filename="output.html" type="text/html" />
            </div>
            {mdOut && (
              <>
                <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{mdOut}</pre>
                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: mdOut }} />
              </>
            )}
          </Card>

          <Card id="number-base" toolId="number-base" title="Number Base Converter" desc="Binary, octal, decimal and hexadecimal — all directions.">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm">Input base
                <select value={numBase} onChange={(e) => { setNumBase(Number(e.target.value) as 2 | 8 | 10 | 16); trackUse("number-base"); }} aria-label="Input base" className="ml-2 rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value={2}>Binary</option><option value={8}>Octal</option><option value={10}>Decimal</option><option value={16}>Hex</option>
                </select>
              </label>
              <input value={numVal} onChange={(e) => setNumVal(e.target.value)} aria-label="Number value" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-slate-500">Binary</dt><dd className="break-all font-mono">{numOut.bin}</dd></div>
              <div><dt className="text-xs text-slate-500">Octal</dt><dd className="break-all font-mono">{numOut.oct}</dd></div>
              <div><dt className="text-xs text-slate-500">Decimal</dt><dd className="break-all font-mono">{numOut.dec}</dd></div>
              <div><dt className="text-xs text-slate-500">Hex</dt><dd className="break-all font-mono">{numOut.hex}</dd></div>
            </dl>
            <div className="mt-2"><CopyButton getText={() => `bin: ${numOut.bin}\noct: ${numOut.oct}\ndec: ${numOut.dec}\nhex: ${numOut.hex}`} /></div>
          </Card>

          <Card id="html-format" toolId="html-format" title="HTML Formatter" desc="Pretty-print HTML with browser-accurate whitespace, validation warnings, and a side-by-side diff.">
            <textarea value={htmlFmtIn} onChange={(e) => setHtmlFmtIn(e.target.value)} rows={5} className={ta} aria-label="HTML input" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button onClick={() => run("html-format", () => runFormatHtml(htmlFmtIn))} className={runBtn} aria-busy={htmlFmtBusy} disabled={htmlFmtBusy}>Format</button>
              <CopyButton getText={() => htmlFmtOut} />
              <DownloadButton getText={() => htmlFmtOut} filename="formatted.html" type="text/html" />
              {htmlFmtBusy && (
                <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-700 dark:border-t-slate-200" />
                  Formatting {htmlFmtIn.length.toLocaleString()} chars…
                </span>
              )}
            </div>
            {htmlFmtWarnings.length > 0 && (
              <ul
                role="status"
                aria-live="polite"
                className="mt-3 space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {htmlFmtWarnings.map((w, idx) => (
                  <li key={idx}><span className="font-semibold uppercase tracking-wide">{w.kind}:</span> {w.message}</li>
                ))}
              </ul>
            )}
            {htmlFmtOut && htmlFmtDiffSkipped && (
              <p role="status" aria-live="polite" className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Diff preview hidden for large inputs (over {DIFF_MAX_CHARS.toLocaleString()} characters). The full formatted HTML is available via Copy and Download above.
              </p>
            )}
            {htmlFmtOut && htmlFmtDiff && (() => {
              const totalLeft = htmlFmtDiff.left.length;
              const totalRight = htmlFmtDiff.right.length;
              const shown = htmlFmtDiffPage * DIFF_PAGE_SIZE;
              const leftSlice = htmlFmtDiff.left.slice(0, shown);
              const rightSlice = htmlFmtDiff.right.slice(0, shown);
              const hasMore = shown < Math.max(totalLeft, totalRight);
              return (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-medium text-slate-500">Original</div>
                      <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100" aria-label="Original HTML with removed lines highlighted">
                        {leftSlice.map((p: DiffPart, i: number) => (
                          <div key={i} className={p.kind === "del" ? "bg-red-500/25 text-red-100" : ""}>
                            <span className="mr-2 select-none text-slate-500">{p.kind === "del" ? "-" : " "}</span>{p.value || "\u00A0"}
                          </div>
                        ))}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium text-slate-500">Formatted</div>
                      <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100" aria-label="Formatted HTML with added lines highlighted">
                        {rightSlice.map((p: DiffPart, i: number) => (
                          <div key={i} className={p.kind === "add" ? "bg-emerald-500/25 text-emerald-100" : ""}>
                            <span className="mr-2 select-none text-slate-500">{p.kind === "add" ? "+" : " "}</span>{p.value || "\u00A0"}
                          </div>
                        ))}
                      </pre>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500" aria-live="polite">
                    <span>Showing {Math.min(shown, totalLeft).toLocaleString()} / {totalLeft.toLocaleString()} original · {Math.min(shown, totalRight).toLocaleString()} / {totalRight.toLocaleString()} formatted lines</span>
                    {hasMore && (
                      <button onClick={() => setHtmlFmtDiffPage((p) => p + 1)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        Show more
                      </button>
                    )}
                    {shown > DIFF_PAGE_SIZE && (
                      <button onClick={() => setHtmlFmtDiffPage(1)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        Collapse
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </Card>


          <Card id="php-format" toolId="php-format" title="PHP Formatter" desc="Basic PHP re-indentation.">
            <textarea value={phpIn} onChange={(e) => setPhpIn(e.target.value)} rows={5} className={ta} aria-label="PHP input" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={formatPhp} className={runBtn}>Format</button>
              <CopyButton getText={() => phpOut} />
              <DownloadButton getText={() => phpOut} filename="formatted.php" />
            </div>
            {phpOut && <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{phpOut}</pre>}
          </Card>

          <Card id="phrase-crypt" toolId="phrase-crypt" title="Phrase Encrypt / Decrypt" desc="AES-GCM 256 with PBKDF2 passphrase (100k iterations). Runs locally.">
            <textarea value={phraseText} onChange={(e) => setPhraseText(e.target.value)} rows={4} className={ta} aria-label="Text or ciphertext" placeholder="Plain text to encrypt, or ciphertext to decrypt" />
            <input type="password" value={phrasePass} onChange={(e) => setPhrasePass(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Passphrase" placeholder="Passphrase" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={doEncrypt} className={runBtn}>Encrypt</button>
              <button onClick={doDecrypt} className={runBtn}>Decrypt</button>
              <CopyButton getText={() => phraseOut} />
            </div>
            {phraseErr && <p role="alert" className="mt-2 text-xs text-red-600">{phraseErr}</p>}
            {phraseOut && <pre className="mt-3 max-h-40 overflow-auto break-all rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{phraseOut}</pre>}
          </Card>

          <Card id="browser-features" toolId="browser-features" title="Browser Feature Detection" desc="Which modern web APIs your browser supports.">
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3">
              {features.map((f) => (
                <li key={f.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
                  <span className="text-slate-700 dark:text-slate-200">{f.name}</span>
                  <span aria-label={f.ok ? "supported" : "not supported"} className={f.ok ? "text-green-600" : "text-slate-400"}>{f.ok ? "✓" : "✗"}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2"><CopyButton getText={() => features.map((f) => `${f.ok ? "✓" : "✗"} ${f.name}`).join("\n")} label="Copy report" /></div>
          </Card>

          <Card id="html-to-jsx" toolId="html-to-jsx" title="HTML to JSX Converter" desc="Rewrites class→className, inline styles to objects, and self-closes void tags.">
            <textarea value={htmlSrc} onChange={(e) => { setHtmlSrc(e.target.value); trackUse("html-to-jsx"); }} rows={6} className={ta} aria-label="HTML source" />
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyButton getText={() => htmlToJsxOut} label="Copy JSX" />
              <DownloadButton getText={() => htmlToJsxOut} filename="component.jsx" />
            </div>
            <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{htmlToJsxOut}</pre>
          </Card>

          <Card id="html-to-tsx" toolId="html-to-tsx" title="HTML to TSX Converter" desc="Wraps converted JSX in a typed React function component.">
            <textarea value={htmlSrc} onChange={(e) => { setHtmlSrc(e.target.value); trackUse("html-to-tsx"); }} rows={6} className={ta} aria-label="HTML source (shared)" />
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyButton getText={() => htmlToTsxOut} label="Copy TSX" />
              <DownloadButton getText={() => htmlToTsxOut} filename="Component.tsx" />
            </div>
            <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{htmlToTsxOut}</pre>
          </Card>

          <Card id="jsx-to-tsx" toolId="jsx-to-tsx" title="JSX to TSX Converter" desc="Adds an FC-typed signature and a React type import.">
            <textarea value={jsxSrc} onChange={(e) => { setJsxSrc(e.target.value); trackUse("jsx-to-tsx"); }} rows={6} className={ta} aria-label="JSX source" />
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyButton getText={() => jsxToTsxOut} label="Copy TSX" />
              <DownloadButton getText={() => jsxToTsxOut} filename="Component.tsx" />
            </div>
            <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{jsxToTsxOut}</pre>
          </Card>

          <Card id="tsx-to-jsx" toolId="tsx-to-jsx" title="TSX to JSX Converter" desc="Strips TypeScript annotations, generics, casts and type imports (best-effort).">
            <textarea value={tsxSrc} onChange={(e) => { setTsxSrc(e.target.value); trackUse("tsx-to-jsx"); }} rows={6} className={ta} aria-label="TSX source" />
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyButton getText={() => tsxToJsxOut} label="Copy JSX" />
              <DownloadButton getText={() => tsxToJsxOut} filename="Component.jsx" />
            </div>
            <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{tsxToJsxOut}</pre>
          </Card>

          <Card id="css-to-tailwind" toolId="css-to-tailwind" title="CSS to Tailwind Converter" desc="Maps plain CSS declarations to Tailwind utility classes. Uses arbitrary values where needed.">
            <textarea value={cssSrc} onChange={(e) => { setCssSrc(e.target.value); trackUse("css-to-tailwind"); }} rows={6} className={ta} aria-label="CSS source" />
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyButton getText={() => cssToTwOut} label="Copy classes" />
              <DownloadButton getText={() => cssToTwOut} filename="tailwind.txt" />
            </div>
            <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{cssToTwOut}</pre>
          </Card>

          <Card id="tailwind-to-css" toolId="tailwind-to-css" title="Tailwind to CSS Converter" desc="Expand Tailwind utility classes into a CSS rule block.">
            <textarea value={twSrc} onChange={(e) => { setTwSrc(e.target.value); trackUse("tailwind-to-css"); }} rows={4} className={ta} aria-label="Tailwind classes" />
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyButton getText={() => twToCssOut} label="Copy CSS" />
              <DownloadButton getText={() => twToCssOut} filename="styles.css" type="text/css" />
            </div>
            <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{twToCssOut}</pre>
          </Card>

          <Card id="js-keycodes" toolId="js-keycodes" title="JavaScript Keycode Table" desc="Reference for event.key, event.code, keyCode and which. Focus the box and press any key.">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                onKeyDown={(e) => {
                  e.preventDefault();
                  setLastKey({ key: e.key, code: e.code, keyCode: e.keyCode, which: e.which, description: "Live capture" });
                  trackUse("js-keycodes");
                }}
                placeholder="Focus me and press any key…"
                aria-label="Keycode capture input"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                value={kcFilter}
                onChange={(e) => setKcFilter(e.target.value)}
                placeholder="Filter table (key, code, number)…"
                aria-label="Filter keycodes"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            {lastKey && (
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs dark:border-blue-900 dark:bg-blue-950/40 sm:grid-cols-4" role="status" aria-live="polite">
                <div><dt className="font-semibold text-slate-500">event.key</dt><dd className="font-mono">{lastKey.key === " " ? "Space" : lastKey.key}</dd></div>
                <div><dt className="font-semibold text-slate-500">event.code</dt><dd className="font-mono">{lastKey.code}</dd></div>
                <div><dt className="font-semibold text-slate-500">keyCode</dt><dd className="font-mono">{lastKey.keyCode}</dd></div>
                <div><dt className="font-semibold text-slate-500">which</dt><dd className="font-mono">{lastKey.which}</dd></div>
              </div>
            )}
            <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">key</th>
                    <th scope="col" className="px-3 py-2 font-semibold">code</th>
                    <th scope="col" className="px-3 py-2 font-semibold">keyCode</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {kcRows.map((r) => (
                    <tr key={r.code} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-1.5 font-mono">{r.key === " " ? "Space" : r.key}</td>
                      <td className="px-3 py-1.5 font-mono">{r.code}</td>
                      <td className="px-3 py-1.5 font-mono">{r.keyCode}</td>
                      <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{r.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2"><CopyButton getText={() => KEYCODES.map((r) => `${r.key}\t${r.code}\t${r.keyCode}`).join("\n")} label="Copy full table" /></div>
          </Card>

        </div>
      </section>
    </Layout>
  );
}
