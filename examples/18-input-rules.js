// 18-input-rules.js
// Input Rules: automatically transform text as the user types.
//
// This example sets up an editor with several input rules:
//   - emDash (-- → —) and ellipsis (... → …) for typographic polish
//   - wrappingInputRule: "> " at start of line wraps in a blockquote
//   - textblockTypeInputRule: "# ", "## ", "### " change to headings
//   - A custom InputRule: ":)" becomes a smiley emoji 😊
//   - undoInputRule bound to Backspace to revert auto-replacements
//
// Try typing these patterns and watch the transformations happen live.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// Import everything we need from prosemirror-inputrules
import {
  InputRule,
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  emDash,
  ellipsis,
  undoInputRule,
} from "prosemirror-inputrules";

// ── Schema ─────────────────────────────────────────────────────
// A minimal schema with paragraph, heading (h1–h3), and blockquote.
// These are the node types our input rules will target.
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
      // Render as <h1>, <h2>, or <h3> depending on the level attribute
      toDOM(node) { return ["h" + node.attrs.level, 0]; },
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
      ],
    },
    blockquote: {
      group: "block",
      content: "block+",
      toDOM() { return ["blockquote", 0]; },
      parseDOM: [{ tag: "blockquote" }],
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

// ── Input Rules ────────────────────────────────────────────────

// 1. Built-in typographic rules:
//    emDash:   "--" → "—"
//    ellipsis: "..." → "…"
// These are pre-built InputRule instances — just drop them in.

// 2. wrappingInputRule: "> " at the start of a line wraps the
//    current paragraph in a blockquote node.
const blockquoteRule = wrappingInputRule(
  /^\s*>\s$/,                   // match "> " at the start of a textblock
  mySchema.nodes.blockquote     // wrap with this node type
);

// 3. textblockTypeInputRule: "# ", "## ", or "### " at the start
//    of a line changes the paragraph into a heading.
//    We use a single rule with a dynamic getAttrs function that
//    reads the number of "#" characters to determine the level.
const headingRule = textblockTypeInputRule(
  /^(#{1,3})\s$/,               // match 1–3 "#" followed by a space
  mySchema.nodes.heading,       // change to this node type
  match => ({ level: match[1].length })  // attrs from the match
);

// 4. Custom InputRule: replace ":)" with a smiley emoji.
//    This demonstrates writing a rule with a function handler.
//    The handler receives (state, match, start, end) and returns
//    a transaction that replaces the matched range with new content.
const smileyRule = new InputRule(
  /:\)$/,                       // match ":)" at the cursor
  (state, match, start, end) => {
    // Replace the matched text ":)" with the emoji character
    return state.tr.replaceWith(start, end, mySchema.text("😊"));
  }
);

// ── Combine rules into a plugin ────────────────────────────────
// The inputRules() function takes an array of rules and returns
// a Plugin that monitors typed input and applies matching rules.
const myInputRulesPlugin = inputRules({
  rules: [
    emDash,           // -- → —
    ellipsis,         // ... → …
    blockquoteRule,   // > + space → blockquote
    headingRule,      // # / ## / ### + space → heading
    smileyRule,       // :) → 😊
  ],
});

// ── Initial document ───────────────────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("heading", { level: 1 }, [
    mySchema.text("Input Rules Demo"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Try typing these patterns:"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text('Type "--" for an em dash (—)'),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text('Type "..." for an ellipsis (…)'),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text('Type "> " at the start of a new line for a blockquote'),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text('Type "# ", "## ", or "### " at the start for headings'),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text('Type ":)" for a smiley emoji'),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("After a replacement, press Backspace to undo it."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Start typing below this line:"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text(" "),
  ]),
]);

// ── Editor setup ───────────────────────────────────────────────
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    myInputRulesPlugin,
    // undoInputRule is a command — bind it to Backspace so the user
    // can revert the last auto-replacement by pressing Backspace.
    // It goes BEFORE baseKeymap so it gets first crack; if the last
    // change wasn't an input rule, it returns false and baseKeymap's
    // Backspace handler runs instead.
    keymap({ Backspace: undoInputRule }),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
  ],
});

const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
  },
});

// ────────────────────────────────────────────────────────────────
// Exercises:
//   1. Type "--" in the editor. It should become "—". Now press
//      Backspace — the em dash reverts to "--". That's undoInputRule.
//
//   2. On a new empty line, type "> " (greater-than + space).
//      The paragraph wraps into a blockquote.
//
//   3. On a new empty line, type "## " (two hashes + space).
//      The paragraph changes to an h2 heading.
//
//   4. Type ":)" anywhere. It becomes 😊.
//
//   5. Challenge: add a new rule that converts "(c)" into "©".
//      Hint: new InputRule(/\(c\)$/, "©") — a string handler.
//
//   6. Challenge: add a rule for "---" at the start of a line that
//      inserts a horizontal rule. You'll need to add an hr node type
//      to the schema and write a function handler.
