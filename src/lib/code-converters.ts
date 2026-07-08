// Best-effort in-browser converters between HTML / JSX / TSX / CSS / Tailwind.
// These are heuristic — they cover the common cases, not the entire spec.

const HTML_TO_JSX_ATTR: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  colspan: "colSpan",
  rowspan: "rowSpan",
  contenteditable: "contentEditable",
  spellcheck: "spellCheck",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  autoplay: "autoPlay",
  crossorigin: "crossOrigin",
  enctype: "encType",
  formaction: "formAction",
  novalidate: "noValidate",
  srcset: "srcSet",
  usemap: "useMap",
  frameborder: "frameBorder",
  allowfullscreen: "allowFullScreen",
  accept: "accept",
  charset: "charSet",
  datetime: "dateTime",
  accesskey: "accessKey",
  playsinline: "playsInline",
};

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function kebabToCamel(k: string) {
  return k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function convertStyle(styleStr: string): string {
  const decls = styleStr.split(";").map((s) => s.trim()).filter(Boolean);
  const pairs = decls.map((d) => {
    const idx = d.indexOf(":");
    if (idx === -1) return null;
    const prop = d.slice(0, idx).trim();
    const val = d.slice(idx + 1).trim();
    const jsProp = prop.startsWith("--") ? `"${prop}"` : kebabToCamel(prop);
    const numeric = /^-?\d+(\.\d+)?$/.test(val) ? val : `"${val.replace(/"/g, '\\"')}"`;
    return `${jsProp}: ${numeric}`;
  }).filter(Boolean);
  return `{{ ${pairs.join(", ")} }}`;
}

export function htmlToJsx(html: string): string {
  let out = html;

  // Comments <!-- x --> → {/* x */}
  out = out.replace(/<!--([\s\S]*?)-->/g, (_, c) => `{/*${c}*/}`);

  // Attribute conversions inside tags
  out = out.replace(/<([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g, (_m, tag: string, attrs: string) => {
    let a = attrs;

    // style="..." → style={{ ... }}
    a = a.replace(/style\s*=\s*"([^"]*)"/gi, (_s, css: string) => `style=${convertStyle(css)}`);
    a = a.replace(/style\s*=\s*'([^']*)'/gi, (_s, css: string) => `style=${convertStyle(css)}`);

    // on* handlers → onCamel
    a = a.replace(/\son([a-z]+)\s*=/gi, (_s, ev: string) => ` on${ev.charAt(0).toUpperCase()}${ev.slice(1).toLowerCase()}=`);

    // known attr renames
    a = a.replace(/\s([a-zA-Z-]+)(\s*=)/g, (_s, name: string, eq: string) => {
      const lower = name.toLowerCase();
      if (HTML_TO_JSX_ATTR[lower]) return ` ${HTML_TO_JSX_ATTR[lower]}${eq}`;
      // data-* and aria-* stay as-is
      if (lower.startsWith("data-") || lower.startsWith("aria-")) return ` ${lower}${eq}`;
      return ` ${name}${eq}`;
    });

    // Boolean attrs without value: readonly, disabled etc → readOnly={true}
    a = a.replace(/\s(readonly|disabled|checked|selected|required|autoplay|controls|loop|muted|hidden|open|reversed|multiple)(?=[\s/>])/gi, (_s, name: string) => {
      const lower = name.toLowerCase();
      const mapped = HTML_TO_JSX_ATTR[lower] || lower;
      return ` ${mapped}`;
    });

    // Self-close void tags if not already
    const isVoid = VOID_TAGS.has(tag.toLowerCase());
    const alreadySelf = /\/\s*$/.test(a);
    if (isVoid && !alreadySelf) {
      return `<${tag}${a.replace(/\s*$/, "")} />`;
    }
    return `<${tag}${a}>`;
  });

  // Normalize &nbsp; entities to {"\u00A0"} to survive JSX
  out = out.replace(/&nbsp;/g, "{'\\u00A0'}");

  return out;
}

export function htmlToTsx(html: string, componentName = "Converted"): string {
  const jsx = htmlToJsx(html).trim();
  const safeName = componentName.replace(/[^A-Za-z0-9_]/g, "") || "Converted";
  return `import type { FC } from "react";

const ${safeName}: FC = () => {
  return (
    <>
${jsx.split("\n").map((l) => "      " + l).join("\n")}
    </>
  );
};

export default ${safeName};
`;
}

export function jsxToTsx(jsx: string, componentName = "Converted"): string {
  const safeName = componentName.replace(/[^A-Za-z0-9_]/g, "") || "Converted";
  // If it already looks like a component, just retype the signature; else wrap.
  const hasComponent = /\b(function|const)\s+[A-Z][A-Za-z0-9_]*/.test(jsx);
  if (hasComponent) {
    // Add `: FC` after `const Name = ` when missing.
    let out = jsx;
    if (!/from ["']react["']/.test(out)) {
      out = `import type { FC } from "react";\n\n` + out;
    }
    out = out.replace(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(/, `const $1: FC = (`);
    return out;
  }
  return `import type { FC } from "react";

const ${safeName}: FC = () => {
  return (
    <>
${jsx.split("\n").map((l) => "      " + l).join("\n")}
    </>
  );
};

export default ${safeName};
`;
}

export function tsxToJsx(tsx: string): string {
  let out = tsx;
  // Drop import type lines and pure `type` / `interface` blocks.
  out = out.replace(/^\s*import\s+type\s+[^;]+;?\s*$/gm, "");
  out = out.replace(/^\s*export\s+type\s+[^;]+;?\s*$/gm, "");
  out = out.replace(/^\s*type\s+\w+[^=]*=\s*[^;]+;?\s*$/gm, "");
  out = out.replace(/^\s*interface\s+\w+[^{]*\{[\s\S]*?\}\s*$/gm, "");
  // Strip generics on function calls / declarations: foo<T>( → foo(
  out = out.replace(/([A-Za-z_$][\w$]*)<[^<>()=;{}]+>\s*\(/g, "$1(");
  // Strip `as Type` casts
  out = out.replace(/\s+as\s+[A-Za-z_$][\w$.<>[\], |&]*/g, "");
  // Strip `: Type` annotations in params & vars (best-effort, stops at , ) = or {)
  out = out.replace(/(\bconst\s+\w+|\blet\s+\w+|\bvar\s+\w+|\b\w+)\s*:\s*[A-Za-z_$][\w$.<>[\], |&?]*(?=\s*[=,)\]{])/g, "$1");
  // Strip return type on functions: ) : Type {  → ) {
  out = out.replace(/\)\s*:\s*[A-Za-z_$][\w$.<>[\], |&?]*(\s*[={])/g, ")$1");
  // Drop non-null assertions foo! → foo (rough)
  out = out.replace(/([A-Za-z_$][\w$)\]]*)!(\W)/g, "$1$2");
  // Clean triple+ blank lines
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim() + "\n";
}

// ─── CSS ↔ Tailwind ──────────────────────────────────────────────────

const CSS_TO_TW: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^display:\s*flex$/, () => "flex"],
  [/^display:\s*inline-flex$/, () => "inline-flex"],
  [/^display:\s*grid$/, () => "grid"],
  [/^display:\s*block$/, () => "block"],
  [/^display:\s*inline-block$/, () => "inline-block"],
  [/^display:\s*inline$/, () => "inline"],
  [/^display:\s*none$/, () => "hidden"],
  [/^flex-direction:\s*row$/, () => "flex-row"],
  [/^flex-direction:\s*column$/, () => "flex-col"],
  [/^flex-wrap:\s*wrap$/, () => "flex-wrap"],
  [/^justify-content:\s*center$/, () => "justify-center"],
  [/^justify-content:\s*space-between$/, () => "justify-between"],
  [/^justify-content:\s*flex-start$/, () => "justify-start"],
  [/^justify-content:\s*flex-end$/, () => "justify-end"],
  [/^align-items:\s*center$/, () => "items-center"],
  [/^align-items:\s*flex-start$/, () => "items-start"],
  [/^align-items:\s*flex-end$/, () => "items-end"],
  [/^text-align:\s*center$/, () => "text-center"],
  [/^text-align:\s*left$/, () => "text-left"],
  [/^text-align:\s*right$/, () => "text-right"],
  [/^font-weight:\s*(\d+)$/, (m) => `font-[${m[1]}]`],
  [/^font-weight:\s*bold$/, () => "font-bold"],
  [/^font-weight:\s*normal$/, () => "font-normal"],
  [/^font-style:\s*italic$/, () => "italic"],
  [/^text-transform:\s*uppercase$/, () => "uppercase"],
  [/^text-transform:\s*lowercase$/, () => "lowercase"],
  [/^text-decoration:\s*underline$/, () => "underline"],
  [/^border-radius:\s*9999px$/, () => "rounded-full"],
  [/^border-radius:\s*(\d+)px$/, (m) => `rounded-[${m[1]}px]`],
  [/^border:\s*1px\s+solid\s+(.+)$/, (m) => `border border-[${m[1]}]`],
  [/^background(?:-color)?:\s*(.+)$/, (m) => `bg-[${m[1]}]`],
  [/^color:\s*(.+)$/, (m) => `text-[${m[1]}]`],
  [/^font-size:\s*(\d+)px$/, (m) => `text-[${m[1]}px]`],
  [/^line-height:\s*([\d.]+)$/, (m) => `leading-[${m[1]}]`],
  [/^padding:\s*(\d+)px$/, (m) => `p-[${m[1]}px]`],
  [/^padding-top:\s*(\d+)px$/, (m) => `pt-[${m[1]}px]`],
  [/^padding-right:\s*(\d+)px$/, (m) => `pr-[${m[1]}px]`],
  [/^padding-bottom:\s*(\d+)px$/, (m) => `pb-[${m[1]}px]`],
  [/^padding-left:\s*(\d+)px$/, (m) => `pl-[${m[1]}px]`],
  [/^margin:\s*(\d+)px$/, (m) => `m-[${m[1]}px]`],
  [/^margin-top:\s*(\d+)px$/, (m) => `mt-[${m[1]}px]`],
  [/^margin-right:\s*(\d+)px$/, (m) => `mr-[${m[1]}px]`],
  [/^margin-bottom:\s*(\d+)px$/, (m) => `mb-[${m[1]}px]`],
  [/^margin-left:\s*(\d+)px$/, (m) => `ml-[${m[1]}px]`],
  [/^width:\s*100%$/, () => "w-full"],
  [/^width:\s*(\d+)px$/, (m) => `w-[${m[1]}px]`],
  [/^height:\s*100%$/, () => "h-full"],
  [/^height:\s*(\d+)px$/, (m) => `h-[${m[1]}px]`],
  [/^gap:\s*(\d+)px$/, (m) => `gap-[${m[1]}px]`],
  [/^position:\s*(absolute|relative|fixed|sticky|static)$/, (m) => m[1]],
  [/^opacity:\s*([\d.]+)$/, (m) => `opacity-[${m[1]}]`],
  [/^cursor:\s*pointer$/, () => "cursor-pointer"],
  [/^overflow:\s*hidden$/, () => "overflow-hidden"],
  [/^overflow:\s*auto$/, () => "overflow-auto"],
  [/^z-index:\s*(-?\d+)$/, (m) => `z-[${m[1]}]`],
  [/^box-shadow:\s*none$/, () => "shadow-none"],
];

export function cssToTailwind(css: string): string {
  // Extract each rule block: selector { decls }
  const blocks: string[] = [];
  const ruleRe = /([^{}]+)\{([^{}]+)\}/g;
  let m: RegExpExecArray | null;
  let hadBlock = false;
  while ((m = ruleRe.exec(css)) !== null) {
    hadBlock = true;
    const selector = m[1].trim();
    const decls = m[2].split(";").map((s) => s.trim()).filter(Boolean);
    const classes: string[] = [];
    const leftover: string[] = [];
    for (const d of decls) {
      let matched = false;
      for (const [re, fn] of CSS_TO_TW) {
        const mm = d.match(re);
        if (mm) { classes.push(fn(mm)); matched = true; break; }
      }
      if (!matched) leftover.push(d + ";");
    }
    let out = `/* ${selector} */\nclass="${classes.join(" ")}"`;
    if (leftover.length) out += `\n/* not mapped: ${leftover.join(" ")} */`;
    blocks.push(out);
  }
  if (!hadBlock) {
    // Treat whole input as a bare decl block
    const decls = css.split(";").map((s) => s.trim()).filter(Boolean);
    const classes: string[] = [];
    const leftover: string[] = [];
    for (const d of decls) {
      let matched = false;
      for (const [re, fn] of CSS_TO_TW) {
        const mm = d.match(re);
        if (mm) { classes.push(fn(mm)); matched = true; break; }
      }
      if (!matched) leftover.push(d + ";");
    }
    let out = `class="${classes.join(" ")}"`;
    if (leftover.length) out += `\n/* not mapped: ${leftover.join(" ")} */`;
    return out;
  }
  return blocks.join("\n\n");
}

const TW_TO_CSS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^flex$/, () => "display: flex;"],
  [/^inline-flex$/, () => "display: inline-flex;"],
  [/^grid$/, () => "display: grid;"],
  [/^block$/, () => "display: block;"],
  [/^inline-block$/, () => "display: inline-block;"],
  [/^inline$/, () => "display: inline;"],
  [/^hidden$/, () => "display: none;"],
  [/^flex-row$/, () => "flex-direction: row;"],
  [/^flex-col$/, () => "flex-direction: column;"],
  [/^flex-wrap$/, () => "flex-wrap: wrap;"],
  [/^justify-center$/, () => "justify-content: center;"],
  [/^justify-between$/, () => "justify-content: space-between;"],
  [/^justify-start$/, () => "justify-content: flex-start;"],
  [/^justify-end$/, () => "justify-content: flex-end;"],
  [/^items-center$/, () => "align-items: center;"],
  [/^items-start$/, () => "align-items: flex-start;"],
  [/^items-end$/, () => "align-items: flex-end;"],
  [/^text-center$/, () => "text-align: center;"],
  [/^text-left$/, () => "text-align: left;"],
  [/^text-right$/, () => "text-align: right;"],
  [/^font-bold$/, () => "font-weight: 700;"],
  [/^font-normal$/, () => "font-weight: 400;"],
  [/^font-semibold$/, () => "font-weight: 600;"],
  [/^italic$/, () => "font-style: italic;"],
  [/^uppercase$/, () => "text-transform: uppercase;"],
  [/^lowercase$/, () => "text-transform: lowercase;"],
  [/^underline$/, () => "text-decoration: underline;"],
  [/^rounded-full$/, () => "border-radius: 9999px;"],
  [/^rounded-\[(.+)\]$/, (m) => `border-radius: ${m[1]};`],
  [/^rounded$/, () => "border-radius: 0.25rem;"],
  [/^rounded-lg$/, () => "border-radius: 0.5rem;"],
  [/^rounded-xl$/, () => "border-radius: 0.75rem;"],
  [/^rounded-2xl$/, () => "border-radius: 1rem;"],
  [/^border$/, () => "border-width: 1px;"],
  [/^border-\[(.+)\]$/, (m) => `border-color: ${m[1]};`],
  [/^bg-\[(.+)\]$/, (m) => `background-color: ${m[1]};`],
  [/^text-\[(.+)\]$/, (m) => `color: ${m[1]};`],
  [/^p-\[(.+)\]$/, (m) => `padding: ${m[1]};`],
  [/^pt-\[(.+)\]$/, (m) => `padding-top: ${m[1]};`],
  [/^pr-\[(.+)\]$/, (m) => `padding-right: ${m[1]};`],
  [/^pb-\[(.+)\]$/, (m) => `padding-bottom: ${m[1]};`],
  [/^pl-\[(.+)\]$/, (m) => `padding-left: ${m[1]};`],
  [/^p-(\d+)$/, (m) => `padding: ${Number(m[1]) * 0.25}rem;`],
  [/^px-(\d+)$/, (m) => `padding-left: ${Number(m[1]) * 0.25}rem; padding-right: ${Number(m[1]) * 0.25}rem;`],
  [/^py-(\d+)$/, (m) => `padding-top: ${Number(m[1]) * 0.25}rem; padding-bottom: ${Number(m[1]) * 0.25}rem;`],
  [/^m-\[(.+)\]$/, (m) => `margin: ${m[1]};`],
  [/^m-(\d+)$/, (m) => `margin: ${Number(m[1]) * 0.25}rem;`],
  [/^mx-(\d+)$/, (m) => `margin-left: ${Number(m[1]) * 0.25}rem; margin-right: ${Number(m[1]) * 0.25}rem;`],
  [/^my-(\d+)$/, (m) => `margin-top: ${Number(m[1]) * 0.25}rem; margin-bottom: ${Number(m[1]) * 0.25}rem;`],
  [/^w-full$/, () => "width: 100%;"],
  [/^w-\[(.+)\]$/, (m) => `width: ${m[1]};`],
  [/^w-(\d+)$/, (m) => `width: ${Number(m[1]) * 0.25}rem;`],
  [/^h-full$/, () => "height: 100%;"],
  [/^h-\[(.+)\]$/, (m) => `height: ${m[1]};`],
  [/^h-(\d+)$/, (m) => `height: ${Number(m[1]) * 0.25}rem;`],
  [/^gap-\[(.+)\]$/, (m) => `gap: ${m[1]};`],
  [/^gap-(\d+)$/, (m) => `gap: ${Number(m[1]) * 0.25}rem;`],
  [/^(absolute|relative|fixed|sticky|static)$/, (m) => `position: ${m[1]};`],
  [/^opacity-\[(.+)\]$/, (m) => `opacity: ${m[1]};`],
  [/^opacity-(\d+)$/, (m) => `opacity: ${Number(m[1]) / 100};`],
  [/^cursor-pointer$/, () => "cursor: pointer;"],
  [/^overflow-hidden$/, () => "overflow: hidden;"],
  [/^overflow-auto$/, () => "overflow: auto;"],
  [/^shadow-none$/, () => "box-shadow: none;"],
  [/^shadow$/, () => "box-shadow: 0 1px 3px rgba(0,0,0,0.1);"],
  [/^shadow-lg$/, () => "box-shadow: 0 10px 15px rgba(0,0,0,0.1);"],
  [/^text-xs$/, () => "font-size: 0.75rem;"],
  [/^text-sm$/, () => "font-size: 0.875rem;"],
  [/^text-base$/, () => "font-size: 1rem;"],
  [/^text-lg$/, () => "font-size: 1.125rem;"],
  [/^text-xl$/, () => "font-size: 1.25rem;"],
  [/^text-2xl$/, () => "font-size: 1.5rem;"],
];

export function tailwindToCss(input: string): string {
  const tokens = input
    .replace(/class(Name)?=/g, "")
    .replace(/["'`]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const decls: string[] = [];
  const unknown: string[] = [];
  for (const tok of tokens) {
    let matched = false;
    for (const [re, fn] of TW_TO_CSS) {
      const mm = tok.match(re);
      if (mm) { decls.push(fn(mm)); matched = true; break; }
    }
    if (!matched) unknown.push(tok);
  }
  let out = ".converted {\n" + decls.map((d) => "  " + d).join("\n") + "\n}";
  if (unknown.length) out += `\n\n/* not mapped: ${unknown.join(" ")} */`;
  return out;
}

// ─── JS Keycode reference ────────────────────────────────────────────

export interface KeycodeRow {
  key: string;
  code: string;
  keyCode: number;
  which: number;
  description: string;
}

export const KEYCODES: KeycodeRow[] = [
  { key: "Backspace", code: "Backspace", keyCode: 8, which: 8, description: "Delete previous character" },
  { key: "Tab", code: "Tab", keyCode: 9, which: 9, description: "Tab / focus move" },
  { key: "Enter", code: "Enter", keyCode: 13, which: 13, description: "Return / submit" },
  { key: "Shift", code: "ShiftLeft", keyCode: 16, which: 16, description: "Shift modifier" },
  { key: "Control", code: "ControlLeft", keyCode: 17, which: 17, description: "Ctrl modifier" },
  { key: "Alt", code: "AltLeft", keyCode: 18, which: 18, description: "Alt / Option" },
  { key: "Pause", code: "Pause", keyCode: 19, which: 19, description: "Pause / Break" },
  { key: "CapsLock", code: "CapsLock", keyCode: 20, which: 20, description: "Caps Lock" },
  { key: "Escape", code: "Escape", keyCode: 27, which: 27, description: "Escape" },
  { key: " ", code: "Space", keyCode: 32, which: 32, description: "Spacebar" },
  { key: "PageUp", code: "PageUp", keyCode: 33, which: 33, description: "Page Up" },
  { key: "PageDown", code: "PageDown", keyCode: 34, which: 34, description: "Page Down" },
  { key: "End", code: "End", keyCode: 35, which: 35, description: "End" },
  { key: "Home", code: "Home", keyCode: 36, which: 36, description: "Home" },
  { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37, which: 37, description: "Left arrow" },
  { key: "ArrowUp", code: "ArrowUp", keyCode: 38, which: 38, description: "Up arrow" },
  { key: "ArrowRight", code: "ArrowRight", keyCode: 39, which: 39, description: "Right arrow" },
  { key: "ArrowDown", code: "ArrowDown", keyCode: 40, which: 40, description: "Down arrow" },
  { key: "Insert", code: "Insert", keyCode: 45, which: 45, description: "Insert" },
  { key: "Delete", code: "Delete", keyCode: 46, which: 46, description: "Forward delete" },
  ...Array.from({ length: 10 }, (_, i) => ({
    key: String(i), code: `Digit${i}`, keyCode: 48 + i, which: 48 + i, description: `Number ${i}`,
  })),
  ...Array.from({ length: 26 }, (_, i) => ({
    key: String.fromCharCode(65 + i),
    code: `Key${String.fromCharCode(65 + i)}`,
    keyCode: 65 + i,
    which: 65 + i,
    description: `Letter ${String.fromCharCode(65 + i)}`,
  })),
  { key: "Meta", code: "MetaLeft", keyCode: 91, which: 91, description: "Windows / Command key" },
  { key: "ContextMenu", code: "ContextMenu", keyCode: 93, which: 93, description: "Right-click menu key" },
  ...Array.from({ length: 12 }, (_, i) => ({
    key: `F${i + 1}`, code: `F${i + 1}`, keyCode: 112 + i, which: 112 + i, description: `Function key F${i + 1}`,
  })),
  { key: "NumLock", code: "NumLock", keyCode: 144, which: 144, description: "Num Lock" },
  { key: "ScrollLock", code: "ScrollLock", keyCode: 145, which: 145, description: "Scroll Lock" },
  { key: ";", code: "Semicolon", keyCode: 186, which: 186, description: "Semicolon" },
  { key: "=", code: "Equal", keyCode: 187, which: 187, description: "Equals" },
  { key: ",", code: "Comma", keyCode: 188, which: 188, description: "Comma" },
  { key: "-", code: "Minus", keyCode: 189, which: 189, description: "Minus" },
  { key: ".", code: "Period", keyCode: 190, which: 190, description: "Period" },
  { key: "/", code: "Slash", keyCode: 191, which: 191, description: "Forward slash" },
  { key: "`", code: "Backquote", keyCode: 192, which: 192, description: "Backtick" },
  { key: "[", code: "BracketLeft", keyCode: 219, which: 219, description: "Left bracket" },
  { key: "\\", code: "Backslash", keyCode: 220, which: 220, description: "Backslash" },
  { key: "]", code: "BracketRight", keyCode: 221, which: 221, description: "Right bracket" },
  { key: "'", code: "Quote", keyCode: 222, which: 222, description: "Apostrophe" },
];
