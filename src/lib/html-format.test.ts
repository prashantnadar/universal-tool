import { describe, it, expect } from "vitest";
import { formatHtml } from "./html-format";

describe("formatHtml — whitespace collapsing", () => {
  it("collapses runs of spaces inside a text node", () => {
    const { output } = formatHtml("<p>Hello                 <strong>world</strong></p>");
    expect(output).toBe("<p>Hello <strong>world</strong></p>");
  });

  it("collapses tabs and newlines like the browser", () => {
    const { output } = formatHtml("<p>Hello\n\t   \n  world</p>");
    expect(output).toBe("<p>Hello world</p>");
  });

  it("preserves content inside <pre> verbatim", () => {
    const src = "<pre>  line one\n    line two   </pre>";
    const { output } = formatHtml(src);
    expect(output).toContain("  line one\n    line two   ");
  });

  it("preserves content inside <script>", () => {
    const src = "<script>if (a  <  b)   { x = '  hi  '; }</script>";
    const { output } = formatHtml(src);
    expect(output).toBe("<script>if (a  <  b)   { x = '  hi  '; }</script>");
  });

  it("preserves single space between inline siblings", () => {
    const { output } = formatHtml("<p><span>a</span>   <span>b</span></p>");
    expect(output).toBe("<p><span>a</span> <span>b</span></p>");
  });

  it("indents nested block elements and trims their text edges", () => {
    const { output } = formatHtml("<div>   <h1>Title</h1>  <p>  Hi   </p>  </div>");
    expect(output).toBe(["<div>", "  <h1>Title</h1>", "  <p>Hi</p>", "</div>"].join("\n"));
  });

  it("collapses text across inline element boundaries", () => {
    const { output } = formatHtml("<p>Hello   <strong>   world   </strong>   !</p>");
    expect(output).toBe("<p>Hello <strong>world</strong> !</p>");
  });

  it("handles void elements without needing a close tag", () => {
    const { output } = formatHtml("<p>a<br>b<img src=\"x\">c</p>");
    expect(output).toBe("<p>a<br>b<img src=\"x\">c</p>");
  });
});

describe("formatHtml — validation warnings", () => {
  it("reports unclosed tags at end of input", () => {
    const { warnings } = formatHtml("<div><p>hi");
    expect(warnings.some((w) => w.kind === "unclosed")).toBe(true);
  });

  it("reports stray closing tags", () => {
    const { warnings } = formatHtml("<div>hi</span></div>");
    expect(warnings.some((w) => w.kind === "mismatched")).toBe(true);
  });

  it("reports unterminated comments and recovers", () => {
    const { warnings, output } = formatHtml("<!-- oops");
    expect(warnings.some((w) => w.kind === "unclosed")).toBe(true);
    expect(output).toContain("<!--");
  });

  it("returns empty warning for empty input", () => {
    const { warnings } = formatHtml("   ");
    expect(warnings.some((w) => w.kind === "empty")).toBe(true);
  });

  it("recovers from mis-nested tags without throwing", () => {
    expect(() => formatHtml("<b><i>hi</b></i>")).not.toThrow();
  });
});

describe("formatHtml — tricky whitespace edge cases", () => {
  it("keeps a single space between two adjacent inline elements separated by whitespace", () => {
    const { output } = formatHtml("<p><a>one</a>\n   <a>two</a></p>");
    expect(output).toBe("<p><a>one</a> <a>two</a></p>");
  });

  it("does NOT introduce a space between inline elements with no whitespace between them", () => {
    const { output } = formatHtml("<p><a>one</a><a>two</a></p>");
    expect(output).toBe("<p><a>one</a><a>two</a></p>");
  });

  it("handles deeply nested inline elements on one line", () => {
    const { output } = formatHtml("<p>a <em>b <strong>c <u>d</u> e</strong> f</em> g</p>");
    expect(output).toBe("<p>a <em>b <strong>c <u>d</u> e</strong> f</em> g</p>");
  });

  it("preserves HTML entities in text runs without altering them", () => {
    const { output } = formatHtml("<p>1 &lt; 2 &amp;&amp; 3 &gt; 2 &nbsp; ok</p>");
    expect(output).toBe("<p>1 &lt; 2 &amp;&amp; 3 &gt; 2 &nbsp; ok</p>");
  });

  it("collapses whitespace around entities without eating them", () => {
    const { output } = formatHtml("<p>a   &amp;   b</p>");
    expect(output).toBe("<p>a &amp; b</p>");
  });

  it("mixes text, inline elements, and entities on one block line", () => {
    const { output } = formatHtml("<p>Hello &nbsp; <strong>world</strong>   &mdash;   done</p>");
    expect(output).toBe("<p>Hello &nbsp; <strong>world</strong> &mdash; done</p>");
  });

  it("mixes block and inline siblings correctly", () => {
    const src = "<div><h1>Hi</h1><p>a <b>b</b> c</p><p>x</p></div>";
    const { output } = formatHtml(src);
    expect(output).toBe([
      "<div>",
      "  <h1>Hi</h1>",
      "  <p>a <b>b</b> c</p>",
      "  <p>x</p>",
      "</div>",
    ].join("\n"));
  });

  it("collapses leading and trailing whitespace inside a block", () => {
    const { output } = formatHtml("<p>   hi there   </p>");
    expect(output).toBe("<p>hi there</p>");
  });

  it("handles <br> mid-sentence without breaking the inline run", () => {
    const { output } = formatHtml("<p>line1<br>line2   <br>   line3</p>");
    expect(output).toBe("<p>line1<br>line2 <br> line3</p>");
  });

  it("preserves attribute quoting on the opening tag", () => {
    const { output } = formatHtml('<a href="/x" class="btn">click</a>');
    expect(output).toBe('<a href="/x" class="btn">click</a>');
  });

  it("keeps <style> content byte-for-byte", () => {
    const src = "<style>\n  .a { color: red;   padding: 10px; }\n</style>";
    const { output } = formatHtml(src);
    expect(output).toContain(".a { color: red;   padding: 10px; }");
  });

  it("does not collapse whitespace inside <textarea>", () => {
    const src = "<textarea>a   b\n   c</textarea>";
    const { output } = formatHtml(src);
    expect(output).toContain("a   b\n   c");
  });

  it("handles case-insensitive tag names (normalizes close tags to lowercase)", () => {
    const { output } = formatHtml("<DIV><P>Hi   there</P></DIV>");
    expect(output).toBe(["<DIV>", "  <P>Hi there</p>", "</div>"].join("\n"));
  });

  it("keeps comments on their own line at block level", () => {
    const { output } = formatHtml("<div><!-- note --><p>x</p></div>");
    expect(output).toBe(["<div>", "  <!-- note -->", "  <p>x</p>", "</div>"].join("\n"));
  });
});

