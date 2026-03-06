// ============================================================
// Exercise 02 — Dispatch Transactions
// ============================================================
// Goal: Programmatically modify the document by dispatching
// transactions — insert text, delete text, and replace content.
//
// Instructions:
//   1. A basic editor is set up for you below.
//   2. After the editor is created, dispatch transactions to
//      make the changes described in each TODO.
//
// Hints:
//   - view.state.tr gives you a fresh transaction.
//   - tr.insertText(text, pos) inserts text at a position.
//   - tr.delete(from, to) deletes a range.
//   - tr.replaceWith(from, to, node) replaces a range with a node.
//   - view.dispatch(tr) applies the transaction.
//   - After dispatching, view.state is updated — get a new tr!
// ============================================================

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema } from "prosemirror-schema-basic";

// Start with a simple document
const doc = schema.node("doc", null, [
  schema.node("paragraph", null, [schema.text("Hello world")]),
  schema.node("paragraph", null, [schema.text("ProseMirror is powerful")]),
]);

const state = EditorState.create({ doc, schema });
const view = new EditorView(document.querySelector("#editor"), { state });

// --- Transaction 1: Insert text ---
// TODO: Insert " and welcome" after "Hello world" (position 12)
//       so the first paragraph reads "Hello world and welcome"
// Hint: view.dispatch(view.state.tr.insertText(" and welcome", 12))


// --- Transaction 2: Delete text ---
// TODO: Delete "and welcome " from the first paragraph to revert it.
//       After Transaction 1, the first paragraph content starts at pos 1.
//       Find the right (from, to) range and use tr.delete(from, to).
// Hint: Use view.state.doc.textContent or count positions carefully.


// --- Transaction 3: Replace content ---
// TODO: Replace the second paragraph entirely with a new paragraph
//       that says "Transactions are immutable updates."
//       You'll need to find the start/end positions of the second paragraph.
// Hint: The second paragraph node starts after the first paragraph closes.
//       Use view.state.doc.nodeAt(pos) or resolve() to find boundaries.
//       tr.replaceWith(from, to, newNode) replaces the range.

