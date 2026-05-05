// 23-example-setup.js
// What exampleSetup Bundles: dissecting the convenience plugin array.
//
// This example calls exampleSetup({ schema }) and inspects the resulting
// array of plugins. A panel below the editor shows every plugin with its
// key/name and a description of what it provides. The editor itself uses
// the full exampleSetup bundle so you can interact with all the pieces.

import "prosemirror-menu/style/menu.css";
import "prosemirror-example-setup/style/style.css";

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema } from "prosemirror-schema-basic";
import { exampleSetup } from "prosemirror-example-setup";

// ── Generate the plugin array ──────────────────────────────────
// This is the ONE call that lessons 01-03 used without explanation.
// Now we can look inside.
const plugins = exampleSetup({ schema });

// ── Describe each plugin ───────────────────────────────────────
// exampleSetup returns plugins in a fixed order. We identify each
// by its key string — every ProseMirror plugin has a .key property
// (either from a PluginKey or auto-generated like "plugin$1").

const descriptions = {
  "inputRules$":      "Input Rules — smart quotes, markdown shortcuts (# → heading, > → blockquote, etc.)",
  "keymap$":          "Keymap — schema-aware bindings (Mod-b bold, Mod-i italic, heading shortcuts, etc.)",
  // The second keymap$ is baseKeymap; we handle duplicates below.
  "dropCursor$":      "Drop Cursor — shows a position indicator when dragging content over the editor",
  "gapCursor$":       "Gap Cursor — allows cursor in positions that can't hold text (before/after leaf blocks)",
  "menuBar$":         "Menu Bar — toolbar with formatting buttons, insert menu, type menu, undo/redo",
  "history$":         "History — undo (Mod-z) and redo (Mod-Shift-z) support",
};

// Build a human-readable label for each plugin.
// Some plugins share a key prefix (e.g., two keymap$ plugins), so
// we track which ones we've seen to disambiguate.
const seenKeys = {};

function describePlugin(plugin, index) {
  const key = plugin.key;

  // Find matching description by key prefix
  let desc = null;
  for (const prefix of Object.keys(descriptions)) {
    if (key.startsWith(prefix)) {
      desc = descriptions[prefix];
      // Remove so the second keymap gets a different label
      delete descriptions[prefix];
      break;
    }
  }

  // Handle the second keymap (baseKeymap) and the style plugin
  if (!desc && key.startsWith("keymap$")) {
    desc = "Base Keymap — fundamental keys: Enter (split block), Backspace, Delete, etc.";
  }
  if (!desc && key.startsWith("plugin$")) {
    desc = "Style Plugin — adds the CSS class 'ProseMirror-example-setup-style' to the editor";
  }
  if (!desc) {
    desc = "(unknown plugin)";
  }

  return { index, key, desc };
}

const pluginInfo = plugins.map((p, i) => describePlugin(p, i));

// ── Log to console for exploration ─────────────────────────────
console.log("exampleSetup({ schema }) returned", plugins.length, "plugins:");
plugins.forEach((p, i) => {
  console.log(`  [${i}] key: "${p.key}"`);
});

// ── Create the editor ──────────────────────────────────────────
const state = EditorState.create({
  doc: schema.node("doc", null, [
    schema.node("heading", { level: 1 }, [
      schema.text("Example Setup — Dissected"),
    ]),
    schema.node("paragraph", null, [
      schema.text("This editor uses "),
      schema.text("exampleSetup({ schema })", [schema.marks.code.create()]),
      schema.text(". The panel below shows every plugin it created."),
    ]),
    schema.node("paragraph", null, [
      schema.text("Try the features: "),
      schema.text("Mod-b", [schema.marks.code.create()]),
      schema.text(" for bold, "),
      schema.text("Mod-i", [schema.marks.code.create()]),
      schema.text(" for italic, type "),
      schema.text("> ", [schema.marks.code.create()]),
      schema.text("at a line start for a blockquote."),
    ]),
    schema.node("paragraph", null, [
      schema.text("Each feature comes from a specific plugin in the array."),
    ]),
  ]),
  plugins,
});

const view = new EditorView(document.querySelector("#editor"), { state });

// ── Info panel: show every plugin and what it does ─────────────
const panel = document.createElement("div");
panel.style.cssText =
  "margin:12px 0;padding:0;font-family:monospace;font-size:12px;line-height:1.6;";
document.querySelector("#editor").parentNode.appendChild(panel);

// Title
const title = document.createElement("div");
title.style.cssText =
  "padding:8px 12px;background:#1a2233;color:#e0e8f0;font-weight:bold;" +
  "font-size:13px;border-radius:4px 4px 0 0;";
title.textContent =
  `exampleSetup({ schema }) → ${plugins.length} plugins`;
panel.appendChild(title);

// One row per plugin
pluginInfo.forEach(({ index, key, desc }) => {
  const row = document.createElement("div");
  const bg = index % 2 === 0 ? "#f0f4f8" : "#ffffff";
  row.style.cssText =
    `padding:6px 12px;background:${bg};border:1px solid #c0d0e0;` +
    `border-top:none;`;

  // Index badge
  const badge = document.createElement("span");
  badge.style.cssText =
    "display:inline-block;width:22px;height:22px;line-height:22px;" +
    "text-align:center;background:#3a7bd5;color:white;border-radius:50%;" +
    "font-size:11px;font-weight:bold;margin-right:10px;vertical-align:middle;";
  badge.textContent = index;
  row.appendChild(badge);

  // Description
  const text = document.createElement("span");
  text.style.cssText = "vertical-align:middle;";
  text.innerHTML =
    `<strong>${desc.split(" — ")[0]}</strong> — ${desc.split(" — ")[1] || ""}`;
  row.appendChild(text);

  // Key label (muted)
  const keyLabel = document.createElement("div");
  keyLabel.style.cssText =
    "margin-left:32px;color:#888;font-size:11px;margin-top:2px;";
  keyLabel.textContent = `plugin.key = "${key}"`;
  row.appendChild(keyLabel);

  panel.appendChild(row);
});

// Bottom border radius
const lastRow = panel.lastChild;
if (lastRow) lastRow.style.borderRadius = "0 0 4px 4px";

// ────────────────────────────────────────────────────────────────
// Exercises:
//   1. Count the plugins listed in the panel. Confirm the number matches
//      plugins.length logged to the console.
//
//   2. Test each plugin:
//      - Input rules: type "# " at the start of a line → heading appears.
//      - Keymap: press Mod-b to bold selected text.
//      - Drop cursor: drag selected text and watch the blue line appear.
//      - Gap cursor: add a horizontal_rule to the schema and try
//        arrowing past it.
//      - Menu bar: click the toolbar buttons.
//      - History: press Mod-z to undo, Mod-Shift-z to redo.
//
//   3. Open the console and inspect the plugin objects. Each has a .key
//      (string), .spec (the original spec object), and .getState(editorState)
//      for plugins that define a state field.
//
//   4. Challenge: call exampleSetup with { schema, menuBar: false } or
//      { schema, history: false } and see how the plugin count changes.
//      Which plugins disappear from the panel?
//
//   5. Think about what you would change for a production editor.
//      Which plugins would you keep? Which would you replace?
