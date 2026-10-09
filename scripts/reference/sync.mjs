#!/usr/bin/env node
/**
 * Refresh the pinned reference inputs in scripts/reference/sources from the
 * sources of truth, then regenerate the reference pages.
 *
 *   node scripts/reference/sync.mjs --work <scratch dir> [parts] [options]
 *
 * Parts (default: all):
 *   --mcp       Summer Engine MCP tools (summer-engine npm + hosted MCP)
 *   --http      Summer Platform HTTP API (summer-platform api/*\/openapi.yaml)
 *   --gdscript  In-game Summer GDScript API
 *
 * Options:
 *   --summer-engine <spec>   npm spec for the local MCP (default: summer-engine@latest)
 *   --pse <checkout>         publicsummerengine git checkout (hosted MCP provenance)
 *   --platform <checkout>    summer-platform git checkout (OpenAPI specs)
 *   --engine <checkout>      summerengine git checkout (GDScript bindings)
 *   --ref <git ref>          ref to read in every checkout (default: origin/main)
 *   --no-hosted              keep the hosted tool list from the current snapshot
 *
 * Checkouts are read with `git show <ref>:<path>`; nothing in them is modified.
 * The hosted tool list needs a store sign-in (`summer login --store`) because
 * it is read from the hosted Summer Engine MCP exactly as the npm package
 * mounts it. Docs builds never run this; they only render the pinned inputs
 * (scripts/reference/generate.mjs --check).
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCES = join(HERE, "sources");

function parseArgs(argv) {
  const opts = { parts: new Set(), ref: "origin/main", summerEngine: "summer-engine@latest", hosted: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === "--mcp" || a === "--http" || a === "--gdscript") opts.parts.add(a.slice(2));
    else if (a === "--work") opts.work = resolve(next());
    else if (a === "--summer-engine") opts.summerEngine = next();
    else if (a === "--pse") opts.pse = resolve(next());
    else if (a === "--platform") opts.platform = resolve(next());
    else if (a === "--engine") opts.engine = resolve(next());
    else if (a === "--ref") opts.ref = next();
    else if (a === "--no-hosted") opts.hosted = false;
    else throw new Error(`unknown argument ${a}`);
  }
  if (!opts.parts.size) ["mcp", "http", "gdscript"].forEach((p) => opts.parts.add(p));
  if (!opts.work) throw new Error("--work <scratch dir> is required");
  return opts;
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
  console.log(`wrote ${file.replace(HERE + "/", "scripts/reference/")}`);
};
export const gitIn = (repo) => (...args) =>
  execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 256 << 20 });

async function syncMcp(opts) {
  const { installNpmPackage, readLocalTools, readHostedTools, traceHostedSources, hostedWithSources } = await import(
    "./lib/mcp-source.mjs"
  );
  const file = join(SOURCES, "mcp-tools.json");
  const previous = (() => {
    try {
      return readJson(file);
    } catch {
      return null;
    }
  })();
  const npm = installNpmPackage(opts.work, opts.summerEngine);
  const local = await readLocalTools(npm.dir);
  let hosted;
  let hostedSource;
  if (opts.hosted) {
    if (!opts.pse) throw new Error("--pse <publicsummerengine checkout> is required to trace hosted tools (or pass --no-hosted)");
    const live = await readHostedTools(npm.dir);
    const trace = traceHostedSources(opts.pse, opts.ref, live.tools.map((t) => t.name));
    hosted = { tools: hostedWithSources(live, trace), prompts: live.prompts };
    hostedSource = {
      endpoint: live.endpoint,
      repository: "SummerEngine/publicsummerengine",
      path: "src/lib/mcp/hosted",
      commit: trace.commit,
    };
  } else {
    if (!previous) throw new Error("--no-hosted needs an existing snapshot to keep");
    hosted = { tools: previous.hosted, prompts: previous.hostedPrompts };
    hostedSource = previous.sources.hosted;
  }
  writeJson(file, {
    schemaVersion: 1,
    generatedBy: "scripts/reference/sync.mjs --mcp",
    sources: {
      local: {
        package: "summer-engine",
        repository: "SummerEngine/summer",
        version: npm.version,
        integrity: npm.integrity,
        paths: ["dist/mcp/server.js (tools/list)", "library/tools/*/resource.yaml", "registry/generated/index.json"],
      },
      hosted: hostedSource,
    },
    local: local.tools,
    localPrompts: local.prompts,
    hosted: hosted.tools,
    hostedPrompts: hosted.prompts,
  });
}

async function syncHttp(opts) {
  if (!opts.platform) throw new Error("--platform <summer-platform checkout> is required for --http");
  const { syncOpenApi } = await import("./lib/http-source.mjs");
  await syncOpenApi({ repo: opts.platform, ref: opts.ref, work: opts.work, sources: SOURCES, writeJson });
}

async function syncGdscript(opts) {
  const { syncGdscriptApi } = await import("./lib/gdscript-source.mjs");
  await syncGdscriptApi({ opts, sources: SOURCES, writeJson, gitIn });
}

const opts = parseArgs(process.argv.slice(2));
mkdirSync(opts.work, { recursive: true });
if (opts.parts.has("mcp")) await syncMcp(opts);
if (opts.parts.has("http")) await syncHttp(opts);
if (opts.parts.has("gdscript")) await syncGdscript(opts);
execFileSync(process.execPath, [join(HERE, "generate.mjs")], { stdio: "inherit" });
process.exit(0);
