// 12-selections.js
// Selections: cursors, text ranges, node selections, and AllSelection.
//
// This example builds an editor with buttons that set different selection types,
// and a debug panel that shows live selection details. Edit the document and
// click the buttons to see how each selection type behaves.

import { EditorState, TextSelection, NodeSelection, AllSelection, Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema ─────────────────────────────────────────────────
// paragraph, heading, and horizontal_rule give us nodes for
// TextSelection, NodeSelection, and general exploration.
const mySchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }],
    },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 2 } },
      toDOM(node) { return ["h" + node.attrs.level, 0]; },
      parseDOM: [
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
      ],
    },
    // horizontal_rule is a leaf node — perfect for NodeSelection
    horizontal_rule: {
      group: "block",
      toDOM() { return ["hr"]; },
      parseDOM: [{ tag: "hr" }],
    },
    text: { group: "inline", inline: true },
  },
  marks: {
    strong: {
      toDOM() { return ["strong", 0]; },
      parseDOM: [{ tag: "strong" }],
    },
  },
});

// ── Initial document ───────────────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("heading", { level: 2 }, [
    mySchema.text("Selections Demo"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("This is the first paragraph. Try the buttons below."),
  ]),
  mySchema.node("horizontal_rule"),
  mySchema.node("paragraph", null, [
    mySchema.text("This is the second paragraph, after the horizontal rule."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("A "),
    mySchema.text("third", [mySchema.marks.strong.create()]),
    mySchema.text(" paragraph with bold text."),
  ]),
]);

// ── Editor state and view ──────────────────────────────────
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
  ],
});

// ── Button toolbar ─────────────────────────────────────────
const toolbar = document.createElement("div");
toolbar.style.cssText =
  "margin:0 0 8px;display:flex;gap:6px;flex-wrap:wrap;";

function makeBtn(label, handler) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.style.cssText =
    "padding:4px 10px;font-size:13px;cursor:pointer;" +
    "border:1px solid #aaa;border-radius:4px;background:#f8f8f8;";
  btn.addEventListener("click", handler);
  toolbar.appendChild(btn);
  return btn;
}

// Button: Cursor to start
// Uses Selection.atStart() to place the cursor at the first valid position.
makeBtn("Cursor to start", () => {
  const tr = view.state.tr;
  tr.setSelection(Selection.atStart(tr.doc));
  view.dispatch(tr);
  view.focus();
});

// Button: Cursor to end
// Uses Selection.atEnd() to place the cursor at the last valid position.
makeBtn("Cursor to end", () => {
  const tr = view.state.tr;
  tr.setSelection(Selection.atEnd(tr.doc));
  view.dispatch(tr);
  view.focus();
});

// Button: Select <hr> (NodeSelection)
// Finds the first horizontal_rule and node-selects it.
makeBtn("Select <hr> (node)", () => {
  const tr = view.state.tr;
  let hrPos = null;
  tr.doc.descendants((node, pos) => {
    if (node.type.name === "horizontal_rule" && hrPos === null) {
      hrPos = pos;
    }
  });
  if (hrPos !== null) {
    tr.setSelection(NodeSelection.create(tr.doc, hrPos));
    view.dispatch(tr);
    view.focus();
  }
});

// Button: Select all (AllSelection)
// Selects the entire document.
makeBtn("Select all", () => {
  const tr = view.state.tr;
  tr.setSelection(new AllSelection(tr.doc));
  view.dispatch(tr);
  view.focus();
});

document.querySelector("#editor").parentNode.insertBefore(
  toolbar,
  document.querySelector("#editor"),
);

// ── Debug panel ────────────────────────────────────────────
// Shows live selection info: type, positions, anchor/head, empty.
const debugEl = document.createElement("pre");
debugEl.style.cssText =
  "margin:12px 0;padding:12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:12px;max-height:300px;overflow:auto;line-height:1.6;" +
  "white-space:pre-wrap;word-break:break-word;";
document.querySelector("#editor").parentNode.appendChild(debugEl);

function updateDebug(view) {
  const { selection } = view.state;
  const lines = [];

  // ── Selection type ──
  // We check the constructor name to display the concrete subclass.
  let typeName = selection.constructor.name || "Selection";
  if (selection instanceof AllSelection) typeName = "AllSelection";
  else if (selection instanceof NodeSelection) typeName = "NodeSelection";
  else if (selection instanceof TextSelection) typeName = "TextSelection";

  lines.push("═══ SELECTION INFO ═══");
  lines.push(`  type:   ${typeName}`);
  lines.push(`  from:   ${selection.from}`);
  lines.push(`  to:     ${selection.to}`);
  lines.push(`  anchor: ${selection.anchor}`);
  lines.push(`  head:   ${selection.head}`);
  lines.push(`  empty:  ${selection.empty}`);

  // ── Extra info for each type ──
  if (selection instanceof NodeSelection) {
    lines.push(`\n═══ NODE SELECTION DETAIL ═══`);
    lines.push(`  node type: ${selection.node.type.name}`);
    lines.push(`  node size: ${selection.node.nodeSize}`);
  }

  if (selection instanceof TextSelection && selection.$cursor) {
    lines.push(`\n═══ CURSOR DETAIL ═══`);
    const $c = selection.$cursor;
    lines.push(`  cursor pos:     ${$c.pos}`);
    lines.push(`  parent:         <${$c.parent.type.name}>`);
    lines.push(`  depth:          ${$c.depth}`);
    lines.push(`  parentOffset:   ${$c.parentOffset}`);
  }

  if (!selection.empty && selection instanceof TextSelection) {
    lines.push(`\n═══ TEXT RANGE DETAIL ═══`);
    const slice = view.state.doc.slice(selection.from, selection.to);
    lines.push(`  selected text:  "${slice.content.textBetween(0, slice.content.size)}"`);
    lines.push(`  direction:      ${selection.anchor <= selection.head ? "forward →" : "← backward"}`);
  }

  if (selection instanceof AllSelection) {
    lines.push(`\n═══ ALL SELECTION DETAIL ═══`);
    lines.push(`  doc size: ${view.state.doc.content.size}`);
    lines.push(`  covers:   0 → ${view.state.doc.content.size}`);
  }

  debugEl.textContent = lines.join("\n");
}

// ── Create the editor view ─────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
    updateDebug(this);
  },
});

// Initial render of the debug panel
updateDebug(view);

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Click around the editor and watch the debug panel. When does
//      "empty" change from true to false?
//
//   2. Click "Select <hr> (node)". Notice the type changes to
//      NodeSelection and from/to span exactly one position (the hr).
//
//   3. Click "Select all". from=0 and to=doc.content.size. Type
//      something — it replaces the entire document.
//
//   4. Select text by dragging right, then dragging left. Watch
//      how anchor and head swap while from/to stay ordered.
//
//   5. Look at the "Cursor to start" button code. Try replacing
//      Selection.atStart(tr.doc) with
//      TextSelection.create(tr.doc, 1) — what happens?
