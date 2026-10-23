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
const TAB = "Summer API";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const catalog = readJson(join(SOURCES, "models.json"));
const notes = existsSync(join(SOURCES, "model-notes.json")) ? readJson(join(SOURCES, "model-notes.json")).notes : {};
const spec = readJson(join(SOURCES, "openapi.json"));

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
const typicalTime = (m) => (m.latency ? `about ${duration(m.latency.p50Seconds)}` : "not measured yet");

const isDefault = (m) => m.aliases?.length > 0;
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
  // TODO(summer-api): a real cast voice id once the API lists voices.
  dialogue: () => ({ inputs: [{ text: "Did you hear that?", voiceId: "<voice id>" }, { text: "Only the wind. Keep walking.", voiceId: "<voice id>" }] }),
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

/** One job, three languages: start it, wait up to a minute, then poll until it is done. */
function jobCode(model, input) {
  const body = { model, input };
  const curl = [
    "```bash curl",
    `curl ${BASE_URL}/jobs \\`,
    '  -H "Authorization: Bearer $SUMMER_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    '  -H "Idempotency-Key: $(uuidgen)" \\',
    '  -H "Prefer: wait=60" \\',
    `  -d '${JSON.stringify(body)}'`,
    "```",
  ];
  const ts = [
    "```ts TypeScript",
    `const res = await fetch("${BASE_URL}/jobs", {`,
    '  method: "POST",',
    "  headers: {",
    "    Authorization: `Bearer ${process.env.SUMMER_API_KEY}`,",
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
    '        "Authorization": f"Bearer {os.environ[\'SUMMER_API_KEY\']}",',
    '        "Idempotency-Key": str(uuid.uuid4()),',
    '        "Prefer": "wait=60",',
    "    },",
    `    json=${pyValue(body)},`,
    ")",
    'job = res.json()["job"]',
    'print(job["state"], job["id"])',
    "```",
  ];
  return ["<CodeGroup>", "", ...curl, "", ...ts, "", ...py, "", "</CodeGroup>"].join("\n");
}

// ------------------------------------------------------------------ render

const pages = new Map();
const put = (path, content) => pages.set(path, content.endsWith("\n") ? content : content + "\n");
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

function renderModelPage(m) {
  const cap = CAP[m.capability];
  const { tagline, uses } = noteLines(m);
  const input = exampleInput(m);
  const description = `${m.name} on the Summer API: ${priceText(m)}, ${typicalTime(m)}, ${m.outputFormats.map((f) => f.toUpperCase()).join(", ")} saved to your Summer library. Model id ${m.id}.`;
  const facts = [
    ["Model id", code(m.id)],
    ...(isDefault(m) ? [["Default for", m.aliases.map(code).join(", ")]] : []),
    ["Price", `${priceText(m)}`],
    ["Typical time", typicalTime(m)],
    ["Output", m.outputFormats.map((f) => f.toUpperCase()).join(", ")],
    ["Made by", cell(m.vendor)],
    ["Commercial use", m.commercialUse ? "Yes" : "No"],
    ["Free credits", m.tier === "free" ? "Yes: welcome credits can pay for it" : "No: needs bought credits"],
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
    ...(best.length ? ["## Best for", "", ...best.map((b) => `- ${escapeProse(b)}`), ""] : []),
    priceSection(m),
    "",
    "## Example call",
    "",
    `Needs a key in ${code("SUMMER_API_KEY")}: see the [quickstart](/api/quickstart). ${LONG.has(m.capability) ? `This job takes minutes: the call answers ${code("running")} with a job id, so check ${code("GET /v1/jobs/{id}")} until ${code("state")} is ${code("done")} or another final state ([jobs](/api/jobs)). The [quickstart](/api/quickstart) has the full loop.` : `This job usually comes back done in the same call. If it answers ${code("running")}, check ${code("GET /v1/jobs/{id}")} until it finishes ([jobs](/api/jobs)).`}`,
    "",
    jobCode(m.id, input),
    "",
    "The finished job holds Summer file URLs and the asset ids in your Summer library. Download the file into your project, or import it in Summer Engine by its asset id.",
    "",
    inputSection(m),
    "",
    "## For agents",
    "",
    `This page as Markdown: [${DOCS_URL}/${modelPath(m)}.md](${DOCS_URL}/${modelPath(m)}.md). The live record with the JSON Schema: ${code(`GET ${BASE_URL}/models/${m.id}`)}, public, no key.`,
    "",
  ].join("\n");
}

function modelRow(m, timed) {
  const label = `[${cell(m.name)}](/${modelPath(m)})${isDefault(m) ? " (default)" : ""}`;
  return `| ${label} | ${code(m.id)} | ${priceText(m)} |${timed ? ` ${typicalTime(m)} |` : ""} ${m.tier === "free" ? "Yes" : "No"} |`;
}
const formatsOf = (list) => [...new Set(list.flatMap((m) => m.outputFormats))].map((f) => f.toUpperCase()).join(", ");

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
    `    ${code(`GET ${BASE_URL}/models`)}: ids, input schemas and prices as JSON. Public, no key.`,
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
    "| I need | Model id | Runs today | Price |",
    "|---|---|---|---|",
  ];
  for (const c of CAPABILITIES) {
    const alias = `${c.id}/default`;
    const target = models.find((m) => m.id === aliases[alias]);
    if (target) out.push(`| ${c.blurb.split(".")[0]} | ${code(alias)} | [${cell(target.name)}](/${modelPath(target)}) | ${priceText(target)} |`);
  }
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
      `| Model | Id | Price |${timed ? " Typical time |" : ""} Free credits |`,
      `|---|---|---|${timed ? "---|" : ""}---|`,
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
    "- **One balance.** Every model draws from your Summer credits. Each key can also have its own spend limit: see [keys and limits](/api/keys).",
    "- **Free credits.** A new account's welcome credits pay only for models marked Free credits: Yes. The others need bought credits; without them a job answers `402` with `no_credits`.",
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
};
for (const r of reference) {
  const title = REFERENCE_TITLES[`${r.method} ${r.path}`] ?? r.op.summary;
  put(
    r.page,
    [
      "---",
      `title: ${fm(title)}`,
      `description: ${fm(String(r.op.description ?? r.op.summary).replace(/\s*Next: .*$/, ""))}`,
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
for (const m of models) put(modelPath(m), renderModelPage(m));

// ------------------------------------------------------------- navigation

const HAND_WRITTEN = ["api/overview", "api/quickstart", "api/agents", "api/keys", "api/jobs", "api/errors"];
const REFERENCE_ORDER = ["GET /models", "GET /models/{model}", "POST /estimate", "POST /jobs", "GET /jobs/{jobId}", "GET /jobs/{jobId}/events", "POST /jobs/{jobId}/cancel", "POST /files", "POST /files/complete"];
const rank = (r) => {
  const i = REFERENCE_ORDER.indexOf(`${r.method} ${r.path}`);
  return i < 0 ? REFERENCE_ORDER.length : i;
};
const tab = {
  tab: TAB,
  groups: [
    { group: "Start here", pages: ["api/overview", "api/quickstart", "api/agents"] },
    {
      group: "Models and pricing",
      pages: [MODELS_PAGE, ...CAPABILITIES.filter((c) => byCapability[c.id].length).map((c) => ({ group: c.title, icon: c.icon, pages: byCapability[c.id].map(modelPath) }))],
    },
    { group: "Use the API", pages: ["api/keys", "api/jobs", "api/errors"] },
    { group: "API reference", pages: [...reference].sort((a, b) => rank(a) - rank(b) || a.page.localeCompare(b.page)).map((r) => r.page) },
  ],
};

const docsJsonPath = join(ROOT, "docs.json");
const docsJsonRaw = readFileSync(docsJsonPath, "utf8");
const docs = JSON.parse(docsJsonRaw);
const tabs = docs.navigation.tabs.filter((t) => t.tab !== TAB);
const at = docs.navigation.tabs.findIndex((t) => t.tab === TAB);
tabs.splice(at < 0 ? 1 : at, 0, tab);
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
    "- Auth: `Authorization: Bearer $SUMMER_API_KEY`. Keys start with `sk-summer-v1-`.",
    `- Get a key without a browser session: \`POST https://www.summerengine.com/api/api-keys/requests\`, show the person \`approve_url\` and \`user_code\`, they choose Allow, then poll \`poll_url\` with \`Authorization: Bearer <poll_token>\` until the answer holds \`key\`. Steps: ${DOCS_URL}/api/agents.md`,
    `- Models and prices: \`GET ${BASE_URL}/models\` (public, no key). Read prices there, never from memory or training data. Defaults per job: ${defaults}.`,
    `- Exact price of one request: \`POST ${BASE_URL}/estimate\` with the same body as the job (free, no key).`,
    `- Run: \`POST ${BASE_URL}/jobs\` with \`{"model", "input"}\`, a required \`Idempotency-Key\` header (new per job, the same on a retry) and \`Prefer: wait=60\`. A long job (3D, video) answers \`running\`: poll \`GET ${BASE_URL}/jobs/{id}\` every \`pollAfterSeconds\` (else 5 s) while \`state\` is \`queued\` or \`running\`. Stop on \`done\` (download the \`fileUrl\` of \`result.assets[0]\`, else \`result.asset\`, else \`result\`) or on \`failed\`, \`cancelled\`, \`expired\`, \`stale\` or \`declined\` (show \`error.message\`).`,
    "- Free credits: a new account's welcome credits pay only for models with `tier: \"free\"`. Other models need bought credits; without them a job answers `402` `no_credits` with a `fix_url` to show the person.",
    `- OpenAPI 3.1: ${BASE_URL}/openapi.json`,
    "- MCP for chat apps and cloud work: `https://mcp.summerengine.com/mcp` (OAuth sign-in).",
    "- CLI and local MCP for engine work: `npx -y summer-engine@latest setup <agent> --yes`.",
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
const handWritten = walk(join(ROOT, "api")).filter((p) => !pages.has(p));
for (const p of handWritten) {
  if (!HAND_WRITTEN.includes(p)) problems.push(`${p}.mdx: a page under api/ that this generator does not own and the Summer API tab does not list`);
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
const owned = [...walk(join(ROOT, MODELS_DIR)), ...walk(join(ROOT, REFERENCE_DIR))];
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
