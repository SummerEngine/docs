#!/usr/bin/env node
/**
 * Pin each Summer API model's example outputs from the PublicSummerEngine
 * example catalogs: the real outputs summerengine.com/create shows, each with
 * the model and the prompt that made it (zero dependencies; Node 23 strips
 * the TypeScript types).
 *
 *   node --no-warnings scripts/api/samples.mjs --pse <PublicSummerEngine checkout>
 *
 * Writes scripts/api/sources/model-samples.json: per Summer API model id, up
 * to four samples ({ kind, url, poster, prompt, fromPicture, input }). Every URL is checked
 * with a HEAD request; a sample with a dead file is dropped. Models made by a
 * model Summer does not run (madeWith) are skipped. Run it when the example
 * catalogs change, then `npm run generate:api`.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { register } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "sources", "model-samples.json");
const MAX = 4;
const SITE = "https://www.summerengine.com";

const arg = process.argv.indexOf("--pse");
if (arg < 0 || !process.argv[arg + 1]) {
  console.error("usage: node scripts/api/samples.mjs --pse <PublicSummerEngine checkout>");
  process.exit(2);
}
const PSE = resolve(process.argv[arg + 1]);
const CREATE = join(PSE, "app/(marketing)/[locale]/(core)/create/[category]");

// "@/x" is the PSE root, and the catalogs import their siblings without an extension.
register(
  `data:text/javascript,${encodeURIComponent(`
const ROOT = ${JSON.stringify(pathToFileURL(PSE + "/").href)};
export async function resolve(specifier, context, next) {
  let s = specifier.startsWith("@/") ? new URL(specifier.slice(2), ROOT).href : specifier;
  if ((s.startsWith("file:") || s.startsWith(".")) && !/\\.[cm]?[jt]sx?$/.test(s)) s += ".ts";
  return next(s, context);
}`)}`,
);

const load = (file) => import(pathToFileURL(join(CREATE, file)).href);
const [{ IMAGE_EXAMPLES }, { VIDEO_EXAMPLES }, { MODEL_MEDIA }, { THREE_D_EXAMPLES }, { AUDIO_EXAMPLES }] = await Promise.all([
  load("image/image-examples.ts"),
  load("video/video-examples.ts"),
  load("video/video-model-media.ts"),
  load("3d/three-d-examples.ts"),
  load("audio/audio-examples.ts"),
]);

const catalog = JSON.parse(readFileSync(join(HERE, "sources", "models.json"), "utf8"));
const apiIds = new Set(catalog.models.map((m) => m.id));

// Video: an endpoint id runs the Summer model of its registry row (mcpModelKey);
// a mode the API does not list (reference-to-video) runs the row of its version.
const videoRows = JSON.parse(readFileSync(join(PSE, "config/models/studio-video.json"), "utf8"));
const rows = (Array.isArray(videoRows) ? videoRows : (videoRows.models ?? Object.values(videoRows)[0])).filter((r) => r.mcpModelKey);
function videoId(endpoint) {
  const exact = rows.find((r) => r.id === endpoint);
  if (exact) return `video/${exact.mcpModelKey}`;
  const stem = endpoint.split("/").slice(0, -1).join("/");
  const row = rows.find((r) => r.id.startsWith(`${stem}/`) || r.id === stem);
  return row ? `video/${row.mcpModelKey}` : null;
}

// Audio: the Summer ids of models whose maker's name is not public (src/lib/summer-api/models.ts).
const UNBRANDED = { eleven_v3: "expressive-v3", eleven_multilingual_v2: "multilingual-v2", eleven_flash_v2_5: "flash-v2.5", eleven_text_to_sound_v2: "sfx-v2", music_v2: "music-v2", music_v1: "music-v1" };
const AUDIO_CAP = { text_to_speech: "voice", text_to_dialogue: "dialogue", sound_effects: "sound", music: "music" };

const abs = (url) => (url?.startsWith("/") ? `${SITE}${url}` : url);
const candidates = [];
const add = (id, sample) => id && apiIds.has(id) && candidates.push({ id, ...sample, url: abs(sample.url), poster: abs(sample.poster) });

for (const e of IMAGE_EXAMPLES) add(`image/${e.recreate?.modelId}`, { kind: "image", url: e.src, prompt: e.recreate?.prompt });
const videos = [...MODEL_MEDIA.flatMap((m) => [m.card, ...m.examples]), ...VIDEO_EXAMPLES];
for (const e of videos) add(e.recreate?.modelId && videoId(e.recreate.modelId), { kind: "video", url: e.src, poster: e.poster, prompt: e.recreate?.prompt, fromPicture: e.recreate?.mode === "image" || undefined });
for (const e of THREE_D_EXAMPLES) add(`3d/${e.model}`, { kind: "3d", url: e.glb, poster: e.poster, prompt: e.prompt, fromPicture: e.mode === "image" || undefined, ...(e.sourceImage && { input: abs(e.sourceImage) }) });
for (const e of AUDIO_EXAMPLES) {
  const r = e.recreate;
  if (!r.modelId || r.madeWith) continue;
  add(`${AUDIO_CAP[e.mode]}/${UNBRANDED[r.modelId] ?? r.modelId}`, { kind: "audio", url: e.src, poster: e.cover, prompt: r.words, title: e.title });
}

const alive = new Map();
async function ok(url) {
  if (!url) return true;
  if (!alive.has(url)) {
    alive.set(
      url,
      fetch(url, { method: "HEAD", redirect: "follow" })
        .then((res) => res.ok)
        .catch(() => false),
    );
  }
  return alive.get(url);
}

const out = {};
const dead = [];
for (const c of candidates) {
  const list = (out[c.id] ??= []);
  if (list.length >= MAX || list.some((s) => s.url === c.url)) continue;
  const checks = await Promise.all([ok(c.url), ok(c.poster), ok(c.input)]);
  if (!checks.every(Boolean)) {
    dead.push(c.url);
    continue;
  }
  const { id, ...sample } = c;
  list.push(Object.fromEntries(Object.entries(sample).filter(([, v]) => v !== undefined)));
}
for (const id of Object.keys(out)) if (!out[id].length) delete out[id];

const sorted = Object.fromEntries(Object.keys(out).sort().map((id) => [id, out[id]]));
const missing = catalog.models.map((m) => m.id).filter((id) => !sorted[id]);
const next = JSON.stringify({ source: "PublicSummerEngine app/(marketing)/[locale]/(core)/create example catalogs", samples: sorted }, null, 2) + "\n";
const before = existsSync(OUT) ? readFileSync(OUT, "utf8") : null;
if (before !== next) writeFileSync(OUT, next);
console.log(`samples: ${Object.keys(sorted).length} models with samples, ${dead.length} dead files dropped${before === next ? ", unchanged" : ", wrote sources/model-samples.json"}`);
if (dead.length) console.log(`  dead: ${dead.join("\n        ")}`);
if (missing.length) console.log(`  no samples: ${missing.join(", ")}`);
