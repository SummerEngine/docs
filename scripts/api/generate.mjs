#!/usr/bin/env node
/**
 * Render the generated Summer API pages from the pinned inputs in
 * scripts/api/sources (zero dependencies, no network).
 *
 *   node scripts/api/generate.mjs           write pages, llms.txt and the Summer API tab in docs.json
 *   node scripts/api/generate.mjs --check   fail if anything on disk differs, or a price guard fails (CI)
 *
 * Generated:
 *   api/models                     Models and pricing: one table per capability, from GET /v1/models
 *   api/models/<capability>/<id>   one page per model: price, best for, input, example call
 *   api/reference/*                API reference (Mintlify OpenAPI pages) from GET /v1/openapi.json
 *   llms.txt                       the agent block, then every page in the navigation
 *   docs.json                      the Summer API tab
 *
 * Price guard: Summer API asset prices appear only on the generated pages above,
 * read from sources/models.json. A hand-written page under api/ that types a
 * dollar amount fails, and no page under api/ may name a markup, a margin or
 * a provider cost.
 *
 * To refresh the inputs from the Summer API, run scripts/api/sync.mjs.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { cell, code, escapeProse, fm } from "../reference/lib/mdx.mjs";
import { ROUTER_HAND_WRITTEN, ROUTER_TAB, routerPages } from "./router.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const SOURCES = join(HERE, "sources");
const CHECK = process.argv.includes("--check");
const GENERATOR = "scripts/api";
const BASE_URL = "https://www.summerengine.com/v1";
const DOCS_URL = "https://docs.summerengine.com";
const SPEC = "/scripts/api/sources/openapi.json";
const MODELS_PAGE = "api/models";
const MODELS_DIR = "api/models";
const REFERENCE_DIR = "api/reference";
const PRICES_SNIPPET = "snippets/api-default-prices";
const TAB = "Summer API";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const catalog = readJson(join(SOURCES, "models.json"));
const notes = existsSync(join(SOURCES, "model-notes.json")) ? readJson(join(SOURCES, "model-notes.json")).notes : {};
const spec = readJson(join(SOURCES, "openapi.json"));
// Real outputs per model, pinned by scripts/api/samples.mjs from the summerengine.com/create examples.
const samples = existsSync(join(SOURCES, "model-samples.json")) ? readJson(join(SOURCES, "model-samples.json")).samples : {};

// ------------------------------------------------------------------ data

const CAPABILITIES = [
  { id: "3d", title: "3D models", icon: "box", one: "model", noun: "3D model", blurb: "Textured GLB models from a prompt or a picture. Ask for a rig and animations on the same job." },
  { id: "image", title: "Images", icon: "image", one: "image", noun: "image model", blurb: "Concept art, sprites, textures, icons and key art. Optional transparent background." },
  { id: "video", title: "Video", icon: "clapperboard", one: "clip", noun: "video model", blurb: "Trailer shots, cutscenes and animated key art, from a prompt or a picture." },
  { id: "voice", title: "Voice", icon: "mic", one: "line", noun: "voice model", blurb: "Character lines and narration from text." },
  { id: "dialogue", title: "Dialogue", icon: "messages-square", one: "dialogue", noun: "dialogue model", blurb: "Several characters talking, in one file." },
  { id: "sound", title: "Sound effects", icon: "audio-lines", one: "sound", noun: "sound effect model", blurb: "Hits, footsteps, pickups, UI clicks and loops from a description." },
  { id: "music", title: "Music", icon: "music", one: "track", noun: "music model", blurb: "Level, menu and combat music from a description." },
];
const CAP = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c]));

const models = catalog.models;
const aliases = catalog.aliases ?? {};
for (const m of models) if (!CAP[m.capability]) throw new Error(`model ${m.id}: unknown capability ${m.capability}`);

/** The page slug of a model id: `3d/meshy-7.1` -> `3d/meshy-7-1` (dots and underscores read badly in a URL). */
const modelSlug = (id) => {
  const [cap, ...rest] = id.split("/");
  return `${cap}/${rest.join("-").toLowerCase().replace(/[._]+/g, "-")}`;
};
const modelPath = (m) => `${MODELS_DIR}/${modelSlug(m.id)}`;
{
  const seen = new Map();
  for (const m of models) {
    const p = modelPath(m);
    if (seen.has(p)) throw new Error(`models ${seen.get(p)} and ${m.id} share the page ${p}`);
    seen.set(p, m.id);
  }
}

/** USD for people: 3 decimals from $0.10, 4 below; the exact amount is on the model page and in the API. */
function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`not a price: ${value}`);
  if (n === 0) return "$0";
  let s = n.toFixed(n >= 0.1 ? 3 : 4).replace(/0+$/, "").replace(/\.$/, "");
  if (n >= 0.1 && /\.\d$/.test(s)) s += "0";
  if (!s.includes(".") && n >= 1) s += ".00";
  return `$${s}`;
}

function unitLabel(m) {
  switch (m.price.unit) {
    case "call":
      return CAP[m.capability].one;
    case "output_second":
      return "second";
    case "1k_characters":
      return "1,000 characters";
    case "megapixel":
      return "megapixel";
    default:
      throw new Error(`model ${m.id}: unknown price unit ${m.price.unit}`);
  }
}

const priceText = (m) => `${money(m.price.price)} per ${unitLabel(m)}`;

function duration(seconds) {
  if (seconds < 90) return `${Math.round(seconds)} s`;
  return `${Math.round(seconds / 60)} min`;
}
const typicalTime = (m) => (m.latency ? `about ${duration(m.latency.p50Seconds)}` : null);

const isDefault = (m) => m.aliases?.length > 0;
const voicesOf = (m) => m.voices ?? [];
/** Capabilities whose jobs run for minutes and answer `running`. */
const LONG = new Set(["3d", "video"]);
const props = (m) => m.inputSchema?.properties ?? {};

/** Within a capability: the default first, then Summer's well-tested picks, then by price. */
function ordered(list) {
  return [...list].sort((a, b) => Number(isDefault(b)) - Number(isDefault(a)) || Number(b.wellTested) - Number(a.wellTested) || Number(a.price.price) - Number(b.price.price) || a.name.localeCompare(b.name));
}
const byCapability = Object.fromEntries(CAPABILITIES.map((c) => [c.id, ordered(models.filter((m) => m.capability === c.id))]));

// The model page notes describe the model in Summer Studio; keep only the
// lines that hold for the API's own input (no Studio tools, no reference
// pictures where the model takes none, no provider names).
const STUDIO_ONLY = /\b(?:Studio|Summer Pixel|MCP|fal|restyl\w*|motion clip|composition plan|early access)\b/i;
function noteLines(m) {
  const note = notes[m.id];
  if (!note) return { tagline: null, uses: [] };
  const takesReference = Object.keys(props(m)).some((k) => /reference|imageUrls/i.test(k));
  const keep = (line) => line && !STUDIO_ONLY.test(line) && (takesReference || !/reference/i.test(line));
  return { tagline: keep(note.tagline) ? note.tagline : null, uses: (note.gameUses ?? []).filter(keep) };
}

// ------------------------------------------------------------- examples

const SAMPLE_PICTURE = `${DOCS_URL}/images/api/chest.png`;
const EXAMPLE_INPUT = {
  "3d": (m) => (props(m).kind?.enum?.includes("text-to-3d") ?? true ? { kind: "text-to-3d", prompt: "a stylized treasure chest, game prop" } : { kind: "image-to-3d", imageUrl: SAMPLE_PICTURE }),
  image: () => ({ prompt: "a cozy pixel-art tavern at night, warm window light", aspectRatio: "16:9" }),
  video: () => ({ prompt: "a slow pan over a misty forest village at dawn", duration: 5 }),
  voice: () => ({ text: "The gate is open. Go, before the guards come back." }),
  dialogue: (m) => {
    const [a, b] = voicesOf(m);
    if (!a) throw new Error(`model ${m.id}: dialogue needs voices in GET /v1/models`);
    return { inputs: [{ text: "Did you hear that?", voiceId: a.voiceId }, { text: "Only the wind. Keep walking.", voiceId: (b ?? a).voiceId }] };
  },
  sound: () => ({ text: "a sword hits a wooden shield", durationSeconds: 2 }),
  music: () => ({ prompt: "a calm lo-fi loop for a cozy farming game menu", durationSeconds: 30 }),
};
function exampleInput(m) {
  const input = EXAMPLE_INPUT[m.capability](m);
  const p = props(m);
  const out = Object.fromEntries(Object.entries(input).filter(([k]) => k in p));
  for (const k of m.inputSchema?.required ?? []) if (!(k in out)) throw new Error(`model ${m.id}: the example input misses required ${k}`);
  return out;
}

const json = (v, indent = 2) => JSON.stringify(v, null, indent);
const indent = (text, pad) => text.split("\n").map((l, i) => (i ? pad + l : l)).join("\n");

function pyValue(v, pad = "") {
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null) return "None";
  if (Array.isArray(v)) return `[${v.map((x) => pyValue(x, pad)).join(", ")}]`;
  if (typeof v === "object") return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${pyValue(x, pad)}`).join(", ")}}`;
  return JSON.stringify(v);
}

/** One job: the CLI (runs, follows and saves), then curl, TypeScript and Python over HTTP. */
function jobCode(model, input) {
  const body = { model, input };
  const curl = [
    "```bash curl",
    `curl ${BASE_URL}/jobs \\`,
    '  -H "Authorization: Bearer $SUMMER_TOKEN" \\',
    '  -H "Content-Type: application/json" \\',
    '  -H "Idempotency-Key: $(uuidgen)" \\',
    '  -H "Prefer: wait=60" \\',
    `  -d '${JSON.stringify(body)}'`,
    "```",
  ];
  const cli = [
    "```bash CLI",
    `npx -y summer-engine@latest api run ${model} \\`,
    `  --input '${JSON.stringify(input)}' \\`,
    "  --download .",
    "```",
  ];
  const ts = [
    "```ts TypeScript",
    `const res = await fetch("${BASE_URL}/jobs", {`,
    '  method: "POST",',
    "  headers: {",
    "    Authorization: `Bearer ${process.env.SUMMER_TOKEN}`,",
    '    "Content-Type": "application/json",',
    '    "Idempotency-Key": crypto.randomUUID(),',
    '    Prefer: "wait=60",',
    "  },",
    `  body: JSON.stringify(${indent(json(body), "  ")}),`,
    "});",
    "const { job } = await res.json();",
    "console.log(job.state, job.id);",
    "```",
  ];
  const py = [
    "```python Python",
    "import os, uuid, requests",
    "",
    "res = requests.post(",
    `    "${BASE_URL}/jobs",`,
    "    headers={",
    '        "Authorization": f"Bearer {os.environ[\'SUMMER_TOKEN\']}",',
    '        "Idempotency-Key": str(uuid.uuid4()),',
    '        "Prefer": "wait=60",',
    "    },",
    `    json=${pyValue(body)},`,
    ")",
    'job = res.json()["job"]',
    'print(job["state"], job["id"])',
    "```",
  ];
  const mcp = [
    "```js MCP",
    "// Summer's MCP server: npx -y summer-engine@latest setup <agent> --yes",
    `summer_api_run({\n  model: ${JSON.stringify(model)},\n  input: ${jsValue(input, "  ")},\n  out: "assets",\n})`,
    ...(LONG.has(model.split("/")[0]) ? ["// It answers `next` while the job runs: follow it to the end.", 'summer_api_job({ jobId: "<jobId>", wait: true, out: "assets" })'] : []),
    "```",
  ];
  return ["<CodeGroup>", "", ...cli, "", ...curl, "", ...ts, "", ...py, "", ...mcp, "", "</CodeGroup>"].join("\n");
}

/** A JavaScript object literal: unquoted keys where they are plain names. */
function jsValue(v, pad = "") {
  if (Array.isArray(v)) return `[${v.map((x) => jsValue(x, pad)).join(", ")}]`;
  if (v && typeof v === "object") {
    const inner = Object.entries(v).map(([k, x]) => `${pad}  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${jsValue(x, `${pad}  `)}`);
    return `{\n${inner.join(",\n")}\n${pad}}`;
  }
  return JSON.stringify(v);
}

// ------------------------------------------------------------------ render

const pages = new Map();
// Mintlify reads two dollar signs on one line as math: in a page body every price's $ is escaped.
const escapeDollars = (content) => {
  const [, head, body] = content.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/) ?? [null, "", content];
  return head + body.replace(/(?<!\\)\$(?=\d)/g, "\\$");
};
const put = (path, content) => pages.set(path, escapeDollars(content.endsWith("\n") ? content : content + "\n"));
const banner = (from) => `{/* Generated by scripts/api/generate.mjs from ${from}. Do not edit by hand: run scripts/api/sync.mjs. */}`;
const updatedAt = [...new Set(models.map((m) => m.price.priceUpdatedAt))].sort().at(-1);

function condition(rule) {
  if (rule.set) return `${code(rule.field)} is set`;
  return `${code(rule.field)} is ${code(JSON.stringify(rule.equals))}`;
}

function priceSection(m) {
  const unit = unitLabel(m);
  const lines = [
    "## Price",
    "",
    `**${priceText(m)}**${m.price.quantityField && m.price.unit === "call" ? `, times ${code(m.price.quantityField)}` : ""}${m.price.unit !== "call" && m.price.quantityField ? `, counted from ${code(m.price.quantityField)}` : ""}. Exact list price: ${code(`${m.price.price} USD`)}.`,
  ];
  const field = m.price.quantityField;
  const fallback = field ? props(m)[field]?.default : undefined;
  if (m.price.unit === "output_second" && typeof fallback === "number") {
    lines.push("", `At the default ${code(field)} of ${fallback} seconds: ${money(Number(m.price.price) * fallback)}.`);
  }
  if (m.price.minimum) lines.push("", `Minimum per job: ${money(m.price.minimum)}.`);
  if (m.price.estimate) lines.push("", "This is the price of a typical request. The exact price depends on the request: ask `POST /v1/estimate` first.");
  if (m.price.modifiers?.length) {
    lines.push("", "| When | Price |", "|---|---|");
    for (const rule of m.price.modifiers) {
      lines.push(`| ${condition(rule)} | ${rule.add ? `adds ${money(rule.add)}` : `${money(rule.price)} per ${unit}`} |`);
    }
  }
  lines.push(
    "",
    `No markup: this is the provider's list price, checked ${m.price.priceUpdatedAt}. A failed job costs nothing. Get the exact price of one request, free and without a key, from [\`POST /v1/estimate\`](/api/jobs#know-the-price-first).`,
  );
  return lines.join("\n");
}

function typeOf(schema) {
  if (!schema) return "any";
  if (schema.enum) return schema.enum.map((v) => code(v)).join(", ");
  if (schema.type === "array") return `array of ${schema.items?.type === "object" ? "objects" : `${schema.items?.type ?? "any"}`}`;
  return Array.isArray(schema.type) ? schema.type.join(" or ") : (schema.type ?? "any");
}

function limits(schema) {
  const out = [];
  if (schema.minimum !== undefined && schema.maximum !== undefined) out.push(`${schema.minimum} to ${schema.maximum}`);
  else if (schema.maximum !== undefined) out.push(`up to ${schema.maximum}`);
  if (schema.maxLength !== undefined) out.push(`up to ${schema.maxLength} characters`);
  if (schema.minItems !== undefined || schema.maxItems !== undefined) out.push(`${schema.minItems ?? 0} to ${schema.maxItems} items`);
  return out.join(", ");
}

function inputSection(m) {
  const p = props(m);
  const required = new Set(m.inputSchema?.required ?? []);
  const rows = Object.entries(p).map(([name, s]) => {
    const about = [s.description, limits(s), s.default !== undefined ? `Default ${code(JSON.stringify(s.default))}.` : ""].filter(Boolean).join(" ");
    return `| ${code(name)}${required.has(name) ? " (required)" : ""} | ${cell(typeOf(s)).replace(/\\`/g, "`")} | ${cell(about)} |`;
  });
  return [
    "## Input",
    "",
    `Send these fields in ${code("input")}. The full JSON Schema is ${code("inputSchema")} in [\`GET /v1/models/${m.id}\`](/api/reference/get-models-model).`,
    "",
    "| Field | Type | About |",
    "|---|---|---|",
    ...rows,
  ].join("\n");
}

function voicesSection(m) {
  const voices = voicesOf(m);
  if (!voices.length) return [];
  const need = m.capability === "dialogue" ? `Each line in ${code("inputs")} needs a ${code("voiceId")} from this list.` : `${code("voiceId")} is optional: without it the model uses its default voice.`;
  return [
    "## Voices",
    "",
    `${need} These are Summer's curated voices; the live list is ${code("voices")} in ${code(`GET /v1/models/${m.id}`)}. For more, search the public voice library by words, language, gender, age or accent, each with a sample: ${code(`GET /v1/voices?model=${m.id}&search=old+wizard`)} (signed in).`,
    "",
    `<Accordion title=${JSON.stringify(`All ${voices.length} voices`)}>`,
    "",
    "| Name | voiceId |",
    "|---|---|",
    ...voices.map((v) => `| ${cell(v.name)} | ${code(v.voiceId)} |`),
    "",
    "</Accordion>",
    "",
  ];
}

// A JSX attribute string: JSX strings take no escapes, so quotes and braces never reach one.
const attr = (v) => `"${String(v).replace(/"/g, "'").replace(/[{}<>\\]/g, "")}"`;
const samplesOf = (m) => samples[m.id] ?? [];
const TILE = (cap) => `/images/api/tiles/${cap}.svg`;
/** The picture that stands for a model: its first sample's still, or the neutral tile of its capability. */
const thumbnail = (m) => {
  const s = samplesOf(m)[0];
  return s ? (s.kind === "image" ? s.url : s.poster ?? TILE(m.capability)) : TILE(m.capability);
};
const clip = (text, max = 220) => {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : flat;
};

function sampleMedia(s, m) {
  const alt = attr(`${m.name}: ${clip(s.prompt, 120)}`);
  switch (s.kind) {
    case "image":
      return `<img src=${attr(s.url)} alt=${alt} />`;
    case "video":
      return `<video controls muted loop playsInline preload="metadata" poster=${attr(s.poster)} src=${attr(s.url)} />`;
    case "3d":
      // model-viewer (loaded by model-viewer.js) turns the turntable still into a model to spin; without it the still shows.
      return `<model-viewer src=${attr(s.url)} poster=${attr(s.poster)} alt=${alt} camera-controls="" auto-rotate="" loading="lazy"><img slot="poster" src=${attr(s.poster)} alt=${alt} /></model-viewer>`;
    case "audio":
      return [s.poster ? `<img src=${attr(s.poster)} alt=${attr(s.title ?? m.name)} />` : "", `<audio controls preload="none" src=${attr(s.url)} />`].filter(Boolean).join("");
    default:
      throw new Error(`model ${m.id}: unknown sample kind ${s.kind}`);
  }
}

function examplesSection(m) {
  const list = samplesOf(m);
  if (!list.length) return [];
  const label = (s) => (s.kind === "audio" ? "Words" : s.fromPicture ? "From a picture, prompt" : "Prompt");
  return [
    "## Examples",
    "",
    `Real outputs of ${code(m.id)}, each with the input that made it.`,
    "",
    '<div className="summer-samples">',
    ...list.map((s) =>
      [
        '<figure className="summer-sample">',
        sampleMedia(s, m),
        `<figcaption><strong>${label(s)}:</strong> ${escapeProse(clip(s.prompt))}${s.kind === "3d" ? ` <a href=${attr(s.url)}>GLB</a>` : ""}</figcaption>`,
        "</figure>",
      ].join(""),
    ),
    "</div>",
    "",
  ];
}

function relatedSection(m) {
  const list = byCapability[m.capability].filter((x) => x.id !== m.id).slice(0, 4);
  if (!list.length) return [];
  return [
    "## Related models",
    "",
    '<div className="summer-gallery">',
    "<CardGroup cols={2}>",
    ...list.map((x) => `  <Card title=${attr(x.name)} href=${attr(`/${modelPath(x)}`)} img=${attr(thumbnail(x))}>${code(x.id)}: ${priceText(x)}${isDefault(x) ? " (default)" : ""}</Card>`),
    "</CardGroup>",
    "</div>",
    "",
  ];
}

function renderModelPage(m) {
  const cap = CAP[m.capability];
  const { tagline, uses } = noteLines(m);
  const input = exampleInput(m);
  const description = `${m.name} on the Summer API: ${priceText(m)}, ${typicalTime(m) ? `${typicalTime(m)}, ` : ""}${m.outputFormats.map((f) => f.toUpperCase()).join(", ")} saved to your Summer library. Model id ${m.id}.`;
  const facts = [
    ["Model id", code(m.id)],
    ...(isDefault(m) ? [["Default for", m.aliases.map(code).join(", ")]] : []),
    ["Price", `${priceText(m)}`],
    ...(typicalTime(m) ? [["Typical time", typicalTime(m)]] : []),
    ["Output", m.outputFormats.map((f) => f.toUpperCase()).join(", ")],
    ["Made by", cell(m.vendor)],
    ["Commercial use", m.commercialUse ? "Yes" : "No"],
  ];
  const best = [
    ...(isDefault(m) ? [`The default ${cap.noun}: what ${code(m.aliases[0])} runs today.`] : []),
    ...(m.wellTested && !isDefault(m) ? ["A model Summer runs by default in its own tools."] : []),
    ...uses,
  ];
  return [
    "---",
    `title: ${fm(m.name)}`,
    `description: ${fm(description)}`,
    "generated: true",
    `generator: ${GENERATOR}`,
    "---",
    "",
    banner(`GET /v1/models (${m.id})`),
    "",
    escapeProse(tagline ?? `${m.name}: a ${cap.noun} for your game.`),
    "",
    "| | |",
    "|---|---|",
    ...facts.map(([k, v]) => `| ${k} | ${v} |`),
    "",
    ...examplesSection(m),
    ...(best.length ? ["## Best for", "", ...best.map((b) => `- ${escapeProse(b)}`), ""] : []),
    priceSection(m),
    "",
    "## Example call",
    "",
    `Sign in once with ${code("summer login")}; over HTTP, send ${code("Authorization: Bearer $SUMMER_TOKEN")} after ${code("export SUMMER_TOKEN=$(summer token)")} ([sign-in](/api/sign-in)). ${LONG.has(m.capability) ? `This job takes minutes. The CLI follows it and saves the file. Over HTTP the call answers ${code("running")} with a job id: check ${code("GET /v1/jobs/{id}")} until ${code("state")} is ${code("done")} ([jobs](/api/jobs)); the [quickstart](/api/quickstart) has the full loop.` : `This job comes back done in the same call, with the file ready to download.`}`,
    "",
    jobCode(m.id, input),
    "",
    `The finished job has ${code("state")} ${code('"done"')} and ${code("result.assets")}: one entry per file, each with ${code("assetId")}, ${code("fileUrl")} (a Summer URL) and ${code("thumbnailUrl")}. Download the file into your project, or import it in Summer Engine by its asset id.`,
    "",
    inputSection(m),
    "",
    ...voicesSection(m),
    ...relatedSection(m),
    "## For agents",
    "",
    `This page as Markdown: [${DOCS_URL}/${modelPath(m)}.md](${DOCS_URL}/${modelPath(m)}.md). The live record with the JSON Schema: ${code(`GET ${BASE_URL}/models/${m.id}`)}, public, no sign-in.`,
    "",
  ].join("\n");
}

function modelRow(m, timed) {
  const label = `[${cell(m.name)}](/${modelPath(m)})${isDefault(m) ? " (default)" : ""}`;
  return `| ${label} | ${code(m.id)} | ${priceText(m)} |${timed ? ` ${typicalTime(m) ?? ""} |` : ""}`;
}
const formatsOf = (list) => [...new Set(list.flatMap((m) => m.outputFormats))].map((f) => f.toUpperCase()).join(", ");

/** The list's shape with one real entry: the default 3D model, its input schema cut to two fields. */
function sampleListing() {
  const m = models.find((x) => x.id === aliases["3d/default"]) ?? models[0];
  const properties = Object.fromEntries(Object.entries(props(m)).slice(0, 2));
  return {
    currency: catalog.currency,
    aliases: Object.fromEntries(Object.entries(aliases).slice(0, 2)),
    models: [{ ...m, inputSchema: { type: "object", properties } }],
  };
}

/** One row per job: the default id, the model it runs and its price. */
function defaultsTable() {
  const out = ["| I need | Model id | Runs | Price |", "|---|---|---|---|"];
  for (const c of CAPABILITIES) {
    const alias = `${c.id}/default`;
    const target = models.find((m) => m.id === aliases[alias]);
    if (target) out.push(`| ${c.blurb.split(".")[0]} | ${code(alias)} | [${cell(target.name)}](/${modelPath(target)}) | ${priceText(target)} |`);
  }
  return out;
}

/** The defaults and their prices, for the hand-written pages (they import it; prices are never typed by hand). */
function renderPricesSnippet() {
  return [
    banner("GET /v1/models"),
    "",
    ...defaultsTable(),
    "",
    `Every other model and its price: [models and pricing](/${MODELS_PAGE}). Prices checked up to ${updatedAt}.`,
    "",
  ].join("\n");
}

function renderModelsPage() {
  const counts = CAPABILITIES.map((c) => `${byCapability[c.id].length} ${c.noun}${byCapability[c.id].length === 1 ? "" : "s"}`).join(", ");
  const out = [
    "---",
    'title: "Summer API models and pricing"',
    'sidebarTitle: "Models and pricing"',
    `description: ${fm(`Every model on the Summer API with its price: ${counts}. No markup on assets. Every model at the provider's list price. Generated from GET /v1/models.`)}`,
    'icon: "tags"',
    'mode: "wide"',
    "generated: true",
    `generator: ${GENERATOR}`,
    "---",
    "",
    banner("GET /v1/models"),
    "",
    `**No markup on assets. Every model at the provider's list price.** ${models.length} curated models, each tested for games. A failed job costs nothing, and you pay from one credit balance. No plan needed.`,
    "",
    `This table is generated from [\`GET /v1/models\`](/api/reference/get-models), the same list the API prices and charges from. Agents: read prices and ids from there, never from memory, and copy ids exactly as listed. Each model page shows the date its price was last checked.`,
    "",
    "<CardGroup cols={2}>",
    `  <Card title="List every model" icon="list" href="/api/reference/get-models">`,
    `    ${code(`GET ${BASE_URL}/models`)}: ids, input schemas and prices as JSON. Public, no sign-in.`,
    "  </Card>",
    `  <Card title="Price one exact request" icon="calculator" href="/api/jobs#know-the-price-first">`,
    "    `POST /v1/estimate`: the exact amount and a quote that holds it for 15 minutes. Free.",
    "  </Card>",
    "</CardGroup>",
    "",
    "## Which model should I use?",
    "",
    "Send the default id when you have no preference. It runs the model Summer tests first for that job, and it moves when a better one passes.",
    "",
    ...defaultsTable(),
  ];
  for (const c of CAPABILITIES) {
    const list = byCapability[c.id];
    if (!list.length) continue;
    const timed = list.some((m) => m.latency);
    out.push(
      "",
      `## ${c.title}`,
      "",
      `${c.blurb} Output: ${formatsOf(list)}.`,
      "",
      '<div className="summer-gallery">',
      "<CardGroup cols={3}>",
      ...list.map((m) => `  <Card title=${attr(`${m.name}${isDefault(m) ? " (default)" : ""}`)} href=${attr(`/${modelPath(m)}`)} img=${attr(thumbnail(m))}>${priceText(m)}${typicalTime(m) ? `, ${typicalTime(m)}` : ""}</Card>`),
      "</CardGroup>",
      "</div>",
      "",
      `| Model | Id | Price |${timed ? " Typical time |" : ""}`,
      `|---|---|---|${timed ? "---|" : ""}`,
      ...list.map((m) => modelRow(m, timed)),
    );
    const options = [...new Set(list.flatMap((m) => (m.price.modifiers ?? []).map((r) => r.field)))];
    if (options.length) out.push("", `Some options change the price (${options.map(code).join(", ")}). Each model page lists them.`);
  }
  out.push(
    "",
    "## How the price works",
    "",
    "- **Per unit.** A price is per model, image, clip or sound, or per second or per 1,000 characters. The model page says which input field counts the units.",
    "- **Rounded here, exact in the API.** This page rounds for reading. The model page shows the exact list price, and the API returns it as a decimal string in US dollars.",
    "- **Failed jobs are free.** Most jobs are charged when they succeed. A job that is charged when it starts, such as a video, is refunded in full when it fails.",
    "- **One balance.** Every model draws from your paid Summer credits: your plan's credits and your top-ups. Each connected app can also have its own spend limit: see [sign-in and limits](/api/sign-in).",
    "",
    "## The JSON",
    "",
    `${code("GET /v1/models")} answers one object. Each model carries its price in the same scheme: ${code("unit")} (${[...new Set(models.map((m) => m.price.unit))].map(code).join(", ")}), ${code("price")} for one unit as a decimal string in US dollars, ${code("quantityField")} (the input field that counts the units), and ${code("modifiers")} (input values that replace the price or add to it). ${code("datedId")} records which price check a model follows; a job may send it, and it runs the current model. Here is the default 3D model as it is listed, with its ${code("inputSchema")} cut to two fields:`,
    "",
    "```json GET /v1/models",
    json(sampleListing(), 2),
    "```",
    "",
  );
  return out.join("\n");
}

// API reference: one Mintlify OpenAPI page per operation, at a URL from its method and path.
const referencePath = (method, path) => `${REFERENCE_DIR}/${[method, ...path.split("/")].map((s) => s.replace(/[{}]/g, "")).filter(Boolean).join("-").toLowerCase()}`;
const reference = [];
for (const [path, item] of Object.entries(spec.paths ?? {})) {
  if (path === "/openapi.json") continue;
  for (const [method, op] of Object.entries(item)) {
    reference.push({ method: method.toUpperCase(), path, op, page: referencePath(method, path) });
  }
}
const REFERENCE_TITLES = {
  "GET /models": "List models",
  "GET /models/{model}": "Get a model",
  "POST /estimate": "Estimate a job",
  "POST /jobs": "Run a job",
  "GET /jobs/{jobId}": "Get a job",
  "GET /jobs/{jobId}/events": "Follow a job",
  "POST /jobs/{jobId}/cancel": "Cancel a job",
  "POST /files": "Start a file upload",
  "POST /files/complete": "Finish a file upload",
  "POST /webhooks/secret": "Make a webhook secret",
  "GET /webhooks/deliveries": "List webhook deliveries",
  "GET /voices": "Search voices",
  "GET /voices/preview/{token}": "Play a voice sample",
  "GET /key": "Read the app's limit",
  "GET /balance": "Read your balance",
};
// The spec's descriptions are the operations' own, written for every surface; these say it in HTTP words.
const REFERENCE_DESCRIPTIONS = {
  "GET /models": "Every Summer API model with its id, input schema, output formats, typical time and price. Public, no sign-in.",
  "GET /models/{model}": "One model by id, dated id or default alias, with its input schema and price. Public, no sign-in.",
  "POST /estimate": "The price of one exact job before it runs, what makes it up, and a quote id that holds the price for 15 minutes. Free, no sign-in.",
  "POST /jobs": "Run one model on its input. The files go to your Summer library. Short jobs come back done; long ones answer running with a job id to follow with GET /v1/jobs/{jobId}. A quoteId caps the charge.",
  "GET /jobs/{jobId}": "Read a job: its state, progress and, when done, result.assets with each file's Summer URL.",
  "GET /jobs/{jobId}/events": "Follow a job as server-sent events: a job event on each change, then done.",
  "POST /jobs/{jobId}/cancel": "Stop a job that has not finished.",
  "POST /files": "Start a picture upload (PNG, JPEG or WebP): POST every field plus the file to uploadUrl, then call POST /v1/files/complete.",
  "POST /files/complete": "Finish a picture upload. The picture becomes a private asset in your Summer library, with a fileUrl to send as imageUrl.",
  "POST /webhooks/secret": "Make your webhook signing secret, shown once. A new one stops the old one at once.",
  "GET /webhooks/deliveries": "Your newest webhook deliveries, each with every attempt.",
  "GET /voices": "Find voices for a voice or dialogue model: Summer's curated voices first, then the public voice library by words, language, gender, age or accent, each with a sample.",
  "GET /voices/preview/{token}": "A voice's short sample, from the previewUrl in GET /v1/voices.",
  "GET /key": "The connected app behind this token: its name, spend limit, what it spent this period and when that resets.",
  "GET /balance": "Your paid credit balance and what this app can spend now.",
};
for (const r of reference) {
  const title = REFERENCE_TITLES[`${r.method} ${r.path}`] ?? r.op.summary;
  put(
    r.page,
    [
      "---",
      `title: ${fm(title)}`,
      `description: ${fm(REFERENCE_DESCRIPTIONS[`${r.method} ${r.path}`] ?? String(r.op.description ?? r.op.summary).replace(/\s*Next: .*$/, ""))}`,
      `openapi: ${fm(`${SPEC} ${r.method} ${r.path}`)}`,
      "generated: true",
      `generator: ${GENERATOR}`,
      "---",
      "",
      banner(`GET /v1/openapi.json (${r.method} ${r.path})`),
    ].join("\n"),
  );
}

put(MODELS_PAGE, renderModelsPage());
put(PRICES_SNIPPET, renderPricesSnippet());
for (const m of models) put(modelPath(m), renderModelPage(m));

// Summer Router: its own tab, from the pinned registry and default caps.
const routerModelsPath = join(SOURCES, "router-models.json");
const router = routerPages(readJson(join(SOURCES, "router-registry.json")), readJson(join(SOURCES, "router-policy.json")), existsSync(routerModelsPath) ? readJson(routerModelsPath) : null);
for (const [path, content] of router.pages) put(path, content);

// ------------------------------------------------------------- navigation

const QUICKSTARTS = ["claude-code", "codex", "cursor", "chatgpt-and-claude", "hermes"].map((p) => `api/quickstarts/${p}`);
const HAND_WRITTEN = ["api/overview", "api/quickstart", "api/from-studio", "api/agents", ...QUICKSTARTS, "api/sign-in", "api/jobs", "api/errors"];
const REFERENCE_ORDER = ["GET /models", "GET /models/{model}", "POST /estimate", "POST /jobs", "GET /jobs/{jobId}", "GET /jobs/{jobId}/events", "POST /jobs/{jobId}/cancel", "POST /files", "POST /files/complete", "GET /voices", "GET /voices/preview/{token}", "POST /webhooks/secret", "GET /webhooks/deliveries", "GET /key", "GET /balance"];
const rank = (r) => {
  const i = REFERENCE_ORDER.indexOf(`${r.method} ${r.path}`);
  return i < 0 ? REFERENCE_ORDER.length : i;
};
const tab = {
  tab: TAB,
  groups: [
    { group: "Start here", pages: ["api/overview", "api/quickstart", "api/from-studio", "api/agents", { group: "Quickstart per agent", icon: "bot", pages: QUICKSTARTS }] },
    {
      group: "Models and pricing",
      pages: [MODELS_PAGE, ...CAPABILITIES.filter((c) => byCapability[c.id].length).map((c) => ({ group: c.title, icon: c.icon, pages: byCapability[c.id].map(modelPath) }))],
    },
    { group: "Use the API", pages: ["api/sign-in", "api/jobs", "api/errors"] },
    { group: "API reference", pages: [...reference].sort((a, b) => rank(a) - rank(b) || a.page.localeCompare(b.page)).map((r) => r.page) },
  ],
};

const docsJsonPath = join(ROOT, "docs.json");
const docsJsonRaw = readFileSync(docsJsonPath, "utf8");
const docs = JSON.parse(docsJsonRaw);
const tabs = docs.navigation.tabs.filter((t) => t.tab !== TAB && t.tab !== ROUTER_TAB);
const at = docs.navigation.tabs.findIndex((t) => t.tab === TAB);
tabs.splice(at < 0 ? 1 : at, 0, tab, router.nav);
docs.navigation.tabs = tabs;
const docsJsonNext = JSON.stringify(docs, null, 2) + "\n";

// --------------------------------------------------------------- llms.txt

function frontmatter(file) {
  const abs = join(ROOT, `${file}.mdx`);
  const raw = pages.get(file) ?? (existsSync(abs) ? readFileSync(abs, "utf8") : "");
  const head = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const field = (key) => {
    const v = head.match(new RegExp(`^${key}:\\s*(.*)$`, "m"))?.[1]?.trim();
    if (!v) return null;
    if (v.startsWith('"')) {
      try {
        return JSON.parse(v);
      } catch {
        return v.slice(1, -1);
      }
    }
    return v.replace(/^'|'$/g, "");
  };
  return { title: field("title"), description: field("description") };
}

function indexLines(node, depth, out) {
  for (const page of node.pages ?? []) {
    if (typeof page === "string") {
      const { title, description } = frontmatter(page);
      const url = `${DOCS_URL}/${page === "index" ? "index" : page}.md`;
      out.push(`- [${title ?? page}](${url})${description ? `: ${description}` : ""}`);
    } else {
      out.push("", `${"#".repeat(Math.min(depth, 6))} ${page.group}`, "");
      indexLines(page, depth + 1, out);
    }
  }
}

const BIG_TAB = 100;
const countPages = (node) => (node.pages ?? []).reduce((n, p) => n + (typeof p === "string" ? 1 : countPages(p)), 0);

function renderLlms() {
  const defaults = CAPABILITIES.map((c) => aliases[`${c.id}/default`] && `${code(`${c.id}/default`)}`).filter(Boolean).join(", ");
  const out = [
    "# Summer Engine",
    "",
    "> Summer is the game engine built for AI. Any agent builds, tests and publishes a full multiplayer game. The Summer API makes the game's assets: 3D models, images, video, voice, sound effects and music from curated models tested for games, saved to your Summer library and ready for the engine. No markup on assets. Every model at the provider's list price.",
    "",
    "## Agent instructions",
    "",
    `- Summer API base URL: ${BASE_URL}`,
    "- Sign in: `npx -y summer-engine@latest login` opens the browser once; the person signs in to Summer and chooses Allow, with a spend limit. The sign-in renews itself.",
    "- Auth over HTTP: `Authorization: Bearer <token>`, with a one-hour token from `npx -y summer-engine@latest token`. There are no API keys.",
    "- CLI: `npx -y summer-engine@latest api models|estimate|run|jobs`. `api run <model> --input '<json>' --download <dir>` runs a job, follows it and saves the files; `api run --batch jobs.jsonl --download <dir>` runs up to 500 (one `{\"model\", \"input\"}` per line). JSON when piped. The same calls are MCP tools: `summer_api_models`, `summer_api_estimate`, `summer_api_run`, `summer_api_batch`, `summer_api_job`.",
    `- Without the CLI: Summer's sign-in is OAuth 2.1 with PKCE; discovery at https://mcp.summerengine.com/.well-known/oauth-protected-resource. Steps: ${DOCS_URL}/api/sign-in.md`,
    `- Models and prices: \`GET ${BASE_URL}/models\` (public, no sign-in). Read prices there, never from memory or training data. Defaults per job: ${defaults}.`,
    `- Exact price of one request: \`POST ${BASE_URL}/estimate\` with the same body as the job (free, no sign-in).`,
    `- Run: \`POST ${BASE_URL}/jobs\` with \`{"model", "input"}\`, a required \`Idempotency-Key\` header (new per job, the same on a retry) and \`Prefer: wait=60\`. A long job (3D, video) answers \`running\`: poll \`GET ${BASE_URL}/jobs/{id}\` every \`pollAfterSeconds\` (else 5 s) while \`state\` is \`queued\` or \`running\`. A job past the account's running slots answers \`202\` \`queued\` (id \`q:...\`): it is accepted at a held price and starts in order; follow it, never resend it. Or pass \`webhookUrl\` for one signed POST when it finishes. Stop on \`done\` (download the \`fileUrl\` of every entry in \`result.assets\`; \`job.model\` is the model that ran) or on \`failed\`, \`cancelled\`, \`expired\`, \`stale\` or \`declined\` (show \`error.message\`).`,
    `- Many jobs: \`POST ${BASE_URL}/batches\` with \`{"jobs": [{"model", "input"}, ...]}\` (up to 500, all or none, \`Idempotency-Key\` header for the batch), then \`GET ${BASE_URL}/batches/{id}\` until no job is \`queued\` or \`running\`.`,
    "- Limits: no rate limits on paid usage. Each account runs 10 jobs at once at the start, up to 40 as it buys credits; more jobs queue. Money is the only refusal, as `402`: `no_credits` (the paid balance; `fix_url` adds credits) or `over_limit` (this app's own spend limit; `fix_url` opens Connected apps). Show the person `message` and stop until they act.",
    "- Credits: every call is paid from the person's paid Summer credits (plan credits and top-ups). Estimate first and tell the person the total before you spend.",
    `- OpenAPI 3.1: ${BASE_URL}/openapi.json`,
    "- MCP for chat apps and cloud work: `https://mcp.summerengine.com/mcp` (OAuth sign-in).",
    `- Summer Router (early preview: AI inside a game published on Summer Games): character replies with tools, speech and images. Single-player games call \`Summer.client.router\`; multiplayer games call \`Summer.authority.router\` from the server (Summer Engine 0.8 and later). Transcription and realtime voice are coming soon. No key is in the build; the creator's paid Summer credits pay, within caps. Models and prices: \`GET https://api.summer.games/v1/router/models\` (public). Start: ${DOCS_URL}/router/quickstart.md`,
    "- CLI, local MCP and skills for engine work: `npx -y summer-engine@latest setup <agent> --yes`. The `summer-api` skill covers assets; the `summer-router` skill covers AI characters in games.",
    "- Every page is also Markdown: add `.md` to its URL. Everything in one file: https://docs.summerengine.com/llms-full.txt",
    `- Quickstart: ${DOCS_URL}/api/quickstart.md. Models and pricing: ${DOCS_URL}/api/models.md. Errors: ${DOCS_URL}/api/errors.md`,
    "",
  ];
  for (const t of docs.navigation.tabs) {
    out.push(`## ${t.tab}`);
    const groups = t.groups ?? [];
    // A generated tab of hundreds of pages (skills, reference) gets its overview here;
    // its pages link on from there and are all in llms-full.txt.
    const size = groups.reduce((n, g) => n + countPages(g), 0);
    for (const g of size > BIG_TAB ? groups.slice(0, 1) : groups) {
      out.push("", `### ${g.group}`, "");
      indexLines(g, 4, out);
    }
    if (size > BIG_TAB) out.push(`- ${size - countPages(groups[0])} more pages in ${t.tab}: open the pages above, or read https://docs.summerengine.com/llms-full.txt`);
    if (t.pages) indexLines(t, 3, out);
    out.push("");
  }
  const anchors = docs.navigation.global?.anchors ?? [];
  if (anchors.length) out.push("## Optional", "", ...anchors.map((a) => `- [${a.anchor}](${a.href})`), "");
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}
const llms = renderLlms();

// ------------------------------------------------------------------ guards

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".mdx")) out.push(relative(ROOT, p).split(sep).join("/").replace(/\.mdx$/, ""));
  }
  return out;
}

const problems = [];
const MONEY = /.{0,40}(?:~\s*)?\$\s?\d.{0,40}/;
// Words that never appear on a Summer API page: Summer keeps margins, deals and provider costs private.
const PRIVATE = /.{0,40}\b(?:margins?|provider[ _]costs?|provider_price|summer_fee|top-up fee|mark-?ups?)\b.{0,40}/i;
const PROMISE = /No markup(?: on assets)?[:.]?/g;
const handWritten = [...walk(join(ROOT, "api")), ...walk(join(ROOT, "router"))].filter((p) => !pages.has(p));
for (const p of handWritten) {
  if (![...HAND_WRITTEN, ...ROUTER_HAND_WRITTEN].includes(p)) problems.push(`${p}.mdx: a page under api/ or router/ that this generator does not own and no tab lists`);
  const raw = readFileSync(join(ROOT, `${p}.mdx`), "utf8").replace(/```[\s\S]*?```/g, (block) => block.replace(/\$\(|\$\{|\$[A-Z_]+/g, ""));
  const money = raw.match(MONEY);
  if (money) problems.push(`${p}.mdx: a typed price (prices come only from GET /v1/models): …${money[0]}…`);
}
for (const p of [...handWritten, ...pages.keys()]) {
  const raw = pages.get(p) ?? readFileSync(join(ROOT, `${p}.mdx`), "utf8");
  const hit = raw.replace(PROMISE, "").match(PRIVATE);
  if (hit) problems.push(`${p}.mdx: private pricing words: …${hit[0]}…`);
}
{
  const hit = llms.replace(PROMISE, "").match(PRIVATE);
  if (hit) problems.push(`llms.txt: private pricing words: …${hit[0]}…`);
}
// Summer never names the providers it buys from, or other APIs, on its own pages.
const OTHERS = /.{0,40}(?:\bfal(?:\.ai)?\b|\bReplicate\b|\bOpenRouter\b).{0,40}/i;
for (const p of [...handWritten, ...pages.keys()]) {
  const hit = (pages.get(p) ?? readFileSync(join(ROOT, `${p}.mdx`), "utf8")).match(OTHERS);
  if (hit) problems.push(`${p}.mdx: names another provider: …${hit[0]}…`);
}
// Summer Router pages name no provider and no model maker at all: the creator picks models in Studio.
const ROUTER_OTHERS = /.{0,40}\b(?:Vercel|ElevenLabs|OpenAI|Anthropic|Google|Meshy|Gateway)\b.{0,40}/;
for (const p of [...handWritten, ...pages.keys()].filter((p) => p.startsWith("router/"))) {
  const hit = (pages.get(p) ?? readFileSync(join(ROOT, `${p}.mdx`), "utf8")).match(ROUTER_OTHERS);
  if (hit) problems.push(`${p}.mdx: names a provider: …${hit[0]}…`);
}
for (const m of models) {
  const p = m.price;
  for (const v of [p.price, p.minimum, ...(p.modifiers ?? []).flatMap((r) => [r.price, r.add])].filter((v) => v !== undefined)) {
    if (!/^\d+(\.\d+)?$/.test(v)) problems.push(`sources/models.json ${m.id}: price ${JSON.stringify(v)} is not a USD decimal string`);
  }
}

// ------------------------------------------------------------- write/check

const stale = [];
for (const [path, content] of pages) {
  const abs = join(ROOT, `${path}.mdx`);
  const current = existsSync(abs) ? readFileSync(abs, "utf8") : null;
  if (current !== content) {
    stale.push(`${path}.mdx`);
    if (!CHECK) {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content);
    }
  }
}
const owned = [...walk(join(ROOT, MODELS_DIR)), ...walk(join(ROOT, REFERENCE_DIR)), ...walk(join(ROOT, "router")).filter((p) => !ROUTER_HAND_WRITTEN.includes(p))];
const extra = owned.filter((p) => !pages.has(p));
if (!CHECK) extra.forEach((p) => rmSync(join(ROOT, `${p}.mdx`)));
const llmsPath = join(ROOT, "llms.txt");
const llmsStale = (existsSync(llmsPath) ? readFileSync(llmsPath, "utf8") : null) !== llms;
if (!CHECK && llmsStale) writeFileSync(llmsPath, llms);
const navStale = docsJsonNext !== docsJsonRaw;
if (!CHECK && navStale) {
  writeFileSync(docsJsonPath, docsJsonNext);
  execFileSync(process.execPath, [join(ROOT, "scripts/check-routes.mjs"), "--write"], { stdio: "inherit" });
}

const counts = `${models.length} models, ${reference.length} API reference pages, ${pages.size} pages in all`;
if (problems.length) {
  console.error(`summer api: FAIL\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
if (CHECK) {
  if (stale.length || extra.length || navStale || llmsStale) {
    console.error("summer api: FAIL generated pages are stale. Run `npm run generate:api` and commit the result.");
    for (const p of stale) console.error(`  differs: ${p}`);
    for (const p of extra) console.error(`  not generated: ${p}.mdx`);
    if (navStale) console.error("  differs: docs.json (Summer API tab)");
    if (llmsStale) console.error("  differs: llms.txt (it lists every page: regenerate after any navigation or title change)");
    process.exit(1);
  }
  console.log(`summer api: PASS ${counts}`);
} else {
  console.log(`summer api: wrote ${stale.length} pages, removed ${extra.length}${navStale ? ", updated docs.json" : ""}${llmsStale ? ", wrote llms.txt" : ""}. ${counts}`);
}
