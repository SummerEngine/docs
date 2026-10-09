// Small, dependency-free helpers to turn source prose into safe MDX.

/** Escape characters MDX would read as JSX or markdown syntax, outside code spans. */
export function escapeProse(text) {
  if (!text) return "";
  const out = [];
  const lines = String(text).split("\n");
  let fence = null;
  for (const line of lines) {
    const f = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      out.push(line);
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
      continue;
    }
    if (f) {
      fence = f[1];
      out.push(line);
      continue;
    }
    out.push(
      line
        .split(/(`[^`\n]*`)/)
        .map((part, i) => (i % 2 ? part : escapeSpan(part)))
        .join("")
        .replace(/^(\s*)#/, "$1\\#")
        .replace(/^(\s*)(\d+)\.(\s)/, "$1$2\\.$3")
        .replace(/^ {4,}/, "  "),
    );
  }
  if (fence) out.push(fence);
  return out.join("\n");
}

function escapeSpan(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/[{}]/g, (c) => `\\${c}`)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*/g, "\\*")
    .replace(/(^|[\s(])_/g, "$1\\_")
    .replace(/_($|[\s).,:;])/g, "\\_$1")
    .replace(/\[(?=[^\]]*\]\()/g, "\\[");
}

/** One table cell: single line, pipes escaped. */
export function cell(text) {
  return escapeProse(String(text ?? "").replace(/\s*\n\s*/g, " ").trim()).replace(/\|/g, "\\|");
}

/** Inline code that survives backticks inside the value. */
export function code(value) {
  const s = String(value);
  if (!s.includes("`")) return `\`${s}\``;
  return `\`\` ${s} \`\``;
}

/** YAML-safe double-quoted frontmatter string. */
export function fm(value) {
  return JSON.stringify(String(value ?? "").replace(/\s+/g, " ").trim());
}

/** First sentence, for summaries and descriptions. */
export function firstSentence(text, max = 220) {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  const m = flat.match(/^(.+?[.!?])(?:\s|$)/);
  let s = m ? m[1] : flat;
  if (s.length > max) s = s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  return s;
}

export const kebab = (s) =>
  String(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
