// 22-mapping.js
// Mapping and Position Tracking: how to keep positions valid after edits.
//
// This example places a visible "bookmark" at a position in the document.
// Every time you edit, tr.mapping.map() updates the bookmark so it stays
// in the right place. A panel shows the old and new positions, plus bias
// behavior when content is deleted around the bookmark.

import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema ─────────────────────────────────────────────────
const mySchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }],
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

// ── Bookmark plugin ────────────────────────────────────────
// Stores the bookmark position in plugin state. On each transaction,
// maps the position through tr.mapping so it tracks correctly.

const bookmarkKey = new PluginKey("bookmark");

// Starting bookmark position — inside the second paragraph
const INITIAL_BOOKMARK = 25;

const bookmarkPlugin = new Plugin({
  key: bookmarkKey,
  state: {
    init() {
      return { pos: INITIAL_BOOKMARK };
    },
    apply(tr, value) {
      // If a meta value is set, use it directly (for manual repositioning)
      const meta = tr.getMeta(bookmarkKey);
      if (meta !== undefined) return { pos: meta.pos };

      // Otherwise, map through the transaction's mapping
      if (tr.docChanged) {
        const newPos = tr.mapping.map(value.pos);
        return { pos: newPos };
      }
      return value;
    },
  },

  // Render the bookmark as a widget decoration — a small red marker
  props: {
    decorations(state) {
      const { pos } = bookmarkKey.getState(state);
      // Clamp to valid range
      const safePos = Math.min(pos, state.doc.content.size);
      const widget = Decoration.widget(safePos, () => {
        const marker = document.createElement("span");
        marker.textContent = "\u25C6"; // diamond character
        marker.style.cssText =
          "color:#e74c3c;font-size:16px;font-weight:bold;" +
          "position:relative;top:-1px;pointer-events:none;";
        marker.title = `Bookmark at position ${safePos}`;
        return marker;
      }, { side: 0 });
      return DecorationSet.create(state.doc, [widget]);
    },
  },
});

// ── Build the initial document ─────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("paragraph", null, [
    mySchema.text("Type here to see mapping."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("The red diamond is a bookmark tracked via mapping."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Try deleting text before, after, and around it."),
  ]),
]);

const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
    bookmarkPlugin,
  ],
});

// ── Info panel below the editor ────────────────────────────
const infoEl = document.createElement("pre");
infoEl.style.cssText =
  "margin:12px 0;padding:12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:12px;max-height:300px;overflow:auto;line-height:1.6;" +
  "white-space:pre-wrap;word-break:break-word;";
document.querySelector("#editor").parentNode.appendChild(infoEl);

// ── Buttons: reposition bookmark & demonstrate bias ────────
const btnRow = document.createElement("div");
btnRow.style.cssText = "margin:8px 0;display:flex;gap:8px;flex-wrap:wrap;";
document.querySelector("#editor").parentNode.appendChild(btnRow);

function makeBtn(label, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.style.cssText =
    "padding:4px 10px;font-size:12px;cursor:pointer;border:1px solid #aaa;" +
    "border-radius:3px;background:#fff;";
  btn.addEventListener("click", onClick);
  btnRow.appendChild(btn);
  return btn;
}

// Button to set bookmark at current cursor position
makeBtn("Set bookmark at cursor", () => {
  const { from } = view.state.selection;
  view.dispatch(
    view.state.tr.setMeta(bookmarkKey, { pos: from })
  );
});

// Button to demonstrate bias with a deletion around the bookmark
makeBtn("Demo bias: delete around bookmark", () => {
  const { pos } = bookmarkKey.getState(view.state);
  const docSize = view.state.doc.content.size;

  // Delete 2 chars on each side of the bookmark (if possible)
  const from = Math.max(0, pos - 2);
  const to = Math.min(docSize, pos + 2);

  if (from >= to) {
    infoEl.textContent = "Not enough text around the bookmark to delete.";
    return;
  }

  // Show what bias -1 vs 1 would produce for this mapping
  const tr = view.state.tr.delete(from, to);
  const mappedDefault = tr.mapping.map(pos, 1);   // bias 1 (default)
  const mappedLeft    = tr.mapping.map(pos, -1);   // bias -1

  // Also check mapResult to see if it was "deleted"
  const resultDefault = tr.mapping.mapResult(pos, 1);
  const resultLeft    = tr.mapping.mapResult(pos, -1);

  const lines = [
    "=== BIAS DEMO: delete around bookmark ===",
    `Old bookmark pos: ${pos}`,
    `Deleted range: ${from}-${to}`,
    "",
    `mapping.map(${pos}, 1)  => ${mappedDefault}  (bias right, default)`,
    `mapping.map(${pos}, -1) => ${mappedLeft}  (bias left)`,
    "",
    `mapResult(${pos}, 1).deleted  => ${resultDefault.deleted}`,
    `mapResult(${pos}, -1).deleted => ${resultLeft.deleted}`,
    "",
    "(The actual bookmark uses bias 1 by default.)",
    "(Transaction applied — see the bookmark move.)",
  ];
  infoEl.textContent = lines.join("\n");

  // Actually apply the transaction
  view.dispatch(tr);
});

// ── Create the view ────────────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    // Capture the old bookmark position before applying
    const oldBookmark = bookmarkKey.getState(this.state).pos;

    // Apply the transaction to get the new state
    const newState = this.state.apply(tr);
    this.updateState(newState);

    // Read the new bookmark position after the state update
    const newBookmark = bookmarkKey.getState(newState).pos;

    // Update the info panel on every transaction
    if (tr.docChanged) {
      const lines = [
        "=== LAST EDIT: POSITION MAPPING ===",
        `Bookmark: ${oldBookmark} => ${newBookmark}`,
        `Steps in transaction: ${tr.steps.length}`,
      ];

      // Show each step's map ranges for educational purposes
      tr.steps.forEach((step, i) => {
        const map = step.getMap();
        // StepMap.ranges is the internal array: [start, oldSize, newSize, ...]
        // We can show it by mapping a few sample positions
        lines.push(`  Step ${i}: ${step.toJSON().stepType}`);
        lines.push(`    map(${oldBookmark}) => ${map.map(oldBookmark)}`);
      });

      lines.push("");
      lines.push(`Accumulated: tr.mapping.map(${oldBookmark}) => ${tr.mapping.map(oldBookmark)}`);
      lines.push(`Doc size: ${newState.doc.content.size}`);

      infoEl.textContent = lines.join("\n");
    }
  },
});

// Initial info panel content
infoEl.textContent = [
  "=== MAPPING & POSITION TRACKING ===",
  `Bookmark position: ${INITIAL_BOOKMARK}`,
  "",
  "Type in the editor. The red diamond bookmark tracks its",
  "position through edits using tr.mapping.map().",
  "",
  'Click "Set bookmark at cursor" to move it.',
  'Click "Demo bias" to see how bias -1 vs 1 behaves',
  "when text around the bookmark is deleted.",
].join("\n");

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Type text BEFORE the bookmark. Watch the panel: the bookmark
//      position increases by the number of characters you typed.
//
//   2. Type text AFTER the bookmark. The bookmark position stays the
//      same — edits after it don't affect it.
//
//   3. Delete text before the bookmark (select and backspace). The
//      bookmark position decreases.
//
//   4. Click "Demo bias: delete around bookmark" and read the panel.
//      Both bias -1 and bias 1 produce the same position for a pure
//      deletion, but mapResult.deleted is true — the bookmark's
//      original content was removed.
//
//   5. Place the cursor at the bookmark, type some text, then undo.
//      Notice how the bookmark position maps back correctly through
//      undo because undo is just another transaction with its own
//      mapping.
