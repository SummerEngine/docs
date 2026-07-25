#!/usr/bin/env node
/**
 * check-docs.mjs — makes URL-POLICY.md enforceable.
 *
 * Zero dependencies. Node 20+. Run: node scripts/check-docs.mjs
 * Exits 1 if any ERROR is found. Warnings never fail the build.
 *
 * Checks:
 *   1  nav-integrity      every docs.json navigation page exists on disk
 *   2  orphans            .mdx on disk not in navigation                  (warn)
 *   3  url-freeze         deleted/renamed .mdx needs a redirect           <- the point
 *   4  redirect-integrity destinations resolve, no cycles, no shadowing
 *   5  redirect-permanence no redirect entry may be removed
 *   6  internal-links     every internal link hits a page or a redirect
 *   7  images             every referenced /images/... file exists
 *   8  bare-paths         filesystem-shaped bare text outside code        (warn)
 *   9  frontmatter        title required, description recommended
 *   10 generated-pages    generated pages may not be hand-edited alone
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_JSON = join(ROOT, "docs.json");

const USE_COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (USE_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = (s) => c("31", s);
const yellow = (s) => c("33", s);
const green = (s) => c("32", s);
const dim = (s) => c("2", s);
const bold = (s) => c("1", s);

const errors = [];
const warnings = [];
const notes = [];

/** @param {string} check @param {string} where @param {string} msg @param {string} fix */
const err = (check, where, msg, fix) => errors.push({ check, where, msg, fix });
const warn = (check, where, msg, fix) => warnings.push({ check, where, msg, fix });
const note = (msg) => notes.push(msg);

// ---------------------------------------------------------------- git helpers

function git(args, { allowFail = true } = {}) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (e) {
    if (allowFail) return null;
    throw e;
  }
}

const revExists = (rev) => git(["rev-parse", "--verify", "--quiet", `${rev}^{commit}`]) !== null;

/**
 * Find a commit to diff against. Must work locally, in a PR, and on push to main,
 * and must degrade to `null` (skip) rather than crash on a shallow or fresh clone.
 */
function resolveDiffBase() {
  if (process.env.DOCS_CHECK_BASE) {
    const b = process.env.DOCS_CHECK_BASE;
    if (revExists(b)) return { base: b, why: `DOCS_CHECK_BASE=${b}` };
    return { base: null, why: `DOCS_CHECK_BASE=${b} does not resolve to a commit` };
  }

  if (git(["rev-parse", "--is-shallow-repository"]) === "true") {
    return {
      base: null,
      why: "shallow clone (set actions/checkout fetch-depth: 0 so diff-based checks can run)",
    };
  }

  // Pull request: diff against the merge base with the target branch.
  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    for (const cand of [`origin/${baseRef}`, baseRef]) {
      if (revExists(cand)) {
        const mb = git(["merge-base", cand, "HEAD"]);
        if (mb) return { base: mb, why: `merge-base with ${cand}` };
      }
    }
    return { base: null, why: `PR base ref ${baseRef} not fetched` };
  }

  // Push / local: previous commit.
  if (revExists("HEAD~1")) return { base: "HEAD~1", why: "HEAD~1" };
  return { base: null, why: "no parent commit (first commit)" };
}

// ------------------------------------------------------------------ file tree

function walkMdx(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "scripts") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkMdx(full, out);
    else if (entry.name.endsWith(".mdx")) out.push(full);
  }
  return out;
}

/** repo-relative file path -> served URL path. index.mdx -> "/" */
function fileToUrl(absPath) {
  const rel = relative(ROOT, absPath).split(sep).join("/").replace(/\.mdx$/, "");
  return rel === "index" ? "/" : `/${rel}`;
}

/** docs.json navigation entry ("essentials/faq") -> served URL path */
const navEntryToUrl = (entry) => (entry === "index" ? "/" : `/${entry.replace(/^\//, "")}`);

const normalizeUrl = (u) => {
  let s = u.split("#")[0].split("?")[0];
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return s || "/";
};

// -------------------------------------------------------------- docs.json nav

function collectNavPages(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectNavPages(item, out);
    return out;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "pages" && Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") out.push(item);
          else collectNavPages(item, out);
        }
      } else {
        collectNavPages(value, out);
      }
    }
  }
  return out;
}

// ------------------------------------------------------- mdx masking + parsing

/**
 * Return the file's lines with every span that a crawler will NOT treat as prose
 * blanked out (same length, so line numbers and columns stay honest):
 * frontmatter, fenced code blocks, inline code, and MDX {/* comments *␀/}.
 */
function maskMdx(raw) {
  const lines = raw.split("\n");
  const masked = lines.slice();
  const blank = (i) => (masked[i] = " ".repeat(lines[i].length));

  let i = 0;
  // frontmatter
  if (lines[0] !== undefined && /^---\s*$/.test(lines[0])) {
    blank(0);
    i = 1;
    while (i < lines.length && !/^---\s*$/.test(lines[i])) blank(i++);
    if (i < lines.length) blank(i++);
  }

  let fence = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      blank(i);
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1];
      blank(i);
      continue;
    }
    // inline code spans
    masked[i] = line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length));
  }

  // MDX comments {/* ... */} across lines
  let text = masked.join("\n");
  text = text.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (m) => m.replace(/[^\n]/g, " "));
  // HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
  return text.split("\n");
}

function parseFrontmatter(raw) {
  const lines = raw.split("\n");
  if (!/^---\s*$/.test(lines[0] ?? "")) return null;
  const end = lines.findIndex((l, idx) => idx > 0 && /^---\s*$/.test(l));
  if (end === -1) return null;
  const fm = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    fm[m[1]] = v;
  }
  return fm;
}

// ------------------------------------------------------------------ load state

if (!existsSync(DOCS_JSON)) {
  console.error(red("docs.json not found at repo root. Run this from the docs repo."));
  process.exit(1);
}

let config;
try {
  config = JSON.parse(readFileSync(DOCS_JSON, "utf8"));
} catch (e) {
  console.error(red(`docs.json is not valid JSON: ${e.message}`));
  process.exit(1);
}

const mdxFiles = walkMdx(ROOT);
const livePages = new Map(); // url -> repo-relative file
for (const f of mdxFiles) livePages.set(fileToUrl(f), relative(ROOT, f).split(sep).join("/"));

const navEntries = collectNavPages(config.navigation ?? {});
const navUrls = new Set(navEntries.map(navEntryToUrl));

const redirects = Array.isArray(config.redirects) ? config.redirects : [];
const redirectBySource = new Map();
for (const r of redirects) {
  if (!r || typeof r.source !== "string") continue;
  redirectBySource.set(normalizeUrl(r.source), normalizeUrl(String(r.destination ?? "")));
}

// ============================================================ 1. nav integrity

for (const entry of navEntries) {
  const url = navEntryToUrl(entry);
  if (!livePages.has(url)) {
    err(
      "nav-integrity",
      "docs.json",
      `navigation references "${entry}" but ${entry}.mdx does not exist`,
      `create ${entry}.mdx, or remove the entry from docs.json navigation`,
    );
  }
}

// ================================================================= 2. orphans

const orphans = [...livePages.entries()]
  .filter(([url]) => !navUrls.has(url))
  .map(([, file]) => file)
  .sort();

// ============================================================== 3. URL freeze

const { base: diffBase, why: diffWhy } = resolveDiffBase();
let baseConfig = null;

if (!diffBase) {
  note(`URL-freeze and redirect-permanence checks skipped: ${diffWhy}`);
} else {
  const raw = git(["diff", "--name-status", "-M", "--diff-filter=DR", diffBase, "HEAD", "--", "*.mdx"]);
  if (raw === null) {
    note(`URL-freeze check skipped: git diff against ${diffWhy} failed`);
  } else {
    const changes = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split("\t"));

    for (const parts of changes) {
      const status = parts[0];
      if (status.startsWith("D")) {
        const oldFile = parts[1];
        const oldUrl = normalizeUrl(fileToUrl(join(ROOT, oldFile)));
        if (!redirectBySource.has(oldUrl)) {
          err(
            "url-freeze",
            oldFile,
            `live page deleted with no redirect for its URL ${oldUrl}`,
            `add {"source": "${oldUrl}", "destination": "<nearest living page>"} to the redirects array in docs.json — see URL-POLICY.md`,
          );
        }
      } else if (status.startsWith("R")) {
        const [, oldFile, newFile] = parts;
        const oldUrl = normalizeUrl(fileToUrl(join(ROOT, oldFile)));
        const newUrl = normalizeUrl(fileToUrl(join(ROOT, newFile)));
        if (oldUrl === newUrl) continue;
        if (!redirectBySource.has(oldUrl)) {
          err(
            "url-freeze",
            `${oldFile} -> ${newFile}`,
            `live page renamed, old URL ${oldUrl} now 404s`,
            `add {"source": "${oldUrl}", "destination": "${newUrl}"} to the redirects array in docs.json — or revert the rename; URL-POLICY.md says renaming a live file is effectively never right`,
          );
        }
      }
    }
  }

  // ==================================================== 5. redirect permanence
  const baseJson = git(["show", `${diffBase}:docs.json`]);
  if (baseJson === null) {
    note("redirect-permanence check skipped: docs.json did not exist at the diff base");
  } else {
    try {
      baseConfig = JSON.parse(baseJson);
    } catch {
      note("redirect-permanence check skipped: docs.json at the diff base is not valid JSON");
    }
    if (baseConfig) {
      const baseSources = (Array.isArray(baseConfig.redirects) ? baseConfig.redirects : [])
        .filter((r) => r && typeof r.source === "string")
        .map((r) => normalizeUrl(r.source));
      for (const src of baseSources) {
        if (!redirectBySource.has(src)) {
          err(
            "redirect-permanence",
            "docs.json",
            `redirect for "${src}" was removed`,
            `restore it. URL-POLICY.md: redirects are permanent — removing one resurrects a 404 that was already fixed`,
          );
        }
      }
    }
  }
}

// ======================================================= 4. redirect integrity

for (const [source, destination] of redirectBySource) {
  if (livePages.has(source)) {
    err(
      "redirect-integrity",
      "docs.json",
      `redirect source "${source}" shadows the real page ${livePages.get(source)}`,
      `remove the redirect, or move the page — a redirect on a live URL makes the page unreachable`,
    );
  }

  if (!destination) {
    err("redirect-integrity", "docs.json", `redirect "${source}" has no destination`, "add a destination");
    continue;
  }
  if (/^https?:\/\//.test(destination)) continue;

  const seen = [source];
  let cur = destination;
  let hops = 1;
  let cycle = false;

  while (redirectBySource.has(cur)) {
    if (seen.includes(cur)) {
      cycle = true;
      seen.push(cur);
      break;
    }
    seen.push(cur);
    cur = redirectBySource.get(cur);
    hops++;
    if (hops > 25) {
      cycle = true;
      break;
    }
  }

  if (cycle) {
    err(
      "redirect-integrity",
      "docs.json",
      `redirect cycle: ${seen.join(" -> ")}`,
      "point one of these redirects at a real page to break the loop",
    );
    continue;
  }

  if (!livePages.has(cur)) {
    err(
      "redirect-integrity",
      "docs.json",
      `redirect "${source}" resolves to ${cur}, which is not a page on disk`,
      `point it at an existing page (${cur.replace(/^\//, "")}.mdx does not exist)`,
    );
    continue;
  }

  if (hops > 1) {
    warn(
      "redirect-integrity",
      "docs.json",
      `redirect chain ${hops} hops: ${seen.join(" -> ")} -> ${cur}`,
      `repoint "${source}" straight at ${cur}. Keep both entries; chains leak ranking signal at every hop`,
    );
  }
}

// ============================== 6, 7, 8, 9, 10. per-file content checks

const IMAGE_EXT = /\.(png|jpe?g|gif|svg|webp|avif|ico|mp4|webm)$/i;

// Filesystem-shaped bare text. Deliberately narrow: doc routes like /mcp/setup
// must not match, or the warning becomes noise and gets ignored.
const BARE_PATH_PATTERNS = [
  // ./foo or ../foo
  /(?:^|[\s(>"'])(\.\.?\/[A-Za-z0-9._@-]+(?:\/[A-Za-z0-9._@-]+)*\/?)/g,
  // ~/foo — always a home-directory path, never a doc route
  /(?:^|[\s(>"'])(~\/[A-Za-z0-9._@-]+(?:\/[A-Za-z0-9._@-]+)*\/?)/g,
  // absolute paths rooted in a real filesystem directory
  /(?:^|[\s(>"'])(\/(?:Applications|Users|usr|opt|etc|var|tmp|home|Library|System|bin|sbin|private|Volumes|proc|dev|mnt|srv)\/[A-Za-z0-9._@ -]*(?:\/[A-Za-z0-9._@ -]+)*\/?)/g,
  // absolute path ending in a filesystem-ish extension
  /(?:^|[\s(>"'])(\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\.(?:app|exe|dmg|pkg|msi|sh|bat|ps1|py|gd|tscn|tres|cfg|conf|ini|plist|godot|pck|so|dll|dylib|zip|tar|gz|jar|json|toml|ya?ml|env|lock|db|sqlite))(?![A-Za-z0-9])/g,
];

// Marker contract for check 10 (documented in the run banner too).
const GENERATED_KEY = "generated";
const GENERATOR_KEY = "generator";

let changedFiles = new Set();
if (diffBase) {
  const raw = git(["diff", "--name-only", diffBase, "HEAD"]);
  if (raw) changedFiles = new Set(raw.split("\n").map((s) => s.trim()).filter(Boolean));
}

for (const abs of mdxFiles) {
  const rel = relative(ROOT, abs).split(sep).join("/");
  const raw = readFileSync(abs, "utf8");
  const masked = maskMdx(raw);

  // -------------------------------------------------------- 9. frontmatter
  const fm = parseFrontmatter(raw);
  if (!fm || !fm.title) {
    err("frontmatter", `${rel}:1`, "missing frontmatter `title`", "add a title: to the frontmatter block");
  }
  if (fm && !fm.description) {
    warn(
      "frontmatter",
      `${rel}:1`,
      "missing frontmatter `description`",
      "add description: — it is the search snippet and the model-facing summary",
    );
  }

  // ---------------------------------------------------- 10. generated pages
  if (fm && String(fm[GENERATED_KEY]).toLowerCase() === "true") {
    const generator = fm[GENERATOR_KEY];
    if (!generator) {
      err(
        "generated-pages",
        `${rel}:1`,
        `marked \`${GENERATED_KEY}: true\` but has no \`${GENERATOR_KEY}:\` frontmatter key`,
        `add ${GENERATOR_KEY}: <path or source that produces this page>`,
      );
    } else if (changedFiles.has(rel) && !process.env.DOCS_ALLOW_GENERATED_EDIT) {
      const generatorInRepo = existsSync(join(ROOT, generator));
      const generatorChanged = generatorInRepo && changedFiles.has(generator);
      if (!generatorChanged) {
        err(
          "generated-pages",
          rel,
          `generated page was hand-edited without a matching change to its generator (${generator})`,
          generatorInRepo
            ? `fix ${generator} and regenerate, or set DOCS_ALLOW_GENERATED_EDIT=1 for a deliberate one-off`
            : `${generator} is outside this repo — regenerate from source, or set DOCS_ALLOW_GENERATED_EDIT=1 with the regeneration noted in the commit message`,
        );
      }
    }
  }

  // ------------------------------------------- 6 + 7. links and images
  for (let i = 0; i < masked.length; i++) {
    const line = masked[i];
    const lineNo = i + 1;
    if (!line.trim()) continue;

    /** @type {{target: string, kind: "link"|"image"}[]} */
    const targets = [];

    for (const m of line.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) targets.push({ target: m[1], kind: "image" });
    for (const m of line.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)/g)) targets.push({ target: m[1], kind: "link" });
    for (const m of line.matchAll(/\bhref\s*=\s*["']([^"']+)["']/g)) targets.push({ target: m[1], kind: "link" });
    for (const m of line.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/g)) targets.push({ target: m[1], kind: "image" });

    for (const { target, kind } of targets) {
      if (!target.startsWith("/")) continue; // external, anchor, mailto, relative asset
      if (/^\/\//.test(target)) continue; // protocol-relative

      const clean = normalizeUrl(target);

      if (IMAGE_EXT.test(clean) || kind === "image") {
        const onDisk = join(ROOT, clean.replace(/^\//, ""));
        if (!existsSync(onDisk)) {
          err(
            "images",
            `${rel}:${lineNo}`,
            `references ${clean} but that file does not exist`,
            `add the file at ${clean.replace(/^\//, "")}, or remove the reference — never ship a broken image`,
          );
        }
        continue;
      }

      if (livePages.has(clean) || redirectBySource.has(clean)) continue;
      if (existsSync(join(ROOT, clean.replace(/^\//, "")))) continue; // static asset

      err(
        "internal-links",
        `${rel}:${lineNo}`,
        `links to ${clean}, which is neither a page nor a redirect source`,
        `point it at an existing page, or add a redirect for ${clean} in docs.json`,
      );
    }
  }

  // ------------------------------------------------------- 8. bare paths
  for (let i = 0; i < masked.length; i++) {
    let line = masked[i];
    if (!line.trim()) continue;

    // Remove anything already understood as a link/image target or URL, so we
    // only look at prose that a crawler would try to resolve as a relative link.
    line = line
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/\]\([^)]*\)/g, " ")
      .replace(/\b(?:href|src|url|icon|to)\s*=\s*["'][^"']*["']/g, " ");

    const hits = new Set();
    for (const re of BARE_PATH_PATTERNS) {
      // trim sentence punctuation the regex swept up ("./World." -> "./World")
      for (const m of line.matchAll(re)) hits.add(m[1].replace(/[.,;:!?]+$/, ""));
    }
    for (const hit of hits) {
      warn(
        "bare-paths",
        `${rel}:${i + 1}`,
        `bare filesystem path in prose: ${hit}`,
        `wrap it in backticks. Unbackticked, Google resolves it as a relative link and crawls it as a 404 — this has already happened to us three times`,
      );
    }
  }
}

// ==================================================================== report

const byCheck = (list) => {
  const groups = new Map();
  for (const item of list) {
    if (!groups.has(item.check)) groups.set(item.check, []);
    groups.get(item.check).push(item);
  }
  return groups;
};

const printGroup = (groups, label, colorFn) => {
  for (const [check, items] of groups) {
    console.log(`\n${colorFn(`${label} ${check}`)} ${dim(`(${items.length})`)}`);
    for (const it of items) {
      console.log(`  ${bold(it.where)}`);
      console.log(`    ${it.msg}`);
      console.log(`    ${dim("fix:")} ${dim(it.fix)}`);
    }
  }
};

console.log(bold("check-docs") + dim("  — enforcing URL-POLICY.md"));
console.log(
  dim(
    `  ${mdxFiles.length} pages on disk · ${navEntries.length} nav entries · ${redirectBySource.size} redirects · diff base: ${diffBase ? `${diffBase} (${diffWhy})` : "none"}`,
  ),
);

if (errors.length) printGroup(byCheck(errors), "ERROR", red);
if (warnings.length) printGroup(byCheck(warnings), "WARN", yellow);

if (orphans.length) {
  console.log(`\n${yellow("WARN orphans")} ${dim(`(${orphans.length})`)}`);
  console.log(dim("  On disk but not in docs.json navigation. Still live, still crawlable."));
  console.log(dim("  Per URL-POLICY.md this is a legitimate state — be sure it is deliberate."));
  for (const o of orphans) console.log(`  ${o}  ${dim(`-> ${fileToUrl(join(ROOT, o))}`)}`);
}

for (const n of notes) console.log(`\n${dim(`note: ${n}`)}`);

console.log(
  dim(
    `\nGenerated-page marker: frontmatter \`${GENERATED_KEY}: true\` + \`${GENERATOR_KEY}: <source>\`.` +
      ` Editing such a page without touching its generator is an error (override: DOCS_ALLOW_GENERATED_EDIT=1).`,
  ),
);

console.log("");
if (errors.length) {
  console.log(red(bold(`FAIL  ${errors.length} error${errors.length === 1 ? "" : "s"}`)) + dim(`, ${warnings.length + orphans.length} warnings`));
  process.exit(1);
}
console.log(green(bold("PASS")) + dim(`  0 errors, ${warnings.length + orphans.length} warnings`));
