#!/usr/bin/env node
/**
 * generate-llms.mjs — writes llms.txt at the repo root: an "Agent
 * instructions" block for coding agents, then every page in navigation order
 * (one line per page: title, the page's .md URL, its description), grouped
 * by tab. A root llms.txt replaces the one the docs host would generate, so
 * this keeps the full index and adds the block on top.
 *
 * Zero dependencies. Node 20+.
 *   node scripts/generate-llms.mjs          write llms.txt
 *   node scripts/generate-llms.mjs --check  exit 1 when llms.txt is out of date
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://docs.summerengine.com";
const OUT = join(ROOT, "llms.txt");
const CHECK = process.argv[2] === "--check";

const AGENT_INSTRUCTIONS = `## Agent instructions

Summer Engine is the game engine built for AI: any coding agent builds a full multiplayer game and publishes it.

- Every page is Markdown: add \`.md\` to its URL (for example ${BASE}/router/quickstart.md), or send \`Accept: text/markdown\`.
- Hosted MCP (OAuth, no install): https://mcp.summerengine.com/mcp
- Local MCP and CLI: the \`summer-engine\` npm package (Node 20 or later). Set up an agent: \`npx -y summer-engine@latest setup claude-code --yes\` (or \`codex\`, \`cursor\`, and others). The CLI is \`summer\`; without a global install, run \`npx -y summer-engine@latest <command>\`.
- Skills: \`setup\` installs them. One skill: \`npx -y summer-engine@latest skills install <name>\`.
- Sign in: \`summer login\`. With no terminal (an agent) it prints JSON \`{browser_url, verification_code, next_step}\`: show browser_url to the person, then run \`summer login --complete\`. CI: set \`SUMMER_TOKEN\`.
- Summer Router (AI characters, speech, transcription and images at runtime; early access): \`npx -y summer-engine@latest router setup --yes\`, then ${BASE}/router/quickstart.md. Game code calls \`Summer.client.router\` (the engine reaches \`/v1/games/{gameId}/router/...\` through the Summer host). Character files live in \`ai/characters/<id>.json\`; the operations router.add_character, router.check, router.push and router.pull work on them (\`summer router <action>\`, or \`summer_call\` in MCP), and router.push and router.pull reach \`/v1/management/games/{gameId}/router/...\`. The cloud ones (router.models, router.list_characters, router.save_character, router.test_character, router.settings, router.set_settings, router.usage, ...) run on the hosted server: find them with \`summer_search\`, run them with \`summer_call\`.
- Every Summer operation (\`area.action\`) answers \`{ok, status, result}\` or \`{ok: false, error: {code, message, next}}\`; \`summer <area> <action> --json\` prints only that, exit 0 or 1. A step for a person is one URL (\`browser_url\`, or \`error.next.url\`); show it.
- Never put a provider key, a model name or a prompt in a game build.`;

const config = JSON.parse(readFileSync(join(ROOT, "docs.json"), "utf8"));

function frontmatter(page) {
  const file = join(ROOT, `${page}.mdx`);
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  const fields = {};
  for (const line of (match?.[1] ?? "").split("\n")) {
    const field = line.match(/^(title|description)\s*:\s*(.*)$/);
    if (!field) continue;
    let value = field[2].trim();
    if (/^".*"$/.test(value)) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1);
      }
    } else if (/^'.*'$/.test(value)) {
      value = value.slice(1, -1);
    }
    fields[field[1]] = value;
  }
  return fields;
}

function pagesOf(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) pagesOf(item, out);
    return out;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "pages" && Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") out.push(item);
          else pagesOf(item, out);
        }
      } else if (key !== "tab") {
        pagesOf(value, out);
      }
    }
  }
  return out;
}

const seen = new Set();
const sections = [];
for (const tab of config.navigation?.tabs ?? []) {
  const lines = [];
  for (const page of pagesOf(tab)) {
    if (seen.has(page)) continue;
    seen.add(page);
    const fields = frontmatter(page);
    if (!fields?.title) continue;
    const description = fields.description ? `: ${fields.description.replace(/\s+/g, " ").trim()}` : "";
    lines.push(`- [${fields.title}](${BASE}/${page}.md)${description}`);
  }
  if (lines.length) sections.push(`## ${tab.tab}\n\n${lines.join("\n")}`);
}

const summary = config.seo?.metatags?.description ?? "";
const text = `# ${config.name}\n\n${summary ? `> ${summary}\n\n` : ""}${AGENT_INSTRUCTIONS}\n\n${sections.join("\n\n")}\n`;

if (CHECK) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== text) {
    console.error("llms.txt is out of date. Run: node scripts/generate-llms.mjs");
    process.exit(1);
  }
  console.log(`llms.txt is current (${seen.size} pages).`);
} else {
  writeFileSync(OUT, text);
  console.log(`wrote llms.txt (${seen.size} pages)`);
}
