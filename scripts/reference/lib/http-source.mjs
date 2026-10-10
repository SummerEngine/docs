// Builds the public Summer Platform OpenAPI documents from the specs in
// summer-platform (api/<name>/openapi.yaml). Only the operations named in
// scripts/reference/http-api-allowlist.json are kept: the creator management
// routes an agent token may call, the analytics reads, anonymous store reads
// and the account basics. Everything else (internal, staff, game-server and
// owner-only routes) is dropped, with the components only they used.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { redactText } from "./redact.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ALLOWLIST = join(HERE, "..", "http-api-allowlist.json");
const METHODS = ["get", "put", "post", "patch", "delete", "options", "head"];

// Sentences that describe how Summer runs inside (services, stores, design
// records, repository paths, test environments) are not part of the public
// contract and are dropped from every description.
const INTERNAL_SENTENCE =
  /\bADR\b|\b(?:control|management|analytics|items)-api\b|ClickHouse|\bstaging\b|tailnet|\binternal\/|\bdocs\/|\.md\b|\.go\b|\bcmd\/|\bkubernetes\b|\bcluster\b/i;

function cleanText(text) {
  if (typeof text !== "string") return text;
  const kept = text
    .split(/\n{2,}/)
    .map((para) =>
      para
        .split(/(?<=[.!?])\s+(?=[A-Z`(])/)
        .filter((s) => !INTERNAL_SENTENCE.test(s))
        .join(" "),
    )
    .filter((p) => p.trim())
    .join("\n\n");
  return redactText(kept);
}

const SCHEMA_KEYWORDS = new Set(["default", "example", "const", "nullable", "enum", "examples", "value", "x-nullable"]);
const TEXT_KEYS = new Set(["description", "summary", "title"]);
const MAP_KEYS = new Set(["properties", "patternProperties", "headers", "paths", "responses", "schemas", "parameters", "securitySchemes", "examples", "content"]);

/** Strip x-* extensions and clean prose, without touching user-named map keys. */
function scrub(node, parentKey = null) {
  if (Array.isArray(node)) return node.map((v) => scrub(v, null));
  if (!node || typeof node !== "object") return node;
  // A flow mapping like {description: a, b, or c} parses as extra null keys;
  // join them back into the description the spec author wrote.
  const isSpill = ([k, v]) => v === null && !SCHEMA_KEYWORDS.has(k);
  const spill = Object.entries(node).filter(isSpill);
  if (spill.length && typeof node.description === "string") {
    node = Object.fromEntries(Object.entries(node).filter((e) => !isSpill(e)));
    node.description = [node.description, ...spill.map(([k]) => k)].join(", ");
  }
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    const isMapEntry = parentKey !== null && MAP_KEYS.has(parentKey);
    if (!isMapEntry && key.startsWith("x-")) continue;
    if (!isMapEntry && TEXT_KEYS.has(key) && typeof value === "string") {
      const cleaned = cleanText(value);
      if (cleaned) out[key] = cleaned;
      continue;
    }
    out[key] = scrub(value, isMapEntry ? null : key);
  }
  return out;
}

function collectRefs(node, into) {
  if (Array.isArray(node)) node.forEach((v) => collectRefs(v, into));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string") into.add(v);
      else collectRefs(v, into);
    }
  }
}

function filterSpec(name, spec, allow, server, api) {
  const wanted = new Set(allow);
  const found = new Set();
  const paths = {};
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    const kept = {};
    for (const method of METHODS) {
      if (!item[method]) continue;
      const key = `${method.toUpperCase()} ${path}`;
      if (!wanted.has(key)) continue;
      found.add(key);
      kept[method] = item[method];
    }
    if (Object.keys(kept).length) {
      if (item.parameters) kept.parameters = item.parameters;
      paths[path] = kept;
    }
  }
  const missing = [...wanted].filter((k) => !found.has(k));
  if (missing.length) throw new Error(`${name}: allowlisted operations missing from the spec: ${missing.join(", ")}`);

  // Security schemes the kept operations use.
  const usedSchemes = new Set();
  const opSecurity = [];
  for (const item of Object.values(paths)) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      const security = op.security ?? spec.security ?? [];
      opSecurity.push(security);
      for (const req of security) Object.keys(req).forEach((s) => usedSchemes.add(s));
    }
  }

  // Components reachable from the kept paths (transitively).
  const components = spec.components ?? {};
  const keep = {};
  const pending = new Set();
  collectRefs(paths, pending);
  const seen = new Set();
  while (pending.size) {
    const ref = pending.values().next().value;
    pending.delete(ref);
    if (seen.has(ref)) continue;
    seen.add(ref);
    // A ref may point inside a component (#/components/schemas/X/properties/y); keep all of X.
    const m = ref.match(/^#\/components\/([^/]+)\/([^/]+)/);
    if (!m) throw new Error(`${name}: unsupported $ref ${ref}`);
    const [, section, key] = m;
    const target = components[section]?.[key];
    if (!target) throw new Error(`${name}: dangling $ref ${ref}`);
    (keep[section] ??= {})[key] = target;
    collectRefs(target, pending);
  }
  if (usedSchemes.size) {
    keep.securitySchemes = Object.fromEntries(
      [...usedSchemes].sort().map((s) => {
        if (!components.securitySchemes?.[s]) throw new Error(`${name}: unknown security scheme ${s}`);
        // The public description of who holds this token comes from the allowlist.
        return [s, { ...components.securitySchemes[s], description: api.auth }];
      }),
    );
  }
  const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  for (const section of Object.keys(keep)) keep[section] = sortObj(keep[section]);

  const usedTags = new Set();
  for (const item of Object.values(paths)) for (const m of METHODS) (item[m]?.tags ?? []).forEach((t) => usedTags.add(t));
  const tags = (spec.tags ?? []).filter((t) => usedTags.has(t.name));

  const globalSecurity = (spec.security ?? []).filter((req) => Object.keys(req).every((s) => usedSchemes.has(s)));
  const info = {
    title: spec.info?.title,
    version: String(spec.info?.version ?? "").replace(/-staging$/, ""),
    description: api.description,
  };

  return scrub({
    openapi: spec.openapi,
    info,
    servers: [{ url: server }],
    ...(globalSecurity.length ? { security: globalSecurity } : {}),
    ...(tags.length ? { tags } : {}),
    paths,
    components: keep,
  });
}

async function loadYaml(work) {
  const dir = join(work, "npm");
  const entry = join(dir, "node_modules/yaml/dist/index.js");
  if (!existsSync(entry)) {
    execFileSync("mkdir", ["-p", dir]);
    if (!existsSync(join(dir, "package.json"))) execFileSync("sh", ["-c", `echo '{"private":true}' > package.json`], { cwd: dir });
    execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--silent", "yaml@2"], { cwd: dir, stdio: "inherit" });
  }
  return (await import(pathToFileURL(entry).href)).parse;
}

export async function syncOpenApi({ repo, ref, work, sources, writeJson }) {
  const parseYaml = await loadYaml(work);
  const allow = JSON.parse(readFileSync(ALLOWLIST, "utf8"));
  const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 256 << 20 });
  const commit = git("rev-parse", `${ref}^{commit}`).trim();
  const manifest = { schemaVersion: 1, generatedBy: "scripts/reference/sync.mjs --http", repository: "SummerEngine/summer-platform", commit, server: allow.server, apis: [] };
  for (const api of allow.apis) {
    const raw = git("show", `${commit}:${api.spec}`);
    const spec = parseYaml(raw, { maxAliasCount: -1 });
    const doc = filterSpec(api.id, spec, api.operations, allow.server, api);
    writeJson(join(sources, "openapi", `${api.id}.json`), doc);
    manifest.apis.push({ id: api.id, title: api.title, description: api.description, auth: api.auth, spec: api.spec, operations: api.operations.length });
  }
  writeJson(join(sources, "http-api.json"), manifest);
}
