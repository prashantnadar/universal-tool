import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { CopyButton, DownloadButton } from "@/components/CopyDownload";
import { trackUse } from "@/lib/usage-tracking";
import { imageMeta } from "@/lib/seo";
import { toolCategoryJsonLd } from "@/lib/tool-seo";

export const Route = createFileRoute("/tools/password")({
  head: () => ({
    meta: [
      { title: "Password Tools — Strong Password Generator & Strength Test | UniversalTools" },
      { name: "description", content: "Create strong random passwords with custom length, uppercase, lowercase, numbers and symbols. Test password strength with our free password checker. Also generates memorable passphrases and numeric PINs — 100% offline in your browser." },
      { name: "keywords", content: "password generator, strong password generator, random password, password strength meter, password strength test, password checker, secure password, passphrase generator, pin generator, how strong is my password, online password tools" },
      { property: "og:title", content: "Password Generator & Strength Test — UniversalTools" },
      { property: "og:description", content: "Generate strong passwords, check strength and create passphrases — securely, offline in your browser." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://universal-tool.lovable.app/tools/password" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Password Generator & Strength Test — UniversalTools" },
      { name: "twitter:description", content: "Generate strong passwords, check strength and create passphrases in your browser." },
      ...imageMeta(),
    ],
    links: [{ rel: "canonical", href: "https://universal-tool.lovable.app/tools/password" }],
    scripts: toolCategoryJsonLd({
      path: "/tools/password",
      name: "Password Tools",
      description: "Free browser-based password utilities: generator, strength meter, passphrase and PIN.",
      keywords: ["password generator", "password strength", "password test", "random password", "passphrase generator", "pin generator", "secure password"],
      tools: [
        { name: "Password Generator", url: "/tools/password#generate", description: "Strong random passwords with custom length and character mix." },
        { name: "Password Strength Meter", url: "/tools/password#strength", description: "Test how strong your password is." },
        { name: "Passphrase Generator", url: "/tools/password#passphrase", description: "Memorable multi-word passphrases." },
        { name: "PIN Generator", url: "/tools/password#pin", description: "Numeric PIN codes, 4 to 12 digits." },
      ],
    }),
  }),
  component: PasswordTools,
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

const runBtn = "inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const NUMS = "23456789";
const SYMS = "!@#$%^&*()-_=+[]{};:,.<>?/";
const AMBIG = "Il1O0";

function randPick(pool: string) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return pool[a[0] % pool.length];
}

function scorePassword(pw: string) {
  if (!pw) return { score: 0, label: "Empty", hint: "Type a password to test", pct: 0, color: "bg-slate-300" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (pw.length >= 16) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (/(.)\1\1/.test(pw)) s = Math.max(0, s - 1);
  const map = [
    { label: "Very weak", color: "bg-red-500", pct: 15, hint: "Use at least 12 chars with mixed types." },
    { label: "Weak", color: "bg-orange-500", pct: 30, hint: "Add numbers and symbols." },
    { label: "Fair", color: "bg-amber-500", pct: 50, hint: "Lengthen it further." },
    { label: "Good", color: "bg-lime-500", pct: 70, hint: "Looking solid." },
    { label: "Strong", color: "bg-emerald-500", pct: 85, hint: "Great password." },
    { label: "Very strong", color: "bg-emerald-600", pct: 95, hint: "Excellent." },
    { label: "Excellent", color: "bg-blue-600", pct: 100, hint: "Top tier." },
  ];
  const out = map[Math.min(s, 6)];
  return { score: s, ...out };
}

function PasswordTools() {
  // generator
  const [length, setLength] = useState(20);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [nums, setNums] = useState(true);
  const [syms, setSyms] = useState(true);
  const [excludeAmbig, setExcludeAmbig] = useState(true);
  const [customText, setCustomText] = useState("");
  const [customMode, setCustomMode] = useState<"insert" | "pool">("insert");
  const [generated, setGenerated] = useState("");

  const generate = () => {
    let pool = "";
    if (upper) pool += UPPER;
    if (lower) pool += LOWER;
    if (nums) pool += NUMS;
    if (syms) pool += SYMS;
    if (!excludeAmbig) pool += AMBIG;
    if (customMode === "pool" && customText) pool += customText;
    if (!pool) { setGenerated(""); return; }

    if (customMode === "insert" && customText) {
      const remaining = Math.max(0, length - customText.length);
      let filler = "";
      for (let i = 0; i < remaining; i++) filler += randPick(pool);
      const idxArr = new Uint32Array(1);
      crypto.getRandomValues(idxArr);
      const pos = filler.length ? idxArr[0] % (filler.length + 1) : 0;
      setGenerated(filler.slice(0, pos) + customText + filler.slice(pos));
    } else {
      let out = "";
      for (let i = 0; i < length; i++) out += randPick(pool);
      setGenerated(out);
    }
    trackUse("pw-generate");
  };

  // strength meter
  const [tested, setTested] = useState("");
  const strength = useMemo(() => scorePassword(tested), [tested]);

  // passphrase
  const WORDS = ["apple", "river", "shadow", "lantern", "ember", "harbor", "violet", "summit", "willow", "comet", "orchid", "quartz", "ranger", "silver", "marble", "thunder", "winter", "garnet", "valley", "echo"];
  const [wordCount, setWordCount] = useState(5);
  const [sep, setSep] = useState("-");
  const [phrase, setPhrase] = useState("");
  const makePhrase = () => {
    const out: string[] = [];
    for (let i = 0; i < wordCount; i++) out.push(randPick(WORDS.join(",")) ? WORDS[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000 * WORDS.length)] : WORDS[0]);
    setPhrase(out.join(sep));
    trackUse("pw-passphrase");
  };

  // pin
  const [pinLen, setPinLen] = useState(6);
  const [pin, setPin] = useState("");
  const makePin = () => {
    let s = "";
    for (let i = 0; i < pinLen; i++) s += randPick("0123456789");
    setPin(s);
    trackUse("pw-pin");
  };

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Reveal>
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Password tools</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Strong passwords, in your browser</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Generated locally with the Web Crypto API. Nothing is sent anywhere.</p>
          </header>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card id="generate" toolId="pw-generate" title="Password Generator" desc="Custom length and character mix.">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Length: {length}</label>
            <input type="range" min={6} max={64} value={length} onChange={(e) => setLength(+e.target.value)} className="mt-2 w-full accent-blue-600" aria-label="length" />
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} /> Uppercase</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={lower} onChange={(e) => setLower(e.target.checked)} /> Lowercase</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={nums} onChange={(e) => setNums(e.target.checked)} /> Numbers</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={syms} onChange={(e) => setSyms(e.target.checked)} /> Symbols</label>
              <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={excludeAmbig} onChange={(e) => setExcludeAmbig(e.target.checked)} /> Exclude ambiguous (Il1O0)</label>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Custom text (optional)</label>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g. your name, brand, keyword"
                aria-label="custom text to include in password"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
                <label className="flex items-center gap-1.5"><input type="radio" name="custom-mode" checked={customMode === "insert"} onChange={() => setCustomMode("insert")} /> Insert text as-is</label>
                <label className="flex items-center gap-1.5"><input type="radio" name="custom-mode" checked={customMode === "pool"} onChange={() => setCustomMode("pool")} /> Add characters to pool</label>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={generate} className={runBtn}>Generate</button>
              <CopyButton getText={() => generated} />
              <DownloadButton getText={() => generated} filename="password.txt" />
            </div>
            {generated && (
              <div className="mt-3 break-all rounded-lg bg-slate-950 p-3 font-mono text-sm text-emerald-300">{generated}</div>
            )}
          </Card>

          <Card id="strength" toolId="pw-strength" title="Password Strength Meter" desc="Audit a password's strength.">
            <input type="text" value={tested} onChange={(e) => { setTested(e.target.value); if (e.target.value) trackUse("pw-strength"); }} placeholder="Type or paste a password…" aria-label="password to test" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className={`h-full transition-all ${strength.color}`} style={{ width: `${strength.pct}%` }} aria-label={`strength: ${strength.label}`} />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-900 dark:text-white">{strength.label}</span>
              <span className="text-slate-500">{tested.length} chars</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{strength.hint}</p>
          </Card>

          <Card id="passphrase" toolId="pw-passphrase" title="Passphrase Generator" desc="Memorable word-based passwords.">
            <div className="flex items-center gap-3">
              <label className="text-sm">Words <input type="number" min={3} max={12} value={wordCount} onChange={(e) => setWordCount(+e.target.value)} className="ml-1 w-20 rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
              <label className="text-sm">Separator <input value={sep} onChange={(e) => setSep(e.target.value)} maxLength={3} className="ml-1 w-16 rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={makePhrase} className={runBtn}>Generate</button>
              <CopyButton getText={() => phrase} />
            </div>
            {phrase && <div className="mt-3 break-all rounded-lg bg-slate-950 p-3 font-mono text-sm text-cyan-300">{phrase}</div>}
          </Card>

          <Card id="pin" toolId="pw-pin" title="PIN Generator" desc="Numeric PIN codes (4–12 digits).">
            <label className="text-sm">Digits <input type="number" min={4} max={12} value={pinLen} onChange={(e) => setPinLen(+e.target.value)} className="ml-1 w-20 rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={makePin} className={runBtn}>Generate</button>
              <CopyButton getText={() => pin} />
            </div>
            {pin && <div className="mt-3 rounded-lg bg-slate-950 p-3 text-center font-mono text-2xl tracking-[0.5em] text-amber-300">{pin}</div>}
          </Card>
        </div>

        <Reveal>
          <section className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>More password tools</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">We're actively expanding this category.</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">Coming soon</span>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { name: "Password Vault", desc: "Save & organize passwords locally, encrypted with a master key." },
                { name: "Breach Checker", desc: "Check if a password has appeared in known data breaches (k-anonymous)." },
                { name: "TOTP / 2FA Generator", desc: "Generate rolling 6-digit codes from a secret." },
                { name: "Wi‑Fi QR Code", desc: "Create a scannable QR code for your Wi‑Fi credentials." },
              ].map((f) => (
                <li key={f.name} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{f.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{f.desc}</p>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">Soon</span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      </section>
    </Layout>
  );
}
