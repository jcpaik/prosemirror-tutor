// 05-commands.js
// Commands: the universal interface for editor actions.
//
// A command is (state, dispatch?, view?) => boolean.
// This example defines a custom command, wires it to a keyboard shortcut,
// and adds buttons that demonstrate the "dry run" pattern — calling a command
// without dispatch to check whether it's applicable.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, deleteSelection, selectAll } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema — minimal, same as the from-scratch example ─────
const mySchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }],
    },
    // Horizontal rule — a leaf block node, no editable content.
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

// ── Custom command: insert a timestamp at the cursor ───────
// Follows the standard pattern:
//   1. Check if the command makes sense (can we insert text here?)
//   2. If dispatch is provided, build and dispatch the transaction.
//   3. Return true (applicable) or false (not applicable).
function insertTimestamp(state, dispatch) {
  // Check: is the cursor inside an inline context?
  // (We need the selection to be in a node that allows text.)
  const { $from } = state.selection;
  const parent = $from.parent;
  if (!parent.type.spec.content || !parent.type.spec.content.includes("inline")) {
    return false; // Can't insert text here
  }

  // If no dispatch, this is a dry run — just report applicability.
  if (dispatch) {
    const timestamp = `[${new Date().toLocaleTimeString()}]`;
    // Insert the timestamp text at the current selection.
    // replaceSelectionWith replaces the selection with a node,
    // but for text we use insertText on the transaction.
    const tr = state.tr.insertText(timestamp);
    dispatch(tr);
  }
  return true;
}

// ── Custom command: insert a horizontal rule ───────────────
function insertHR(state, dispatch) {
  const hrType = mySchema.nodes.horizontal_rule;

  // Check: can we replace the selection with an HR at this position?
  const { $from, $to } = state.selection;
  if (!$from.parent.canReplaceWith($from.index(), $to.index(), hrType)) {
    return false;
  }

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(hrType.create()));
  }
  return true;
}

// ── Build the initial document ─────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("paragraph", null, [
    mySchema.text("Type here. Select some text, then try the buttons below."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Press "),
    mySchema.text("Mod-Shift-T", [mySchema.marks.strong.create()]),
    mySchema.text(" to insert a timestamp via keyboard shortcut."),
  ]),
]);

// ── Plugins — note how custom commands bind to keys ────────
const plugins = [
  history(),
  keymap({
    "Mod-z": undo,
    "Mod-Shift-z": redo,
    // Bind our custom commands to keyboard shortcuts.
    "Mod-Shift-t": insertTimestamp,
    "Mod-Shift-h": insertHR,
  }),
  keymap(baseKeymap),
];

const state = EditorState.create({ doc: initDoc, plugins });

// ── Create the view ────────────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
    // Update button states whenever the editor state changes.
    updateButtons();
  },
});

// ── Toolbar buttons below the editor ───────────────────────
// Each button runs a command. We also use the "dry run" pattern to
// enable/disable buttons based on whether the command is applicable.
const toolbar = document.createElement("div");
toolbar.style.cssText = "margin:12px 0;display:flex;gap:8px;flex-wrap:wrap;";
document.querySelector("#editor").parentNode.appendChild(toolbar);

// Status line to show what happened.
const statusEl = document.createElement("div");
statusEl.style.cssText =
  "margin:8px 0;padding:8px 12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:13px;min-height:20px;border-radius:4px;";
document.querySelector("#editor").parentNode.appendChild(statusEl);

function setStatus(msg) {
  statusEl.textContent = msg;
}

// Helper: create a button that runs a command.
function addButton(label, command, description) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.title = description;
  btn.style.cssText = "padding:4px 12px;font-size:13px;cursor:pointer;";
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault(); // Don't steal focus from the editor.
    // Execute the command — pass dispatch to actually run it.
    const ran = command(view.state, view.dispatch, view);
    if (ran) {
      setStatus(`"${label}" executed successfully.`);
    } else {
      setStatus(`"${label}" is not applicable right now.`);
    }
    view.focus(); // Return focus to the editor.
  });
  toolbar.appendChild(btn);
  return btn;
}

// Add buttons for our commands.
const btnTimestamp = addButton("Insert Timestamp", insertTimestamp,
  "Inserts the current time at the cursor (Mod-Shift-T)");
const btnHR = addButton("Insert HR", insertHR,
  "Inserts a horizontal rule (Mod-Shift-H)");
const btnDelete = addButton("Delete Selection", deleteSelection,
  "Deletes selected text (only works when something is selected)");
const btnSelectAll = addButton("Select All", selectAll,
  "Selects the entire document");
const btnUndo = addButton("Undo", undo, "Undo last change (Mod-Z)");
const btnRedo = addButton("Redo", redo, "Redo (Mod-Shift-Z)");

// ── Update button enabled/disabled state ───────────────────
// This is the "dry run" pattern in action: call the command
// without dispatch to check if it would succeed.
function updateButtons() {
  const buttons = [
    [btnTimestamp, insertTimestamp],
    [btnHR, insertHR],
    [btnDelete, deleteSelection],
    [btnUndo, undo],
    [btnRedo, redo],
  ];
  for (const [btn, cmd] of buttons) {
    // Dry run: pass state but NOT dispatch.
    const applicable = cmd(view.state);
    btn.disabled = !applicable;
    btn.style.opacity = applicable ? "1" : "0.4";
  }
}

// Initial button state check.
updateButtons();

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Click "Delete Selection" with no text selected — it should be
//      grayed out. Now select some text and notice the button enables.
//
//   2. Click "Undo" right after loading — it's disabled because there's
//      nothing to undo. Make an edit, then try again.
//
//   3. Read the insertTimestamp function. Modify it to insert the date
//      instead of the time (hint: use toLocaleDateString()).
//
//   4. Write a new command that wraps the selected text in asterisks.
//      (Hint: get the selected text with state.doc.textBetween(from, to),
//      then use tr.replaceWith or tr.insertText.)
//
//   5. Add your new command as a button and bind it to a key shortcut.
