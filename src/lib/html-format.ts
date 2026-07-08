// HTML formatter that mirrors browser whitespace behavior.
//
// Rules implemented:
// - Text nodes inside normal flow collapse runs of ASCII whitespace to a single space (HTML "white-space: normal").
// - Content inside <pre>, <textarea>, <script>, <style> is preserved verbatim.
// - Inline elements (span, a, strong, em, b, i, u, code, small, mark, sub, sup, label, abbr, cite, q, time, kbd, var, samp, s, del, ins, bdi, bdo, ruby, rt, rp)
//   keep the significant single space that separates them from adjacent text.
// - Block elements are placed on their own line and indented; text touching only block boundaries has its edge whitespace stripped.
// - Void elements are self-closed inline with their surrounding text.
// - Comments and doctype are preserved.
// - Unclosed tags, mismatched close tags, and stray "<" are reported as warnings; the formatter recovers rather than throws.

export type FormatWarning = {
  kind: "unclosed" | "mismatched" | "stray" | "auto-void" | "empty";
  message: string;
};

export type FormatResult = {
  output: string;
  warnings: FormatWarning[];
};

const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "source", "track", "wbr",
]);

const PRESERVE = new Set(["pre", "textarea", "script", "style"]);

const INLINE = new Set([
  "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn", "em",
  "i", "kbd", "label", "mark", "q", "rp", "rt", "ruby", "s", "samp", "small",
  "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "del", "ins",
  "img", "input",
]);

type Tok =
  | { kind: "open"; name: string; raw: string; selfClose: boolean }
  | { kind: "close"; name: string; raw: string }
  | { kind: "text"; value: string }
  | { kind: "raw"; value: string } // verbatim (pre/script/style/textarea inner)
  | { kind: "comment"; raw: string }
  | { kind: "doctype"; raw: string };

function tokenize(src: string, warnings: FormatWarning[]): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    if (src[i] === "<") {
      if (src.startsWith("<!--", i)) {
        const end = src.indexOf("-->", i + 4);
        if (end === -1) {
          warnings.push({ kind: "unclosed", message: "Unterminated comment auto-closed at end of input." });
          toks.push({ kind: "comment", raw: src.slice(i) + "-->" });
          i = src.length;
        } else {
          toks.push({ kind: "comment", raw: src.slice(i, end + 3) });
          i = end + 3;
        }
        continue;
      }
      if (src[i + 1] === "!") {
        const end = src.indexOf(">", i);
        const stop = end === -1 ? src.length : end + 1;
        toks.push({ kind: "doctype", raw: src.slice(i, stop) });
        i = stop;
        continue;
      }
      const end = src.indexOf(">", i);
      if (end === -1) {
        warnings.push({ kind: "stray", message: 'Stray "<" treated as text.' });
        toks.push({ kind: "text", value: src.slice(i) });
        break;
      }
      const raw = src.slice(i, end + 1);
      const m = raw.match(/^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)/);
      if (!m) {
        warnings.push({ kind: "stray", message: `Malformed tag treated as text: ${raw}` });
        toks.push({ kind: "text", value: raw });
        i = end + 1;
        continue;
      }
      const isClose = m[1] === "/";
      const name = m[2].toLowerCase();
      if (isClose) {
        toks.push({ kind: "close", name, raw });
        i = end + 1;
        continue;
      }
      const selfClose = /\/\s*>$/.test(raw) || VOID.has(name);
      if (VOID.has(name) && !/\/\s*>$/.test(raw)) {
        // benign; do not warn — HTML5 allows <br>.
      }
      toks.push({ kind: "open", name, raw, selfClose });
      i = end + 1;
      // Verbatim preservation for raw text elements
      if (!selfClose && PRESERVE.has(name)) {
        const closeRe = new RegExp(`</\\s*${name}\\s*>`, "i");
        const rest = src.slice(i);
        const cm = rest.match(closeRe);
        if (!cm || cm.index === undefined) {
          warnings.push({ kind: "unclosed", message: `<${name}> was not closed; content preserved to end of input.` });
          toks.push({ kind: "raw", value: rest });
          toks.push({ kind: "close", name, raw: `</${name}>` });
          i = src.length;
        } else {
          toks.push({ kind: "raw", value: rest.slice(0, cm.index) });
          toks.push({ kind: "close", name, raw: rest.slice(cm.index, cm.index + cm[0].length) });
          i += cm.index + cm[0].length;
        }
      }
    } else {
      const nxt = src.indexOf("<", i);
      const stop = nxt === -1 ? src.length : nxt;
      toks.push({ kind: "text", value: src.slice(i, stop) });
      i = stop;
    }
  }
  return toks;
}

// Node model
type Node =
  | { type: "element"; name: string; children: Node[]; selfClose: boolean; raw: string }
  | { type: "text"; value: string }
  | { type: "raw"; value: string; parentName: string }
  | { type: "comment"; raw: string }
  | { type: "doctype"; raw: string };

function parse(toks: Tok[], warnings: FormatWarning[]): Node[] {
  const root: Node[] = [];
  const stack: { name: string; children: Node[] }[] = [{ name: "#root", children: root }];
  for (const t of toks) {
    const top = stack[stack.length - 1];
    if (t.kind === "text") top.children.push({ type: "text", value: t.value });
    else if (t.kind === "raw") top.children.push({ type: "raw", value: t.value, parentName: top.name });
    else if (t.kind === "comment") top.children.push({ type: "comment", raw: t.raw });
    else if (t.kind === "doctype") top.children.push({ type: "doctype", raw: t.raw });
    else if (t.kind === "open") {
      const node: Node = { type: "element", name: t.name, children: [], selfClose: t.selfClose, raw: t.raw };
      top.children.push(node);
      if (!t.selfClose) stack.push({ name: t.name, children: node.children });
    } else if (t.kind === "close") {
      // find matching open in the stack
      let idx = -1;
      for (let s = stack.length - 1; s >= 1; s--) {
        if (stack[s].name === t.name) { idx = s; break; }
      }
      if (idx === -1) {
        warnings.push({ kind: "mismatched", message: `Stray closing tag </${t.name}> ignored.` });
      } else {
        if (idx !== stack.length - 1) {
          const skipped = stack.slice(idx + 1).map((s) => s.name).join(", ");
          warnings.push({ kind: "unclosed", message: `Auto-closed unclosed tag(s): ${skipped}` });
        }
        stack.length = idx;
      }
    }
  }
  if (stack.length > 1) {
    warnings.push({ kind: "unclosed", message: `Unclosed at end of input: ${stack.slice(1).map((s) => s.name).join(", ")}` });
  }
  return root;
}

function isInline(n: Node): boolean {
  if (n.type === "text" || n.type === "raw") return true;
  if (n.type === "element") return INLINE.has(n.name);
  return false; // comments/doctype -> block
}

function serialize(nodes: Node[]): string {
  const PAD = "  ";
  const out: string[] = [];

  function walk(nodes: Node[], depth: number, inlineParent: boolean) {
    // Split children into runs: consecutive inline nodes group into one line.
    let i = 0;
    while (i < nodes.length) {
      const n = nodes[i];
      if (n.type === "text") {
        // Collapse whitespace like normal flow.
        const collapsed = n.value.replace(/[\t\n\r\f ]+/g, " ");
        if (!collapsed.trim()) { i++; continue; }
        // Text at block level: start an inline run.
        const run: Node[] = [];
        while (i < nodes.length && isInline(nodes[i])) { run.push(nodes[i]); i++; }
        out.push(PAD.repeat(depth) + renderInlineRun(run));
        continue;
      }
      if (n.type === "element" && INLINE.has(n.name)) {
        const run: Node[] = [];
        while (i < nodes.length && isInline(nodes[i])) { run.push(nodes[i]); i++; }
        out.push(PAD.repeat(depth) + renderInlineRun(run));
        continue;
      }
      if (n.type === "comment") {
        out.push(PAD.repeat(depth) + n.raw);
        i++; continue;
      }
      if (n.type === "doctype") {
        out.push(PAD.repeat(depth) + n.raw);
        i++; continue;
      }
      if (n.type === "raw") {
        // Only reached at top level; preserved indentation.
        out.push(n.value);
        i++; continue;
      }
      // Block element
      const el = n as Extract<Node, { type: "element" }>;
      if (el.selfClose || el.children.length === 0) {
        out.push(PAD.repeat(depth) + el.raw + (el.selfClose ? "" : `</${el.name}>`));
      } else if (PRESERVE.has(el.name)) {
        // Preserve inner content verbatim
        const inner = el.children.map((c) => (c.type === "raw" || c.type === "text" ? (c as { value: string }).value : "")).join("");
        out.push(PAD.repeat(depth) + el.raw + inner + `</${el.name}>`);
      } else if (el.children.length === 1 && el.children[0].type === "text") {
        const collapsed = el.children[0].value.replace(/[\t\n\r\f ]+/g, " ").trim();
        out.push(PAD.repeat(depth) + el.raw + collapsed + `</${el.name}>`);
      } else if (el.children.every(isInline)) {
        out.push(PAD.repeat(depth) + el.raw + renderInlineRun(el.children) + `</${el.name}>`);
      } else {
        out.push(PAD.repeat(depth) + el.raw);
        walk(el.children, depth + 1, false);
        out.push(PAD.repeat(depth) + `</${el.name}>`);
      }
      i++;
    }
    void inlineParent;
  }

  function renderInlineRun(run: Node[]): string {
    // Build the text as the browser would: collapse whitespace within and across nodes; keep single spaces at boundaries.
    let s = "";
    for (const n of run) {
      if (n.type === "text") {
        s += n.value.replace(/[\t\n\r\f ]+/g, " ");
      } else if (n.type === "element") {
        const inner = renderInlineRun(n.children);
        if (n.selfClose || n.children.length === 0) {
          s += n.raw + (n.selfClose ? "" : `</${n.name}>`);
        } else {
          s += n.raw + inner + `</${n.name}>`;
        }
      } else if (n.type === "raw") {
        s += n.value;
      } else if (n.type === "comment") {
        s += n.raw;
      }
    }
    // Trim the boundary spaces of the whole line (block context handles that), but keep internal single spaces.
    return s.replace(/[\t\n\r\f ]+/g, " ").trim();
  }

  walk(nodes, 0, false);
  return out.join("\n");
}

export function formatHtml(source: string): FormatResult {
  const warnings: FormatWarning[] = [];
  if (!source.trim()) {
    warnings.push({ kind: "empty", message: "Input is empty." });
    return { output: "", warnings };
  }
  const toks = tokenize(source, warnings);
  const tree = parse(toks, warnings);
  const output = serialize(tree);
  // dedupe warnings by message
  const seen = new Set<string>();
  const dedup = warnings.filter((w) => (seen.has(w.message) ? false : (seen.add(w.message), true)));
  return { output, warnings: dedup };
}

// Word-level line diff used by the UI to highlight changes.
export type DiffPart = { value: string; kind: "same" | "add" | "del" };
export function lineDiff(a: string, b: string): { left: DiffPart[]; right: DiffPart[] } {
  const A = a.split("\n");
  const B = b.split("\n");
  const n = A.length, m = B.length;
  // LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const left: DiffPart[] = [];
  const right: DiffPart[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { left.push({ value: A[i], kind: "same" }); right.push({ value: B[j], kind: "same" }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { left.push({ value: A[i], kind: "del" }); i++; }
    else { right.push({ value: B[j], kind: "add" }); j++; }
  }
  while (i < n) { left.push({ value: A[i++], kind: "del" }); }
  while (j < m) { right.push({ value: B[j++], kind: "add" }); }
  return { left, right };
}
