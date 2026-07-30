#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWLIST_PATH = join(ROOT, "scripts/docs-language-allowlist.json");
const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));

if (allowlist.schemaVersion !== 1) {
  console.error(`language guard: unsupported allowlist schema ${JSON.stringify(allowlist.schemaVersion)}`);
  process.exit(1);
}

const walkMdx = (directory, output = []) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "scripts") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walkMdx(path, output);
    else if (entry.name.endsWith(".mdx")) output.push(path);
  }
  return output;
};

const maskComments = (value) =>
  value
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (match) => match.replace(/[^\n]/g, " "))
    .replace(/<!--[\s\S]*?-->/g, (match) => match.replace(/[^\n]/g, " "));

function proseLines(raw) {
  const lines = maskComments(raw).split("\n");
  const output = lines.map(() => "");
  let inFrontmatter = lines[0]?.trim() === "---";
  let inFence = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    if (inFrontmatter) {
      if (index > 0 && line.trim() === "---") {
        inFrontmatter = false;
        continue;
      }
      const field = line.match(/^(title|description)\s*:\s*(.*)$/);
      if (field) output[index] = field[2].replace(/^["']|["']$/g, "");
      continue;
    }

    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (inFence) {
      if (fence && fence[1][0] === inFence[0] && fence[1].length >= inFence.length) inFence = null;
      continue;
    }
    if (fence) {
      inFence = fence[1];
      continue;
    }

    output[index] = line
      .replace(/`[^`]*`/g, " ")
      .replace(/\]\([^)]*\)/g, "]")
      .replace(/\b(?:href|src|url)\s*=\s*["'][^"']*["']/g, " ");
  }

  return output;
}

const rules = [
  {
    id: "godot-game",
    pattern: /\bGodot games?\b/gi,
    help: "Use Summer game in creator-facing prose; keep Godot only in an allowlisted technical or migration context.",
  },
  {
    id: "default-godot-45",
    pattern:
      /(?:\b(?:install|download|require|required|prerequisite|use|run)\b.{0,80}\bGodot\s+4\.5\b|\bGodot\s+4\.5\b.{0,80}\b(?:install|download|required|prerequisite|use|run)\b)/gi,
    help: "Default onboarding must install and use Summer Engine, never plain Godot 4.5.",
  },
  {
    id: "lowercase-gdscript",
    pattern: /\bgdscript\b/g,
    help: "Spell the language GDScript in prose; lowercase is reserved for fenced-code tags, paths, and identifiers.",
  },
];

const exceptions = allowlist.exceptions ?? [];
const usedExceptions = new Map(exceptions.map((exception, index) => [index, 0]));
const errors = [];

for (let index = 0; index < exceptions.length; index++) {
  const exception = exceptions[index];
  for (const field of ["rule", "file", "match", "owner", "reason"]) {
    if (typeof exception[field] !== "string" || !exception[field].trim()) {
      errors.push(`allowlist exception ${index} is missing ${field}`);
    }
  }
  if (!Number.isInteger(exception.maxOccurrences) || exception.maxOccurrences < 1) {
    errors.push(`allowlist exception ${index} must have a positive maxOccurrences`);
  }
}

for (const absolute of walkMdx(ROOT)) {
  const file = relative(ROOT, absolute).split(sep).join("/");
  const lines = proseLines(readFileSync(absolute, "utf8"));

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      for (const match of line.matchAll(rule.pattern)) {
        const exceptionIndex = exceptions.findIndex(
          (exception, index) =>
            exception.rule === rule.id &&
            exception.file === file &&
            exception.match === match[0] &&
            usedExceptions.get(index) < exception.maxOccurrences,
        );
        if (exceptionIndex >= 0) {
          usedExceptions.set(exceptionIndex, usedExceptions.get(exceptionIndex) + 1);
          continue;
        }
        errors.push(`${file}:${lineIndex + 1} [${rule.id}] ${JSON.stringify(match[0])} — ${rule.help}`);
      }
    }
  }
}

for (let index = 0; index < exceptions.length; index++) {
  const exception = exceptions[index];
  const used = usedExceptions.get(index);
  if (used !== exception.maxOccurrences) {
    errors.push(
      `allowlist exception ${index} expected ${exception.maxOccurrences} occurrence(s), found ${used}: ` +
        `${exception.file} [${exception.rule}] ${JSON.stringify(exception.match)}`,
    );
  }
}

for (const requirement of allowlist.requiredTerms ?? []) {
  const absolute = join(ROOT, requirement.file);
  let prose;
  try {
    prose = proseLines(readFileSync(absolute, "utf8")).join("\n");
  } catch {
    errors.push(`required-term file is missing: ${requirement.file}`);
    continue;
  }
  for (const term of requirement.terms ?? []) {
    if (!prose.includes(term)) errors.push(`${requirement.file} is missing required creator term ${JSON.stringify(term)}`);
  }
}

if (errors.length) {
  console.error(`language guard: FAIL (${errors.length})`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(
  `language guard: PASS ${rules.length} targeted rules, ${exceptions.length} owned exceptions, ` +
    `${(allowlist.requiredTerms ?? []).length} canonical routes`,
);
