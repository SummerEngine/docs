#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanCapabilityClaims } from "./docs-policy-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(readFileSync(join(ROOT, "scripts/docs-capability-policy.json"), "utf8"));
const config = JSON.parse(readFileSync(join(ROOT, "docs.json"), "utf8"));
const errors = [];

if (policy.schemaVersion !== 2) {
  errors.push(`unsupported capability policy schema ${JSON.stringify(policy.schemaVersion)}`);
}
const capabilityIds = new Set();
for (const capability of policy.claimCapabilities ?? []) {
  if (capabilityIds.has(capability.id)) {
    errors.push(`duplicate capability policy id: ${capability.id}`);
  }
  capabilityIds.add(capability.id);
  for (const field of ["id", "label", "state"]) {
    if (typeof capability[field] !== "string" || !capability[field].trim()) {
      errors.push(`capability policy ${capability.id ?? "<missing-id>"} is missing ${field}`);
    }
  }
  for (const field of ["subjectAliases", "statusTerms", "disclaimerPatterns"]) {
    if (!Array.isArray(capability[field]) || capability[field].length === 0) {
      errors.push(`capability policy ${capability.id ?? "<missing-id>"} needs a non-empty ${field}`);
    }
  }
  const assertionCount =
    (capability.assertionVerbs?.length ?? 0) +
    (capability.assertionTerms?.length ?? 0) +
    (capability.assertionPatterns?.length ?? 0);
  if (assertionCount === 0) {
    errors.push(`capability policy ${capability.id ?? "<missing-id>"} needs assertion verbs or terms`);
  }
}

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
const publicFiles = navigation.map(routeToFile);
const publicSet = new Set(publicFiles);
const canonicalPage = policy.canonicalPage;
const disclosureIndicators = (policy.scaffoldDisclosureIndicators ?? []).map(
  (pattern) => new RegExp(pattern),
);
const disclosureExemptions = new Map(
  (policy.scaffoldDisclosureExemptions ?? []).map((entry) => [entry.file, entry]),
);

if (!publicSet.has(canonicalPage)) {
  errors.push(`canonical capability page is not discoverable in public navigation: ${canonicalPage}`);
}

let canonicalRaw = "";
try {
  canonicalRaw = readFileSync(join(ROOT, canonicalPage), "utf8");
} catch {
  errors.push(`canonical capability page is missing: ${canonicalPage}`);
}

if (canonicalRaw && !canonicalRaw.includes(policy.canonicalFrontmatter)) {
  errors.push(`${canonicalPage} is missing canonical marker ${JSON.stringify(policy.canonicalFrontmatter)}`);
}
for (const term of policy.requiredCanonicalTerms ?? []) {
  if (!canonicalRaw.includes(term)) {
    errors.push(`${canonicalPage} is missing required capability status ${JSON.stringify(term)}`);
  }
}
for (const required of policy.requiredCapabilityStatuses ?? []) {
  const capability = (policy.claimCapabilities ?? []).find((entry) => entry.id === required.id);
  if (!capability) {
    errors.push(`required capability policy is missing: ${required.id}`);
    continue;
  }
  for (const field of ["label", "state"]) {
    if (capability[field] !== required[field]) {
      errors.push(
        `required capability policy ${required.id} has ${field} ${JSON.stringify(capability[field])}; ` +
          `expected ${JSON.stringify(required[field])}`,
      );
    }
  }
  const canonicalRow = `| ${required.label} | **${required.state}** |`;
  if (!canonicalRaw.includes(canonicalRow)) {
    errors.push(`${canonicalPage} is missing required policy row ${JSON.stringify(canonicalRow)}`);
  }
}

let canonicalMarkers = 0;
let statusTables = 0;
for (const file of publicFiles) {
  let raw;
  try {
    raw = readFileSync(join(ROOT, file), "utf8");
  } catch {
    errors.push(`cannot scan public capability route: ${file}`);
    continue;
  }

  if (raw.includes(policy.canonicalFrontmatter)) canonicalMarkers++;
  const ownsPlatformStatus =
    file === canonicalPage ||
    /^(?:agent-setup(?:\/|\.mdx)|api-reference\/summer-sdk(?:\/|\.mdx)|knowledge-base\/multiplayer\.mdx)/.test(
      file,
    );
  if (ownsPlatformStatus && /^\|\s*Capability\s*\|\s*Status\s*\|/im.test(raw)) {
    statusTables++;
    if (file !== canonicalPage) {
      errors.push(`${file} defines a secondary capability/status table; link to ${canonicalPage} instead`);
    }
  }

  for (const claim of scanCapabilityClaims(raw, policy)) {
    errors.push(
      `${file}:${claim.line} [${claim.capability}:${claim.state}] ${JSON.stringify(claim.text)} — ${claim.help}`,
    );
  }

  const hasScaffoldContract = disclosureIndicators.some((pattern) => pattern.test(raw));
  const exemption = disclosureExemptions.get(file);
  if (
    hasScaffoldContract &&
    file !== canonicalPage &&
    !raw.includes("knowledge-base/source-status") &&
    !exemption
  ) {
    errors.push(`${file} names scaffolded SDK/runtime surfaces but does not link to ${canonicalPage}`);
  }
}

if (canonicalMarkers !== 1) {
  errors.push(`expected exactly one canonical capability marker across public routes, found ${canonicalMarkers}`);
}
if (statusTables !== 1) {
  errors.push(`expected exactly one Capability/Status table across public routes, found ${statusTables}`);
}

for (const [file, exemption] of disclosureExemptions) {
  if (!publicSet.has(file)) errors.push(`scaffold disclosure exemption is not a public route: ${file}`);
  for (const field of ["owner", "reason"]) {
    if (typeof exemption[field] !== "string" || !exemption[field].trim()) {
      errors.push(`scaffold disclosure exemption ${file} is missing ${field}`);
    }
  }
}

for (const requirement of policy.requiredRouteTerms ?? []) {
  if (!publicSet.has(requirement.file)) {
    errors.push(`required capability-policy route is not public: ${requirement.file}`);
    continue;
  }
  const raw = readFileSync(join(ROOT, requirement.file), "utf8");
  for (const term of requirement.terms ?? []) {
    if (!raw.includes(term)) {
      errors.push(`${requirement.file} is missing required policy term ${JSON.stringify(term)}`);
    }
  }
}

if (errors.length) {
  console.error(`capability guard: FAIL (${errors.length})`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(
  `capability guard: PASS ${publicFiles.length} public routes, one canonical status source, ` +
    `${(policy.claimCapabilities ?? []).length} semantic capability policies, route-aware scaffold disclosures`,
);
