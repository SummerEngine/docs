#!/usr/bin/env node
/**
 * Print what a sync changed in scripts/api/sources/models.json: one line per
 * model whose price was added, removed or changed, against git HEAD. Used by
 * .github/workflows/api-price-sync.yml for its alert.
 *
 *   node scripts/api/price-diff.mjs
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FILE = "scripts/api/sources/models.json";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function prices(text) {
  const list = JSON.parse(text).models ?? [];
  return new Map(list.map((model) => [model.id, describe(model.price)]));
}

function describe(price) {
  if (!price) return "no price";
  const extras = (price.modifiers ?? []).map((m) => `${m.field} ${m.add ? `+$${m.add}` : `$${m.price}`}`);
  return [`$${price.price} per ${price.unit}`, price.minimum ? `min $${price.minimum}` : "", ...extras].filter(Boolean).join(", ");
}

let before = new Map();
try {
  before = prices(execFileSync("git", ["show", `HEAD:${FILE}`], { cwd: ROOT, encoding: "utf8" }));
} catch {
  // A first sync has nothing to compare with.
}
const after = prices(readFileSync(join(ROOT, FILE), "utf8"));

const lines = [];
for (const [id, now] of after) {
  const was = before.get(id);
  if (was === undefined) lines.push(`${id}: new, ${now}`);
  else if (was !== now) lines.push(`${id}: ${was} -> ${now}`);
}
for (const id of before.keys()) if (!after.has(id)) lines.push(`${id}: removed`);
console.log(lines.length ? lines.join("\n") : "No model price changed (other model data did).");
