#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_PATH = join(ROOT, "compatibility/source.json");
const MANIFEST_PATH = join(ROOT, "compatibility/summer-engine.json");
const OUTPUT_PATH = join(ROOT, "reference/compatibility.mdx");
const CHECK = process.argv[2] === "--check";

if (process.argv.length > (CHECK ? 3 : 2)) {
  console.error("usage: node scripts/sync-engine-compatibility.mjs [--check]");
  process.exit(2);
}

const sourceRaw = readFileSync(SOURCE_PATH, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");
const source = JSON.parse(sourceRaw);
const manifest = JSON.parse(manifestRaw);
const generatedReferencePath = join(ROOT, source.generatedReferenceSnapshot);
const generatedReferenceRaw = readFileSync(generatedReferencePath, "utf8");

const digest = (algorithm, value) => createHash(algorithm).update(value).digest("hex");
const manifestSha256 = digest("sha256", manifestRaw);
const manifestGitBlobSha = digest("sha1", `blob ${Buffer.byteLength(manifestRaw)}\0${manifestRaw}`);
const generatedReferenceSha256 = digest("sha256", generatedReferenceRaw);
const generatedReferenceGitBlobSha = digest(
  "sha1",
  `blob ${Buffer.byteLength(generatedReferenceRaw)}\0${generatedReferenceRaw}`,
);

const fail = (message) => {
  console.error(`compatibility sync: ERROR: ${message}`);
  process.exit(1);
};

if (source.schemaVersion !== 1) fail(`unsupported source schema ${JSON.stringify(source.schemaVersion)}`);
if (!/^[0-9a-f]{40}$/.test(source.commit)) fail("source commit must be a full 40-character Git SHA");
if (source.manifestSha256 !== manifestSha256) {
  fail(`manifest SHA-256 drifted: expected ${source.manifestSha256}, got ${manifestSha256}`);
}
if (source.manifestGitBlobSha !== manifestGitBlobSha) {
  fail(`manifest Git blob drifted: expected ${source.manifestGitBlobSha}, got ${manifestGitBlobSha}`);
}
if (source.generatedReferenceSha256 !== generatedReferenceSha256) {
  fail(
    `generated reference SHA-256 drifted: expected ${source.generatedReferenceSha256}, ` +
      `got ${generatedReferenceSha256}`,
  );
}
if (source.generatedReferenceGitBlobSha !== generatedReferenceGitBlobSha) {
  fail(
    `generated reference Git blob drifted: expected ${source.generatedReferenceGitBlobSha}, ` +
      `got ${generatedReferenceGitBlobSha}`,
  );
}
if (manifest.schemaVersion !== 1) fail(`unsupported engine contract schema ${JSON.stringify(manifest.schemaVersion)}`);

const product = manifest.product;
const releaseIdentity = product?.releaseIdentity;
const upstream = manifest.upstreamBase;
const planned = upstream?.plannedNext;
const runtime = manifest.runtimeCompatibility;
const project = manifest.projectCompatibility;
const verification = manifest.verification;
const language = manifest.languagePolicy;

if (product?.name !== "Summer Engine") fail("product.name must be Summer Engine");
if (releaseIdentity?.state !== "measured" || releaseIdentity?.strategy !== "platform-staggered") {
  fail("product release identity must be measured and platform-staggered");
}
if (!releaseIdentity.platforms || !Object.keys(releaseIdentity.platforms).length) {
  fail("product release identity must contain at least one platform");
}
if (!upstream?.current?.version || !planned?.state || !upstream.policy) fail("upstream compatibility fields are incomplete");
if (language?.creatorProduct !== "Summer Engine" || language?.creatorGame !== "Summer game") {
  fail("language policy does not match the frozen product identity");
}
if (language?.defaultCreatorLanguage !== "GDScript") fail("default creator language must be GDScript");

const measurement = (value) => {
  if (value?.state === "unmeasured") return "Unmeasured; no version is claimed.";
  if (value?.state === "measured" && value.version) return `Measured at \`${value.version}\`.`;
  fail(`invalid compatibility measurement ${JSON.stringify(value)}`);
};

const sourceUrl =
  `https://github.com/${source.repository}/blob/${source.commit}/${source.manifestPath}`;
const engineReleaseRows = new Map();
for (const match of generatedReferenceRaw.matchAll(
  /^\| ([^|]+?) \| `([^`]+)` \| `([^`]+)` → `([^`]+)` \|$/gm,
)) {
  const [, displayName, version, releaseSource, define] = match;
  engineReleaseRows.set(define, { displayName, version, releaseSource, define });
}

const platformRows = Object.values(releaseIdentity.platforms)
  .sort((left, right) => left.displayName.localeCompare(right.displayName, "en"))
  .map((platform) => {
    const release = engineReleaseRows.get(platform.define);
    if (!release) fail(`engine-generated reference has no product release for ${platform.define}`);
    if (release.displayName !== platform.displayName || release.releaseSource !== releaseIdentity.source) {
      fail(`engine manifest and generated reference disagree for ${platform.define}`);
    }
    return (
      `| ${release.displayName} | \`${release.version}\` | ` +
      `\`${release.releaseSource}\` → \`${release.define}\` |`
    );
  });

const plannedValue =
  planned.state === "planned" ? `\`${planned.version}\`` : "Unmeasured; no next version is claimed.";

const rendered = `---
title: "Compatibility & upstream"
description: "Generated Summer Engine product-release and upstream compatibility facts from the pinned engine contract."
icon: "git-compare-arrows"
generated: true
generator: compatibility/source.json
---

{/* Generated by scripts/sync-engine-compatibility.mjs. Do not edit by hand. */}

This reference is generated from the [Summer Engine compatibility contract](${sourceUrl}) at
commit \`${source.commit}\`. The checked-in input is verified against SHA-256
\`${source.manifestSha256}\`; docs builds do not fetch mutable remote data.

## Product identity

**${product.name}** is the product. Creators make a **${language.creatorGame}** in
**${language.defaultCreatorLanguage}** and use the **Summer SDK** for platform capabilities.
The product release is platform-staggered and separate from the upstream technical base.

| Platform | Summer Engine release | Authoritative engine source |
|---|---:|---|
${platformRows.join("\n")}

## Upstream technical base

| Field | Value |
|---|---|
| Current upstream base | \`${upstream.current.version}\` |
| Planned next upstream base | ${plannedValue} |
| Policy | \`${upstream.policy}\` |
| Build evidence | \`${upstream.current.source}\` |
| Verified | \`${verification.verifiedOn}\` |

The upstream base is a compatibility and lineage fact, not the Summer Engine product version.
Summer follows upstream continuously; neither the current nor planned upstream number is a
permanent Summer identity.

## Runtime and project compatibility

- Runtime compatibility: ${measurement(runtime)}
- Minimum project compatibility: ${measurement(project.minimum)}
- Recommended project compatibility: ${measurement(project.recommended)}

Unmeasured values are intentionally \`null\` in the source contract. Do not infer a minimum
from \`project.godot\`, copied prose, or an older setup guide.

## Where upstream terminology belongs

Godot references remain in migration, plugin and GDExtension compatibility, upstream
contribution, attribution, and legal contexts. Default creator onboarding installs and uses
Summer Engine.

<CardGroup cols={2}>
  <Card title="Previous: Naming" icon="arrow-left" href="/api-reference/summer-sdk/naming">
    Review creator-facing names and stable wire identifiers.
  </Card>
  <Card title="Next: Existing-project migration" icon="arrow-right" href="/migration/godot">
    Bring an existing Godot project into Summer Engine.
  </Card>
</CardGroup>
`;

if (CHECK) {
  let actual;
  try {
    actual = readFileSync(OUTPUT_PATH, "utf8");
  } catch {
    fail("generated reference is missing; run `npm run generate:compatibility`");
  }
  if (actual !== rendered) fail("generated reference is stale; run `npm run generate:compatibility`");
  console.log(`compatibility sync: PASS ${source.commit} ${manifestSha256}`);
} else {
  writeFileSync(OUTPUT_PATH, rendered, "utf8");
  console.log(`generated ${OUTPUT_PATH.replace(`${ROOT}/`, "")}`);
}
