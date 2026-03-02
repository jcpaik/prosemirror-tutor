// 03-transactions.js
// Transactions: how state changes in ProseMirror.
//
// State is immutable. To change it, you create a Transaction — a recipe
// describing the edit — and apply it to get a new State.
//
// This example logs every transaction so you can see exactly what happens
// when you type, press Enter, or undo.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

const mySchema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: {
      content: "text*",
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }],
    },
    text: { inline: true },
  },
});

const state = EditorState.create({
  schema: mySchema,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
  ],
});

// ── The key part: dispatchTransaction ───────────────────
// Every time an edit happens, the view calls this function.
// By default it just does: this.updateState(this.state.apply(tr))
// We override it to log what the transaction contains.

// Create a log area below the editor
const logEl = document.createElement("pre");
logEl.style.cssText =
  "margin:12px 0;padding:12px;background:#f5f5f5;border:1px solid #ddd;" +
  "font-size:12px;max-height:250px;overflow:auto;";
document.querySelector("#editor").parentNode.appendChild(logEl);

let txCount = 0;

const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    txCount++;
    const lines = [`── Transaction #${txCount} ──`];

    // Steps are the atomic operations inside a transaction.
    // Typing "a" produces a ReplaceStep that inserts "a".
    // Pressing Enter produces a ReplaceStep that splits the paragraph.
    if (tr.steps.length > 0) {
      lines.push(`  Steps (${tr.steps.length}):`);
      tr.steps.forEach((step, i) => {
        lines.push(`    ${i}: ${step.toJSON().stepType} → ${JSON.stringify(step.toJSON())}`);
      });
    }

    // Selection changes (cursor moved)
    if (!tr.selectionSet && tr.steps.length === 0) {
      lines.push("  (no-op — usually a focus/blur event)");
    }
    if (tr.selectionSet) {
      const sel = tr.selection;
      lines.push(`  Selection: ${sel.from}–${sel.to}` +
        (sel.from === sel.to ? " (cursor)" : " (range)"));
    }

    // Document changed?
    lines.push(`  Doc changed: ${tr.docChanged}`);

    logEl.textContent = lines.join("\n") + "\n\n" + logEl.textContent;

    // IMPORTANT: apply the transaction to get the new state,
    // then tell the view to use it.
    const newState = this.state.apply(tr);
    this.updateState(newState);
  },
});

// ── Programmatic transactions ──────────────────────────
// You can also create transactions in code, not just from user input.
// This inserts "Hello!" at the start of the document after 1 second.
setTimeout(() => {
  const tr = view.state.tr.insertText("Hello! ", 1);
  view.dispatch(tr);
}, 1000);

// ────────────────────────────────────────────────────────
// Exercises:
//   1. Type a few characters and read the log. Each keystroke = 1 transaction
//      with 1 ReplaceStep.
//   2. Press Enter — see how the step splits the paragraph node.
//   3. Press Mod-z (undo) — notice the steps reverse the previous edit.
//   4. Change the setTimeout code to insert text at a different position.
//      Hint: position 1 = start of first paragraph's content.
