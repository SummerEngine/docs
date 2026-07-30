#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  scanCapabilityClaims,
  scanCompatibilityClaims,
  scanIdentityText,
} from "./docs-policy-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = JSON.parse(readFileSync(join(ROOT, "scripts/policy-fixtures.json"), "utf8"));
const capabilityPolicy = JSON.parse(
  readFileSync(join(ROOT, "scripts/docs-capability-policy.json"), "utf8"),
);
const currentFeature = "4.6";
const errors = [];

if (fixtures.schemaVersion !== 1) errors.push(`unsupported fixture schema ${fixtures.schemaVersion}`);

for (const fixture of fixtures.languageReject ?? []) {
  const found = new Set(scanIdentityText(fixture.text, { currentFeature }).map((item) => item.rule));
  for (const rule of fixture.rules ?? []) {
    if (!found.has(rule)) errors.push(`${fixture.name}: expected language rule ${rule} to reject mutation`);
  }
}
for (const fixture of fixtures.languageAllow ?? []) {
  const found = scanIdentityText(fixture.text, { currentFeature });
  if (found.length) {
    errors.push(`${fixture.name}: expected language fixture to pass, found ${found.map((item) => item.rule).join(", ")}`);
  }
}

for (const fixture of fixtures.compatibilityReject ?? []) {
  const found = new Set(scanCompatibilityClaims(fixture.text).map((item) => item.rule));
  for (const rule of fixture.rules ?? []) {
    if (!found.has(rule)) errors.push(`${fixture.name}: expected compatibility rule ${rule} to reject mutation`);
  }
}
for (const fixture of fixtures.compatibilityAllow ?? []) {
  const found = scanCompatibilityClaims(fixture.text);
  if (found.length) {
    errors.push(
      `${fixture.name}: expected compatibility fixture to pass, found ` +
        found.map((item) => item.rule).join(", "),
    );
  }
}

for (const fixture of fixtures.capabilityReject ?? []) {
  const found = new Set(
    scanCapabilityClaims(fixture.text, capabilityPolicy).map((item) => item.capability),
  );
  for (const capability of fixture.capabilities ?? []) {
    if (!found.has(capability)) {
      errors.push(`${fixture.name}: expected capability ${capability} to reject mutation`);
    }
  }
}
for (const fixture of fixtures.capabilityAllow ?? []) {
  const found = scanCapabilityClaims(fixture.text, capabilityPolicy);
  if (found.length) {
    errors.push(
      `${fixture.name}: expected capability fixture to pass, found ` +
        found.map((item) => item.capability).join(", "),
    );
  }
}

if (errors.length) {
  console.error(`policy mutation fixtures: FAIL (${errors.length})`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(
  `policy mutation fixtures: PASS ${(fixtures.languageReject ?? []).length} language rejects, ` +
    `${(fixtures.languageAllow ?? []).length} language allows, ` +
    `${(fixtures.compatibilityReject ?? []).length} compatibility rejects, ` +
    `${(fixtures.compatibilityAllow ?? []).length} compatibility allows, ` +
    `${(fixtures.capabilityReject ?? []).length} capability rejects, ` +
    `${(fixtures.capabilityAllow ?? []).length} capability allows`,
);
