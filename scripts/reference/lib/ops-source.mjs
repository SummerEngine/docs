// Reads the Summer operation catalog (Summer 4.0) from its sources of truth:
//  - cloud operations: publicsummerengine src/lib/ops/public-catalog.json,
//    the checked-in public catalog that a publicsummerengine test keeps equal
//    to the defined ops. summer-engine 4.1.0 and later ship a byte copy as
//    registry/operations/public-catalog.json, read from the npm package; with
//    --pse it is read from a publicsummerengine checkout (`git show <ref>:<path>`).
//  - engine and local operations: the summer-engine npm package (4.0 and
//    later ship dist/core/ops/catalog.js). An older package has none; then
//    the page lists their names and links to their MCP tool.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { redactDeep } from "./redact.mjs";

/** Install an npm spec of summer-engine into <work>/npm; returns its dir, version and integrity. */
export function installNpmPackage(work, spec) {
  const dir = join(work, "npm");
  execFileSync("mkdir", ["-p", dir]);
  if (!existsSync(join(dir, "package.json"))) {
    execFileSync("sh", ["-c", `echo '{"private":true}' > package.json`], { cwd: dir });
  }
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--silent", spec], {
    cwd: dir,
    stdio: ["ignore", "inherit", "inherit"],
  });
  const lock = JSON.parse(readFileSync(join(dir, "package-lock.json"), "utf8"));
  const entry = lock.packages["node_modules/summer-engine"];
  return { dir, version: entry.version, integrity: entry.integrity };
}

export const PUBLIC_CATALOG_PATH = "src/lib/ops/public-catalog.json";

export function readCloudCatalog(gitIn, ref) {
  const git = gitIn;
  const commit = git("rev-parse", ref).trim();
  const catalog = JSON.parse(git("show", `${commit}:${PUBLIC_CATALOG_PATH}`));
  if (catalog.contract !== 1) throw new Error(`${PUBLIC_CATALOG_PATH}: unsupported contract ${catalog.contract}`);
  return { commit, catalog };
}

export const PACKAGED_CATALOG_PATH = "registry/operations/public-catalog.json";

/** The public catalog the summer-engine package ships (4.1.0 and later), or null for an older package. */
export function readPackagedCatalog(npmDir) {
  const file = join(npmDir, "node_modules/summer-engine", PACKAGED_CATALOG_PATH);
  if (!existsSync(file)) return null;
  const catalog = JSON.parse(readFileSync(file, "utf8"));
  if (catalog.contract !== 1) throw new Error(`${PACKAGED_CATALOG_PATH}: unsupported contract ${catalog.contract}`);
  return { catalog };
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
      cloud: commit
        ? { repository: "SummerEngine/publicsummerengine", path: PUBLIC_CATALOG_PATH, commit }
        : { package: "summer-engine", repository: "SummerEngine/summer", version: npm.version, path: PACKAGED_CATALOG_PATH },
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
