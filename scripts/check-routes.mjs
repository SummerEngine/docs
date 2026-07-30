#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = join(ROOT, "docs.json");
const SNAPSHOT_PATH = join(ROOT, "scripts/docs-routes.snapshot.json");
const WRITE = process.argv[2] === "--write";

if (process.argv.length > (WRITE ? 3 : 2)) {
  console.error("usage: node scripts/check-routes.mjs [--write]");
  process.exit(2);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const navigation = [];

function collectPages(node) {
  if (Array.isArray(node)) {
    for (const value of node) collectPages(value);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (key === "pages" && Array.isArray(value)) {
      for (const page of value) {
        if (typeof page === "string") navigation.push(page);
        else collectPages(page);
      }
    } else {
      collectPages(value);
    }
  }
}

collectPages(config.navigation);
const duplicates = [...new Set(navigation.filter((page, index) => navigation.indexOf(page) !== index))];
if (duplicates.length) {
  console.error(`route snapshot: duplicate navigation routes: ${duplicates.join(", ")}`);
  process.exit(1);
}

const redirects = (config.redirects ?? []).map(({ source, destination }) => ({ source, destination }));
const snapshot = {
  schemaVersion: 1,
  navigation,
  redirects,
};
const rendered = JSON.stringify(snapshot, null, 2) + "\n";

if (WRITE) {
  writeFileSync(SNAPSHOT_PATH, rendered, "utf8");
  console.log(`generated scripts/docs-routes.snapshot.json (${navigation.length} routes, ${redirects.length} redirects)`);
} else {
  let actual;
  try {
    actual = readFileSync(SNAPSHOT_PATH, "utf8");
  } catch {
    console.error("route snapshot: missing scripts/docs-routes.snapshot.json; run `npm run generate:routes`");
    process.exit(1);
  }
  if (actual !== rendered) {
    console.error("route snapshot: stale; inspect docs.json and run `npm run generate:routes`");
    process.exit(1);
  }
  console.log(`route snapshot: PASS ${navigation.length} unique routes, ${redirects.length} redirects`);
}
