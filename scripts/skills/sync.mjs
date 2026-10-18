#!/usr/bin/env node
/**
 * Refresh the pinned skill library in scripts/skills/sources/skills.json from its
 * source of truth, then regenerate the skill pages.
 *
 *   node scripts/skills/sync.mjs --work <scratch dir> [--summer-engine <npm spec>]
 *   node scripts/skills/sync.mjs --summer <checkout>
 *
 * Source of truth: library/skills/<slug>/ (SKILL.md, resource.yaml and any
 * supporting files) in SummerEngine/summer. By default it is read from the
 * summer-engine npm package (summer-engine@latest), the same copy
 * `summer skills install` gives people. With --summer it is read from a working
 * checkout of SummerEngine/summer, for skills not released yet.
 *
 * Docs builds never run this; they only render the pinned input
 * (scripts/skills/generate.mjs --check).
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { installNpmPackage } from "../reference/lib/ops-source.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_FILE = join(HERE, "sources", "skills.json");
const TEXT_FILE = /\.(md|gd|gdshader|gdshaderinc|txt|json|cfg|tscn|tres|py|sh)$/i;

function parseArgs(argv) {
  const opts = { summerEngine: "summer-engine@latest" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === "--work") opts.work = resolve(next());
    else if (a === "--summer-engine") opts.summerEngine = next();
    else if (a === "--summer") opts.summer = resolve(next());
    else throw new Error(`unknown argument ${a}`);
  }
  if (!opts.summer && !opts.work) throw new Error("--work <scratch dir> is required (or --summer <checkout>)");
  return opts;
}

/** Split a SKILL.md into its frontmatter `name`/`description` and its body. */
function splitSkill(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { name: null, description: null, body: raw };
  const field = (key) => {
    const line = m[1].match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
    if (!line) return null;
    const v = line[1].trim();
    if (v.startsWith('"')) {
      try {
        return JSON.parse(v);
      } catch {
        return v.slice(1, -1);
      }
    }
    return v.replace(/^'|'$/g, "");
  };
  return { name: field("name"), description: field("description"), body: m[2] };
}

function listFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith(".")) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative(dir, p).split(sep).join("/"));
    }
  };
  walk(dir);
  return out;
}

export function readLibrary(root) {
  const index = JSON.parse(readFileSync(join(root, "registry/generated/index.json"), "utf8"));
  const meta = new Map(index.resources.filter((r) => r.kind === "skill").map((r) => [r.id.replace(/^skill\//, ""), r]));
  const skillsDir = join(root, "library/skills");
  const skills = [];
  for (const slug of readdirSync(skillsDir).sort()) {
    const dir = join(skillsDir, slug);
    if (!existsSync(join(dir, "SKILL.md"))) continue;
    const r = meta.get(slug);
    if (!r) throw new Error(`library/skills/${slug} is not in registry/generated/index.json`);
    const { name, description, body } = splitSkill(readFileSync(join(dir, "SKILL.md"), "utf8"));
    const files = listFiles(dir)
      // tests/ holds the skill's eval specs, not guidance for agents.
      .filter((f) => f !== "SKILL.md" && f !== "resource.yaml" && !f.startsWith("tests/") && TEXT_FILE.test(f))
      .map((path) => ({ path, content: readFileSync(join(dir, path), "utf8") }));
    skills.push({
      slug,
      name: name ?? slug,
      description: description ?? r.summary,
      summary: r.summary,
      version: r.version,
      status: r.status,
      recommended: !!r.recommended,
      useWhen: r.use_when ?? [],
      domains: r.facets?.domains ?? [],
      engine: r.compatibility?.engine ?? null,
      related: (r.related?.skills ?? []).map((id) => id.replace(/^skill\//, "")),
      body,
      files,
    });
  }
  return skills;
}

const opts = parseArgs(process.argv.slice(2));
let root;
let source;
if (opts.summer) {
  root = opts.summer;
  const commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  source = { kind: "checkout", repo: "SummerEngine/summer", commit };
} else {
  mkdirSync(opts.work, { recursive: true });
  const npm = installNpmPackage(opts.work, opts.summerEngine);
  root = join(npm.dir, "node_modules", "summer-engine");
  source = { kind: "npm", package: "summer-engine", version: npm.version, integrity: npm.integrity };
}

const skills = readLibrary(root);
mkdirSync(dirname(SOURCE_FILE), { recursive: true });
writeFileSync(SOURCE_FILE, JSON.stringify({ source, skills }, null, 2) + "\n");
console.log(`wrote scripts/skills/sources/skills.json: ${skills.length} skills from ${source.kind === "npm" ? `summer-engine ${source.version}` : `SummerEngine/summer ${source.commit.slice(0, 10)}`}`);
execFileSync(process.execPath, [join(HERE, "generate.mjs")], { stdio: "inherit" });
