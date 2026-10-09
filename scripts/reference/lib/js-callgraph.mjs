// Function-level reachability over the compiled ESM of the summer-engine npm
// package (tsc output: top-level declarations start at column 0). Used only by
// sync.mjs to read which credential each MCP tool handler reaches; it never
// runs the code.

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const DECL = /^(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/;
const modules = new Map();

function loadModule(file) {
  if (modules.has(file)) return modules.get(file);
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  const lines = text.split("\n");
  const imports = new Map();
  for (const m of text.matchAll(/^import\s+(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*"([^"]+)";/gm)) {
    const [, def, named, from] = m;
    if (!from.startsWith(".")) continue;
    const target = resolve(dirname(file), from);
    if (def) imports.set(def, { file: target, name: "default" });
    for (const part of (named ?? "").split(",")) {
      const p = part.trim();
      if (!p) continue;
      const [orig, alias] = p.split(/\s+as\s+/).map((s) => s.trim());
      imports.set(alias ?? orig, { file: target, name: orig });
    }
  }
  const decls = new Map();
  let current = null;
  let start = 0;
  const flush = (end) => {
    if (current) decls.set(current, lines.slice(start, end).join("\n"));
  };
  lines.forEach((line, i) => {
    if (/^\S/.test(line) && !/^[)}\]]/.test(line)) {
      const m = line.match(DECL);
      flush(i);
      current = m ? m[1] ?? m[2] : null;
      start = i;
    }
  });
  flush(lines.length);
  const mod = { file, text, imports, decls };
  modules.set(file, mod);
  return mod;
}

/**
 * Bodies reachable from `body` (inside `file`), following every reference to a
 * top-level declaration of the same module or to an imported one. Returns
 * [{ file, name, body }].
 */
export function reachableBodies(file, body, limit = 600) {
  const seen = new Set();
  const out = [{ file, name: null, body }];
  const queue = [[file, body]];
  while (queue.length && out.length < limit) {
    const [f, b] = queue.shift();
    const mod = loadModule(f);
    for (const m of b.matchAll(/(?<![\w$])(?<![^.]\.)([A-Za-z_$][\w$]*)\b/g)) {
      const id = m[1];
      let target = null;
      if (mod.decls.has(id)) target = [f, id];
      else if (mod.imports.has(id)) {
        const imp = mod.imports.get(id);
        target = [imp.file, imp.name];
      }
      if (!target) continue;
      const key = target.join("#");
      if (seen.has(key)) continue;
      seen.add(key);
      const tm = loadModule(target[0]);
      const tb = tm.decls.get(target[1]);
      if (!tb) continue;
      out.push({ file: target[0], name: target[1], body: tb });
      queue.push([target[0], tb]);
    }
  }
  return out;
}

/** Split a tool module into { toolName: handlerSource } by its server.tool(...) calls. */
export function toolBlocks(file) {
  const text = loadModule(file).text;
  const re = /(?:server\.tool|server\.registerTool|registerTool)\(\s*"(summer_[a-z0-9_]+)"/g;
  const hits = [...text.matchAll(re)].map((m) => [m[1], m.index]);
  const blocks = {};
  hits.forEach(([name, at], k) => {
    blocks[name] = text.slice(at, k + 1 < hits.length ? hits[k + 1][1] : text.length);
  });
  return blocks;
}

export { join };
