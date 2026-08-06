import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reference = readFileSync(resolve(root, "mcp/tools-reference.mdx"), "utf8");
const overview = readFileSync(resolve(root, "mcp/overview.mdx"), "utf8");
const expectedTools = [
  "summer_add_node",
  "summer_batch",
  "summer_check_job",
  "summer_clear_console",
  "summer_cloud_checkpoints",
  "summer_cloud_conflicts",
  "summer_cloud_init",
  "summer_cloud_pull",
  "summer_cloud_push",
  "summer_cloud_restore",
  "summer_cloud_status",
  "summer_connect_signal",
  "summer_create_debug_report",
  "summer_create_scene",
  "summer_creator_config",
  "summer_creator_logs",
  "summer_creator_publish",
  "summer_creator_releases",
  "summer_generate_3d",
  "summer_generate_audio",
  "summer_generate_image",
  "summer_generate_motion",
  "summer_generate_video",
  "summer_get_agent_playbook",
  "summer_get_asset",
  "summer_get_asset_download_url",
  "summer_get_console",
  "summer_get_debugger_errors",
  "summer_get_debugger_warnings",
  "summer_get_diagnostics",
  "summer_get_project_context",
  "summer_get_scene_tree",
  "summer_get_script_errors",
  "summer_get_studio_workflow",
  "summer_import_asset",
  "summer_import_asset_by_id",
  "summer_import_from_url",
  "summer_import_from_url_batch",
  "summer_input_map_bind",
  "summer_inspect_node",
  "summer_inspect_resource",
  "summer_instantiate_scene",
  "summer_is_running",
  "summer_list_my_assets",
  "summer_open_main_scene",
  "summer_open_scene",
  "summer_play",
  "summer_project_setting",
  "summer_read_file",
  "summer_remove_node",
  "summer_replace_node",
  "summer_replace_text",
  "summer_save_scene",
  "summer_screenshot",
  "summer_search_assets",
  "summer_select_node",
  "summer_set_prop",
  "summer_set_resource_property",
  "summer_slice_asset_sheet",
  "summer_start_game_task",
  "summer_stop",
  "summer_write_file",
];
const headings = [...reference.matchAll(/^### (summer_[a-z0-9_]+)\s*$/gm)].map(
  (match) => match[1],
);
const unique = new Set(headings);
const creatorAdditions = [
  "summer_creator_publish",
  "summer_creator_releases",
  "summer_creator_logs",
  "summer_creator_config",
];

if (headings.length !== 62 || unique.size !== 62) {
  throw new Error(
    `MCP tools reference must contain 62 unique tool headings; found ${headings.length} headings and ${unique.size} unique names.`,
  );
}

const actualTools = [...unique].sort();
if (JSON.stringify(actualTools) !== JSON.stringify(expectedTools)) {
  const missing = expectedTools.filter((tool) => !unique.has(tool));
  const extra = actualTools.filter((tool) => !expectedTools.includes(tool));
  throw new Error(
    `MCP tools reference differs from the canonical 2.8 inventory. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`,
  );
}

for (const tool of [
  "summer_get_studio_workflow",
  "summer_slice_asset_sheet",
  ...creatorAdditions,
]) {
  if (!unique.has(tool)) throw new Error(`MCP tools reference is missing ${tool}.`);
}

for (const text of [reference, overview]) {
  if (!text.includes("2.7.0") || !text.includes("58") || !text.includes("2.8")) {
    throw new Error("MCP docs must retain the versioned 2.7.0 (58) to 2.8 (62) registry comparison.");
  }
  for (const tool of creatorAdditions) {
    if (!text.includes(tool)) throw new Error(`MCP release comparison is missing ${tool}.`);
  }
}

console.log("mcp registry docs: PASS (62 unique tools; 2.7.0 58 -> 2.8.0 62)");
