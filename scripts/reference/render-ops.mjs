// Renders the Summer operations reference (Summer 4.0) from sources/operations.json.

import { cell, code, escapeProse, firstSentence, fm } from "./lib/mdx.mjs";
import { inputTable, mcpGroupPath, schemaBlock } from "./render-mcp.mjs";

export const OPS_BASE = "mcp/operations";
export const OPS_LEGACY_PAGE = `${OPS_BASE}/legacy-names`;

// One page per area (SPEC-operations §3.2). Area names are permanent, so the URLs are too.
// `whoami`, the one root operation, is on the account page.
export const OPS_AREAS = [
  { id: "account", title: "Account", icon: "user", blurb: "Who is signed in, credits, agent permissions and auto top-up." },
  { id: "ops", title: "Find operations", icon: "search", blurb: "Find any operation by describing the job, and read its exact input." },
  { id: "jobs", title: "Jobs", icon: "clock", blurb: "Long work and waiting for your approval: read, wait for, list and cancel jobs." },
  { id: "docs", title: "Docs and skills", icon: "book-open", blurb: "Summer's skills, templates, references and the engine class reference." },
  { id: "assets", title: "Assets", icon: "image", blurb: "Make, find, edit and upload images, 3D models, sound, music, voices, video and animation." },
  { id: "makers", title: "Makers", icon: "wand-sparkles", blurb: "One-shot creative recipes: trailers, ads, NPC voices, sprite sheets and more." },
  { id: "projects", title: "Projects", icon: "folder", blurb: "Where a game is made: list, create, build and open projects." },
  { id: "plans", title: "Plans", icon: "map", blurb: "The game plan: look, characters, direction and the plan agent." },
  { id: "games", title: "Games", icon: "gamepad-2", blurb: "Your games on Summer Games, and who works on them." },
  { id: "store", title: "Store and publishing", icon: "store", blurb: "A game's store page, uploads, publishing and releases." },
  { id: "jams", title: "Jams", icon: "trophy", blurb: "Summer Games Jams: list, enter and withdraw." },
  { id: "pricing", title: "Pricing", icon: "tag", blurb: "What players pay: base price, country prices and sales." },
  { id: "analytics", title: "Analytics", icon: "chart-line", blurb: "How your game is doing: views, launches, sessions, play time, events and funnels." },
  { id: "experiments", title: "A/B tests", icon: "flask-conical", blurb: "Create, start, stop and read A/B tests." },
  { id: "marketing", title: "Marketing", icon: "megaphone", blurb: "Services Summer runs for a game, and the Content videos and brand pack." },
  { id: "team", title: "Teams", icon: "users", blurb: "Your teams: list, create, rename and invite." },
  { id: "profile", title: "Profile", icon: "id-card", blurb: "Your public profile and Studio settings." },
  { id: "apps", title: "Summer Apps", icon: "app-window", blurb: "Team tools that agents build inside Summer Studio." },
  { id: "studio", title: "Studio", icon: "layout-dashboard", blurb: "Move around Summer Studio: open pages, read the map and the page." },
  { id: "chats", title: "Chats", icon: "message-square", blurb: "Your Studio chats." },
  { id: "stories", title: "Stories", icon: "book", blurb: "The story builder: nodes, links, references and sharing." },
  { id: "plugins", title: "Plugins", icon: "plug", blurb: "Plugins for desktop projects." },
  { id: "engine", title: "Engine", icon: "box", blurb: "The open project in Summer Engine and the running game: scenes, nodes, scripts, play, input and screenshots." },
];
const AREA_IDS = new Set(OPS_AREAS.map((a) => a.id));
export const opsAreaPath = (id) => `${OPS_BASE}/${id}`;
const areaOf = (name) => (name.includes(".") ? name.split(".")[0] : "account");

const EFFECT_WORDS = {
  read: "Reads only. Changes nothing.",
  write: "Changes your own drafts, files or settings. Nobody else sees it yet.",
  spend: "Spends your credits.",
  publish: "Publishes: makes something public or live.",
  player_facing: "Changes what players see or pay, or who can act on a game.",
  destructive: "Removes or stops something for good.",
};

const RUNS = {
  cloud: "On Summer's servers: the hosted MCP, or the npm MCP after `summer login`.",
  engine: "In Summer Engine on your computer, through the npm MCP. Open your project first.",
  local: "On your computer, in the `summer-engine` npm package.",
};

const kebab = (s) => s.replace(/_/g, "-");
const camelToKebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/_/g, "-").toLowerCase();
const actionOf = (name) => (name.includes(".") ? name.split(".").slice(1).join(".") : name);
const anchorOf = (name) => actionOf(name);
const cliOf = (name) => (name.includes(".") ? `summer ${name.split(".")[0]} ${kebab(actionOf(name))}` : `summer ${name}`);

const EFFECT_GROUP = { read: "free", write: "make", spend: "spend", publish: "publish", player_facing: "live", destructive: "delete" };
/** The permission an operation needs; engine and local operations follow their effect. */
const permissionOf = (op) => op.permission ?? EFFECT_GROUP[op.effect];

function groupsById(src) {
  return Object.fromEntries(src.permissionGroups.map((g) => [g.id, g]));
}

/**
 * Changes Summer Games still keeps for the person even when their switch is
 * on, until it honors Agent permissions for agents (summer-platform #2634).
 * Remove this list when that is live.
 */
const PLATFORM_STILL_ASKS = new Set([
  "pricing.set_base", "pricing.set_country", "pricing.clear_country", "pricing.schedule_discount", "pricing.clear_discount",
  "experiments.start", "experiments.stop", "games.set_member_role",
  "store.publish", "store.release", "store.update_release_notes",
]);

function asksFirst(op, groups) {
  const permission = permissionOf(op);
  if (permission === "free") return { short: "Never", long: "No. It changes nothing." };
  if (permission === "ask") return { short: "Always", long: "Always. You approve it in Studio; an agent can never skip this." };
  const g = groups[permission];
  if (!g) return { short: "-", long: "-" };
  if (PLATFORM_STILL_ASKS.has(op.name)) {
    const who = op.name.startsWith("store.publish") || op.name === "store.release" ? "the game's owner" : "you";
    return { short: "Yes, for now", long: `Yes, for now: Summer Games still asks ${who} first. Soon it follows **${g.label}** in Agent permissions (on by default).` };
  }
  return g.default
    ? { short: "Not by default", long: `No: **${g.label}** is on by default in Agent permissions. When it is off, your agent asks you first.` }
    : { short: "Yes, by default", long: `Yes: **${g.label}** is off by default in Agent permissions.` };
}

// ------------------------------------------------------------- examples

const shellQuote = (s) => (/^[A-Za-z0-9_./:@%+=,-]+$/.test(s) ? s : `'${String(s).replace(/'/g, "'\\''")}'`);

function cliExample(op, input) {
  const parts = [cliOf(op.name)];
  const rest = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    const flag = `--${camelToKebab(key)}`;
    if (typeof value === "boolean") parts.push(value ? flag : `--no-${camelToKebab(key)}`);
    else if (typeof value === "string" || typeof value === "number") parts.push(flag, shellQuote(String(value)));
    else if (Array.isArray(value) && value.every((v) => typeof v === "string" || typeof v === "number"))
      value.forEach((v) => parts.push(flag, shellQuote(String(v))));
    else rest[key] = value;
  }
  if (Object.keys(rest).length) parts.push("--input", shellQuote(JSON.stringify(rest)));
  return parts.join(" ");
}

function mcpExample(op, input, direct) {
  const call = direct ? { name: op.mcpTool, arguments: input ?? {} } : { name: "summer_call", arguments: { op: op.name, input: input ?? {} } };
  return JSON.stringify(call, null, 2);
}

function exampleBlock(op, hosted) {
  const ex = op.examples?.[0] ?? { input: {}, note: op.title };
  const direct = hosted.has(op.name) || op.provider !== "cloud";
  const note = ex.note?.trim() || op.title;
  return [
    `**Example:** ${escapeProse(note)}`,
    "",
    "<CodeGroup>",
    "",
    "```json MCP",
    mcpExample(op, ex.input, direct),
    "```",
    "",
    "```bash CLI",
    cliExample(op, ex.input),
    "```",
    "",
    "</CodeGroup>",
  ].join("\n");
}

// ------------------------------------------------------------- one operation

function mcpLine(op, src) {
  const where = [];
  if (src.profiles.hosted.includes(op.name) || (op.direct ?? []).includes("hosted")) where.push("the hosted MCP");
  if ((op.direct ?? []).includes("assets")) where.push("the npm assets profile");
  if (op.provider !== "cloud") return `${code(op.mcpTool)} in the npm MCP`;
  if (where.length) return `${code(op.mcpTool)}, a tool on ${where.join(" and ")}. Elsewhere: ${code("summer_call")} with ${code(`"op": "${op.name}"`)}`;
  return `${code("summer_call")} with ${code(`"op": "${op.name}"`)}`;
}

/** Quoted node paths ('./World/Player') as code, so search engines never read them as relative links. */
function codePaths(schema) {
  if (Array.isArray(schema)) return schema.map(codePaths);
  if (!schema || typeof schema !== "object") return schema;
  return Object.fromEntries(
    Object.entries(schema).map(([k, v]) => [k, k === "description" && typeof v === "string" ? v.replace(/'(\.\/[^'\s]*)'/g, "`$1`") : codePaths(v)]),
  );
}

function opSection(op, src, groups, hosted) {
  const asks = asksFirst(op, groups);
  const facts = [
    `| **MCP** | ${mcpLine(op, src)} |`,
    `| **CLI** | ${code(cliOf(op.name))} |`,
    `| **Runs** | ${RUNS[op.provider] ?? op.provider}${op.alsoLocal ? " The npm MCP also runs it on your computer." : ""}${op.auth === "account" ? " Needs your Summer sign-in." : ""} |`,
    `| **Effect** | ${EFFECT_WORDS[op.effect]} |`,
    `| **Asks you first** | ${asks.long} |`,
  ];
  if (op.job) facts.push(`| **Long work** | Answers with a job at once. Wait with ${code("jobs.wait")}. |`);
  if (op.idempotencyKey === "required") facts.push(`| **Retry key** | Required: send a new ${code("idempotencyKey")} for each new request, the same one only to retry it. |`);
  if (op.legacy?.length) facts.push(`| **3.x names** | ${op.legacy.map(code).join(", ")} |`);
  const lines = [`### ${anchorOf(op.name)}`, "", `${code(op.name)}: **${escapeProse(op.title)}**`, ""];
  if (op.status === "preview") lines.push("<Note>Preview: search finds it and `summer_call` runs it. It may still change.</Note>", "");
  if (op.deprecated) lines.push(`<Warning>Deprecated: use ${code(op.deprecated.replacedBy)}. It keeps working until at least ${op.deprecated.after}.</Warning>`, "");
  lines.push(escapeProse(op.summary), "", "| | |", "|---|---|", ...facts, "");
  lines.push("**Inputs:**", "", inputTable(codePaths(op.input)), "", schemaBlock("Input JSON schema", op.input), "");
  if (op.output && Object.keys(op.output.properties ?? {}).length) lines.push(schemaBlock("Result JSON schema", op.output), "");
  lines.push(exampleBlock(op, hosted));
  return lines.join("\n");
}

// ------------------------------------------------------------- local ops without a catalog

function toolLink(name, mcpByName) {
  const e = mcpByName.get(name);
  return e ? `[${code(name)}](/${mcpGroupPath(e.group)}#${name})` : code(name);
}

function localNameRows(ops, mcpByName) {
  return [
    "| Operation | MCP tool |",
    "|---|---|",
    ...ops.map((op) => `| ${code(op.name)} | ${op.legacy.map((l) => l.split("#")[0]).filter((v, i, a) => a.indexOf(v) === i).map((l) => toolLink(l, mcpByName)).join(", ")} |`),
  ];
}

// ------------------------------------------------------------- pages

const banner = (src) =>
  `{/* Generated by scripts/reference/generate.mjs from scripts/reference/sources/operations.json (operation catalog at publicsummerengine ${src.sources.cloud.commit.slice(0, 10)}${src.sources.local ? `, summer-engine ${src.sources.local.version}` : ""}). Do not edit by hand: fix the operation's definition, then run scripts/reference/sync.mjs --ops. */}`;

function sourceNote(src) {
  const local = src.sources.local
    ? ` and the ${code("summer-engine")} npm package ${code(src.sources.local.version)} for engine and local operations`
    : "";
  return [
    "<Note>",
    `Generated from the operation catalog: ${code(src.sources.cloud.path)} at ${code(src.sources.cloud.commit.slice(0, 10))}${local}. If something here is wrong, the operation's definition is wrong.`,
    "</Note>",
  ].join("\n");
}

/**
 * One entry per operation name (SPEC-operations §7.9: one name, one contract).
 * An op both servers run (docs.search, docs.read, studio.open) shows once,
 * from the cloud catalog, marked as running locally too.
 */
function uniqueOps(src) {
  const cloudNames = new Set(src.operations.map((op) => op.name));
  const localNames = new Set(src.localOperations.map((op) => op.name));
  const cloud = src.operations.map((op) => (localNames.has(op.name) ? { ...op, alsoLocal: true } : op));
  const local = src.localOperations.filter((op) => !cloudNames.has(op.name));
  return { cloud, local };
}

export function opsByArea(src) {
  const full = (op) => Boolean(op.summary);
  const { cloud, local } = uniqueOps(src);
  const all = [...cloud, ...local.filter(full)];
  const names = [...local.filter((op) => !full(op))];
  const by = new Map(OPS_AREAS.map((a) => [a.id, { ops: [], names: [] }]));
  for (const op of all) {
    const area = areaOf(op.name);
    if (!AREA_IDS.has(area)) throw new Error(`operation ${op.name}: area "${area}" has no page in OPS_AREAS (render-ops.mjs)`);
    by.get(area).ops.push(op);
  }
  for (const op of names) {
    const area = areaOf(op.name);
    if (!AREA_IDS.has(area)) throw new Error(`operation ${op.name}: area "${area}" has no page in OPS_AREAS (render-ops.mjs)`);
    by.get(area).names.push(op);
  }
  for (const v of by.values()) {
    v.ops.sort((a, b) => a.name.localeCompare(b.name));
    v.names.sort((a, b) => a.name.localeCompare(b.name));
  }
  return by;
}

export function renderOpsAreaPage(area, src, byArea, mcpByName) {
  const groups = groupsById(src);
  const hosted = new Set(src.profiles.hosted);
  const { ops, names } = byArea.get(area.id);
  const count = ops.length + names.length;
  const lines = [
    "---",
    `title: ${fm(`Operations: ${area.title.toLowerCase()}`)}`,
    `sidebarTitle: ${fm(area.title)}`,
    `description: ${fm(`${area.blurb} For each operation: what it does, whether it asks you first, its inputs and an example call.`)}`,
    `icon: ${fm(area.icon)}`,
    "generated: true",
    "generator: scripts/reference",
    "---",
    "",
    banner(src),
    "",
    `${escapeProse(area.blurb)} ${count} operations. How to call them, and what the answers mean: [Operations reference](/${OPS_BASE}).`,
    "",
    sourceNote(src),
    "",
  ];
  if (ops.length) {
    lines.push(
      "| Operation | What it does | Asks you first |",
      "|---|---|---|",
      ...ops.map((op) => `| [${code(op.name)}](#${anchorOf(op.name)}) | ${cell(firstSentence(op.summary))} | ${asksFirst(op, groups).short} |`),
      "",
    );
  }
  if (names.length) {
    lines.push(
      ...(ops.length ? ["## On your computer", ""] : []),
      `These operations run in the ${code("summer-engine")} npm MCP on your computer and keep their tool names. Their inputs and examples are in the [MCP tools reference](/mcp/tools-reference).`,
      "",
      ...localNameRows(names, mcpByName),
      "",
    );
  }
  if (ops.length) lines.push(...ops.flatMap((op) => ["---", "", opSection(op, src, groups, hosted), ""]));
  return lines.join("\n").replace(/\n+$/, "\n");
}

export function renderOpsLegacyPage(src, byArea) {
  const rows = [];
  const seen = new Set();
  for (const op of [...src.operations, ...src.localOperations]) {
    for (const legacy of op.legacy ?? []) {
      if (seen.has(legacy)) continue;
      seen.add(legacy);
      rows.push({ legacy, op: op.name, area: areaOf(op.name) });
    }
  }
  rows.sort((a, b) => a.legacy.localeCompare(b.legacy));
  return [
    "---",
    'title: "3.x tool names"',
    'sidebarTitle: "3.x tool names"',
    `description: ${fm("Every Summer 3.x MCP tool name and the 4.0 operation that now does its job. 3.x names keep working for all of 4.x.")}`,
    'icon: "history"',
    "generated: true",
    "generator: scripts/reference",
    "---",
    "",
    banner(src),
    "",
    `Summer 4.0 names every capability as an operation. The 3.x tool names keep working for all of 4.x: ${code("summer_call")} accepts them on every server, and the npm MCP lists them again with ${code("summer mcp --toolsets legacy")} (and by itself while your installed Summer skills are older than 4.0). A name with ${code("#action")} is one action of a 3.x tool that did several jobs; the 3.x ${code("action")} argument picks the operation. ${rows.length} names.`,
    "",
    "| 3.x name | Operation |",
    "|---|---|",
    ...rows.map((r) => `| ${code(r.legacy)} | [${code(r.op)}](/${opsAreaPath(r.area)}${byArea.get(r.area).ops.some((o) => o.name === r.op) ? `#${anchorOf(r.op)}` : ""}) |`),
    "",
  ].join("\n");
}

export function renderOpsIndexPage(src, byArea) {
  const groups = src.permissionGroups;
  const unique = uniqueOps(src);
  const cloud = unique.cloud.length;
  const local = unique.local.length;
  const all = [...unique.cloud, ...unique.local.filter((o) => o.summary)];
  const byName = new Map(all.map((o) => [o.name, o]));
  const countIn = (id) => all.filter((o) => permissionOf(o) === id).length;
  const lines = [
    "---",
    'title: "Operations reference"',
    'sidebarTitle: "Operations"',
    `description: ${fm("Every Summer operation an agent can run, generated from the operation catalog: what it does, whether it asks you first, its inputs, its answer and an example call.")}`,
    'icon: "list-tree"',
    "generated: true",
    "generator: scripts/reference",
    "---",
    "",
    banner(src),
    "",
    `Summer is the game engine built for AI. Everything your agent can do with Summer is an operation: one name such as ${code("assets.generate_3d")} or ${code("store.publish")}, one input, one answer. The hosted MCP, the npm MCP and the ${code("summer")} CLI all run the same ${cloud + local} operations: ${cloud} on Summer's servers and ${local} on your computer.`,
    "",
    sourceNote(src),
    "",
    "## Call an operation",
    "",
    "| From | How |",
    "|---|---|",
    `| Hosted MCP, ${code("https://mcp.summerengine.com/mcp")} | The common jobs are their own tools (below). For anything else, ${code("summer_search")} finds the operation from the job in plain words and returns its exact input. Then ${code("summer_call")} runs it: ${code('{"op": "pricing.set_base", "input": {...}}')}. |`,
    `| npm MCP, ${code("summer mcp")} | Engine operations under their tool names, such as ${code("summer_add_node")} and ${code("summer_play")}, plus ${code("summer_search")} and ${code("summer_call")}. After ${code("summer login")} it runs every cloud operation too. |`,
    `| CLI | ${code("summer <area> <action> --field value")}, for example ${code("summer assets search --query knight")}. Add ${code("--dry-run")}, ${code("--wait")} or ${code("--json")}. ${code("summer ops search <words>")} finds an operation; ${code("summer ops describe <name>")} prints its input. |`,
    "",
    "Tools on the hosted MCP:",
    "",
    "| Tool | Operation | What it does |",
    "|---|---|---|",
    ...src.profiles.hosted.map((name) => {
      const op = byName.get(name);
      return `| ${code(op.mcpTool)} | [${code(name)}](/${opsAreaPath(areaOf(name))}#${anchorOf(name)}) | ${cell(firstSentence(op.summary))} |`;
    }),
    `| ${code("summer_search")} | [${code("ops.search")}](/${opsAreaPath("ops")}#search) | Finds any operation by the job in plain words. |`,
    `| ${code("summer_call")} | | Runs any operation by name, with the same checks as its own tool. |`,
    "",
    `Tool names come from the operation: ${code("games.list")} is ${code("summer_games_list")}. Engine operations keep their 3.x names, and makers keep ${code("summer_tool_<name>")}. Every 3.x tool name still works: see [3.x tool names](/${OPS_LEGACY_PAGE}).`,
    "",
    "## The answer",
    "",
    "Every operation answers one JSON shape. MCP sends it as text and as structured content; the CLI prints it with `--json`.",
    "",
    "| `status` | Means | What the agent does next |",
    "|---|---|---|",
    "| `done` | Finished. `result` holds the answer. | Use `result`. |",
    "| `running` | Long work started. `job.id` names it. | Call `jobs.wait` with the job id until it is done. |",
    "| `needs_approval` | The change waits for your yes. Nothing has changed. | Give you `approval.url`, then call `jobs.wait` with the job id. |",
    "| `dry_run` | A check only (`dryRun: true`). Nothing changed and nothing was spent. | Read `preview`: the changes, and for spend operations your estimated credits. |",
    "",
    "An error answers `ok: false` with `error.code`, a plain `message`, exactly one `next` step and `retry` (`no`, `safe`, `same_key` or `after`).",
    "",
    "Every operation that changes something also takes:",
    "",
    "- `dryRun: true` to check the call and see what it would do. Nothing changes, nothing is spent and nothing is sent.",
    "- `idempotencyKey` to retry safely: the same key with the same input gives the first answer again and never does the work twice. Operations that go live or move money require it.",
    "",
    "## What your agent may do without asking",
    "",
    "Studio shows six switches in **Settings > Agent permissions**. They apply to every app you connect. These defaults apply now. You can change them soon. Until then, Summer Games still asks the game's owner before an agent publishes, and price, A/B test and member changes ask you first. When a change asks, the operation answers `needs_approval` with a link, and your open Studio tab shows the request. Nothing changes until you approve. **Settings > Agent activity** lists what your agents did, with Undo for prices, sales, member roles, team names and the event limit.",
    "",
    "| Permission | By default | Operations |",
    "|---|---|---|",
    ...groups.map((g) => {
      const held = all.some((o) => permissionOf(o) === g.id && PLATFORM_STILL_ASKS.has(o.name));
      return `| ${g.label} | ${g.default ? (held ? "On: runs at once, except what Summer Games still asks for" : "On: runs at once") : "Off: asks you first"} | ${countIn(g.id)} |`;
    }),
    `| Always asks | You approve each time | ${countIn("ask")} |`,
    `| Reads | Never ask | ${countIn("free")} |`,
    "",
    "Spending never asks per call: agents spend within your credits and the monthly limit of your auto top-up. When credits run out, the answer is `no_credits` with a link to add credits.",
    "",
    "## Errors",
    "",
    "The list is closed: a new code is a new version of the catalog.",
    "",
    "| `code` | When | `retry` |",
    "|---|---|---|",
    ...src.errors.map((e) => `| ${code(e.code)} | ${cell(e.when)} | ${code(e.retry)} |`),
    "",
    "## Operations by area",
    "",
    "| Area | Operations | What for |",
    "|---|---|---|",
    ...OPS_AREAS.map((a) => {
      const v = byArea.get(a.id);
      return `| [${escapeProse(a.title)}](/${opsAreaPath(a.id)}) | ${v.ops.length + v.names.length} | ${escapeProse(a.blurb)} |`;
    }),
    "",
  ];
  return lines.join("\n");
}
