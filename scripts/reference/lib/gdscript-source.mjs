// Reads the in-game Summer GDScript API from the engine's class reference
// (Godot doc XML) in SummerEngine:
//   modules/1summer_engine/doc_classes/*.xml   the Summer singleton and its roots
//   modules/summer_sdk_core/doc_classes/*.xml  operations, results, value types
// The engine generates that XML from its ClassDB bindings. This reader walks
// every type reachable from the `Summer` singleton (SummerRuntime) and checks
// the XML against the C++ bindings in both directions; any drift fails.

import { execFileSync } from "node:child_process";

const DOC_DIRS = ["modules/1summer_engine/doc_classes", "modules/summer_sdk_core/doc_classes", "modules/summer_multiplayer/doc_classes"];
const BIND_DIRS = ["modules/1summer_engine/runtime", "modules/summer_sdk_core", "modules/summer_multiplayer"];
// Netcode lives in its own module; only its entry service is in scope here.
const NETCODE_DIR = "modules/summer_multiplayer/";
const NETCODE_ENTRY = "SummerMultiplayerService";
// Not public: the debug root, a second internal singleton, and test-only bindings.
const EXCLUDED_CLASSES = new Set(["SummerDebug", "SummerNativeLaunchRuntime"]);
const EXCLUDED_MEMBER = /^(?:_|benchmark_phase0_|create_phase0_|get_phase0_|set_phase0_)/;

const unesc = (s) =>
  s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const attrs = (s) => Object.fromEntries([...s.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], unesc(m[2])]));
const dedent = (s) => unesc(s).replace(/^\n?/, "").replace(/^\t+/gm, "").trim();
const text = (body, tag) => {
  const m = body.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? dedent(m[1]) : "";
};
const params = (body) =>
  [...body.matchAll(/<param ([^>]*?)\/>/g)]
    .map((m) => attrs(m[1]))
    .sort((a, b) => Number(a.index) - Number(b.index))
    .map(({ name, type, default: def, enum: en }) => ({ name, type: en || type, ...(def !== undefined ? { default: def } : {}) }));

function parseClass(xml, file) {
  const head = attrs(xml.match(/<class ([^>]*)>/)[1]);
  const block = (tag) => (xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) || [, ""])[1];
  const methods = [...block("methods").matchAll(/<method ([^>]*)>([\s\S]*?)<\/method>/g)].map(([, a, b]) => {
    const at = attrs(a);
    const r = attrs((b.match(/<return ([^>]*?)\/>/) || [, ""])[1]);
    return {
      name: at.name,
      qualifiers: at.qualifiers || "",
      returns: r.enum || r.type || "void",
      params: params(b),
      ...(at.deprecated !== undefined ? { deprecated: at.deprecated } : {}),
      ...(at.experimental !== undefined ? { experimental: at.experimental } : {}),
      description: text(b, "description"),
    };
  });
  const members = [...block("members").matchAll(/<member ([^>]*)>([\s\S]*?)<\/member>/g)].map(([, a, b]) => {
    const at = attrs(a);
    return {
      name: at.name,
      type: at.enum || at.type,
      readOnly: at.setter === "",
      getter: at.getter || null,
      setter: at.setter || null,
      ...(at.default !== undefined ? { default: at.default } : {}),
      description: dedent(b),
    };
  });
  const signals = [...block("signals").matchAll(/<signal ([^>]*)>([\s\S]*?)<\/signal>/g)].map(([, a, b]) => ({
    name: attrs(a).name,
    params: params(b),
    description: text(b, "description"),
  }));
  const constants = [...block("constants").matchAll(/<constant ([^>]*)>([\s\S]*?)<\/constant>/g)].map(([, a, b]) => {
    const at = attrs(a);
    return { name: at.name, value: at.value, ...(at.enum ? { enum: at.enum } : {}), description: dedent(b) };
  });
  return {
    name: head.name,
    inherits: head.inherits || null,
    file,
    brief: text(xml, "brief_description"),
    description: text(xml, "description"),
    methods,
    members,
    signals,
    constants,
  };
}

const typeRefs = (t) => [...String(t ?? "").matchAll(/Summer[A-Za-z0-9]+/g)].map((m) => m[0]);

export async function syncGdscriptApi({ opts, sources, writeJson, gitIn }) {
  if (!opts.engine) throw new Error("--engine <summerengine checkout> is required for --gdscript");
  const git = gitIn(opts.engine);
  const commit = git("rev-parse", `${opts.ref}^{commit}`).trim();
  const classes = {};
  for (const dir of DOC_DIRS) {
    for (const f of git("ls-tree", "-r", "--name-only", commit, dir).split("\n").filter((p) => p.endsWith(".xml"))) {
      const c = parseClass(git("show", `${commit}:${f}`), f);
      classes[c.name] = c;
    }
  }

  // Reachable public types from the Summer singleton.
  const reach = new Set();
  const visit = (name) => {
    const c = classes[name];
    if (!c || reach.has(name) || EXCLUDED_CLASSES.has(name)) return;
    if (c.file.startsWith(NETCODE_DIR) && name !== NETCODE_ENTRY) return;
    reach.add(name);
    if (name === NETCODE_ENTRY) return; // the netcode tree is a separate reference
    const refs = [
      c.inherits,
      ...c.members.map((m) => m.type),
      ...c.methods.filter((m) => !EXCLUDED_MEMBER.test(m.name)).flatMap((m) => [m.returns, ...m.params.map((p) => p.type)]),
      ...c.signals.flatMap((s) => s.params.map((p) => p.type)),
    ];
    for (const t of refs) typeRefs(t).forEach(visit);
    const prose = [c.description, ...c.methods.map((m) => m.description), ...c.members.map((m) => m.description)].join(" ");
    for (const m of prose.matchAll(/\[(Summer[A-Za-z0-9]+)\]/g)) visit(m[1]);
  };
  visit("SummerRuntime");

  // Drift check against the C++ bindings, both directions.
  const cpp = git(
    "grep", "-h", "-E", 'D_METHOD\\("|ADD_SIGNAL\\(MethodInfo\\("|ADD_PROPERTY\\(PropertyInfo\\([^,]+, "|BIND_ENUM_CONSTANT\\(',
    commit, "--", ...BIND_DIRS,
  );
  const bound = new Set(
    [...cpp.matchAll(/(?:D_METHOD|MethodInfo)\("([A-Za-z_0-9]+)"|PropertyInfo\([^,]+, "([A-Za-z_0-9]+)"|BIND_ENUM_CONSTANT\((\w+)\)/g)].map(
      (m) => m[1] || m[2] || m[3],
    ),
  );
  const drift = [];
  const out = {};
  for (const name of [...reach].sort()) {
    const c = classes[name];
    const keep = (x) => !EXCLUDED_MEMBER.test(x.name);
    const pub = { ...c, methods: c.methods.filter(keep), members: c.members.filter(keep), signals: c.signals.filter(keep) };
    for (const k of [...pub.methods, ...pub.members, ...pub.signals]) {
      if (!bound.has(k.name)) drift.push(`${name}.${k.name} is documented but not bound in C++`);
    }
    for (const k of [...pub.methods, ...pub.signals]) {
      if (!k.description) drift.push(`${name}.${k.name} has no description`);
    }
    out[name] = pub;
  }
  // Reverse: names bound in a reachable class's _bind_methods but missing from its XML.
  const bindFiles = git("grep", "-l", "_bind_methods()", commit, "--", ...BIND_DIRS)
    .split("\n")
    .filter(Boolean)
    .map((l) => l.slice(l.indexOf(":") + 1))
    .filter((f) => f.endsWith(".cpp"));
  for (const f of bindFiles) {
    const src = git("show", `${commit}:${f}`);
    const parts = src.split(/\nvoid (\w+)::_bind_methods\(\) \{/);
    for (let i = 1; i < parts.length; i += 2) {
      const cls = parts[i];
      const c = out[cls];
      if (!c || cls === NETCODE_ENTRY) continue;
      const body = parts[i + 1].split(/\n\}\n/)[0];
      const raw = classes[cls];
      const documented = new Set([...raw.methods, ...raw.members, ...raw.signals, ...raw.constants].map((x) => x.name));
      const accessors = new Set(raw.members.flatMap((m) => [m.getter, m.setter, `set_${m.name}`]));
      const names = [
        ...[...body.matchAll(/D_METHOD\("(\w+)"/g)].map((m) => m[1]),
        ...[...body.matchAll(/ADD_SIGNAL\(MethodInfo\("(\w+)"/g)].map((m) => m[1]),
        ...[...body.matchAll(/ADD_PROPERTY\(PropertyInfo\([^,]+, "(\w+)"/g)].map((m) => m[1]),
        ...[...body.matchAll(/BIND_ENUM_CONSTANT\((\w+)\)/g)].map((m) => m[1]),
      ];
      for (const n of names) {
        if (n.startsWith("_") || documented.has(n) || accessors.has(n)) continue;
        drift.push(`${cls}.${n} is bound in ${f} but missing from ${raw.file}`);
      }
    }
  }
  if (drift.length) throw new Error(`GDScript API drift between doc XML and bindings:\n  ${drift.join("\n  ")}`);

  writeJson(`${sources}/gdscript-api.json`, {
    schemaVersion: 1,
    generatedBy: "scripts/reference/sync.mjs --gdscript",
    repository: "SummerEngine/SummerEngine",
    commit,
    paths: DOC_DIRS.slice(0, 2).map((d) => `${d}/*.xml`).concat([`${NETCODE_DIR}doc_classes/${NETCODE_ENTRY}.xml`]),
    singleton: { name: "Summer", class: "SummerRuntime", registeredIn: "modules/1summer_engine/register_types.cpp" },
    classes: out,
  });
}
