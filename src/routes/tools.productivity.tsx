import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { CopyButton } from "@/components/CopyDownload";
import { trackUse } from "@/lib/usage-tracking";
import { imageMeta } from "@/lib/seo";
import { toolCategoryJsonLd } from "@/lib/tool-seo";

export const Route = createFileRoute("/tools/productivity")({
  head: () => ({
    meta: [
      { title: "Productivity Tools — Timer, To-Do, Calculators, Converters | UniversalTools" },
      { name: "description", content: "Free productivity tools: countdown timer, to-do list, calculator, currency, unit converters (length, mass, area, time, data), timezone converter, finance (loan/EMI, investment), date difference, discount, BMI, temperature and GST calculators." },
      { name: "keywords", content: "timer, to do list, calculator, currency converter, unit converter, length converter, mass converter, area converter, time converter, data converter, timezone converter, date difference, discount calculator, bmi calculator, temperature converter, gst calculator, loan emi, sip calculator" },
      { property: "og:title", content: "Productivity Tools — UniversalTools" },
      { property: "og:description", content: "Timers, calculators and unit converters — free and in your browser." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://universaltools.in/tools/productivity" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Productivity Tools — UniversalTools" },
      { name: "twitter:description", content: "Timers, calculators and unit converters, free in your browser." },
      ...imageMeta(),
    ],
    links: [{ rel: "canonical", href: "https://universaltools.in/tools/productivity" }],
    scripts: (() => {
      const tools = [
        { name: "Timer", url: "/tools/productivity#timer", description: "Free online countdown timer with alarm — set minutes and seconds and get an audible alert when time is up." },
        { name: "To-Do List", url: "/tools/productivity#todo", description: "Free browser-based to-do list. Tasks are stored locally on your device — no sign-in required." },
        { name: "Calculator", url: "/tools/productivity#calculator", description: "Free online calculator for basic arithmetic, percentages and quick math expressions." },
        { name: "Currency Converter", url: "/tools/productivity#currency", description: "Convert between USD, EUR, GBP, INR, JPY and other major currencies with reference rates." },
        { name: "Timezone Converter", url: "/tools/productivity#timezone", description: "Convert times across world timezones — meeting planner style, in your browser." },
        { name: "Unit Converter", url: "/tools/productivity#unit", description: "Quick general-purpose unit converter for everyday values." },
        { name: "Length Converter", url: "/tools/productivity#length", description: "Convert meters, centimeters, millimeters, kilometers, miles, feet and inches instantly." },
        { name: "Mass / Weight Converter", url: "/tools/productivity#mass", description: "Convert kilograms, grams, tonnes, milligrams, pounds, ounces and carats." },
        { name: "Area Converter", url: "/tools/productivity#area", description: "Convert square meters, square feet, acres and hectares." },
        { name: "Time Converter", url: "/tools/productivity#time", description: "Convert years, days, hours, minutes, seconds, milliseconds and microseconds." },
        { name: "Data Size Converter", url: "/tools/productivity#data", description: "Convert bits, bytes, KB, MB, GB, TB and PB." },
        { name: "Temperature Converter", url: "/tools/productivity#temperature", description: "Convert Celsius, Fahrenheit and Kelvin temperatures." },
        { name: "Finance Calculator", url: "/tools/productivity#finance", description: "Loan EMI calculator and SIP investment return calculator in one place." },
        { name: "Date Difference Calculator", url: "/tools/productivity#date-diff", description: "Calculate years, months and days between any two dates." },
        { name: "Discount Calculator", url: "/tools/productivity#discount", description: "Find the final price after applying a percentage discount." },
        { name: "BMI Calculator", url: "/tools/productivity#bmi", description: "Body Mass Index calculator with metric and imperial input." },
        { name: "GST Calculator", url: "/tools/productivity#gst", description: "Add or remove GST from any amount at any tax rate." },
        { name: "Volume Converter", url: "/tools/productivity#volume", description: "Convert liters, milliliters, cubic meters, gallons, quarts, pints, cups and more." },
        { name: "Speed Converter", url: "/tools/productivity#speed", description: "Convert m/s, km/h, mph, knots, mach and speed of light." },
        { name: "Numeral System Converter", url: "/tools/productivity#numeral", description: "Convert numbers between binary, octal, decimal and hexadecimal." },
      ];
      const base = toolCategoryJsonLd({
        path: "/tools/productivity",
        name: "Productivity Tools",
        description: "Free browser-based productivity utilities: timers, calculators, and unit converters.",
        keywords: ["timer", "to do", "calculator", "unit converter", "timezone", "finance", "loan emi", "bmi", "gst"],
        tools,
      });
      const perTool = tools.map((t) => ({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: t.name,
          url: `https://universaltools.in${t.url}`,
          applicationCategory: "UtilitiesApplication",
          operatingSystem: "Any (browser)",
          description: t.description,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          isPartOf: { "@type": "WebSite", name: "UniversalTools", url: "https://universaltools.in" },
        }),
      }));
      return [...base, ...perTool];
    })(),
  }),
  component: ProductivityTools,
});

// ---------------- shared UI ----------------

function Card({ id, toolId, title, desc, children }: { id: string; toolId: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <Reveal as="section">
      <section id={id} data-tool-id={toolId} className="scroll-mt-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </Reveal>
  );
}

const btn = "inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50";
const btnAlt = "inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";
const inp = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white";
const sel = inp;

// ---------------- Converter helper ----------------

type UnitMap = Record<string, { label: string; factor: number }>; // factor = value in base unit

function ConverterCard({ id, toolId, title, desc, units, defaultFrom, defaultTo }: { id: string; toolId: string; title: string; desc: string; units: UnitMap; defaultFrom: string; defaultTo: string }) {
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const num = parseFloat(value);
  const result = useMemo(() => {
    if (!isFinite(num)) return "";
    const base = num * units[from].factor;
    const out = base / units[to].factor;
    trackUse(toolId);
    return formatNum(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [num, from, to]);
  return (
    <Card id={id} toolId={toolId} title={title} desc={desc}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">From</label>
          <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className={inp} aria-label={`${title} input`} />
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${sel} mt-2`} aria-label={`${title} from unit`}>
            {Object.entries(units).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={() => { setFrom(to); setTo(from); }}
          className={`${btnAlt} h-10 justify-center`}
          aria-label="swap units"
          title="Swap"
        >⇄</button>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">To</label>
          <div className={`${inp} font-mono tabular-nums`} aria-live="polite">{result}</div>
          <select value={to} onChange={(e) => setTo(e.target.value)} className={`${sel} mt-2`} aria-label={`${title} to unit`}>
            {Object.entries(units).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
    </Card>
  );
}

function formatNum(n: number): string {
  if (!isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return n.toExponential(6);
  return parseFloat(n.toPrecision(10)).toString();
}

// ---------------- Timer ----------------

function TimerCard() {
  const [mins, setMins] = useState(5);
  const [secs, setSecs] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          try {
            const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
            const ctx = new AC();
            const osc = ctx.createOscillator();
            osc.frequency.value = 880;
            osc.connect(ctx.destination);
            osc.start();
            setTimeout(() => { osc.stop(); ctx.close(); }, 400);
          } catch { /* ignore */ }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (ref.current) window.clearInterval(ref.current); };
  }, [running]);

  const start = () => {
    const total = Math.max(0, mins * 60 + secs);
    if (!total) return;
    if (!remaining) setRemaining(total);
    setRunning(true);
    trackUse("timer");
  };
  const pause = () => setRunning(false);
  const reset = () => { setRunning(false); setRemaining(0); };

  const display = remaining || mins * 60 + secs;
  const mm = Math.floor(display / 60).toString().padStart(2, "0");
  const ss = (display % 60).toString().padStart(2, "0");

  return (
    <Card id="timer" toolId="timer" title="Timer" desc="Countdown timer with an alarm.">
      <div className="text-center font-mono text-5xl font-bold tabular-nums text-slate-900 dark:text-white">{mm}:{ss}</div>
      {!remaining && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm">Minutes<input type="number" min={0} max={999} value={mins} onChange={(e) => setMins(Math.max(0, +e.target.value || 0))} className={`${inp} mt-1`} /></label>
          <label className="text-sm">Seconds<input type="number" min={0} max={59} value={secs} onChange={(e) => setSecs(Math.min(59, Math.max(0, +e.target.value || 0)))} className={`${inp} mt-1`} /></label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {!running ? <button onClick={start} className={btn}>Start</button> : <button onClick={pause} className={btn}>Pause</button>}
        <button onClick={reset} className={btnAlt}>Reset</button>
      </div>
    </Card>
  );
}

// ---------------- To-do ----------------

interface Todo { id: string; text: string; done: boolean }
const TODO_KEY = "ut.productivity.todos.v1";

function TodoCard() {
  const [items, setItems] = useState<Todo[]>([]);
  const [text, setText] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TODO_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(TODO_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    setItems((x) => [...x, { id: crypto.randomUUID(), text: t, done: false }]);
    setText("");
    trackUse("todo");
  };
  const toggle = (id: string) => setItems((x) => x.map((i) => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id: string) => setItems((x) => x.filter((i) => i.id !== id));
  const clearDone = () => setItems((x) => x.filter((i) => !i.done));

  return (
    <Card id="todo" toolId="todo" title="To-Do List" desc="Simple task list saved in your browser.">
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a task…" className={inp} aria-label="new task" />
        <button onClick={add} className={btn}>Add</button>
      </div>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {items.length === 0 && <li className="py-3 text-sm text-slate-500">No tasks yet.</li>}
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2">
            <input type="checkbox" checked={i.done} onChange={() => toggle(i.id)} aria-label={`toggle ${i.text}`} />
            <span className={`flex-1 text-sm ${i.done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-200"}`}>{i.text}</span>
            <button onClick={() => remove(i.id)} className="text-xs text-red-600 hover:underline" aria-label={`remove ${i.text}`}>Remove</button>
          </li>
        ))}
      </ul>
      {items.some((i) => i.done) && <button onClick={clearDone} className={`${btnAlt} mt-3`}>Clear completed</button>}
    </Card>
  );
}

// ---------------- Calculator ----------------

function CalculatorCard() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("");
  const evaluate = () => {
    try {
      const clean = expr.replace(/[^0-9+\-*/().%\s]/g, "");
      if (!clean) return;
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      const val = Function(`"use strict"; return (${clean})`)();
      setResult(String(val));
      trackUse("calculator");
    } catch { setResult("Error"); }
  };
  const press = (v: string) => {
    if (v === "=") { evaluate(); return; }
    if (v === "C") { setExpr(""); setResult(""); return; }
    if (v === "⌫") { setExpr((e) => e.slice(0, -1)); return; }
    setExpr((e) => e + v);
  };
  const keys = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","%","+"];
  return (
    <Card id="calculator" toolId="calculator" title="Calculator" desc="Basic arithmetic calculator.">
      <input value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && evaluate()} placeholder="e.g. 12*(3+4)" className={`${inp} font-mono`} aria-label="expression" />
      <div className="mt-2 rounded-lg bg-slate-950 p-3 text-right font-mono text-2xl text-emerald-300 tabular-nums" aria-live="polite">{result || "0"}</div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {keys.map((k) => (
          <button key={k} onClick={() => press(k)} className={`${btnAlt} justify-center`}>{k}</button>
        ))}
        <button onClick={() => press("C")} className={`${btnAlt} justify-center`}>C</button>
        <button onClick={() => press("⌫")} className={`${btnAlt} justify-center`}>⌫</button>
        <button onClick={() => press("(")} className={`${btnAlt} justify-center`}>(</button>
        <button onClick={() => press(")")} className={`${btnAlt} justify-center`}>)</button>
        <button onClick={evaluate} className={`${btn} col-span-4 justify-center`}>=</button>
      </div>
    </Card>
  );
}

// ---------------- Currency ----------------

// Reference rates (per 1 USD). Static — for quick estimates.
const CURRENCY: Record<string, { label: string; perUSD: number }> = {
  USD: { label: "USD — US Dollar", perUSD: 1 },
  EUR: { label: "EUR — Euro", perUSD: 0.92 },
  GBP: { label: "GBP — British Pound", perUSD: 0.79 },
  INR: { label: "INR — Indian Rupee", perUSD: 83.2 },
  JPY: { label: "JPY — Japanese Yen", perUSD: 155 },
  AUD: { label: "AUD — Australian Dollar", perUSD: 1.52 },
  CAD: { label: "CAD — Canadian Dollar", perUSD: 1.36 },
  CHF: { label: "CHF — Swiss Franc", perUSD: 0.88 },
  CNY: { label: "CNY — Chinese Yuan", perUSD: 7.24 },
  AED: { label: "AED — UAE Dirham", perUSD: 3.67 },
  SGD: { label: "SGD — Singapore Dollar", perUSD: 1.35 },
  SAR: { label: "SAR — Saudi Riyal", perUSD: 3.75 },
};

function CurrencyCard() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const n = parseFloat(amount);
  const converted = isFinite(n) ? (n / CURRENCY[from].perUSD) * CURRENCY[to].perUSD : NaN;
  return (
    <Card id="currency" toolId="currency" title="Currency Converter" desc="Convert between major currencies using reference rates.">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Amount</label>
          <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); trackUse("currency"); }} className={inp} aria-label="amount" />
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${sel} mt-2`} aria-label="from currency">
            {Object.entries(CURRENCY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button onClick={() => { setFrom(to); setTo(from); }} className={`${btnAlt} h-10 justify-center`} aria-label="swap">⇄</button>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Converted</label>
          <div className={`${inp} font-mono tabular-nums`} aria-live="polite">{isFinite(converted) ? converted.toFixed(2) : ""}</div>
          <select value={to} onChange={(e) => setTo(e.target.value)} className={`${sel} mt-2`} aria-label="to currency">
            {Object.entries(CURRENCY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Rates are indicative reference values, not live market rates.</p>
    </Card>
  );
}

// ---------------- Timezone ----------------

const TIMEZONES = [
  "UTC","America/New_York","America/Los_Angeles","America/Chicago","America/Toronto","Europe/London","Europe/Paris","Europe/Berlin","Europe/Moscow","Africa/Cairo","Asia/Dubai","Asia/Kolkata","Asia/Karachi","Asia/Singapore","Asia/Hong_Kong","Asia/Shanghai","Asia/Tokyo","Australia/Sydney","Pacific/Auckland",
];

function TimezoneCard() {
  const now = new Date();
  const isoLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [dt, setDt] = useState(isoLocal);
  const [from, setFrom] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [to, setTo] = useState("UTC");
  const fmt = (tz: string) => {
    try {
      // interpret dt as local time in `from` zone: build a date whose UTC equals that wall clock in from tz
      const [d, t] = dt.split("T");
      const [y, mo, da] = d.split("-").map(Number);
      const [h, mi] = t.split(":").map(Number);
      const naiveUTC = Date.UTC(y, mo - 1, da, h, mi);
      // Compute offset of `from` zone at that instant
      const fromOffset = tzOffset(new Date(naiveUTC), from);
      const instant = new Date(naiveUTC - fromOffset);
      return new Intl.DateTimeFormat(undefined, { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(instant);
    } catch { return ""; }
  };
  return (
    <Card id="timezone" toolId="timezone" title="Timezone Converter" desc="Convert a date/time from one timezone to another.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Date & time<input type="datetime-local" value={dt} onChange={(e) => { setDt(e.target.value); trackUse("timezone"); }} className={`${inp} mt-1`} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">From<select value={from} onChange={(e) => setFrom(e.target.value)} className={`${sel} mt-1`}>{TIMEZONES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="text-sm">To<select value={to} onChange={(e) => setTo(e.target.value)} className={`${sel} mt-1`}>{TIMEZONES.map((t) => <option key={t}>{t}</option>)}</select></label>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950" aria-live="polite">
        <div><span className="font-semibold">In {to}:</span> {fmt(to)}</div>
      </div>
    </Card>
  );
}

function tzOffset(date: Date, tz: string): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const target = new Date(date.toLocaleString("en-US", { timeZone: tz }));
  return target.getTime() - utc.getTime();
}

// ---------------- Length ----------------

const LENGTH_UNITS: UnitMap = {
  km: { label: "Kilometer (km)", factor: 1000 },
  m: { label: "Meter (m)", factor: 1 },
  dm: { label: "Decimeter (dm)", factor: 0.1 },
  cm: { label: "Centimeter (cm)", factor: 0.01 },
  mm: { label: "Millimeter (mm)", factor: 0.001 },
  um: { label: "Micrometer (µm)", factor: 1e-6 },
  nm: { label: "Nanometer (nm)", factor: 1e-9 },
  pm: { label: "Picometer (pm)", factor: 1e-12 },
  mi: { label: "Mile (mi)", factor: 1609.344 },
  yd: { label: "Yard (yd)", factor: 0.9144 },
  ft: { label: "Foot (ft)", factor: 0.3048 },
  in: { label: "Inch (in)", factor: 0.0254 },
  nmi: { label: "Nautical mile", factor: 1852 },
  ly: { label: "Light year", factor: 9.461e15 },
};

// ---------------- Mass ----------------

const MASS_UNITS: UnitMap = {
  t: { label: "Tonne (t)", factor: 1e6 },
  kg: { label: "Kilogram (kg)", factor: 1000 },
  g: { label: "Gram (g)", factor: 1 },
  mg: { label: "Milligram (mg)", factor: 0.001 },
  ug: { label: "Microgram (µg)", factor: 1e-6 },
  ng: { label: "Nanogram (ng)", factor: 1e-9 },
  lb: { label: "Pound (lb)", factor: 453.592 },
  oz: { label: "Ounce (oz)", factor: 28.3495 },
  st: { label: "Stone (st)", factor: 6350.29 },
  ct: { label: "Carat (ct)", factor: 0.2 },
};

// ---------------- Area ----------------

const AREA_UNITS: UnitMap = {
  km2: { label: "Square kilometer (km²)", factor: 1e6 },
  ha: { label: "Hectare (ha)", factor: 10000 },
  ac: { label: "Acre (ac)", factor: 4046.86 },
  m2: { label: "Square meter (m²)", factor: 1 },
  dm2: { label: "Square decimeter (dm²)", factor: 0.01 },
  cm2: { label: "Square centimeter (cm²)", factor: 0.0001 },
  mm2: { label: "Square millimeter (mm²)", factor: 1e-6 },
  ft2: { label: "Square foot (ft²)", factor: 0.092903 },
  in2: { label: "Square inch (in²)", factor: 0.00064516 },
  yd2: { label: "Square yard (yd²)", factor: 0.836127 },
  mi2: { label: "Square mile (mi²)", factor: 2.59e6 },
};

// ---------------- Time ----------------

const TIME_UNITS: UnitMap = {
  y: { label: "Year", factor: 31536000 },
  mo: { label: "Month (30d)", factor: 2592000 },
  wk: { label: "Week", factor: 604800 },
  d: { label: "Day", factor: 86400 },
  h: { label: "Hour", factor: 3600 },
  min: { label: "Minute", factor: 60 },
  s: { label: "Second", factor: 1 },
  ms: { label: "Millisecond", factor: 0.001 },
  us: { label: "Microsecond", factor: 1e-6 },
  ns: { label: "Nanosecond", factor: 1e-9 },
};

// ---------------- Data ----------------

const DATA_UNITS: UnitMap = {
  bit: { label: "Bit", factor: 1 / 8 },
  B: { label: "Byte (B)", factor: 1 },
  KB: { label: "Kilobyte (KB)", factor: 1024 },
  MB: { label: "Megabyte (MB)", factor: 1024 ** 2 },
  GB: { label: "Gigabyte (GB)", factor: 1024 ** 3 },
  TB: { label: "Terabyte (TB)", factor: 1024 ** 4 },
  PB: { label: "Petabyte (PB)", factor: 1024 ** 5 },
  EB: { label: "Exabyte (EB)", factor: 1024 ** 6 },
};

// ---------------- Volume ----------------

const VOLUME_UNITS: UnitMap = {
  m3: { label: "Cubic meter (m³)", factor: 1000 },
  L: { label: "Liter (L)", factor: 1 },
  mL: { label: "Milliliter (mL)", factor: 0.001 },
  cm3: { label: "Cubic centimeter (cm³)", factor: 0.001 },
  gal_us: { label: "US Gallon", factor: 3.78541 },
  gal_uk: { label: "UK Gallon", factor: 4.54609 },
  qt: { label: "US Quart", factor: 0.946353 },
  pt: { label: "US Pint", factor: 0.473176 },
  cup: { label: "US Cup", factor: 0.24 },
  floz: { label: "US Fluid ounce", factor: 0.0295735 },
  tbsp: { label: "Tablespoon", factor: 0.0147868 },
  tsp: { label: "Teaspoon", factor: 0.00492892 },
  ft3: { label: "Cubic foot (ft³)", factor: 28.3168 },
  in3: { label: "Cubic inch (in³)", factor: 0.0163871 },
  bbl: { label: "Oil barrel (bbl)", factor: 158.987 },
};

// ---------------- Speed ----------------

const SPEED_UNITS: UnitMap = {
  mps: { label: "Meter/second (m/s)", factor: 1 },
  kph: { label: "Kilometer/hour (km/h)", factor: 1 / 3.6 },
  mph: { label: "Mile/hour (mph)", factor: 0.44704 },
  fps: { label: "Foot/second (ft/s)", factor: 0.3048 },
  kn: { label: "Knot (kn)", factor: 0.514444 },
  mach: { label: "Mach (at sea level)", factor: 343 },
  c: { label: "Speed of light (c)", factor: 299792458 },
};

// ---------------- Temperature ----------------

function TemperatureCard() {
  const [value, setValue] = useState("100");
  const [from, setFrom] = useState<"C" | "F" | "K">("C");
  const [to, setTo] = useState<"C" | "F" | "K">("F");
  const n = parseFloat(value);
  const toC = (v: number, u: string) => u === "C" ? v : u === "F" ? (v - 32) * 5 / 9 : v - 273.15;
  const fromC = (v: number, u: string) => u === "C" ? v : u === "F" ? v * 9 / 5 + 32 : v + 273.15;
  const result = isFinite(n) ? formatNum(fromC(toC(n, from), to)) : "";
  return (
    <Card id="temperature" toolId="temperature" title="Temperature Converter" desc="Celsius, Fahrenheit and Kelvin.">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">From</label>
          <input type="number" value={value} onChange={(e) => { setValue(e.target.value); trackUse("temperature"); }} className={inp} />
          <select value={from} onChange={(e) => setFrom(e.target.value as "C" | "F" | "K")} className={`${sel} mt-2`}>
            <option value="C">Celsius (°C)</option><option value="F">Fahrenheit (°F)</option><option value="K">Kelvin (K)</option>
          </select>
        </div>
        <button onClick={() => { setFrom(to); setTo(from); }} className={`${btnAlt} h-10 justify-center`}>⇄</button>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">To</label>
          <div className={`${inp} font-mono tabular-nums`} aria-live="polite">{result}</div>
          <select value={to} onChange={(e) => setTo(e.target.value as "C" | "F" | "K")} className={`${sel} mt-2`}>
            <option value="C">Celsius (°C)</option><option value="F">Fahrenheit (°F)</option><option value="K">Kelvin (K)</option>
          </select>
        </div>
      </div>
    </Card>
  );
}

// ---------------- Finance ----------------

function FinanceCard() {
  const [mode, setMode] = useState<"loan" | "invest">("loan");
  // Loan
  const [principal, setPrincipal] = useState("100000");
  const [rate, setRate] = useState("8");
  const [years, setYears] = useState("5");
  const [loanOut, setLoanOut] = useState<{ emi: number; total: number; interest: number } | null>(null);
  const calcLoan = () => {
    const P = parseFloat(principal);
    const r = parseFloat(rate) / 100 / 12;
    const n = parseFloat(years) * 12;
    if (!isFinite(P) || !isFinite(r) || !isFinite(n) || n <= 0) return;
    const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = emi * n;
    setLoanOut({ emi, total, interest: total - P });
    trackUse("finance");
  };

  // Investment
  const [invType, setInvType] = useState<"one-time" | "recurring">("one-time");
  const [invAmount, setInvAmount] = useState("10000");
  const [invRate, setInvRate] = useState("12");
  const [invYears, setInvYears] = useState("10");
  const [invOut, setInvOut] = useState<{ future: number; invested: number; gain: number } | null>(null);
  const calcInvest = () => {
    const A = parseFloat(invAmount);
    const r = parseFloat(invRate) / 100;
    const y = parseFloat(invYears);
    if (!isFinite(A) || !isFinite(r) || !isFinite(y)) return;
    if (invType === "one-time") {
      const fv = A * Math.pow(1 + r, y);
      setInvOut({ future: fv, invested: A, gain: fv - A });
    } else {
      const n = y * 12;
      const mr = r / 12;
      const fv = mr === 0 ? A * n : A * ((Math.pow(1 + mr, n) - 1) / mr) * (1 + mr);
      setInvOut({ future: fv, invested: A * n, gain: fv - A * n });
    }
    trackUse("finance");
  };

  return (
    <Card id="finance" toolId="finance" title="Finance Calculator" desc="Loan EMI and investment growth.">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5"><input type="radio" name="fin-mode" checked={mode === "loan"} onChange={() => setMode("loan")} /> Loan</label>
        <label className="flex items-center gap-1.5"><input type="radio" name="fin-mode" checked={mode === "invest"} onChange={() => setMode("invest")} /> Investment</label>
      </div>
      {mode === "loan" ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm">Principal amount<input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} className={`${inp} mt-1`} /></label>
          <label className="block text-sm">Interest rate (annual %)<input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} className={`${inp} mt-1`} /></label>
          <label className="block text-sm">Duration (years)<input type="number" value={years} onChange={(e) => setYears(e.target.value)} className={`${inp} mt-1`} /></label>
          <button onClick={calcLoan} className={btn}>Calculate</button>
          {loanOut && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950" aria-live="polite">
              <div>Monthly EMI: <strong className="font-mono tabular-nums">{loanOut.emi.toFixed(2)}</strong></div>
              <div>Total payment: <strong className="font-mono tabular-nums">{loanOut.total.toFixed(2)}</strong></div>
              <div>Total interest: <strong className="font-mono tabular-nums">{loanOut.interest.toFixed(2)}</strong></div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm">Investment type
            <select value={invType} onChange={(e) => setInvType(e.target.value as "one-time" | "recurring")} className={`${sel} mt-1`}>
              <option value="one-time">One-time (lump sum)</option>
              <option value="recurring">Recurring (monthly SIP)</option>
            </select>
          </label>
          <label className="block text-sm">{invType === "one-time" ? "Amount invested" : "Monthly contribution"}<input type="number" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} className={`${inp} mt-1`} /></label>
          <label className="block text-sm">Expected annual return (%)<input type="number" step="0.01" value={invRate} onChange={(e) => setInvRate(e.target.value)} className={`${inp} mt-1`} /></label>
          <label className="block text-sm">Duration (years)<input type="number" value={invYears} onChange={(e) => setInvYears(e.target.value)} className={`${inp} mt-1`} /></label>
          <button onClick={calcInvest} className={btn}>Calculate</button>
          {invOut && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950" aria-live="polite">
              <div>Future value: <strong className="font-mono tabular-nums">{invOut.future.toFixed(2)}</strong></div>
              <div>Total invested: <strong className="font-mono tabular-nums">{invOut.invested.toFixed(2)}</strong></div>
              <div>Estimated gain: <strong className="font-mono tabular-nums">{invOut.gain.toFixed(2)}</strong></div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ---------------- Date Difference ----------------

function DateDiffCard() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const out = useMemo(() => {
    const a = new Date(from);
    const b = new Date(to);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    const start = a <= b ? a : b;
    const end = a <= b ? b : a;
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    if (days < 0) {
      months--;
      const prev = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
      days += prev;
    }
    if (months < 0) { years--; months += 12; }
    const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000);
    return { years, months, days, totalDays };
  }, [from, to]);

  return (
    <Card id="date-diff" toolId="date-diff" title="Date Difference" desc="Years, months and days between two dates.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">From<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); trackUse("date-diff"); }} className={`${inp} mt-1`} /></label>
        <label className="text-sm">To<input type="date" value={to} onChange={(e) => { setTo(e.target.value); trackUse("date-diff"); }} className={`${inp} mt-1`} /></label>
      </div>
      {out && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950" aria-live="polite">
          <div><strong className="font-mono">{out.years}</strong> years, <strong className="font-mono">{out.months}</strong> months, <strong className="font-mono">{out.days}</strong> days</div>
          <div className="mt-1 text-slate-500">Total: <span className="font-mono">{out.totalDays}</span> days</div>
        </div>
      )}
    </Card>
  );
}

// ---------------- Discount ----------------

function DiscountCard() {
  const [price, setPrice] = useState("1000");
  const [discount, setDiscount] = useState("20");
  const p = parseFloat(price);
  const d = parseFloat(discount);
  const finalPrice = isFinite(p) && isFinite(d) ? p - (p * d) / 100 : NaN;
  const savings = isFinite(p) && isFinite(d) ? (p * d) / 100 : NaN;
  return (
    <Card id="discount" toolId="discount" title="Discount Calculator" desc="Final price after applying a percentage discount.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Original price<input type="number" value={price} onChange={(e) => { setPrice(e.target.value); trackUse("discount"); }} className={`${inp} mt-1`} /></label>
        <label className="text-sm">Discount (%)<input type="number" value={discount} onChange={(e) => { setDiscount(e.target.value); trackUse("discount"); }} className={`${inp} mt-1`} /></label>
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950" aria-live="polite">
        <div>Final price: <strong className="font-mono tabular-nums">{isFinite(finalPrice) ? finalPrice.toFixed(2) : ""}</strong></div>
        <div>You save: <strong className="font-mono tabular-nums">{isFinite(savings) ? savings.toFixed(2) : ""}</strong></div>
      </div>
    </Card>
  );
}

// ---------------- BMI ----------------

function BMICard() {
  const [age, setAge] = useState("30");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("70");
  const h = parseFloat(height) / 100;
  const w = parseFloat(weight);
  const bmi = isFinite(h) && h > 0 && isFinite(w) ? w / (h * h) : NaN;
  const cat = isFinite(bmi) ? (bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese") : "";
  const color = !isFinite(bmi) ? "" : bmi < 18.5 ? "text-amber-600" : bmi < 25 ? "text-emerald-600" : bmi < 30 ? "text-orange-600" : "text-red-600";
  return (
    <Card id="bmi" toolId="bmi" title="BMI Calculator" desc="Body Mass Index based on height and weight.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Age<input type="number" value={age} onChange={(e) => { setAge(e.target.value); trackUse("bmi"); }} className={`${inp} mt-1`} /></label>
        <label className="text-sm">Gender
          <div className="mt-1 flex gap-3">
            <label className="flex items-center gap-1.5 text-sm"><input type="radio" name="bmi-g" checked={gender === "male"} onChange={() => setGender("male")} /> Male</label>
            <label className="flex items-center gap-1.5 text-sm"><input type="radio" name="bmi-g" checked={gender === "female"} onChange={() => setGender("female")} /> Female</label>
          </div>
        </label>
        <label className="text-sm">Height (cm)<input type="number" value={height} onChange={(e) => { setHeight(e.target.value); trackUse("bmi"); }} className={`${inp} mt-1`} /></label>
        <label className="text-sm">Weight (kg)<input type="number" value={weight} onChange={(e) => { setWeight(e.target.value); trackUse("bmi"); }} className={`${inp} mt-1`} /></label>
      </div>
      {isFinite(bmi) && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950" aria-live="polite">
          <div>BMI: <strong className={`font-mono tabular-nums text-lg ${color}`}>{bmi.toFixed(1)}</strong> — <span className={color}>{cat}</span></div>
          <div className="mt-1 text-xs text-slate-500">Age {age}, {gender}. BMI ranges are the same for adult men and women.</div>
        </div>
      )}
    </Card>
  );
}

// ---------------- GST ----------------

function GSTCard() {
  const [amount, setAmount] = useState("1000");
  const [rate, setRate] = useState("18");
  const [mode, setMode] = useState<"add" | "remove">("add");
  const a = parseFloat(amount);
  const r = parseFloat(rate);
  let net = NaN, tax = NaN, gross = NaN;
  if (isFinite(a) && isFinite(r)) {
    if (mode === "add") { net = a; tax = (a * r) / 100; gross = net + tax; }
    else { gross = a; net = a / (1 + r / 100); tax = gross - net; }
  }
  return (
    <Card id="gst" toolId="gst" title="GST Calculator" desc="Add GST to a net amount or extract GST from a gross amount.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Amount<input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); trackUse("gst"); }} className={`${inp} mt-1`} /></label>
        <label className="text-sm">GST rate (%)<input type="number" value={rate} onChange={(e) => { setRate(e.target.value); trackUse("gst"); }} className={`${inp} mt-1`} /></label>
      </div>
      <div className="mt-2 flex gap-4 text-sm">
        <label className="flex items-center gap-1.5"><input type="radio" name="gst-mode" checked={mode === "add"} onChange={() => setMode("add")} /> Add GST</label>
        <label className="flex items-center gap-1.5"><input type="radio" name="gst-mode" checked={mode === "remove"} onChange={() => setMode("remove")} /> Remove GST</label>
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950" aria-live="polite">
        <div>Net: <strong className="font-mono tabular-nums">{isFinite(net) ? net.toFixed(2) : ""}</strong></div>
        <div>GST: <strong className="font-mono tabular-nums">{isFinite(tax) ? tax.toFixed(2) : ""}</strong></div>
        <div>Gross: <strong className="font-mono tabular-nums">{isFinite(gross) ? gross.toFixed(2) : ""}</strong></div>
      </div>
    </Card>
  );
}

// ---------------- Numeral system converter ----------------

function NumeralCard() {
  const [value, setValue] = useState("255");
  const [base, setBase] = useState(10);
  const parsed = useMemo(() => {
    const s = value.trim();
    if (!s) return null;
    const n = parseInt(s, base);
    if (isNaN(n)) return null;
    trackUse("numeral");
    return n;
  }, [value, base]);
  const clear = () => { setValue(""); setBase(10); };
  return (
    <Card id="numeral" toolId="numeral" title="Numeral System Converter" desc="Convert between binary, octal, decimal and hexadecimal.">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input value={value} onChange={(e) => setValue(e.target.value)} className={inp} aria-label="Number to convert" placeholder="Enter a number" />
        <select value={base} onChange={(e) => setBase(parseInt(e.target.value))} className={sel} aria-label="Input base">
          <option value={2}>Binary (base 2)</option>
          <option value={8}>Octal (base 8)</option>
          <option value={10}>Decimal (base 10)</option>
          <option value={16}>Hex (base 16)</option>
        </select>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <Row label="Binary" val={parsed != null ? parsed.toString(2) : ""} />
        <Row label="Octal" val={parsed != null ? parsed.toString(8) : ""} />
        <Row label="Decimal" val={parsed != null ? parsed.toString(10) : ""} />
        <Row label="Hex" val={parsed != null ? parsed.toString(16).toUpperCase() : ""} />
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={clear} className={btnAlt} title="Clear input">Clear</button>
      </div>
    </Card>
  );
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="font-mono tabular-nums text-slate-900 dark:text-white">{val || "—"}</span>
    </div>
  );
}

// ---------------- Page ----------------

function ProductivityTools() {
  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Reveal>
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Productivity tools</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Calculators, converters and everyday helpers</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Timers, to-dos, unit and currency converters, finance and health calculators — all in your browser.</p>
          </header>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-2">
          <TimerCard />
          <TodoCard />
          <CalculatorCard />
          <CurrencyCard />
          <TimezoneCard />
          <ConverterCard id="unit" toolId="unit" title="Unit Converter (Length)" desc="Quick generic unit conversion." units={LENGTH_UNITS} defaultFrom="m" defaultTo="ft" />
          <ConverterCard id="length" toolId="length" title="Length Converter" desc="km, m, cm, mm, µm, nm, pm, mile, yard, foot, inch." units={LENGTH_UNITS} defaultFrom="m" defaultTo="cm" />
          <ConverterCard id="mass" toolId="mass" title="Mass Converter" desc="tonne, kg, g, mg, µg, lb, oz, carat." units={MASS_UNITS} defaultFrom="kg" defaultTo="lb" />
          <ConverterCard id="area" toolId="area" title="Area Converter" desc="km², ha, acre, m², cm², ft², yd², mi²." units={AREA_UNITS} defaultFrom="m2" defaultTo="ft2" />
          <ConverterCard id="time" toolId="time" title="Time Converter" desc="year, month, week, day, hour, minute, second, ms, µs, ns." units={TIME_UNITS} defaultFrom="h" defaultTo="min" />
          <ConverterCard id="data" toolId="data" title="Data Converter" desc="bit, byte, KB, MB, GB, TB, PB, EB." units={DATA_UNITS} defaultFrom="MB" defaultTo="GB" />
          <TemperatureCard />
          <ConverterCard id="volume" toolId="volume" title="Volume Converter" desc="m³, L, mL, gallon (US/UK), quart, pint, cup, fl oz, tbsp, tsp, ft³, in³, barrel." units={VOLUME_UNITS} defaultFrom="L" defaultTo="gal_us" />
          <ConverterCard id="speed" toolId="speed" title="Speed Converter" desc="m/s, km/h, mph, ft/s, knot, mach, speed of light." units={SPEED_UNITS} defaultFrom="kph" defaultTo="mph" />
          <NumeralCard />
          <FinanceCard />
          <DateDiffCard />
          <DiscountCard />
          <BMICard />
          <GSTCard />
        </div>

        <div className="mt-8 flex justify-end">
          <CopyButton getText={() => window.location.href} label="Copy page URL" />
        </div>
      </section>
    </Layout>
  );
}
