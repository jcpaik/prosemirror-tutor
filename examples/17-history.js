// 17-history.js
// History (Undo/Redo): how the history plugin tracks changes, groups them,
// and how to query undo/redo depth and exclude edits from history.
//
// This editor uses a newGroupDelay of 2000ms so you can see grouping in
// action. A status bar shows live undo/redo depth, and a button demonstrates
// inserting text that bypasses history entirely.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { history, undo, redo, undoDepth, redoDepth } from "prosemirror-history";

// ── Schema: minimal, just paragraphs and text ──────────────
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
});

// ── Initial document ───────────────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("paragraph", null, [
    mySchema.text("Type here, then press Mod-z to undo. Edits within 2 seconds are grouped."),
  ]),
]);

// ── Editor state with history (newGroupDelay = 2000ms) ─────
// The default newGroupDelay is 500ms. We set it to 2000ms so that rapid
// typing within a 2-second window gets undone as a single chunk.
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history({ newGroupDelay: 2000 }),
    keymap({ "Mod-z": undo, "Mod-y": redo }),
    keymap(baseKeymap),
  ],
});

// ── Status bar: displays undo/redo depth ───────────────────
const statusEl = document.createElement("div");
statusEl.style.cssText =
  "margin:8px 0;padding:8px 12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-family:monospace;font-size:13px;border-radius:4px;";
document.querySelector("#editor").parentNode.appendChild(statusEl);

function updateStatus(editorState) {
  const undos = undoDepth(editorState);
  const redos = redoDepth(editorState);
  statusEl.textContent =
    `Undo depth: ${undos}  |  Redo depth: ${redos}  ` +
    `(Mod-z to undo, Mod-y to redo)`;
}

// ── "Insert (no undo)" button ──────────────────────────────
// This button inserts text at the cursor but marks the transaction with
// addToHistory: false, so the insertion cannot be undone.
const btn = document.createElement("button");
btn.textContent = "Insert timestamp (no undo)";
btn.style.cssText =
  "margin:8px 4px;padding:6px 12px;font-size:13px;cursor:pointer;";
document.querySelector("#editor").parentNode.appendChild(btn);

// We need a reference to the view so the button handler can dispatch.
// It is assigned after the view is created below.
let view;

btn.addEventListener("click", () => {
  if (!view) return;
  const { state } = view;
  const timestamp = new Date().toLocaleTimeString();
  // Build a transaction that inserts text at the current cursor position.
  // Setting addToHistory to false means this edit is invisible to undo.
  const tr = state.tr.insertText(`[${timestamp}] `);
  tr.setMeta("addToHistory", false);
  view.dispatch(tr);
});

// ── Create the editor view ─────────────────────────────────
view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
    updateStatus(newState);
  },
});

// Initial status render
updateStatus(view.state);

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Type a few words quickly (within 2 seconds) then wait. Press Mod-z.
//      All the recent typing should undo at once — that's the 2000ms group.
//
//   2. Type, wait 3 seconds, type more. Now Mod-z undoes only the second
//      burst — the first burst is a separate undo event.
//
//   3. Click "Insert timestamp (no undo)". Notice the timestamp appears but
//      the undo depth does NOT increase. Pressing Mod-z skips over it.
//
//   4. Try reducing newGroupDelay to 100. Undo becomes much more granular —
//      almost character-by-character.
//
//   5. Watch the status bar as you undo/redo. The depths update live.
