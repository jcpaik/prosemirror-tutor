// 06-keymaps.js
// Keymap Bindings: mapping keyboard shortcuts to commands.
//
// This example stacks two keymap layers on top of baseKeymap:
//   - Mod-Shift-d  → duplicate the current paragraph
//   - Mod-Shift-t  → insert a timestamp at the cursor
// A log panel below the editor shows which keys fire and which command runs.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema ─────────────────────────────────────────────────────
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
      parseDOM: [{ tag: "h1", attrs: { level: 1 } }],
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

// ── Log panel ──────────────────────────────────────────────────
// We'll append key-event messages here so you can see what fires.
const logEl = document.createElement("pre");
logEl.style.cssText =
  "margin:12px 0;padding:12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:12px;max-height:250px;overflow:auto;line-height:1.5;" +
  "white-space:pre-wrap;word-break:break-word;";
document.querySelector("#editor").parentNode.appendChild(logEl);

const MAX_LOG_LINES = 40;
const logLines = [];

function log(msg) {
  logLines.push(msg);
  if (logLines.length > MAX_LOG_LINES) logLines.shift();
  logEl.textContent = logLines.join("\n");
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Custom commands ────────────────────────────────────────────

// Duplicate the paragraph under the cursor.
// Finds the nearest paragraph, copies it, and inserts it right after.
function duplicateParagraph(state, dispatch) {
  const { $from } = state.selection;
  // Walk up to find a paragraph ancestor
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "paragraph") {
      if (dispatch) {
        // Position right after this paragraph
        const endPos = $from.after(d);
        const tr = state.tr.insert(endPos, node.copy(node.content));
        dispatch(tr.scrollIntoView());
      }
      log("[Mod-Shift-d] duplicateParagraph → handled");
      return true;
    }
  }
  // No paragraph found — let the next keymap try
  return false;
}

// Insert a plain-text timestamp at the cursor.
function insertTimestamp(state, dispatch) {
  const { from } = state.selection;
  const timestamp = new Date().toLocaleTimeString();
  if (dispatch) {
    const tr = state.tr.insertText(`[${timestamp}] `, from);
    dispatch(tr.scrollIntoView());
  }
  log("[Mod-Shift-t] insertTimestamp → handled");
  return true;
}

// ── Wrap baseKeymap commands to log when they fire ─────────────
// This is just for demonstration — you wouldn't do this in production.
function wrapWithLog(bindings) {
  const wrapped = {};
  for (const [key, cmd] of Object.entries(bindings)) {
    wrapped[key] = (state, dispatch, view) => {
      const result = cmd(state, dispatch, view);
      if (result) {
        log(`[${key}] baseKeymap → handled`);
      }
      return result;
    };
  }
  return wrapped;
}

// ── Build the initial document ────────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("heading", { level: 1 }, [
    mySchema.text("Keymap Bindings Demo"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Try pressing Mod-Shift-d to duplicate this paragraph."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Or press Mod-Shift-t to insert a timestamp."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Press Enter, Backspace, or Mod-z to see baseKeymap and history bindings fire in the log below."),
  ]),
]);

// ── Assemble the editor with stacked keymaps ──────────────────
//
// Plugin order matters!
//   1. History keymap    — Mod-z / Mod-Shift-z (undo/redo)
//   2. Custom keymap     — our app-specific shortcuts
//   3. Logging baseKeymap — fallback for Enter, Backspace, etc.
//
// If you moved baseKeymap above the custom keymap, Enter would always
// be consumed by baseKeymap before your custom commands got a chance.

const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),

    // Layer 1: history shortcuts (checked first)
    keymap({
      "Mod-z": (state, dispatch, view) => {
        const result = undo(state, dispatch);
        if (result) log("[Mod-z] undo → handled");
        return result;
      },
      "Mod-Shift-z": (state, dispatch, view) => {
        const result = redo(state, dispatch);
        if (result) log("[Mod-Shift-z] redo → handled");
        return result;
      },
    }),

    // Layer 2: custom shortcuts
    keymap({
      "Mod-Shift-d": duplicateParagraph,
      "Mod-Shift-t": insertTimestamp,
    }),

    // Layer 3: base keymap (fallback) — wrapped for logging
    keymap(wrapWithLog(baseKeymap)),
  ],
});

// ── Create the view ────────────────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
  },
});

log("Ready. Try: Mod-Shift-d, Mod-Shift-t, Mod-z, Enter, Backspace");

// ────────────────────────────────────────────────────────────────
// Exercises:
//   1. Press Mod-Shift-d inside a paragraph. Watch it duplicate in the
//      editor and see the log entry. Then undo with Mod-z.
//
//   2. Press Mod-Shift-t to insert a timestamp. Notice the log shows
//      which command handled the key.
//
//   3. Try reordering the keymap plugins — move the custom keymap
//      *after* baseKeymap. Does Mod-Shift-d still work? (It should,
//      because baseKeymap doesn't bind Mod-Shift-d. But try adding a
//      custom Enter binding and see how order affects it.)
//
//   4. Add a new binding: Mod-Shift-h that wraps the current paragraph
//      in a heading. Hint: look at the replaceWith transform method.
