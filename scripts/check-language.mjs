#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { scanCompatibilityClaims, scanIdentityText } from "./docs-policy-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWLIST_PATH = join(ROOT, "scripts/docs-language-allowlist.json");
const CONFIG_PATH = join(ROOT, "docs.json");
const COMPATIBILITY_PATH = join(ROOT, "compatibility/summer-engine.json");
const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const compatibility = JSON.parse(readFileSync(COMPATIBILITY_PATH, "utf8"));

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

const navigation = [];
function collectNavigation(node) {
  if (Array.isArray(node)) {
    for (const value of node) collectNavigation(value);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (key === "pages" && Array.isArray(value)) {
      for (const page of value) {
        if (typeof page === "string") navigation.push(page);
        else collectNavigation(page);
      }
    } else {
      collectNavigation(value);
    }
  }
}
collectNavigation(config.navigation);

const routeToFile = (route) => (route === "index" ? "index.mdx" : `${route.replace(/^\//, "")}.mdx`);
const publicFiles = new Set(navigation.map(routeToFile));
const technicalGodotMetadataFiles = new Set(allowlist.technicalGodotMetadataFiles ?? []);
const currentUpstream = String(compatibility?.upstreamBase?.current?.version ?? "");
const currentFeature = currentUpstream.match(/^(\d+\.\d+)(?:\.|$)/)?.[1];

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

function frontmatterMetadata(raw) {
  const lines = maskComments(raw).split("\n");
  if (lines[0]?.trim() !== "---") return [];
  const output = [];
  for (let index = 1; index < lines.length && lines[index].trim() !== "---"; index++) {
    const field = lines[index].match(/^(title|description)\s*:\s*(.*)$/);
    if (field) output.push({ line: index + 1, field: field[1], value: field[2].replace(/^["']|["']$/g, "") });
  }
  return output;
}

const rules = [
  {
    id: "lowercase-gdscript",
    pattern: /\bgdscript\b/g,
    help: "Spell the language GDScript in prose; lowercase is reserved for fenced-code tags, paths, and identifiers.",
  },
];

const exceptions = allowlist.exceptions ?? [];
const usedExceptions = new Map(exceptions.map((exception, index) => [index, 0]));
const errors = [];

function consumeException(rule, file, match) {
  const exceptionIndex = exceptions.findIndex(
    (exception, index) =>
      exception.rule === rule &&
      exception.file === file &&
      exception.match === match &&
      usedExceptions.get(index) < exception.maxOccurrences,
  );
  if (exceptionIndex < 0) return false;
  usedExceptions.set(exceptionIndex, usedExceptions.get(exceptionIndex) + 1);
  return true;
}

if (!currentFeature) {
  errors.push("compatibility/summer-engine.json is missing a valid upstreamBase.current.version");
}

const duplicateRoutes = [...new Set(navigation.filter((route, index) => navigation.indexOf(route) !== index))];
for (const route of duplicateRoutes) errors.push(`docs.json contains duplicate public route ${route}`);
for (const file of publicFiles) {
  if (!existsSync(join(ROOT, file))) errors.push(`docs.json public route is missing its source file: ${file}`);
}
for (const file of technicalGodotMetadataFiles) {
  if (!publicFiles.has(file)) errors.push(`technicalGodotMetadataFiles entry is not a public navigation route: ${file}`);
}

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
  const raw = readFileSync(absolute, "utf8");
  const lines = proseLines(raw);

  for (const metadata of frontmatterMetadata(raw)) {
    if (/\bGodot\b/i.test(metadata.value) && !technicalGodotMetadataFiles.has(file)) {
      errors.push(
        `${file}:${metadata.line} [godot-led-metadata] ${metadata.field}=${JSON.stringify(metadata.value)} — ` +
          "Lead public metadata with Summer Engine; allow Godot only on owned compatibility, migration, or extension routes.",
      );
    }
  }

  for (const violation of scanIdentityText(raw, { currentFeature })) {
    if (consumeException(violation.rule, file, violation.match)) continue;
    errors.push(
      `${file}:${violation.line} [${violation.rule}] ${JSON.stringify(violation.match)} — ${violation.help}`,
    );
  }
  for (const violation of scanCompatibilityClaims(raw)) {
    if (consumeException(violation.rule, file, violation.match)) continue;
    errors.push(
      `${file}:${violation.line} [${violation.rule}] ${JSON.stringify(violation.match)} — ${violation.help}`,
    );
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      for (const match of line.matchAll(rule.pattern)) {
        if (consumeException(rule.id, file, match[0])) continue;
        errors.push(`${file}:${lineIndex + 1} [${rule.id}] ${JSON.stringify(match[0])} — ${rule.help}`);
      }
    }
  }
}

const scannedPublicFiles = new Set(
  walkMdx(ROOT)
    .map((absolute) => relative(ROOT, absolute).split(sep).join("/"))
    .filter((file) => publicFiles.has(file)),
);
for (const file of publicFiles) {
  if (!scannedPublicFiles.has(file)) errors.push(`language guard did not scan public route source: ${file}`);
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
  `language guard: PASS ${navigation.length} public routes, raw creator prompts/code/config + prose, ` +
    `${rules.length} prose-only rule, ` +
    `${exceptions.length} owned exceptions, ${(allowlist.requiredTerms ?? []).length} canonical routes, ` +
    `project/config feature tag ${currentFeature}`,
);
