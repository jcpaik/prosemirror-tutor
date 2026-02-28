// 01-basic-editor.js
// A minimal ProseMirror editor using the basic schema and example-setup plugins.

// CSS for the menu bar and example-setup (Vite handles CSS imports from JS)
import "prosemirror-menu/style/menu.css";
import "prosemirror-example-setup/style/style.css";

// EditorState holds the document content, selection, and plugin state.
import { EditorState } from "prosemirror-state";

// EditorView renders the state to the DOM and handles user input.
import { EditorView } from "prosemirror-view";

// schema defines the allowed node/mark types: paragraphs, headings, bold, italic, etc.
import { schema } from "prosemirror-schema-basic";

// exampleSetup bundles common plugins for quick starts:
//   - keymap with bold (Mod-b), italic (Mod-i), undo (Mod-z), redo (Mod-Shift-z)
//   - input rules (e.g., "# " at start of line → heading)
//   - drop cursor, gap cursor
//   - menu bar with formatting buttons
//   - history (undo/redo)
import { exampleSetup } from "prosemirror-example-setup";

// Create the editor state with:
//   - schema: what kinds of nodes/marks are allowed
//   - plugins: behavior and UI extensions
const state = EditorState.create({
  schema,
  plugins: exampleSetup({ schema }),
});

// Mount the editor into the #editor div.
// The view takes ownership of rendering and keeps the DOM in sync with state.
new EditorView(document.querySelector("#editor"), { state });
