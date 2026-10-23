#!/usr/bin/env node
/**
 * Refresh the pinned Summer API inputs in scripts/api/sources from their
 * source of truth, then regenerate the Summer API pages.
 *
 *   node scripts/api/sync.mjs                          GET www.summerengine.com/v1/models + /v1/openapi.json
 *   node scripts/api/sync.mjs --base <url>             another deployment, e.g. a preview: https://<host>/v1
 *   node scripts/api/sync.mjs --models <file> --openapi <file>   saved answers of the two calls
 *   ... --pse <publicsummerengine checkout>            also refresh model-notes.json from config/models/model-pages.json
 *   ... --router <summer-platform checkout or ref dir>  also refresh the Summer Router registry and default caps:
 *       contracts/summer-router/registry.json and the summer.router_policy row of its migration
 *   ... --router-models <file or url>                   the Summer Router price list, GET /v1/router/models
 *       (production: https://api.summer.games/v1/router/models)
 *
 * Source of truth: the Summer API itself. GET /v1/models is the one model list
 * with prices (the same numbers POST /v1/estimate quotes and a job charges);
 * GET /v1/openapi.json is generated from the same operations. Prices are never
 * typed by hand: they come from here or nowhere.
 *
 * Docs builds never run this; they only render the pinned inputs
 * (scripts/api/generate.mjs --check).
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCES = join(HERE, "sources");
const DEFAULT_BASE = "https://www.summerengine.com/v1";

function parseArgs(argv) {
  const opts = { base: DEFAULT_BASE };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === "--base") opts.base = next().replace(/\/$/, "");
    else if (a === "--models") opts.models = resolve(next());
    else if (a === "--openapi") opts.openapi = resolve(next());
    else if (a === "--pse") opts.pse = resolve(next());
    else if (a === "--router") opts.router = resolve(next());
    else if (a === "--router-models") opts.routerModels = next();
    else throw new Error(`unknown argument ${a}`);
  }
  if (Boolean(opts.models) !== Boolean(opts.openapi)) throw new Error("--models and --openapi go together");
  return opts;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${url}: ${res.status} (the Summer API answers 404 until it is on for that deployment)`);
  return res.json();
}

/** The op answer, unwrapped when the file is a saved models.list answer. */
const unwrap = (value) => (value && value.ok === true && value.result ? value.result : value);

// Model page notes (tagline, game uses) live in publicsummerengine under the
// /models page slugs; these are the Summer API ids whose page has another name.
const NOTE_SLUGS = {
  "image/gemini-flash": "gemini-2-5-flash-image",
  "3d/hunyuan-3d": "hunyuan-3d-3-1-pro",
  "3d/hunyuan-3d-rapid": "hunyuan-3d-3-1-rapid",
  "video/kling-3": "kling-3-0",
  "video/kling-3-pro": "kling-3-0",
  "video/gemini-omni-flash-1.1": "gemini-omni-flash",
  "sound/eleven_text_to_sound_v2": "eleven-text-to-sound-v2",
  "voice/expressive-v3": "eleven-v3",
  "dialogue/expressive-v3": "eleven-v3",
  "voice/multilingual-v2": "eleven-multilingual-v2",
  "voice/flash-v2.5": "eleven-flash-v2-5",
  "sound/sfx-v2": "eleven-text-to-sound-v2",
  "music/music-v2": "eleven-music-v2",
  "music/music-v1": "eleven-music-v1",
};
// A model the API lists under Summer's own name keeps no line that names who makes it.
const NAMES_A_MAKER = /\b(?:Eleven\w*|Google|OpenAI|Meta|xAI|ByteDance|Tencent|Alibaba)\b/;
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

function modelNotes(pse, models) {
  const raw = execFileSync("git", ["-C", pse, "show", "origin/main:config/models/model-pages.json"], { encoding: "utf8" });
  const commit = execFileSync("git", ["-C", pse, "rev-parse", "origin/main"], { encoding: "utf8" }).trim();
  const pages = JSON.parse(raw).pages.filter((p) => p.status === "live");
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  const byName = new Map(pages.map((p) => [norm(p.name), p]));
  const notes = {};
  const missing = [];
  for (const m of models) {
    const page = bySlug.get(NOTE_SLUGS[m.id]) ?? byName.get(norm(m.name));
    if (!page) {
      missing.push(m.id);
      continue;
    }
    const own = m.vendor === "Summer";
    const keep = (line) => !own || !NAMES_A_MAKER.test(line);
    notes[m.id] = { tagline: keep(page.tagline) ? page.tagline : null, gameUses: (page.gameUses ?? []).filter(keep) };
  }
  if (missing.length) console.warn(`api sync: no model page notes for ${missing.join(", ")}`);
  return { source: { repo: "SummerEngine/PublicSummerEngine", path: "config/models/model-pages.json", commit }, notes };
}

/** The default caps and their ceilings, read from the migration that writes summer.router_policy. */
function routerPolicy(sql) {
  const table = sql.match(/CREATE TABLE summer\.router_policy \(([\s\S]*?)\n\);/)?.[1];
  const insert = sql.match(/INSERT INTO summer\.router_policy \(([^)]*)\)\s*VALUES \(([^)]*)\)/);
  if (!table || !insert) throw new Error("no summer.router_policy table and row in the migration");
  const columns = insert[1].split(",").map((c) => c.trim());
  const values = insert[2].split(",").map((v) => v.trim());
  const policy = Object.fromEntries(columns.map((c, i) => [c, /^\d+$/.test(values[i]) ? Number(values[i]) : values[i]]));
  const ceilings = Object.fromEntries([...table.matchAll(/^\s*(\w+) \w+ NOT NULL CHECK \(\1 BETWEEN 1 AND (\d+)\)/gm)].map((m) => [m[1], Number(m[2])]));
  delete policy.singleton;
  delete policy.charging;
  return { ...policy, ceilings };
}

function readRouter(dir) {
  const migrations = join(dir, "db/postgres/platform/migrations");
  const file = readdirSync(migrations).filter((f) => f.endsWith("_summer_router.sql")).sort().at(-1);
  if (!file) throw new Error(`no *_summer_router.sql in ${migrations}`);
  // The docs need the kinds, errors and limit keys. Which providers serve a kind, and the provider
  // options of the character schema, are Summer's business: the pinned copy leaves them out.
  const registry = JSON.parse(readFileSync(join(dir, "contracts/summer-router/registry.json"), "utf8"));
  delete registry.providers;
  delete registry.schemas;
  for (const kind of registry.kinds) delete kind.providers;
  return {
    registry,
    policy: { source: `db/postgres/platform/migrations/${file}`, ...routerPolicy(readFileSync(join(migrations, file), "utf8")) },
  };
}

const opts = parseArgs(process.argv.slice(2));
const models = unwrap(opts.models ? JSON.parse(readFileSync(opts.models, "utf8")) : await getJson(`${opts.base}/models`));
const openapi = opts.openapi ? JSON.parse(readFileSync(opts.openapi, "utf8")) : await getJson(`${opts.base}/openapi.json`);
if (!Array.isArray(models?.models) || !models.models.length) throw new Error("the model list has no models");
if (openapi?.openapi?.startsWith("3.") !== true) throw new Error("not an OpenAPI 3 document");

const write = (name, value) => writeFileSync(join(SOURCES, name), JSON.stringify(value, null, 2) + "\n");
write("models.json", { source: opts.models ? "file" : `${opts.base}/models`, ...models });
// The spec names the deployment it came from; the docs always point at production.
write("openapi.json", { ...openapi, servers: [{ url: DEFAULT_BASE }] });
if (opts.pse) write("model-notes.json", modelNotes(opts.pse, models.models));
if (opts.router) {
  const { registry, policy } = readRouter(opts.router);
  write("router-registry.json", registry);
  write("router-policy.json", policy);
}
if (opts.routerModels) {
  const list = /^https?:/.test(opts.routerModels) ? await getJson(opts.routerModels) : JSON.parse(readFileSync(resolve(opts.routerModels), "utf8"));
  if (!Array.isArray(list?.models) || !list.models.length) throw new Error("the Router price list has no models");
  write("router-models.json", list);
}

execFileSync(process.execPath, [join(HERE, "generate.mjs")], { stdio: "inherit" });
