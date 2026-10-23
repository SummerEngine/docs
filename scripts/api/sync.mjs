#!/usr/bin/env node
/**
 * Refresh the pinned Summer API inputs in scripts/api/sources from their
 * source of truth, then regenerate the Summer API pages.
 *
 *   node scripts/api/sync.mjs                          GET www.summerengine.com/v1/models + /v1/openapi.json
 *   node scripts/api/sync.mjs --base <url>             another deployment, e.g. a preview: https://<host>/v1
 *   node scripts/api/sync.mjs --models <file> --openapi <file>   saved answers of the two calls
 *   ... --pse <publicsummerengine checkout>            also refresh model-notes.json from config/models/model-pages.json
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
import { readFileSync, writeFileSync } from "node:fs";
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
};
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
    notes[m.id] = { slug: page.slug, tagline: page.tagline, gameUses: page.gameUses ?? [] };
  }
  if (missing.length) console.warn(`api sync: no model page notes for ${missing.join(", ")}`);
  return { source: { repo: "SummerEngine/PublicSummerEngine", path: "config/models/model-pages.json", commit }, notes };
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

execFileSync(process.execPath, [join(HERE, "generate.mjs")], { stdio: "inherit" });
