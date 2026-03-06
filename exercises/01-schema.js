// ============================================================
// Exercise 01 — Build a Custom Schema
// ============================================================
// Goal: Define a schema with heading, paragraph, and blockquote
// nodes, then create a document and render it in an editor.
//
// Instructions:
//   1. Fill in the `nodes` object in the Schema constructor.
//   2. Create a document using schema.node() calls.
//   3. Create an EditorState and EditorView to display it.
//
// Hints:
//   - A schema always needs a "doc" and "text" node at minimum.
//   - Look at prosemirror-schema-basic for node spec examples.
//   - schema.node("paragraph", null, [schema.text("hello")])
// ============================================================

import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

// TODO: Define a schema with these node types:
//   doc      — top-level, content: "block+"
//   paragraph — block node, content: "inline*", group: "block"
//   heading   — block node, content: "inline*", group: "block",
//               attrs: { level: { default: 1 } }
//   blockquote — block node, content: "block+", group: "block"
//   text      — inline node, group: "inline"
const mySchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    // TODO: add paragraph, heading, and blockquote nodes here
  },
});

// TODO: Build a document with:
//   - A level-2 heading that says "My Document"
//   - A paragraph that says "This is a custom schema."
//   - A blockquote containing a paragraph that says "— quoted text"
//
// Example: mySchema.node("doc", null, [ ... children ... ])
const doc = mySchema.node("doc", null, [
  // TODO: create child nodes here
]);

// TODO: Create an EditorState from the doc, then an EditorView
//       mounted on document.querySelector("#editor")
