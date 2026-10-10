// Reads the Summer Engine MCP tool surface from its sources of truth:
//  - local tools: the published summer-engine npm package. The package's own
//    createMcpServer() answers tools/list over an in-memory transport, so the
//    names, descriptions and JSON schemas are exactly what an agent receives.
//    library/tools/*/resource.yaml and registry/generated/index.json add the
//    descriptor facts (remote, authority, facets, use_when).
//  - hosted tools: the hosted Summer Engine MCP (built from
//    publicsummerengine src/lib/mcp/hosted), listed the way the npm package
//    mounts it after "summer login --store". Each name is traced to the file
//    that registers it at a pinned publicsummerengine commit.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { reachableBodies, toolBlocks } from "./js-callgraph.mjs";
import { redactDeep } from "./redact.mjs";

const importFrom = (path) => import(pathToFileURL(path).href);

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

async function listAll(client) {
  const tools = [];
  let cursor;
  do {
    const page = await client.listTools(cursor ? { cursor } : undefined);
    tools.push(...page.tools);
    cursor = page.nextCursor;
  } while (cursor);
  return tools;
}

// Modules that only report sign-in state (telemetry attribution, diagnostics)
// are not a credential requirement of the tool that reaches them.
const STATE_ONLY = /\/(?:telemetry|mcp-log|doctor)\.js$/;
const REFUSES_WITHOUT_TOKEN = /if\s*\(!token\)\s*\{?\s*(?:return\s*\{|throw|return\s+\w+\()/;

function authFor(dist, moduleFile, toolName, descriptor, description) {
  const blocks = toolBlocks(moduleFile);
  const block = blocks[toolName];
  if (!block) throw new Error(`${toolName}: no registration found in ${moduleFile}`);
  const bodies = reachableBodies(moduleFile, block).filter((b) => !STATE_ONLY.test(b.file));
  const reads = (re) => bodies.some((b) => re.test(b.body));
  const loginBodies = bodies.filter((b) => /getAuthToken\(\)/.test(b.body) && b.name !== "getAuthToken");
  const loginRequired =
    loginBodies.some((b) => REFUSES_WITHOUT_TOKEN.test(b.body)) || /Requires authentication/i.test(description);
  return {
    engine: descriptor ? descriptor.remote === false : reads(/withEngine\(|getClient\(/),
    login: loginRequired ? "required" : loginBodies.length ? "optional" : null,
    store: reads(/getStoreAccessToken\(/),
    creator: reads(/getCreatorToken\(/),
  };
}

export async function readLocalTools(npmDir) {
  const pkg = join(npmDir, "node_modules/summer-engine");
  const sdk = join(npmDir, "node_modules/@modelcontextprotocol/sdk/dist/esm");
  const { parse: parseYaml } = await importFrom(join(npmDir, "node_modules/yaml/dist/index.js"));
  const { createMcpServer } = await importFrom(join(pkg, "dist/mcp/server.js"));
  const { InMemoryTransport } = await importFrom(join(sdk, "inMemory.js"));
  const { Client } = await importFrom(join(sdk, "client/index.js"));

  const { server } = createMcpServer();
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "summer-docs-reference", version: "1" });
  await client.connect(clientSide);
  const tools = await listAll(client);
  const prompts = (await client.listPrompts()).prompts;
  await client.close();

  const index = JSON.parse(readFileSync(join(pkg, "registry/generated/index.json"), "utf8"));
  const indexByName = new Map(
    index.resources.filter((r) => r.kind === "tool").map((r) => [r.mcp_tool_name, r]),
  );
  const yamlByName = new Map();
  const toolsDir = join(pkg, "library/tools");
  for (const slug of readdirSync(toolsDir)) {
    const file = join(toolsDir, slug, "resource.yaml");
    if (!existsSync(file)) continue;
    const doc = parseYaml(readFileSync(file, "utf8"));
    yamlByName.set(doc.surfaces?.mcp?.tool_name, { ...doc, slug });
  }

  const dist = join(pkg, "dist");
  const moduleByTool = new Map();
  for (const f of readdirSync(join(dist, "mcp/tools")).filter((f) => f.endsWith(".js"))) {
    for (const name of Object.keys(toolBlocks(join(dist, "mcp/tools", f)))) moduleByTool.set(name, join(dist, "mcp/tools", f));
  }

  const out = tools.map((tool) => {
    const idx = indexByName.get(tool.name);
    const yml = yamlByName.get(tool.name);
    const moduleFile = moduleByTool.get(tool.name);
    if (!moduleFile) throw new Error(`${tool.name}: listed by the server but no module registers it`);
    const descriptor = idx
      ? {
          id: idx.id,
          slug: yml?.slug ?? null,
          version: idx.version,
          status: idx.status,
          summary: idx.summary,
          useWhen: idx.use_when ?? [],
          doNotUseWhen: yml?.do_not_use_when ?? [],
          lifecycle: idx.facets?.lifecycle ?? [],
          domains: idx.facets?.domains ?? [],
          remote: idx.remote,
          authority: idx.authority,
          cliCommand: idx.cli_command ?? null,
          module: yml?.implementation?.module ?? null,
        }
      : null;
    return {
      name: tool.name,
      title: tool.title ?? null,
      description: tool.description ?? "",
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema ?? null,
      annotations: tool.annotations ?? null,
      descriptor,
      auth: authFor(dist, moduleFile, tool.name, descriptor, tool.description ?? ""),
    };
  });
  return {
    tools: redactDeep(out),
    prompts: redactDeep(prompts.map(({ name, title, description, arguments: args }) => ({ name, title: title ?? null, description: description ?? "", arguments: args ?? [] }))),
  };
}

export async function readHostedTools(npmDir) {
  const pkg = join(npmDir, "node_modules/summer-engine");
  const mount = await importFrom(join(pkg, "dist/mcp/hosted-mount.js"));
  const deps = mount.defaultHostedMountDependencies;
  const endpoint = deps.url();
  const client = await deps.connect(endpoint, deps.token);
  const tools = await listAll(client);
  const prompts = (await client.listPrompts().catch(() => ({ prompts: [] }))).prompts;
  return {
    endpoint,
    tools: tools.map((t) => ({
      name: t.name,
      title: t.title ?? null,
      description: t.description ?? "",
      inputSchema: t.inputSchema,
      outputSchema: t.outputSchema ?? null,
      annotations: t.annotations ?? null,
      oauth: Array.isArray(t._meta?.securitySchemes) && t._meta.securitySchemes.some((s) => s.type === "oauth2"),
    })),
    prompts: prompts.map(({ name, title, description }) => ({ name, title: title ?? null, description: description ?? "" })),
  };
}

const HOSTED_DIR = "src/lib/mcp/hosted";
const MANIFEST_SOURCE = `${HOSTED_DIR}/manifest-tools.ts`;

/** Map each hosted tool to the publicsummerengine file that registers it. */
export function traceHostedSources(repo, ref, names) {
  const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 64 << 20 });
  const commit = git("rev-parse", `${ref}^{commit}`).trim();
  const files = git("ls-tree", "-r", "--name-only", commit, HOSTED_DIR)
    .split("\n")
    .filter((f) => f.endsWith(".ts") && !f.includes("__tests__"));
  const text = new Map(files.map((f) => [f, git("show", `${commit}:${f}`)]));
  // Tools registered by a module the hosted server imports (e.g. the board).
  const all = new Set(git("ls-tree", "-r", "--name-only", commit, "src", "lib").split("\n"));
  for (const f of [...files]) {
    for (const m of text.get(f).matchAll(/from\s+'@\/([^']+)'/g)) {
      const base = m[1];
      const hit = [base, `src/${base}`].flatMap((b) => [`${b}.ts`, `${b}.tsx`, `${b}/index.ts`]).find((c) => all.has(c));
      if (hit && !text.has(hit)) {
        files.push(hit);
        text.set(hit, git("show", `${commit}:${hit}`));
      }
    }
  }
  // Tools that server.ts registers only under a runtime condition
  // (`if (flag) registerX(...)`) are not on every account's server; trace the
  // files behind each such call so the reference can leave those tools out.
  const server = text.get(`${HOSTED_DIR}/server.ts`) ?? "";
  const conditionalFiles = new Set();
  const importOf = (fromFile, symbol) => {
    const m = text.get(fromFile)?.match(new RegExp(`import\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s*from\\s*'\\./([^']+)'`));
    return m ? `${HOSTED_DIR}/${m[1]}.ts` : null;
  };
  const pending = [];
  for (const m of server.matchAll(/^\s*if\s*\([^)]*\)\s*(\w+)\(/gm)) {
    const file = importOf(`${HOSTED_DIR}/server.ts`, m[1]);
    if (file) pending.push(file);
  }
  while (pending.length) {
    const file = pending.pop();
    if (conditionalFiles.has(file) || !text.has(file)) continue;
    conditionalFiles.add(file);
    for (const m of text.get(file).matchAll(/from\s+'\.\/([^']+)'/g)) pending.push(`${HOSTED_DIR}/${m[1]}.ts`);
  }
  const source = {};
  for (const name of names) {
    const hit = files.find((f) => new RegExp(`['"\`]${name}['"\`]`).test(text.get(f)));
    if (hit) source[name] = hit;
    else if (name.startsWith("summer_tool_")) source[name] = MANIFEST_SOURCE;
    else throw new Error(`hosted tool ${name} is not registered anywhere in ${HOSTED_DIR} at ${commit}`);
  }
  const conditional = names.filter((n) => conditionalFiles.has(source[n]));
  return { commit, source, conditional, conditionalFiles: [...conditionalFiles].sort() };
}

/** Hosted tools every signed-in account gets: conditionally registered ones are left out. */
export function hostedWithSources(hosted, trace) {
  const skip = new Set(trace.conditional);
  return redactDeep(hosted.tools.filter((t) => !skip.has(t.name)).map((t) => ({ ...t, source: trace.source[t.name] })));
}
