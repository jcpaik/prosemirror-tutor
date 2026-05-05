// 07-command-chaining.js
// Command Chaining: how chainCommands lets one key trigger different
// commands depending on context.
//
// This example builds custom Backspace and Enter chains that log which
// command handled each keypress. Watch the log panel below the editor.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import {
  chainCommands,
  deleteSelection,
  joinBackward,
  selectNodeBackward,
  newlineInCode,
  createParagraphNear,
  liftEmptyBlock,
  splitBlock,
  baseKeymap,
} from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema ─────────────────────────────────────────────────────
// A simple schema with paragraphs, headings, blockquotes, and an hr
// so we can trigger various Backspace/Enter behaviors.
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
      attrs: { level: { default: 2 } },
      toDOM(node) { return ["h" + node.attrs.level, 0]; },
      parseDOM: [{ tag: "h2", attrs: { level: 2 } }],
    },
    blockquote: {
      group: "block",
      content: "block+",
      toDOM() { return ["blockquote", 0]; },
      parseDOM: [{ tag: "blockquote" }],
    },
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

// ── Log panel ──────────────────────────────────────────────────
// We create a <pre> element below the editor that shows which command
// in the chain handled each Backspace or Enter press.
const logEl = document.createElement("pre");
logEl.style.cssText =
  "margin:12px 0;padding:12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:12px;max-height:250px;overflow:auto;line-height:1.6;" +
  "white-space:pre-wrap;word-break:break-word;";
logEl.textContent = "Press Backspace or Enter in the editor to see which command handles it.\n";
document.querySelector("#editor").parentNode.appendChild(logEl);

let logCount = 0;

function log(message) {
  logCount++;
  logEl.textContent += `[${logCount}] ${message}\n`;
  // Auto-scroll to bottom
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Logging wrapper ────────────────────────────────────────────
// Wraps a command so it logs its name when it returns true.
// The wrapper calls the original command normally — if it returns true,
// we know it handled the event and we log it.
function withLog(name, command) {
  return function (state, dispatch, view) {
    const result = command(state, dispatch, view);
    if (result) {
      log(`${name}`);
    }
    return result;
  };
}

// ── Custom Enter command ───────────────────────────────────────
// A custom command that intercepts Enter inside a heading:
// instead of splitting the heading, it creates a paragraph below.
// This demonstrates prepending custom behavior to a chain.
function exitHeadingOnEnter(state, dispatch) {
  const { $from } = state.selection;
  // Only act when the cursor is inside a heading
  if ($from.parent.type.name !== "heading") return false;
  // Create a new empty paragraph after the heading
  if (dispatch) {
    // Find the end position of the heading node
    const endOfHeading = $from.after();
    const paragraphType = state.schema.nodes.paragraph;
    const tr = state.tr.insert(endOfHeading, paragraphType.create());
    // Move the cursor into the new paragraph (+1 to enter the node)
    tr.setSelection(
      state.selection.constructor.near(tr.doc.resolve(endOfHeading + 1))
    );
    dispatch(tr);
  }
  return true;
}

// ── Build the chained keymaps ──────────────────────────────────
// Backspace chain: same as baseKeymap, but with logging.
const backspaceChain = chainCommands(
  withLog("Backspace handled by: deleteSelection", deleteSelection),
  withLog("Backspace handled by: joinBackward", joinBackward),
  withLog("Backspace handled by: selectNodeBackward", selectNodeBackward),
);

// Enter chain: our custom command first, then the standard chain.
// If exitHeadingOnEnter returns true, the rest are skipped.
const enterChain = chainCommands(
  withLog("Enter handled by: exitHeadingOnEnter (custom)", exitHeadingOnEnter),
  withLog("Enter handled by: newlineInCode", newlineInCode),
  withLog("Enter handled by: createParagraphNear", createParagraphNear),
  withLog("Enter handled by: liftEmptyBlock", liftEmptyBlock),
  withLog("Enter handled by: splitBlock", splitBlock),
);

// ── Build the initial document ─────────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("heading", { level: 2 }, [
    mySchema.text("Command Chaining Demo"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Type here, then press "),
    mySchema.text("Backspace", [mySchema.marks.strong.create()]),
    mySchema.text(" or "),
    mySchema.text("Enter", [mySchema.marks.strong.create()]),
    mySchema.text(". Watch the log below."),
  ]),
  mySchema.node("blockquote", null, [
    mySchema.node("paragraph", null, [
      mySchema.text("Try pressing Backspace at the start of this line."),
    ]),
    mySchema.node("paragraph", null, []),
  ]),
  mySchema.node("horizontal_rule"),
  mySchema.node("paragraph", null, [
    mySchema.text("Place cursor after the line above and press Backspace."),
  ]),
]);

// ── Create the editor ──────────────────────────────────────────
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    // Our custom chains with logging — placed before baseKeymap so they
    // take priority for Backspace and Enter.
    keymap({
      "Backspace": backspaceChain,
      "Enter": enterChain,
    }),
    // baseKeymap handles everything else (arrow keys, Delete, etc.)
    keymap(baseKeymap),
  ],
});

const view = new EditorView(document.querySelector("#editor"), { state });

// ────────────────────────────────────────────────────────────────
// Things to try:
//
//   1. Place the cursor in the middle of a word and press Backspace.
//      The log stays silent — none of our chained commands handle it
//      (the browser's native backspace deletes the character).
//
//   2. Select some text, then press Backspace. The log shows
//      "deleteSelection" — the first command in the chain.
//
//   3. Put the cursor at the start of the blockquote paragraph and
//      press Backspace. The log shows "joinBackward" — it merges
//      the paragraph with the one above.
//
//   4. Put the cursor right after the <hr> and press Backspace.
//      The log shows "selectNodeBackward" — it selects the <hr>.
//      Press Backspace again: now "deleteSelection" removes it.
//
//   5. Press Enter inside the heading. The log shows
//      "exitHeadingOnEnter (custom)" — our custom command fires
//      first, creating a paragraph instead of splitting the heading.
//
//   6. Press Enter in a normal paragraph. The log shows "splitBlock".
//
//   7. Put the cursor in the empty paragraph inside the blockquote
//      and press Enter. The log shows "liftEmptyBlock" — it lifts
//      the empty block out of the blockquote.
