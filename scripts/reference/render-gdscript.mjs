// Renders the in-game Summer GDScript API reference from sources/gdscript-api.json.

import { cell, code, escapeProse, firstSentence, fm, kebab } from "./lib/mdx.mjs";

export const GD_BASE = "api-reference/gdscript";

/** Page path and display name for every class. */
export function gdPages(src) {
  const classes = src.classes;
  const pages = new Map();
  pages.set("SummerRuntime", { path: `${GD_BASE}/overview`, display: "Summer", kind: "root" });
  for (const [rootClass, root, prefix] of [
    ["SummerClient", "client", "Summer.client"],
    ["SummerAuthority", "authority", "Summer.authority"],
  ]) {
    pages.set(rootClass, { path: `${GD_BASE}/${root}`, display: prefix, kind: "root" });
    for (const m of classes[rootClass]?.members ?? []) {
      if (classes[m.type] && !pages.has(m.type)) {
        pages.set(m.type, { path: `${GD_BASE}/${root}/${kebab(m.name)}`, display: `${prefix}.${m.name}`, kind: root, member: m.name });
      }
    }
  }
  if (classes.SummerMultiplayerService) {
    pages.set("SummerMultiplayerService", { path: `${GD_BASE}/multiplayer`, display: "Summer.multiplayer", kind: "root" });
  }
  for (const name of Object.keys(classes).sort()) {
    if (!pages.has(name)) pages.set(name, { path: `${GD_BASE}/types/${kebab(name.replace(/^Summer/, ""))}`, display: name, kind: "type" });
  }
  return pages;
}

function linkType(type, pages) {
  if (!type) return "void";
  return String(type).replace(/Summer[A-Za-z0-9]+(?:\.[A-Za-z0-9_]+)?/g, (t) => {
    const [cls, en] = t.split(".");
    const p = pages.get(cls);
    if (!p) return code(t);
    return `[${code(t)}](/${p.path}${en ? `#${en.toLowerCase()}` : ""})`;
  });
}

const plainType = (t) => String(t ?? "void");

/** Convert Godot class-reference BBCode to MDX. */
function bbcode(text, cls, pages) {
  if (!text) return "";
  const blocks = [];
  let s = String(text)
    .replace(/\[codeblocks?\]([\s\S]*?)\[\/codeblocks?\]/g, (_, body) => {
      const inner = body.replace(/\[\/?gdscript\]/g, "").replace(/\[csharp\][\s\S]*?\[\/csharp\]/g, "");
      const lines = inner.replace(/^\n+|\s+$/g, "").split("\n");
      const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\t*/)[0].length));
      blocks.push(["```gdscript", ...lines.map((l) => l.slice(indent).replace(/\t/g, "    ")), "```"].join("\n"));
      return `\u0000${blocks.length - 1}\u0000`;
    });
  const refs = [];
  const keep = (mdx) => {
    refs.push(mdx);
    return `\u0001${refs.length - 1}\u0001`;
  };
  const member = (kind, target) => {
    const [a, b] = target.includes(".") ? target.split(".") : [cls, target];
    const p = pages.get(a);
    const label = kind === "method" ? `${b}()` : b;
    if (!p) return keep(code(target));
    return keep(`[${code(a === cls ? label : `${pages.get(a).display}.${label}`)}](/${p.path}#${b.toLowerCase()})`);
  };
  s = s
    .replace(/\[code\]([\s\S]*?)\[\/code\]/g, (_, c) => keep(code(c)))
    .replace(/\[(method|member|signal|constant|enum) ([^\]]+)\]/g, (_, kind, target) => member(kind, target))
    .replace(/\[param ([^\]]+)\]/g, (_, p) => keep(code(p)))
    .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/g, (_, u, t) => keep(`[${t}](${u})`))
    .replace(/\[(Summer[A-Za-z0-9]+)\]/g, (_, c) => keep(pages.get(c) ? `[${code(c)}](/${pages.get(c).path})` : code(c)))
    .replace(/\[([A-Z][A-Za-z0-9]+)\]/g, (_, c) => keep(code(c)))
    .replace(/\[b\]([\s\S]*?)\[\/b\]/g, (_, t) => keep(`**${t}**`))
    .replace(/\[i\]([\s\S]*?)\[\/i\]/g, (_, t) => keep(`*${t}*`))
    .replace(/\[br\]/g, "\n");
  s = escapeProse(s);
  s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => refs[Number(i)]);
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `\n\n${blocks[Number(i)]}\n\n`);
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

const isOperation = (type, classes) => {
  let t = String(type ?? "");
  const seen = new Set();
  while (classes[t] && !seen.has(t)) {
    if (t === "SummerOperation") return true;
    seen.add(t);
    t = classes[t].inherits;
  }
  return t === "SummerOperation";
};

function signature(name, params, returns, qualifiers) {
  const args = params.map((p) => `${p.name}: ${plainType(p.type)}${p.default !== undefined ? ` = ${p.default}` : ""}`).join(", ");
  const q = qualifiers ? ` ${qualifiers}` : "";
  return `func ${name}(${args}) -> ${plainType(returns)}${q}`;
}

function capabilityBadges(text) {
  return [...new Set([...String(text ?? "").matchAll(/\b([a-z]+(?:\.[a-z_]+)+@\d+)\b/g)].map((m) => m[1]))];
}

export function renderGdClassPage(name, src, pages) {
  const classes = src.classes;
  const c = classes[name];
  const page = pages.get(name);
  const display = page.display;
  const title = page.kind === "type" ? name : display;
  const brief = firstSentence(bbcodePlain(c.brief || c.description), 200);
  const lines = [
    "---",
    `title: ${fm(title)}`,
    ...(page.member ? [`sidebarTitle: ${fm(page.member)}`] : []),
    `description: ${fm(brief || `${name} in the Summer GDScript API.`)}`,
    "generated: true",
    "generator: scripts/reference",
    "---",
    "",
    `{/* Generated by scripts/reference/generate.mjs from ${c.file} in SummerEngine at ${src.commit.slice(0, 10)}. Do not edit by hand: fix the class reference XML in the engine, then run scripts/reference/sync.mjs. */}`,
    "",
  ];
  const header = [`**Class:** ${code(name)}`];
  if (c.inherits) header.push(`**Inherits:** ${linkType(c.inherits, pages)}`);
  if (page.kind !== "type" && page.kind !== "root") header.push(`**Access:** ${code(display)}`);
  lines.push(header.join(" · "), "");
  if (c.brief) lines.push(bbcode(c.brief, name, pages), "");
  if (c.description && c.description !== c.brief) lines.push(bbcode(c.description, name, pages), "");
  const caps = capabilityBadges([c.description, ...c.methods.map((m) => m.description)].join(" "));
  if (caps.length) lines.push(`**Host capabilities named here:** ${caps.map(code).join(", ")}`, "");

  if (name === "SummerClient" || name === "SummerAuthority") {
    lines.push("## Services", "", "| Property | Class | What it does |", "|---|---|---|");
    for (const m of c.members) {
      const p = pages.get(m.type);
      lines.push(`| ${p ? `[${code(m.name)}](/${p.path})` : code(m.name)} | ${linkType(m.type, pages)} | ${cell(firstSentence(bbcodePlain(classes[m.type]?.brief || m.description)))} |`);
    }
    lines.push("");
  }

  if (c.members.length) {
    lines.push("## Properties", "", "| Property | Type | Access | Description |", "|---|---|---|---|");
    for (const m of c.members) {
      const access = m.readOnly ? `read-only${m.getter ? `, ${code(`${m.getter}()`)}` : ""}` : `read and write${m.default !== undefined ? `, default ${code(m.default)}` : ""}`;
      lines.push(`| <a id="${m.name.toLowerCase()}" />${code(m.name)} | ${linkType(m.type, pages)} | ${access} | ${cell(bbcodePlain(m.description))} |`);
    }
    lines.push("");
  }

  if (c.methods.length) {
    lines.push("## Methods", "");
    for (const m of c.methods) {
      lines.push(`### ${m.name}`, "", "```gdscript", signature(m.name, m.params, m.returns, m.qualifiers), "```", "");
      if (m.deprecated !== undefined) lines.push(`<Warning>Deprecated. ${escapeProse(m.deprecated)}</Warning>`, "");
      if (m.experimental !== undefined) lines.push(`<Note>Experimental. ${escapeProse(m.experimental)}</Note>`, "");
      lines.push(bbcode(m.description, name, pages), "");
      if (m.params.length) {
        lines.push("| Parameter | Type | Default |", "|---|---|---|");
        for (const p of m.params) lines.push(`| ${code(p.name)} | ${linkType(p.type, pages)} | ${p.default !== undefined ? code(p.default) : "required"} |`);
        lines.push("");
      }
      lines.push(`**Returns:** ${linkType(m.returns, pages)}`);
      if (isOperation(m.returns, classes)) {
        lines.push(
          "",
          `Returns at once. Wait for the result with \`var result: SummerResult = await op.get_result_or_completed_signal()\`; see [SummerOperation](/${pages.get("SummerOperation")?.path ?? `${GD_BASE}/overview`}).`,
        );
      }
      lines.push("");
    }
  }

  if (c.signals.length) {
    lines.push("## Signals", "");
    for (const s of c.signals) {
      lines.push(`### ${s.name}`, "", "```gdscript", `signal ${s.name}(${s.params.map((p) => `${p.name}: ${plainType(p.type)}`).join(", ")})`, "```", "", bbcode(s.description, name, pages), "");
    }
  }

  if (c.constants.length) {
    lines.push("## Enums and constants", "");
    const groups = new Map();
    for (const k of c.constants) {
      const key = k.enum ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(k);
    }
    for (const [en, list] of groups) {
      lines.push(en ? `### ${en}` : "### Constants", "", "| Name | Value | Description |", "|---|---|---|");
      for (const k of list) lines.push(`| ${code(k.name)} | ${code(k.value)} | ${cell(bbcodePlain(k.description))} |`);
      lines.push("");
    }
  }
  lines.push("---", "", "What is live on the platform today: [platform capability status](/knowledge-base/source-status). Check availability at runtime before you offer a feature.");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** BBCode reduced to plain text with code spans (for tables and summaries). */
function bbcodePlain(text) {
  return String(text ?? "")
    .replace(/\[codeblocks?\][\s\S]*?\[\/codeblocks?\]/g, "")
    .replace(/\[code\]([\s\S]*?)\[\/code\]/g, "`$1`")
    .replace(/\[(?:method|member|signal|constant|enum|param) ([^\]]+)\]/g, "`$1`")
    .replace(/\[url=[^\]]+\]([\s\S]*?)\[\/url\]/g, "$1")
    .replace(/\[\/?[bi]\]/g, "")
    .replace(/\[br\]/g, " ")
    .replace(/\[([A-Z][A-Za-z0-9]+)\]/g, "`$1`")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderGdOverviewExtras(src, pages) {
  // Appended to the Summer (SummerRuntime) page: a map of the whole API.
  const rows = (kind) =>
    [...pages.entries()]
      .filter(([, p]) => p.kind === kind)
      .map(([cls, p]) => `| [${code(p.display)}](/${p.path}) | ${cell(firstSentence(bbcodePlain(src.classes[cls].brief)))} |`);
  return [
    "## The whole API",
    "",
    `Generated from the engine's class reference: ${src.paths.map(code).join(", ")} in SummerEngine at commit ${code(src.commit.slice(0, 10))}. The generator checks the XML against the engine's C++ bindings and fails on any difference. If something here is wrong, the engine's class reference is wrong.`,
    "",
    "### How calls work",
    "",
    `Every call that talks to Summer returns a [\`SummerOperation\`](/${pages.get("SummerOperation").path}) at once and finishes later on the main thread. Await its result:`,
    "",
    "```gdscript",
    "var op := Summer.client.analytics.capture(\"level_completed\", {\"level\": 3})",
    "var result: SummerResult = await op.get_result_or_completed_signal()",
    "if not result.ok:",
    "    push_warning(result.message)",
    "```",
    "",
    "`Summer.client` exists only in the player's game and `Summer.authority` only on your game's server. The other one is `null`. Check readiness before you offer a feature: many services have `is_available()` or a `check_*_readiness()` method.",
    "",
    "### Summer.client: in the player's game",
    "",
    "| Service | What it does |",
    "|---|---|",
    `| [${code("Summer.client")}](/${pages.get("SummerClient").path}) | ${cell(firstSentence(bbcodePlain(src.classes.SummerClient.brief)))} |`,
    ...rows("client"),
    "",
    "### Summer.authority: on your game's server",
    "",
    "| Service | What it does |",
    "|---|---|",
    `| [${code("Summer.authority")}](/${pages.get("SummerAuthority").path}) | ${cell(firstSentence(bbcodePlain(src.classes.SummerAuthority.brief)))} |`,
    ...rows("authority"),
    "",
    ...(pages.has("SummerMultiplayerService")
      ? ["### Summer.multiplayer", "", `[${code("Summer.multiplayer")}](/${pages.get("SummerMultiplayerService").path}): ${escapeProse(firstSentence(bbcodePlain(src.classes.SummerMultiplayerService.brief)))}`, ""]
      : []),
    "### Types",
    "",
    "Results, operations and values the services return.",
    "",
    "| Class | What it is |",
    "|---|---|",
    ...rows("type").map((r) => r),
    "",
  ].join("\n");
}
