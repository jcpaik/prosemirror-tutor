// 13-plugin-state.js
// Plugins with State Fields: tracking data across transactions.
//
// This example demonstrates two plugins that each maintain their own state:
//   1. A word-count plugin — recomputes whenever the document changes.
//   2. A change-counter plugin — counts document-changing transactions,
//      but skips programmatic edits tagged with setMeta.
//
// Both plugin states are displayed in a status bar below the editor.
// A "Programmatic Edit" button inserts text without incrementing the counter,
// showing how setMeta lets you tag transactions for plugins to inspect.

import { EditorState, Plugin, PluginKey } from "prosemirror-state";
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

// ── Helper: count words in a document ──────────────────────────
// Extracts all text from the doc, splits on whitespace, and counts
// non-empty segments. Simple but effective for a demo.
function countWords(doc) {
  const text = doc.textBetween(0, doc.content.size, " ", " ");
  const words = text.split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

// ── Plugin 1: Word Count ───────────────────────────────────────
// Uses a PluginKey so external code can read the word count from
// any EditorState without importing the plugin instance directly.

const wordCountKey = new PluginKey("wordCount");

const wordCountPlugin = new Plugin({
  key: wordCountKey,

  state: {
    // init runs once when EditorState.create() is called.
    // We compute the word count from the initial document.
    init(_, state) {
      return countWords(state.doc);
    },

    // apply runs on every transaction.
    // If the doc changed, recount. Otherwise, return the old value.
    apply(tr, value, _oldState, newState) {
      if (tr.docChanged) {
        return countWords(newState.doc);
      }
      return value; // cursor-only change, no recount needed
    },
  },
});

// ── Plugin 2: Change Counter ───────────────────────────────────
// Counts how many user edits have changed the document.
// Transactions tagged with setMeta(changeCountKey, "programmatic")
// are excluded from the count, demonstrating metadata usage.

const changeCountKey = new PluginKey("changeCount");

const changeCountPlugin = new Plugin({
  key: changeCountKey,

  state: {
    init() {
      return 0; // start at zero changes
    },

    apply(tr, value) {
      // Check if this transaction was tagged as programmatic.
      // If so, skip incrementing — the edit was not from the user.
      if (tr.getMeta(changeCountKey) === "programmatic") {
        return value;
      }
      // Only count transactions that actually changed the document.
      // Selection-only transactions (clicking, arrow keys) don't count.
      if (tr.docChanged) {
        return value + 1;
      }
      return value;
    },
  },
});

// ── Build initial document ─────────────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("heading", { level: 1 }, [
    mySchema.text("Plugin State Demo"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Type here to see the "),
    mySchema.text("word count", [mySchema.marks.strong.create()]),
    mySchema.text(" and "),
    mySchema.text("change counter", [mySchema.marks.strong.create()]),
    mySchema.text(" update in the status bar below."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text(
      "Try the \"Programmatic Edit\" button — it inserts text but does " +
      "NOT increment the change counter, because the transaction is " +
      "tagged with setMeta."
    ),
  ]),
]);

const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
    wordCountPlugin,
    changeCountPlugin,
  ],
});

// ── Status bar — displays plugin state values ──────────────────
const statusBar = document.createElement("div");
statusBar.style.cssText =
  "margin:8px 0;padding:10px 14px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-family:monospace;font-size:13px;display:flex;gap:24px;align-items:center;";
document.querySelector("#editor").parentNode.appendChild(statusBar);

const wordCountSpan = document.createElement("span");
const changeCountSpan = document.createElement("span");
statusBar.appendChild(wordCountSpan);
statusBar.appendChild(changeCountSpan);

function updateStatusBar(editorState) {
  // Read plugin state via the PluginKey — this is the recommended pattern.
  const words = wordCountKey.getState(editorState);
  const changes = changeCountKey.getState(editorState);
  wordCountSpan.textContent = `Words: ${words}`;
  changeCountSpan.textContent = `User edits: ${changes}`;
}

// ── "Programmatic Edit" button ─────────────────────────────────
// Demonstrates setMeta: the inserted text updates the word count
// (because the doc changed) but NOT the change counter (because
// we tagged the transaction as "programmatic").

const btn = document.createElement("button");
btn.textContent = "Programmatic Edit";
btn.style.cssText =
  "margin-left:auto;padding:4px 12px;cursor:pointer;font-size:13px;";
statusBar.appendChild(btn);

// ── Create the editor view ─────────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), {
  state,
  // Every dispatched transaction flows through here.
  // We apply it, update the view, and refresh the status bar.
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
    updateStatusBar(newState);
  },
});

// Wire up the button click.
btn.addEventListener("click", () => {
  // Build a transaction that inserts text at the end of the doc.
  const endPos = view.state.doc.content.size;
  const tr = view.state.tr.insertText(" [auto] ", endPos);

  // Tag it so the change counter knows to skip it.
  tr.setMeta(changeCountKey, "programmatic");

  // Dispatch — this goes through dispatchTransaction above.
  view.dispatch(tr);
});

// Initial status bar render
updateStatusBar(view.state);

// ────────────────────────────────────────────────────────────────
// Exercises:
//   1. Type some text and watch the word count update. Delete words
//      and confirm the count decreases.
//
//   2. Click "Programmatic Edit" several times. Notice that the word
//      count increases (the doc changed) but "User edits" stays the
//      same (the transaction was tagged as "programmatic").
//
//   3. Now type normally. The user edit count should increment.
//      The change counter distinguishes user from programmatic edits
//      entirely through tr.getMeta / tr.setMeta.
//
//   4. Move the cursor around without editing. Neither counter
//      changes — both plugins check tr.docChanged before updating.
//
//   5. Challenge: add a third plugin that tracks the number of
//      paragraphs. Define a new PluginKey, implement init/apply,
//      and display the count in the status bar.
