// 15-filter-append-transaction.js
// filterTransaction and appendTransaction: intercepting and extending
// the transaction pipeline.
//
// This example demonstrates two plugin hooks:
//   1. filterTransaction — blocks edits that would exceed 200 characters.
//   2. appendTransaction — auto-capitalizes the first letter of every paragraph.
//
// A status bar shows the character count and filter status.
// A log panel records filter/append events as they happen.

import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema ──────────────────────────────────────────────────
// A minimal schema: doc with paragraphs, plain text, and bold.
const mySchema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: {
      content: "inline*",
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }],
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

// ── Helpers ─────────────────────────────────────────────────

const MAX_CHARS = 200;

// Count all text characters in a document.
function charCount(doc) {
  let count = 0;
  doc.descendants(node => {
    if (node.isText) count += node.text.length;
  });
  return count;
}

// ── Log panel ───────────────────────────────────────────────
// We'll append messages here so you can see filter/append events in real time.
const logLines = [];
const MAX_LOG_LINES = 30;

function addLog(msg) {
  const time = new Date().toLocaleTimeString();
  logLines.push(`[${time}] ${msg}`);
  if (logLines.length > MAX_LOG_LINES) logLines.shift();
}

// ── Plugin: filterTransaction (character limit) ─────────────
// This plugin rejects any transaction that would push the document
// beyond MAX_CHARS characters. Cursor-only transactions (no doc
// change) are always allowed.

const filterKey = new PluginKey("charLimitFilter");

const charLimitPlugin = new Plugin({
  key: filterKey,

  filterTransaction(tr, state) {
    // Always allow transactions that don't change the document.
    // This includes cursor movements, selection changes, and metadata.
    if (!tr.docChanged) return true;

    // Check the character count of the document *after* the transaction.
    // `tr.doc` is the document that would result from applying this transaction.
    const newCount = charCount(tr.doc);

    if (newCount > MAX_CHARS) {
      addLog(`FILTER: blocked edit (would be ${newCount}/${MAX_CHARS} chars)`);
      return false; // reject the transaction
    }

    addLog(`FILTER: allowed edit (${newCount}/${MAX_CHARS} chars)`);
    return true;
  },
});

// ── Plugin: appendTransaction (auto-capitalize paragraphs) ──
// After every edit, this plugin scans all paragraphs. If a paragraph
// starts with a lowercase letter, it creates a transaction to
// capitalize it.
//
// Key guard: we only return a transaction if at least one paragraph
// actually needs fixing. This prevents infinite loops — once all
// first letters are uppercase, we return null and the cycle stops.

const appendKey = new PluginKey("autoCapitalize");

const autoCapitalizePlugin = new Plugin({
  key: appendKey,

  appendTransaction(transactions, oldState, newState) {
    // Optimization: only run when the document actually changed.
    const docChanged = transactions.some(tr => tr.docChanged);
    if (!docChanged) return null;

    const tr = newState.tr;
    let madeChanges = false;

    // Walk every top-level child (each is a paragraph in our schema).
    newState.doc.forEach((node, offset) => {
      if (node.type.name !== "paragraph") return;
      const text = node.textContent;
      if (text.length === 0) return;

      const firstChar = text[0];
      if (firstChar !== firstChar.toUpperCase()) {
        // Position of the first character inside this paragraph:
        //   offset     = position before the <paragraph> open token
        //   offset + 1 = position of the first character inside it
        const from = offset + 1;
        const to = from + 1;
        tr.replaceWith(
          tr.mapping.map(from),
          tr.mapping.map(to),
          mySchema.text(firstChar.toUpperCase(), node.firstChild.marks)
        );
        madeChanges = true;
      }
    });

    if (madeChanges) {
      addLog("APPEND: auto-capitalized paragraph first letters");
      return tr;
    }

    // Return null — no correction needed, cycle stops here.
    return null;
  },
});

// ── Build the initial document ──────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("paragraph", null, [
    mySchema.text("This editor limits you to 200 characters."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("try typing a lowercase letter at the start of a new paragraph — it auto-capitalizes!"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Keep typing to approach the limit. The status bar updates live."),
  ]),
]);

// ── Editor state with both plugins ──────────────────────────
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
    charLimitPlugin,       // filterTransaction runs first
    autoCapitalizePlugin,  // appendTransaction runs after apply
  ],
});

// ── Status bar (character count + filter status) ────────────
const statusEl = document.createElement("div");
statusEl.style.cssText =
  "padding:6px 12px;background:#e8f5e9;border:1px solid #a5d6a7;" +
  "font-size:13px;font-family:monospace;margin-top:8px;border-radius:4px;";
document.querySelector("#editor").parentNode.appendChild(statusEl);

// ── Log panel ───────────────────────────────────────────────
const logEl = document.createElement("pre");
logEl.style.cssText =
  "margin:8px 0;padding:10px;background:#f5f5f5;border:1px solid #ddd;" +
  "font-size:11px;max-height:200px;overflow:auto;line-height:1.4;" +
  "white-space:pre-wrap;word-break:break-word;border-radius:4px;";
document.querySelector("#editor").parentNode.appendChild(logEl);

let lastFiltered = false;

function updateStatus(view) {
  const count = charCount(view.state.doc);
  const pct = Math.round((count / MAX_CHARS) * 100);

  // Color-code: green under 75%, amber 75-90%, red above 90%
  let color = "#2e7d32";
  if (pct > 90) color = "#c62828";
  else if (pct > 75) color = "#f57f17";

  statusEl.innerHTML =
    `<span style="color:${color};font-weight:bold">${count} / ${MAX_CHARS} chars (${pct}%)</span>` +
    (lastFiltered
      ? '  <span style="color:#c62828;font-weight:bold">⚠ Last edit was BLOCKED</span>'
      : '  <span style="color:#388e3c">✓ Last edit accepted</span>');

  // Update the log panel
  logEl.textContent = logLines.join("\n");
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Create the view ─────────────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    // Try to apply the transaction. If filterTransaction rejected it,
    // state.applyTransaction returns a state identical to the current one
    // (the transaction is silently dropped).
    const oldState = this.state;
    const newState = oldState.applyTransaction(tr).state;

    // Detect whether the transaction was filtered:
    // If tr changed the doc but the state didn't change, it was blocked.
    if (tr.docChanged && oldState.doc.eq(newState.doc)) {
      lastFiltered = true;
    } else {
      lastFiltered = false;
    }

    this.updateState(newState);
    updateStatus(this);
  },
});

// Initial render
updateStatus(view);

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Type enough text to hit the 200-character limit. Watch the status
//      bar turn red and the log report "FILTER: blocked edit."
//
//   2. Create a new paragraph (press Enter) and start typing a lowercase
//      letter. Notice it auto-capitalizes. Check the log for the
//      "APPEND: auto-capitalized" message.
//
//   3. Try pasting a large block of text. The filter should block the
//      paste if it would exceed the limit.
//
//   4. Read the appendTransaction code carefully. What prevents it from
//      looping forever? (Answer: the guard that checks whether the first
//      letter is already uppercase — if so, it returns null.)
//
//   5. Challenge: add another appendTransaction plugin that enforces a
//      different invariant — e.g., every paragraph must end with a period.
//      Remember to guard against infinite loops!
