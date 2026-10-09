// Renders the Summer Engine MCP tool reference from sources/mcp-tools.json.

import { cell, code, escapeProse, firstSentence, fm } from "./lib/mdx.mjs";

export const MCP_GROUPS = [
  { id: "build", slug: "build", title: "Build", icon: "hammer", blurb: "Scenes, nodes, scripts, project files, the planning board and Summer Studio." },
  { id: "assets", slug: "create-assets", title: "Create assets", icon: "palette", blurb: "Generate and find images, 3D models, audio, video and motion, then import them into the project." },
  { id: "run", slug: "run-and-test", title: "Run and test", icon: "play", blurb: "Play the game, drive input, read the runtime, take screenshots and read errors." },
  { id: "publish", slug: "publish", title: "Publish", icon: "rocket", blurb: "Export, upload builds, write the store page and ask the owner to publish." },
  { id: "grow", slug: "grow", title: "Grow", icon: "trending-up", blurb: "See how your published game is doing." },
];
const groupById = Object.fromEntries(MCP_GROUPS.map((g) => [g.id, g]));
export const mcpGroupPath = (id) => `mcp/tools/${groupById[id].slug}`;

// Hosted tools carry no facets; the file that registers them says what they do.
const HOSTED_GROUP_BY_SOURCE = [
  [/store-tools\.ts$/, "publish"],
  [/grow-tools\.ts$/, "grow"],
  [/(?:upload-tools|manifest-tools)\.ts$/, "assets"],
  [/hosted\/server\.ts$/, "assets"],
  [/./, "build"],
];
const HOSTED_GROUP_BY_NAME = { summer_account: "build" };

function localGroup(t) {
  const d = t.descriptor;
  if (!d) return "build";
  const life = new Set(d.lifecycle);
  const dom = new Set(d.domains);
  if (life.has("launch") && !life.has("build")) return "publish";
  if (life.size === 1 && life.has("grow")) return "grow";
  if (dom.has("world-building")) return "build";
  if (dom.has("generate") || dom.has("assets")) return "assets";
  if (["runtime", "playtest", "debug", "verification"].some((x) => dom.has(x))) return "run";
  return "build";
}
const hostedGroup = (t) => HOSTED_GROUP_BY_NAME[t.name] ?? HOSTED_GROUP_BY_SOURCE.find(([re]) => re.test(t.source))[1];

/** Merge local and hosted tool lists into one entry per name. */
export function mcpEntries(src) {
  const map = new Map();
  for (const t of src.local) map.set(t.name, { name: t.name, local: t, hosted: null, group: localGroup(t) });
  for (const t of src.hosted) {
    const e = map.get(t.name);
    if (e) e.hosted = t;
    else map.set(t.name, { name: t.name, local: null, hosted: t, group: hostedGroup(t) });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- needs

function localNeeds(t) {
  const a = t.auth;
  const out = [];
  if (a.engine) out.push("Summer Engine open with your project");
  if (a.store) out.push("Store sign-in: `summer login --store`");
  if (a.creator) out.push("Creator token: `summer login --creator`");
  if (a.login === "required") out.push("Signed in: `summer login`");
  if (!out.length && a.login === "optional") out.push("No open editor and no sign-in. Uses your `summer login` sign-in when you have one");
  if (!out.length) out.push("No open editor and no sign-in");
  return out;
}
const HOSTED_NEEDS = "Your Summer account (OAuth). In the npm MCP: `summer login --store`";

export function needsSummary(e) {
  if (e.local) {
    const a = e.local.auth;
    const parts = [];
    if (a.engine) parts.push("Engine");
    if (a.store) parts.push("Store sign-in");
    if (a.creator) parts.push("Creator token");
    if (a.login === "required") parts.push("Signed in");
    return parts.length ? parts.join(" + ") : "Nothing";
  }
  return "Summer account";
}

const EFFECTS = {
  filesystem: "writes files",
  editor_mutation: "changes the open project",
  network: "uses the network",
  credentials: "reads credentials",
  publish: "publishes",
};

// ---------------------------------------------------------------- schemas

function typeOf(s) {
  if (!s || typeof s !== "object") return "any";
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (s.const !== undefined) return JSON.stringify(s.const);
  const alts = s.anyOf ?? s.oneOf;
  if (alts) return [...new Set(alts.map(typeOf))].join(" | ");
  if (Array.isArray(s.type)) return s.type.join(" | ");
  if (s.type === "array") return `${typeOf(s.items)}[]`;
  return s.type ?? (s.properties ? "object" : "any");
}

function constraints(s) {
  const bits = [];
  if (s.default !== undefined) bits.push(`Default ${code(JSON.stringify(s.default))}.`);
  if (s.minimum !== undefined || s.maximum !== undefined) bits.push(`Range ${s.minimum ?? "…"} to ${s.maximum ?? "…"}.`);
  if (s.minLength !== undefined || s.maxLength !== undefined) bits.push(`Length ${s.minLength ?? 0} to ${s.maxLength ?? "…"}.`);
  if (s.minItems !== undefined || s.maxItems !== undefined) bits.push(`Items ${s.minItems ?? 0} to ${s.maxItems ?? "…"}.`);
  return bits.join(" ");
}

function rows(schema, prefix = "", required = new Set(), depth = 0, out = []) {
  for (const [name, s] of Object.entries(schema?.properties ?? {})) {
    const full = prefix + name;
    out.push(
      `| ${code(full)} | ${cell(typeOf(s))} | ${required.has(name) ? "Yes" : "No"} | ${cell([s.description, constraints(s)].filter(Boolean).join(" "))} |`,
    );
    if (depth < 2) {
      if (s.type === "object" && s.properties) rows(s, `${full}.`, new Set(s.required ?? []), depth + 1, out);
      if (s.type === "array" && s.items?.properties) rows(s.items, `${full}[].`, new Set(s.items.required ?? []), depth + 1, out);
    }
  }
  return out;
}

function inputTable(schema) {
  const r = rows(schema, "", new Set(schema?.required ?? []));
  if (!r.length) return "No inputs.";
  return ["| Input | Type | Required | Description |", "|---|---|---|---|", ...r].join("\n");
}

function sampleValue(name, s, depth = 0) {
  if (!s || typeof s !== "object") return `<${name}>`;
  if (s.examples?.length) return s.examples[0];
  if (s.default !== undefined) return s.default;
  if (s.const !== undefined) return s.const;
  if (s.enum?.length) return s.enum[0];
  const alts = s.anyOf ?? s.oneOf;
  if (alts?.length) return sampleValue(name, alts.find((a) => a.type !== "null") ?? alts[0], depth);
  const type = Array.isArray(s.type) ? s.type.find((t) => t !== "null") : s.type;
  const eg = String(s.description ?? "").match(/e\.g\.,?\s*['"`]([^'"`]+)['"`]/);
  switch (type) {
    case "string":
      return eg ? eg[1] : `<${name}>`;
    case "integer":
    case "number":
      return s.minimum ?? (s.exclusiveMinimum !== undefined ? s.exclusiveMinimum + 1 : 1);
    case "boolean":
      return false;
    case "array":
      return depth > 2 ? [] : [sampleValue(name.replace(/s$/, ""), s.items, depth + 1)];
    case "object":
      return depth > 2 ? {} : sampleArgs(s, depth + 1);
    default:
      return `<${name}>`;
  }
}

function sampleArgs(schema, depth = 0) {
  const req = schema?.required ?? [];
  return Object.fromEntries(req.map((k) => [k, sampleValue(k, schema.properties?.[k], depth)]));
}

function example(name, schema) {
  const call = { name, arguments: sampleArgs(schema) };
  return ["```json Example call", JSON.stringify(call, null, 2), "```"].join("\n");
}

function schemaBlock(title, schema) {
  const { $schema, ...rest } = schema ?? {};
  return [`<Accordion title="${title}">`, "", "```json", JSON.stringify(rest, null, 2), "```", "", "</Accordion>"].join("\n");
}

// ---------------------------------------------------------------- prose

function linkTools(text, entries) {
  // Link known tool names to their page; never inside code blocks or longer code spans.
  const link = (name) => {
    const e = entries.get(name);
    return e ? `[${code(name)}](/${mcpGroupPath(e.group)}#${name})` : code(name);
  };
  let fence = null;
  return String(text)
    .split("\n")
    .map((line) => {
      const f = line.match(/^\s*(```+|~~~+)/);
      if (fence || f) {
        if (fence && f && f[1][0] === fence[0]) fence = null;
        else if (!fence && f) fence = f[1];
        return line;
      }
      return line
        .split(/(`[^`\n]*`)/)
        .map((part, i) => {
          if (i % 2) {
            const inner = part.slice(1, -1);
            return /^summer_[a-z0-9_]+$/.test(inner) ? link(inner) : part;
          }
          return part.replace(/\bsummer_[a-z0-9_]+\b/g, (name) => link(name));
        })
        .join("");
    })
    .join("\n");
}

function prose(text, entries) {
  return linkTools(escapeProse(text), entries);
}

function outputSection(t) {
  if (t.outputSchema) return ["**Output:** structured content matching this schema.", "", schemaBlock("Output JSON schema", t.outputSchema)].join("\n");
  const returns = String(t.description ?? "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter((s) => /^(?:Returns?|Result|The (?:result|response))\b/i.test(s));
  const lead = "**Output:** MCP text content holding JSON; errors set `isError`.";
  return returns.length ? `${lead} From the tool's own description: ${escapeProse(returns.join(" "))}` : lead;
}

function surfaceBody(t, kind, entries) {
  const lines = [];
  lines.push(prose(t.description, entries), "");
  const needs = kind === "local" ? localNeeds(t) : [HOSTED_NEEDS];
  const facts = [`| **Needs** | ${needs.map((n) => n).join("<br />")} |`];
  if (kind === "local" && t.descriptor) {
    const eff = Object.entries(t.descriptor.authority ?? {})
      .filter(([, v]) => v)
      .map(([k]) => EFFECTS[k]);
    facts.push(`| **Effects** | ${eff.length ? eff.join(", ") : "read-only"} |`);
    if (t.descriptor.cliCommand) facts.push(`| **CLI** | ${code(t.descriptor.cliCommand)} |`);
    else if (t.descriptor.slug) facts.push(`| **CLI** | ${code(`summer tool ${t.descriptor.slug} --args '<json>'`)} |`);
  }
  if (kind === "hosted") {
    const hints = Object.entries(t.annotations ?? {})
      .filter(([, v]) => v === true)
      .map(([k]) => code(k));
    if (hints.length) facts.push(`| **Hints** | ${hints.join(", ")} |`);
  }
  lines.push("| | |", "|---|---|", ...facts, "");
  if (kind === "local" && t.descriptor?.useWhen?.length) {
    lines.push("**Use when:**", "", ...t.descriptor.useWhen.map((u) => `- ${prose(u, entries)}`), "");
  }
  if (kind === "local" && t.descriptor?.doNotUseWhen?.length) {
    lines.push("**Do not use when:**", "", ...t.descriptor.doNotUseWhen.map((u) => `- ${prose(u, entries)}`), "");
  }
  lines.push("**Inputs:**", "", inputTable(t.inputSchema), "", schemaBlock("Input JSON schema", t.inputSchema), "");
  lines.push(outputSection(t), "", example(t.name, t.inputSchema));
  return lines.join("\n");
}

function toolSection(e, entries) {
  const out = [`### ${e.name}`, ""];
  const surfaces = [e.local && "local MCP (`summer-engine` npm)", e.hosted && "hosted MCP"].filter(Boolean);
  out.push(`On the ${surfaces.join(" and the ")}.`, "");
  if (e.local && e.hosted) {
    out.push(
      "<Tabs>",
      '<Tab title="Local MCP">',
      "",
      surfaceBody(e.local, "local", entries),
      "",
      "</Tab>",
      '<Tab title="Hosted MCP">',
      "",
      surfaceBody(e.hosted, "hosted", entries),
      "",
      "</Tab>",
      "</Tabs>",
    );
  } else {
    out.push(surfaceBody(e.local ?? e.hosted, e.local ? "local" : "hosted", entries));
  }
  return out.join("\n");
}

const banner = (src) =>
  `{/* Generated by scripts/reference/generate.mjs from scripts/reference/sources/mcp-tools.json (summer-engine ${src.sources.local.version}, hosted MCP at publicsummerengine ${src.sources.hosted.commit.slice(0, 10)}). Do not edit by hand: fix the tool's source, then run scripts/reference/sync.mjs. */}`;

function sourceNote(src) {
  return [
    "<Note>",
    `Generated from the tools' own definitions: the \`summer-engine\` npm package ${code(src.sources.local.version)} (its MCP server's \`tools/list\`, \`library/tools/*/resource.yaml\` and \`registry/generated/index.json\` in [SummerEngine/summer](https://github.com/SummerEngine/summer)) and the hosted Summer Engine MCP (\`src/lib/mcp/hosted\` at commit ${code(src.sources.hosted.commit.slice(0, 10))}). If something here is wrong, the tool definition is wrong.`,
    "</Note>",
  ].join("\n");
}

export function renderMcpGroupPage(group, entries, src) {
  const byName = new Map(entries.map((e) => [e.name, e]));
  const mine = entries.filter((e) => e.group === group.id);
  const lines = [
    "---",
    `title: ${fm(`MCP tools: ${group.title.toLowerCase()}`)}`,
    `sidebarTitle: ${fm(group.title)}`,
    `description: ${fm(`${group.title} tools of the Summer Engine MCP. ${group.blurb} For each tool: what it does, what it needs, inputs, output and an example.`)}`,
    `icon: ${fm(group.icon)}`,
    "generated: true",
    "generator: scripts/reference",
    "---",
    "",
    banner(src),
    "",
    `${escapeProse(group.blurb)} ${mine.length} tools. What each column means, and how to connect: [MCP tools reference](/mcp/tools-reference).`,
    "",
    sourceNote(src),
    "",
    "| Tool | Needs | What it does |",
    "|---|---|---|",
    ...mine.map((e) => `| [${code(e.name)}](#${e.name}) | ${needsSummary(e)} | ${cell(firstSentence((e.local ?? e.hosted).description))} |`),
    "",
    ...mine.flatMap((e) => [toolSection(e, byName), "", "---", ""]),
  ];
  return lines.join("\n").replace(/\n---\n\n$/, "\n");
}

export function renderMcpIndexPage(entries, src) {
  const count = (pred) => entries.filter(pred).length;
  const lines = [
    "---",
    'title: "MCP tools reference"',
    'sidebarTitle: "MCP tools"',
    `description: ${fm("Every Summer Engine MCP tool, generated from the tool definitions: what it does, what it needs (engine, sign-in, store sign-in), its inputs as JSON schema, its output and an example call.")}`,
    'icon: "wrench"',
    '"og:image": "https://docs.summerengine.com/images/og/mcp-tools-reference.jpg"',
    '"twitter:image": "https://docs.summerengine.com/images/og/mcp-tools-reference.jpg"',
    "generated: true",
    "generator: scripts/reference",
    "---",
    "",
    banner(src),
    "",
    `The Summer Engine MCP gives an agent ${entries.length} tools: ${count((e) => e.local && !e.hosted)} run only in the \`summer-engine\` npm MCP on your computer, ${count((e) => e.hosted && !e.local)} only on the hosted MCP at ${code(src.sources.hosted.endpoint)}, and ${count((e) => e.local && e.hosted)} on both. The npm MCP mounts the hosted tools after \`summer login --store\`, so a local agent sees one server. Set it up in [MCP setup](/mcp/setup); for publishing step by step, see [Create and publish your game](/publishing/summer-games).`,
    "",
    sourceNote(src),
    "",
    "## What a tool needs",
    "",
    "| Needs | Meaning |",
    "|---|---|",
    "| **Engine** | Summer Engine is open with your project. The tool talks to the running editor. |",
    "| **Signed in** | You ran `summer login` once. The tool calls Summer's servers with your account. |",
    "| **Store sign-in** | You ran `summer login --store`. Needed for Summer Games store and publishing tools. |",
    "| **Creator token** | You ran `summer login --creator`. Needed for the creator release tools. |",
    "| **Summer account** | A hosted tool. Your agent connects to the hosted MCP with your Summer account (OAuth). |",
    "| **Nothing** | No open editor and no sign-in. Some tools still use programs on your computer, such as the installed engine for exports. |",
    "",
    "Hosted tools that spend credits say so in their description. Cost depends on the models and voices you choose. Your dashboard shows spend as it happens, and your limits cap it.",
    "",
    "## Value formats",
    "",
    "Engine properties such as `position`, `rotation_degrees` and `mesh` take engine string syntax, not JSON objects.",
    "",
    "| Type | Format | Example |",
    "|---|---|---|",
    '| Vector3 | `"Vector3(x, y, z)"` | `"Vector3(0, 10, 0)"` |',
    '| Vector2 | `"Vector2(x, y)"` | `"Vector2(100, 200)"` |',
    '| Color | `"Color(r, g, b, a)"`, 0 to 1 | `"Color(1, 0.5, 0, 1)"` |',
    '| Transform3D | basis and origin | `"Transform3D(1,0,0, 0,1,0, 0,0,1, 0,5,0)"` |',
    '| Resource | class name, created for you | `"BoxMesh"`, `"StandardMaterial3D"` |',
    "| Number, boolean, string | plain JSON | `1.5`, `true`, `\"hello\"` |",
    "",
    "Node paths start with `./` from the scene root: `./World/Player` is the `Player` child of `World`. Every scene change names its scene with `scenePath`, such as `res://main.tscn`; the scene does not need to be the open editor tab.",
    "",
    "## Tools by task",
    "",
  ];
  for (const g of MCP_GROUPS) {
    const mine = entries.filter((e) => e.group === g.id);
    lines.push(
      `### ${g.title}`,
      "",
      `${escapeProse(g.blurb)} [All ${mine.length} tools in detail](/${mcpGroupPath(g.id)}).`,
      "",
      "| Tool | Needs | What it does |",
      "|---|---|---|",
      ...mine.map((e) => `| [${code(e.name)}](/${mcpGroupPath(g.id)}#${e.name}) | ${needsSummary(e)} | ${cell(firstSentence((e.local ?? e.hosted).description))} |`),
      "",
    );
  }
  if (src.localPrompts?.length || src.hostedPrompts?.length) {
    lines.push("## Prompts", "", "MCP prompts the servers offer next to the tools.", "", "| Prompt | Server | What it does |", "|---|---|---|");
    for (const p of src.localPrompts ?? []) lines.push(`| ${code(p.name)} | npm | ${cell(firstSentence(p.description))} |`);
    for (const p of src.hostedPrompts ?? []) lines.push(`| ${code(p.name)} | hosted | ${cell(firstSentence(p.description))} |`);
    lines.push("");
  }
  return lines.join("\n");
}
