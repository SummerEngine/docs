// JSON Schema helpers for the generated reference pages: an input table and a
// collapsible schema block.

import { cell, code } from "./mdx.mjs";

function typeOf(s) {
  if (!s || typeof s !== "object") return "any";
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (s.const !== undefined) return JSON.stringify(s.const);
  const alts = s.anyOf ?? s.oneOf;
  if (alts) return [...new Set(alts.map(typeOf))].join(" | ");
  if (Array.isArray(s.type)) return s.type.join(" | ");
  if (s.type === "array") return `${typeOf(s.items)}[]`;
  return s.type ?? (s.properties ? "object" : "any");
}

function constraints(s) {
  const bits = [];
  if (s.default !== undefined) bits.push(`Default ${code(JSON.stringify(s.default))}.`);
  if (s.minimum !== undefined || s.maximum !== undefined) bits.push(`Range ${s.minimum ?? "…"} to ${s.maximum ?? "…"}.`);
  if (s.minLength !== undefined || s.maxLength !== undefined) bits.push(`Length ${s.minLength ?? 0} to ${s.maxLength ?? "…"}.`);
  if (s.minItems !== undefined || s.maxItems !== undefined) bits.push(`Items ${s.minItems ?? 0} to ${s.maxItems ?? "…"}.`);
  return bits.join(" ");
}

function rows(schema, prefix = "", required = new Set(), depth = 0, out = []) {
  for (const [name, s] of Object.entries(schema?.properties ?? {})) {
    const full = prefix + name;
    out.push(
      `| ${code(full)} | ${cell(typeOf(s))} | ${required.has(name) ? "Yes" : "No"} | ${cell([s.description, constraints(s)].filter(Boolean).join(" "))} |`,
    );
    if (depth < 2) {
      if (s.type === "object" && s.properties) rows(s, `${full}.`, new Set(s.required ?? []), depth + 1, out);
      if (s.type === "array" && s.items?.properties) rows(s.items, `${full}[].`, new Set(s.items.required ?? []), depth + 1, out);
    }
  }
  return out;
}

export function inputTable(schema) {
  const r = rows(schema, "", new Set(schema?.required ?? []));
  if (!r.length) return "No inputs.";
  return ["| Input | Type | Required | Description |", "|---|---|---|---|", ...r].join("\n");
}

export function schemaBlock(title, schema) {
  const { $schema, ...rest } = schema ?? {};
  return [`<Accordion title="${title}">`, "", "```json", JSON.stringify(rest, null, 2), "```", "", "</Accordion>"].join("\n");
}
