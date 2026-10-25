/**
 * The "How to make" guides of the Summer API tab: in-depth, hand-written
 * prose in scripts/api/guides/<slug>.md, with every model, input, code tab
 * and price filled in from GET /v1/models (zero dependencies, no network).
 *
 * A guide source is Markdown with a frontmatter block (title, sidebarTitle,
 * description, icon, order) and one fenced `recipe` block of JSON: the
 * chain of jobs the guide teaches.
 *
 *   ```recipe
 *   { "steps": [
 *     { "id": "concept", "title": "Concept art", "models": ["image/gpt-image-2.5", "image/default"],
 *       "why": "...", "count": 1, "input": { "prompt": "..." } },
 *     { "id": "model", "title": "3D model", "models": ["3d/default"], "why": "...",
 *       "input": { "kind": "image-to-3d", "imageUrl": "{{concept.fileUrl}}" } } ] }
 *   ```
 *
 * In the body:
 *   the recipe block       becomes the chain table: step, model, why, cost
 *   {{step <id>}}          the step's job in CLI, curl, TypeScript, Python and MCP tabs
 *   {{cost}}               the total, step by step, and how to get the exact price
 *   {{model <id>}}         a link to that model's page, by its name
 *   {{price <id>}}         that model's price per unit
 *
 * `models` lists the models to use, best first: the first one the Summer API
 * lists wins, so a guide moves to a new model the day it ships. `{{x.fileUrl}}`
 * in an input is the file of an earlier step. A guide source never types a
 * dollar amount; every price comes from the model list.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const GUIDES_DIR = "api/guides";
export const GUIDES_INDEX = "api/guides";

const DOLLAR = /\$\s?\d/;

function parse(file, raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: a guide starts with a frontmatter block`);
  const head = Object.fromEntries(
    m[1].split("\n").filter(Boolean).map((line) => {
      const at = line.indexOf(":");
      const key = line.slice(0, at).trim();
      const value = line.slice(at + 1).trim();
      return [key, value.startsWith('"') ? JSON.parse(value) : value];
    }),
  );
  for (const key of ["title", "sidebarTitle", "description", "icon"]) if (!head[key]) throw new Error(`${file}: frontmatter needs ${key}`);
  const fence = m[2].match(/```recipe\n([\s\S]*?)\n```/);
  if (!fence) throw new Error(`${file}: a guide needs one \`\`\`recipe block`);
  let recipe;
  try {
    recipe = JSON.parse(fence[1]);
  } catch (error) {
    throw new Error(`${file}: the recipe block is not JSON (${error.message})`);
  }
  if (DOLLAR.test(m[2])) throw new Error(`${file}: a guide never types a dollar amount; use {{price <model>}} or {{cost}}`);
  return { head, body: m[2], recipeBlock: fence[0], recipe };
}

/**
 * The guide pages. `kit` is generate.mjs's own helpers, so guides render
 * prices, links and code exactly as the model pages do.
 */
export function guidePages(sourceDir, kit) {
  const { models, aliases, modelPath, money, unitLabel, jobCode, code, cell, fm, banner, generator } = kit;
  const byId = new Map(models.map((m) => [m.id, m]));
  const resolve = (id) => byId.get(aliases[id] ?? id);
  if (!existsSync(sourceDir)) return { pages: new Map(), nav: [] };

  const guides = readdirSync(sourceDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ slug: f.replace(/\.md$/, ""), ...parse(f, readFileSync(join(sourceDir, f), "utf8")) }))
    .sort((a, b) => Number(a.head.order ?? 99) - Number(b.head.order ?? 99) || a.slug.localeCompare(b.slug));

  const props = (m) => m.inputSchema?.properties ?? {};

  /** What one job of this input costs at list price, and whether that is a typical request rather than the exact one. */
  function estimate(m, input) {
    const p = m.price;
    let unit = Number(p.price);
    let add = 0;
    for (const rule of p.modifiers ?? []) {
      const hit = rule.set ? input[rule.field] !== undefined : rule.equals !== undefined && input[rule.field] === rule.equals;
      if (!hit) continue;
      if (rule.price !== undefined) unit = Number(rule.price);
      if (rule.add !== undefined) add += Number(rule.add);
    }
    const field = p.quantityField;
    const fallback = field ? props(m)[field]?.default : undefined;
    let quantity = 1;
    if (p.unit === "1k_characters") {
      const text = Array.isArray(input[field]) ? input[field].map((line) => line.text ?? "").join("") : String(input[field] ?? "");
      quantity = text.length / 1000;
    } else if (field) {
      quantity = Number(input[field] ?? fallback ?? (p.unit === "output_second" ? 5 : 1));
    }
    let total = unit * quantity + add * (p.unit === "call" ? quantity : 1);
    if (p.minimum) total = Math.max(total, Number(p.minimum));
    return { usd: total, typical: Boolean(p.estimate) };
  }

  const pages = new Map();
  const nav = [];

  for (const g of guides) {
    const file = `${g.slug}.md`;
    const steps = new Map();
    for (const step of g.recipe.steps ?? []) {
      if (!step.id || !step.title || !Array.isArray(step.models) || !step.input) throw new Error(`${file}: every recipe step needs id, title, models and input`);
      const model = step.models.map(resolve).find(Boolean);
      if (!model) throw new Error(`${file}: step ${step.id}: none of ${step.models.join(", ")} is on the Summer API`);
      // Keep only the fields this model takes, so a guide that moved to a new model stays a valid request.
      const known = props(model);
      const input = Object.fromEntries(Object.entries(step.input).filter(([k]) => k in known));
      for (const k of model.inputSchema?.required ?? []) if (!(k in input)) throw new Error(`${file}: step ${step.id}: ${model.id} needs ${k}`);
      const count = Number(step.count ?? 1);
      const cost = estimate(model, input);
      steps.set(step.id, { ...step, model, input, count, cost });
    }
    const fileOf = (text) =>
      text.replace(/\{\{(\w+)\.fileUrl\}\}/g, (_, id) => {
        if (!steps.has(id)) throw new Error(`${file}: {{${id}.fileUrl}} names no step`);
        return `<fileUrl of ${steps.get(id).title.toLowerCase()}>`;
      });
    const each = (s) => (s.count > 1 ? ` x ${s.count}` : "");
    const stepCost = (s) => `${s.cost.typical ? "about " : ""}${money(s.cost.usd * s.count)}`;
    const total = [...steps.values()].reduce((sum, s) => sum + s.cost.usd * s.count, 0);
    const typical = [...steps.values()].some((s) => s.cost.typical);

    const table = [
      "| Step | Model | Why this model | Cost |",
      "|---|---|---|---|",
      ...[...steps.values()].map((s, i) => `| ${i + 1}. ${cell(s.title)}${each(s)} | [${cell(s.model.name)}](/${modelPath(s.model)}) ${code(s.model.id)} | ${cell(s.why ?? "")} | ${stepCost(s)} |`),
      `| | | **Total** | **${typical ? "about " : ""}${money(total)}** |`,
    ].join("\n");

    const costBlock = [
      `**${typical ? "About " : ""}${money(total)} for the whole chain**, at each model's list price:`,
      "",
      ...[...steps.values()].map((s) => `- ${cell(s.title)}${each(s)}: ${stepCost(s)} (${money(Number(s.model.price.price))} per ${unitLabel(s.model)}${s.count > 1 ? `, ${s.count} jobs` : ""})`),
      "",
      `A failed job costs nothing. Before you run anything, price each step exactly and for free: ${code("summer api estimate <model> --input '<json>'")}, or ${code("POST /v1/estimate")} with the same body as the job. Prices come from [\`GET /v1/models\`](/api/reference/get-models) and change only when the provider's price does.`,
    ].join("\n");

    let body = g.body.replace(g.recipeBlock, table);
    body = body.replace(/\{\{step (\w+)\}\}/g, (_, id) => {
      const s = steps.get(id);
      if (!s) throw new Error(`${file}: {{step ${id}}} names no recipe step`);
      return jobCode(s.model.id, JSON.parse(fileOf(JSON.stringify(s.input))));
    });
    body = body.replace(/\{\{cost\}\}/g, costBlock);
    body = body.replace(/\{\{(model|price) ([\w./-]+)\}\}/g, (_, what, id) => {
      const m = resolve(id);
      if (!m) throw new Error(`${file}: {{${what} ${id}}}: no such model on the Summer API`);
      return what === "model" ? `[${m.name}](/${modelPath(m)})` : `${money(Number(m.price.price))} per ${unitLabel(m)}`;
    });
    body = fileOf(body);
    if (/\{\{/.test(body)) throw new Error(`${file}: an unknown {{...}} marker is left: ${body.match(/\{\{[^}]*\}\}/)[0]}`);

    const path = `${GUIDES_DIR}/${g.slug}`;
    pages.set(
      path,
      [
        "---",
        `title: ${fm(g.head.title)}`,
        `sidebarTitle: ${fm(g.head.sidebarTitle)}`,
        `description: ${fm(g.head.description)}`,
        `icon: ${fm(g.head.icon)}`,
        ...(g.head.keywords ? [`keywords: ${g.head.keywords}`] : []),
        "generated: true",
        `generator: ${generator}`,
        "---",
        "",
        banner(`scripts/api/guides/${file} and GET /v1/models`),
        "",
        body.trim(),
        "",
      ].join("\n"),
    );
    nav.push({ path, title: g.head.sidebarTitle, icon: g.head.icon, description: g.head.description, total, typical });
  }

  if (nav.length) {
    pages.set(
      GUIDES_INDEX,
      [
        "---",
        'title: "How to make game assets with AI: every guide"',
        'sidebarTitle: "All guides"',
        `description: ${fm(`Step-by-step guides for game developers: which Summer API models to chain for a 3D character, sound effects, cutscene music, a trailer, voice lines, a logo, textures and more, with the exact CLI, API and MCP steps and what each costs.`)}`,
        'icon: "map"',
        "generated: true",
        `generator: ${generator}`,
        "---",
        "",
        banner("scripts/api/guides and GET /v1/models"),
        "",
        "Each guide is one real job from a game's production, start to finish: which models to chain and why, the exact request for every step in the CLI, over HTTP and through MCP, and what the whole chain costs at list price. Hand a guide to your coding agent and it can run it for you.",
        "",
        "<CardGroup cols={2}>",
        ...nav.map((n) => `  <Card title=${JSON.stringify(n.title)} icon=${JSON.stringify(n.icon)} href=${JSON.stringify(`/${n.path}`)}>\n    ${cell(n.description)} The whole chain: ${n.typical ? "about " : ""}${money(n.total)}.\n  </Card>`),
        "</CardGroup>",
        "",
      ].join("\n"),
    );
  }
  return { pages, nav: nav.length ? [GUIDES_INDEX, ...nav.map((n) => n.path)] : [] };
}
