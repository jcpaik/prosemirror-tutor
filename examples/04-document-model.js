// 04-document-model.js
// The Document Model: how ProseMirror represents and addresses content.
//
// This example builds a document programmatically, then lets you explore
// its structure — positions, resolved positions, slices, and tree traversal.
// Open the panel below the editor to see the document internals update live.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema with a few node types so we have interesting structure ──
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
      attrs: { level: { default: 1 } },
      toDOM(node) { return ["h" + node.attrs.level, 0]; },
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
      ],
    },
    blockquote: {
      group: "block",
      content: "block+",
      toDOM() { return ["blockquote", 0]; },
      parseDOM: [{ tag: "blockquote" }],
    },
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
    em: {
      toDOM() { return ["em", 0]; },
      parseDOM: [{ tag: "em" }],
    },
  },
});

// ── Build the initial document programmatically ──────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("heading", { level: 1 }, [
    mySchema.text("Document Model Demo"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Click anywhere in this editor. The panel below shows "),
    mySchema.text("position data", [mySchema.marks.strong.create()]),
    mySchema.text(" for your cursor."),
  ]),
  mySchema.node("blockquote", null, [
    mySchema.node("paragraph", null, [
      mySchema.text("This is inside a blockquote — notice how "),
      mySchema.text("depth", [mySchema.marks.em.create()]),
      mySchema.text(" increases here."),
    ]),
  ]),
  mySchema.node("horizontal_rule"),
  mySchema.node("paragraph", null, [
    mySchema.text("Try selecting text to see how slices work."),
  ]),
]);

const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
  ],
});

// ── Info panel below the editor ─────────────────────────────
const infoEl = document.createElement("pre");
infoEl.style.cssText =
  "margin:12px 0;padding:12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:12px;max-height:400px;overflow:auto;line-height:1.5;" +
  "white-space:pre-wrap;word-break:break-word;";
document.querySelector("#editor").parentNode.appendChild(infoEl);

function updateInfo(view) {
  const { doc, selection } = view.state;
  const { from, to } = selection;
  const lines = [];

  // ── 1. Document tree overview ──
  lines.push("═══ DOCUMENT TREE ═══");
  doc.descendants((node, pos) => {
    // Indent based on depth (approximate via resolve)
    const depth = doc.resolve(pos).depth;
    const indent = "  ".repeat(depth);
    if (node.isText) {
      const marks = node.marks.map(m => m.type.name).join(", ");
      const markStr = marks ? ` [${marks}]` : "";
      lines.push(`${indent}"${node.text}"${markStr}  (pos ${pos}–${pos + node.nodeSize})`);
    } else {
      const attrs = Object.keys(node.attrs).length
        ? ` ${JSON.stringify(node.attrs)}`
        : "";
      lines.push(`${indent}<${node.type.name}${attrs}>  (pos ${pos}, size ${node.nodeSize})`);
    }
  });
  lines.push(`\nTotal doc size: doc.content.size = ${doc.content.size}`);

  // ── 2. Cursor / selection info ──
  lines.push("\n═══ CURSOR POSITION ═══");
  if (from === to) {
    lines.push(`Cursor at position: ${from}`);
  } else {
    lines.push(`Selection: ${from} → ${to} (${to - from} chars)`);
  }

  // ── 3. Resolved position details ──
  const $from = doc.resolve(from);
  lines.push(`\n═══ RESOLVED POSITION (from=${from}) ═══`);
  lines.push(`  depth: ${$from.depth}`);
  lines.push(`  parent: <${$from.parent.type.name}>`);
  lines.push(`  parentOffset: ${$from.parentOffset}`);
  lines.push(`  index in parent: ${$from.index()}`);

  // Show the full path from root
  const path = [];
  for (let d = 0; d <= $from.depth; d++) {
    path.push($from.node(d).type.name);
  }
  lines.push(`  path: ${path.join(" → ")}`);

  // ── 4. Slice info (when there's a selection) ──
  if (from !== to) {
    lines.push(`\n═══ SLICE (${from}–${to}) ═══`);
    const slice = doc.slice(from, to);
    lines.push(`  openStart: ${slice.openStart}`);
    lines.push(`  openEnd: ${slice.openEnd}`);
    lines.push(`  content: ${slice.content.toString()}`);
  }

  // ── 5. Node at cursor ──
  const nodeAtCursor = doc.nodeAt(from);
  if (nodeAtCursor) {
    lines.push(`\n═══ NODE AT POSITION ${from} ═══`);
    lines.push(`  type: ${nodeAtCursor.type.name}`);
    lines.push(`  nodeSize: ${nodeAtCursor.nodeSize}`);
    if (nodeAtCursor.isText) {
      lines.push(`  text: "${nodeAtCursor.text}"`);
    }
  }

  infoEl.textContent = lines.join("\n");
}

// ── Create the view ─────────────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
    updateInfo(this);
  },
});

// Initial render of the info panel
updateInfo(view);

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Click at different spots in the editor. Watch the position number
//      change. Notice how entering a blockquote increases the depth.
//
//   2. Look at the document tree. Count the positions manually:
//      - <heading> at pos 0 has nodeSize = text length + 2 (open + close).
//      - <paragraph> starts right after the heading ends.
//
//   3. Select text across two paragraphs. Look at the slice:
//      - openStart/openEnd will be 1, because the paragraphs are "open"
//        (the slice is inside them, not wrapping them fully).
//
//   4. Select an entire paragraph (triple-click). The slice should have
//      openStart = 0 and openEnd = 0 — it's a complete node.
//
//   5. Put your cursor inside the blockquote and check the path:
//      doc → blockquote → paragraph. Depth should be 2.
