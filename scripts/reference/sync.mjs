#!/usr/bin/env node
/**
 * Refresh the pinned reference inputs in scripts/reference/sources from the
 * sources of truth, then regenerate the reference pages.
 *
 *   node scripts/reference/sync.mjs --work <scratch dir> [parts] [options]
 *
 * Parts (default: all):
 *   --http      Summer Platform HTTP API (summer-platform api/*\/openapi.yaml)
 *   --gdscript  In-game Summer GDScript API
 *   --ops       Summer operation catalog: the public catalog the summer-engine npm
 *               package ships (or, with --pse, publicsummerengine's own copy) and the
 *               package's engine and local operations
 *
 * Options:
 *   --summer-engine <spec>   npm spec for the engine and local operations (default: summer-engine@latest)
 *   --pse <checkout>         read the operation catalog from a publicsummerengine checkout
 *                            instead of the npm package (for a catalog not yet released)
 *   --platform <checkout>    summer-platform git checkout (OpenAPI specs)
 *   --engine <checkout>      summerengine git checkout (GDScript bindings)
 *   --ref <git ref>          ref to read in every checkout (default: origin/main)
 *
 * Checkouts are read with `git show <ref>:<path>`; nothing in them is modified.
 * Docs builds never run this; they only render the pinned inputs
 * (scripts/reference/generate.mjs --check).
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCES = join(HERE, "sources");

function parseArgs(argv) {
  const opts = { parts: new Set(), ref: "origin/main", summerEngine: "summer-engine@latest" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === "--http" || a === "--gdscript" || a === "--ops") opts.parts.add(a.slice(2));
    else if (a === "--work") opts.work = resolve(next());
    else if (a === "--summer-engine") opts.summerEngine = next();
    else if (a === "--pse") opts.pse = resolve(next());
    else if (a === "--platform") opts.platform = resolve(next());
    else if (a === "--engine") opts.engine = resolve(next());
    else if (a === "--ref") opts.ref = next();
    else throw new Error(`unknown argument ${a}`);
  }
  if (!opts.parts.size) ["http", "gdscript", "ops"].forEach((p) => opts.parts.add(p));
  if (!opts.work) throw new Error("--work <scratch dir> is required");
  return opts;
}

const writeJson = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
  console.log(`wrote ${file.replace(HERE + "/", "scripts/reference/")}`);
};
export const gitIn = (repo) => (...args) =>
  execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 256 << 20 });

async function syncOps(opts) {
  const { installNpmPackage, readCloudCatalog, readPackagedCatalog, readLocalOperations, operationsSource } = await import("./lib/ops-source.mjs");
  const npm = installNpmPackage(opts.work, opts.summerEngine);
  const cloud = opts.pse ? readCloudCatalog(gitIn(opts.pse), opts.ref) : readPackagedCatalog(npm.dir);
  if (!cloud) {
    console.log(`::notice::summer-engine ${npm.version} ships no operation catalog; operations were not synced (pass --pse <publicsummerengine checkout>)`);
    return;
  }
  const local = await readLocalOperations(npm.dir);
  if (!local) console.log(`summer-engine ${npm.version} has no operation catalog; engine and local operations keep their names only`);
  writeJson(join(SOURCES, "operations.json"), operationsSource(cloud, local, npm));
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
if (opts.parts.has("http")) await syncHttp(opts);
if (opts.parts.has("gdscript")) await syncGdscript(opts);
if (opts.parts.has("ops")) await syncOps(opts);
execFileSync(process.execPath, [join(HERE, "generate.mjs")], { stdio: "inherit" });
process.exit(0);
