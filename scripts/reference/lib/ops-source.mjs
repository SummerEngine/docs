// Reads the Summer operation catalog (Summer 4.0) from its sources of truth:
//  - cloud operations: publicsummerengine src/lib/ops/public-catalog.json,
//    the checked-in public catalog that a publicsummerengine test keeps equal
//    to the defined ops. Read with `git show <ref>:<path>`.
//  - engine and local operations: the summer-engine npm package (4.0 and
//    later ship dist/core/ops/catalog.js). An older package has none; then
//    the page lists their names and links to their MCP tool.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { redactDeep } from "./redact.mjs";

export const PUBLIC_CATALOG_PATH = "src/lib/ops/public-catalog.json";

export function readCloudCatalog(gitIn, ref) {
  const git = gitIn;
  const commit = git("rev-parse", ref).trim();
  const catalog = JSON.parse(git("show", `${commit}:${PUBLIC_CATALOG_PATH}`));
  if (catalog.contract !== 1) throw new Error(`${PUBLIC_CATALOG_PATH}: unsupported contract ${catalog.contract}`);
  return { commit, catalog };
}

/** The npm package's engine and local operations, or null for a package without the catalog (3.x). */
export async function readLocalOperations(npmDir) {
  const file = join(npmDir, "node_modules/summer-engine/dist/core/ops/catalog.js");
  if (!existsSync(file)) return null;
  const { localEntries, localInputSchema } = await import(pathToFileURL(file).href);
  return localEntries()
    .map((entry) => ({
      name: entry.name,
      title: entry.title,
      summary: entry.summary,
      effect: entry.effect,
      approval: entry.approval,
      provider: entry.provider,
      status: entry.status,
      mcpTool: entry.mcpTool,
      legacy: entry.legacy ?? [],
      input: localInputSchema(entry.name) ?? { type: "object" },
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The pinned operations source: cloud ops from the public catalog, local ops from npm when it has them. */
export function operationsSource({ commit, catalog }, local, npm) {
  return {
    schemaVersion: 1,
    generatedBy: "scripts/reference/sync.mjs --ops",
    sources: {
      cloud: { repository: "SummerEngine/publicsummerengine", path: PUBLIC_CATALOG_PATH, commit },
      local: local ? { package: "summer-engine", repository: "SummerEngine/summer", version: npm.version, path: "dist/core/ops/catalog.js" } : null,
    },
    contract: catalog.contract,
    profiles: catalog.profiles,
    permissionGroups: catalog.permissionGroups,
    errors: catalog.errors,
    operations: redactDeep(catalog.operations),
    localOperations: local ? redactDeep(local) : catalog.localOperations,
  };
}
