#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(readFileSync(join(ROOT, "scripts/docs-capability-policy.json"), "utf8"));
const config = JSON.parse(readFileSync(join(ROOT, "docs.json"), "utf8"));
const errors = [];

if (policy.schemaVersion !== 1) {
  errors.push(`unsupported capability policy schema ${JSON.stringify(policy.schemaVersion)}`);
}

const navigation = [];
function collectNavigation(node) {
  if (Array.isArray(node)) {
    for (const value of node) collectNavigation(value);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (key === "pages" && Array.isArray(value)) {
      for (const page of value) {
        if (typeof page === "string") navigation.push(page);
        else collectNavigation(page);
      }
    } else {
      collectNavigation(value);
    }
  }
}
collectNavigation(config.navigation);

const routeToFile = (route) => (route === "index" ? "index.mdx" : `${route.replace(/^\//, "")}.mdx`);
const publicFiles = navigation.map(routeToFile);
const publicSet = new Set(publicFiles);
const canonicalPage = policy.canonicalPage;

if (!publicSet.has(canonicalPage)) {
  errors.push(`canonical capability page is not discoverable in public navigation: ${canonicalPage}`);
}

let canonicalRaw = "";
try {
  canonicalRaw = readFileSync(join(ROOT, canonicalPage), "utf8");
} catch {
  errors.push(`canonical capability page is missing: ${canonicalPage}`);
}

if (canonicalRaw && !canonicalRaw.includes(policy.canonicalFrontmatter)) {
  errors.push(`${canonicalPage} is missing canonical marker ${JSON.stringify(policy.canonicalFrontmatter)}`);
}
for (const term of policy.requiredCanonicalTerms ?? []) {
  if (!canonicalRaw.includes(term)) {
    errors.push(`${canonicalPage} is missing required capability status ${JSON.stringify(term)}`);
  }
}

let canonicalMarkers = 0;
for (const file of publicFiles) {
  let raw;
  try {
    raw = readFileSync(join(ROOT, file), "utf8");
  } catch {
    errors.push(`cannot scan public capability route: ${file}`);
    continue;
  }

  if (raw.includes(policy.canonicalFrontmatter)) canonicalMarkers++;
  const lower = raw.toLocaleLowerCase("en-US");
  for (const claim of policy.blockedClaims ?? []) {
    if (lower.includes(String(claim.match).toLocaleLowerCase("en-US"))) {
      errors.push(`${file} [blocked-capability-claim] ${JSON.stringify(claim.match)} — ${claim.reason}`);
    }
  }
}

if (canonicalMarkers !== 1) {
  errors.push(`expected exactly one canonical capability marker across public routes, found ${canonicalMarkers}`);
}

for (const file of policy.requiredDisclosures ?? []) {
  if (!publicSet.has(file)) {
    errors.push(`required capability-disclosure file is not a public navigation route: ${file}`);
    continue;
  }
  const raw = readFileSync(join(ROOT, file), "utf8");
  if (!raw.includes("knowledge-base/source-status")) {
    errors.push(`${file} must link to the canonical platform capability status`);
  }
}

if (errors.length) {
  console.error(`capability guard: FAIL (${errors.length})`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(
  `capability guard: PASS ${publicFiles.length} public routes, one canonical status source, ` +
    `${(policy.blockedClaims ?? []).length} blocked overclaims`,
);
