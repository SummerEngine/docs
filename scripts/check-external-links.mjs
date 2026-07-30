#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALL = process.argv[2] === "--all";

if (process.argv.length > (ALL ? 3 : 2)) {
  console.error("usage: node scripts/check-external-links.mjs [--all]");
  process.exit(2);
}

const walkMdx = (directory, output = []) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "scripts") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walkMdx(path, output);
    else if (entry.name.endsWith(".mdx")) output.push(path);
  }
  return output;
};

const files = ALL
  ? walkMdx(ROOT)
  : [
      "index.mdx",
      "essentials/installation.mdx",
      "quickstarts/fresh-project.mdx",
      "agent-setup.mdx",
      "agent-setup/prompt.mdx",
      "reference/compatibility.mdx",
      "api-reference/summer-sdk.mdx",
      "api-reference/summer-sdk/build-your-first-summer-game.mdx",
      "api-reference/summer-sdk/testing-your-game-locally.mdx",
      "api-reference/summer-sdk/exporting-and-uploading-your-game.mdx",
      "api-reference/summer-sdk/submission-guide.mdx",
      "api-reference/summer-sdk/updating-your-game.mdx",
    ].map((file) => join(ROOT, file));

const sources = new Map();
for (const file of files) {
  const relativePath = relative(ROOT, file).split(sep).join("/");
  const raw = readFileSync(file, "utf8");
  const matches = [
    ...raw.matchAll(/(?<!!)\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g),
    ...raw.matchAll(/\bhref\s*=\s*["'](https?:\/\/[^"']+)["']/g),
  ];
  for (const match of matches) {
    const url = match[1].replace(/[),.;]+$/, "");
    if (!sources.has(url)) sources.set(url, new Set());
    sources.get(url).add(relativePath);
  }
}

const queue = [...sources];
const results = [];
const workers = Array.from({ length: Math.min(8, queue.length) }, async () => {
  while (queue.length) {
    const [url, referencedBy] = queue.shift();
    try {
      const response = await fetch(url.split("#")[0], {
        redirect: "follow",
        headers: {
          "User-Agent": "SummerEngine-docs-link-check/1.0",
          Range: "bytes=0-0",
        },
        signal: AbortSignal.timeout(15_000),
      });
      results.push({
        url,
        status: response.status,
        ok: response.status >= 200 && response.status < 400,
        restricted: response.status === 401 || response.status === 403,
        referencedBy,
      });
      await response.body?.cancel();
    } catch (error) {
      results.push({ url, status: String(error?.message ?? error), ok: false, restricted: false, referencedBy });
    }
  }
});

await Promise.all(workers);
results.sort((left, right) => left.url.localeCompare(right.url, "en"));

const restricted = results.filter((result) => result.restricted);
for (const result of restricted) {
  console.warn(
    `external link warning: ${result.status} ${result.url} ` +
      `(access-controlled or bot-protected; ${[...result.referencedBy].sort().join(", ")})`,
  );
}

const failures = results.filter((result) => !result.ok && !result.restricted);
for (const failure of failures) {
  console.error(
    `external link: ${failure.status} ${failure.url} (${[...failure.referencedBy].sort().join(", ")})`,
  );
}

if (failures.length) {
  console.error(`external links: FAIL ${failures.length}/${results.length}`);
  process.exit(1);
}

console.log(
  `external links: PASS ${results.length} unique URLs across ${files.length} ${ALL ? "all" : "changed"} routes` +
    `${restricted.length ? ` (${restricted.length} access-controlled warning)` : ""}`,
);
