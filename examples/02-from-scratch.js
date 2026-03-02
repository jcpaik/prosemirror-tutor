// 02-from-scratch.js
// Build a ProseMirror editor piece by piece — no exampleSetup.
// This gives you full control over what the editor can do.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Step 1: Define the Schema ──────────────────────────
// The schema is the rulebook. We define exactly which node types exist.
// Try adding or removing node types and see what changes!
const mySchema = new Schema({
  nodes: {
    // "doc" is the root — every schema needs one.
    // "content" says what children it allows.
    // "paragraph+" means "one or more paragraphs".
    doc: { content: "paragraph+" },

    // A paragraph node. It holds inline content (text).
    paragraph: {
      content: "text*",       // zero or more text nodes
      toDOM() { return ["p", 0]; },             // render as <p>
      parseDOM: [{ tag: "p" }],                 // parse from <p>
    },

    // The text node — every schema needs this.
    text: { inline: true },
  },
});

// ── Step 2: Create Plugins ─────────────────────────────
// Plugins add behavior. Without them, the editor is inert.
// baseKeymap gives Enter (split paragraph), Backspace, Delete, etc.
const plugins = [
  history(),                          // enables undo/redo tracking
  keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),  // wire shortcuts
  keymap(baseKeymap),                 // Enter, Backspace, etc.
];

// ── Step 3: Create the State ───────────────────────────
// The state is a snapshot: document content + selection + plugin state.
// It's immutable — every edit produces a *new* state via a transaction.
const state = EditorState.create({
  schema: mySchema,
  plugins,
});

// ── Step 4: Create the View ────────────────────────────
// The view renders the state to the DOM and captures user input.
// User input → transaction → new state → view updates the DOM.
new EditorView(document.querySelector("#editor"), { state });

// ────────────────────────────────────────────────────────
// Exercises:
//   1. Remove the history() plugin and its keymap — undo stops working.
//   2. Remove baseKeymap — Enter key stops splitting paragraphs.
//   3. Add a "heading" node type to the schema (hint: look at how
//      paragraph is defined, but use "h2" as the tag).
