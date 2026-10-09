// Public-text rules applied to every string copied from a source into
// scripts/reference/sources. Summer's own prices, markups and provider costs
// never appear in public docs; a creator's own game price (an input they set)
// is not a Summer price and stays.

const MONEY = /(?:~\s*)?\$\s?\d/;
const COMMERCIAL = /\bprovider costs?\b/i;

/** Remove parentheticals and sentences that state a dollar amount or margin. */
export function redactText(text) {
  if (typeof text !== "string") return text;
  if (!MONEY.test(text) && !COMMERCIAL.test(text)) return text;
  return text
    .split("\n")
    .map((line) => {
      let out = line.replace(/\s*\([^()]*\$\s?\d[^()]*\)/g, "");
      if (!MONEY.test(out) && !COMMERCIAL.test(out)) return out;
      // Drop whole sentences that still carry an amount.
      out = out
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => !MONEY.test(sentence) && !COMMERCIAL.test(sentence))
        .join(" ");
      return out;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Deep-redact every string inside a JSON value. */
export function redactDeep(value) {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)]));
  }
  return value;
}

/** Returns the first offending snippet, or null. Used by --check as a guard. */
export function findPublicTextViolation(text) {
  const money = text.match(/.{0,40}(?:~\s*)?\$\s?\d.{0,40}/);
  if (money) return money[0];
  const commercial = text.match(/.{0,40}\bprovider costs?\b.{0,40}/i);
  if (commercial) return commercial[0];
  return null;
}
