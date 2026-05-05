// 27-putting-it-together.js
// Putting It All Together: a complete "notes" editor built from scratch.
//
// NO exampleSetup — every piece is manually assembled to show how the parts
// from lessons 05–26 compose into a working editor. Each section references
// the lesson that taught it.
//
// Features:
//   - Custom schema: paragraph, heading (h1-h3), blockquote, hr, strong/em/code
//   - Keymap: Mod-b bold, Mod-i italic, Mod-` code
//   - Input rules: # /## /### for headings, > for blockquote, --- for hr
//   - History with undo/redo
//   - Word-count plugin with status bar (plugin state)
//   - Inline decorations highlighting "TODO" in red
//   - Base keymap from prosemirror-commands

import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import {
  baseKeymap,
  toggleMark,
  setBlockType,
  wrapIn,
  chainCommands,
  exitCode,
  joinUp,
  joinDown,
  lift,
  selectParentNode,
} from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";
import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  InputRule,
  undoInputRule,
} from "prosemirror-inputrules";

// ════════════════════════════════════════════════════════════════
// 1. SCHEMA — the grammar of our editor (lessons 03, 08, 09, 10)
// ════════════════════════════════════════════════════════════════
// Defines what content is allowed: which nodes, which marks, how
// they nest, and how they map to/from DOM.

const notesSchema = new Schema({
  nodes: {
    // The top-level document must contain one or more block nodes.
    doc: { content: "block+" },

    // ── Block nodes ──

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
      // Lesson 10: toDOM maps node attrs to DOM element + attributes.
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
      // Lesson 09: content expression "block+" means one or more
      // block children — blockquotes contain paragraphs, not raw text.
      toDOM() { return ["blockquote", 0]; },
      parseDOM: [{ tag: "blockquote" }],
    },

    horizontal_rule: {
      group: "block",
      // No content expression → this is a leaf node.
      toDOM() { return ["hr"]; },
      parseDOM: [{ tag: "hr" }],
    },

    // ── Inline nodes ──

    text: { group: "inline", inline: true },
  },

  marks: {
    // Lesson 08: marks are metadata on text nodes, not wrapper elements.
    strong: {
      toDOM() { return ["strong", 0]; },
      parseDOM: [
        { tag: "strong" },
        { tag: "b" },
        { style: "font-weight=bold" },
      ],
    },

    em: {
      toDOM() { return ["em", 0]; },
      parseDOM: [
        { tag: "em" },
        { tag: "i" },
        { style: "font-style=italic" },
      ],
    },

    code: {
      toDOM() { return ["code", 0]; },
      parseDOM: [{ tag: "code" }],
    },
  },
});

// ════════════════════════════════════════════════════════════════
// 2. COMMANDS & KEYMAPS (lessons 05, 06, 07)
// ════════════════════════════════════════════════════════════════
// Keymaps bind keyboard shortcuts to commands. Commands are functions
// with signature (state, dispatch?, view?) => boolean.
// ProseMirror tries keymaps in plugin order; first match wins.

// Mark toggle commands — toggleMark creates a command that adds or
// removes a mark from the current selection (lesson 08).
const toggleBold = toggleMark(notesSchema.marks.strong);
const toggleItalic = toggleMark(notesSchema.marks.em);
const toggleCode = toggleMark(notesSchema.marks.code);

// Our custom keymap layer: mark toggles + undo/redo.
// Lesson 06: keymap() returns a plugin that intercepts key events.
const notesKeymap = keymap({
  "Mod-b": toggleBold,
  "Mod-i": toggleItalic,
  "Mod-`": toggleCode,
  "Mod-z": undo,
  "Mod-Shift-z": redo,
  // Mod-y as alternative redo (common on Windows)
  "Mod-y": redo,
});

// ════════════════════════════════════════════════════════════════
// 3. INPUT RULES (lesson 18)
// ════════════════════════════════════════════════════════════════
// Input rules auto-transform typed patterns. They complement keymaps:
// keymaps match key events, input rules match text in the document.

// textblockTypeInputRule: "# ", "## ", "### " → heading level 1/2/3.
// The matched text is removed and the block type changes.
const headingRule = textblockTypeInputRule(
  /^(#{1,3})\s$/,
  notesSchema.nodes.heading,
  match => ({ level: match[1].length })
);

// wrappingInputRule: "> " at block start → wrap in blockquote.
const blockquoteRule = wrappingInputRule(
  /^\s*>\s$/,
  notesSchema.nodes.blockquote
);

// Custom InputRule: "---" at block start → replace paragraph with hr.
// This uses a function handler because we need to replace the entire
// block, not just change its type.
const horizontalRuleRule = new InputRule(
  /^---$/,
  (state, match, start, end) => {
    // `start` and `end` span the matched text "---" inside the paragraph.
    // We want to replace the entire paragraph with an hr + a new empty
    // paragraph (so the cursor has somewhere to go).
    const $start = state.doc.resolve(start);
    // Position of the paragraph node itself (one level up from text).
    const paraStart = $start.before($start.depth);
    const paraEnd = $start.after($start.depth);
    const hr = notesSchema.nodes.horizontal_rule.create();
    const emptyPara = notesSchema.nodes.paragraph.create();
    return state.tr.replaceWith(paraStart, paraEnd, [hr, emptyPara]);
  }
);

// Bundle all rules into a plugin.
const notesInputRules = inputRules({
  rules: [headingRule, blockquoteRule, horizontalRuleRule],
});

// ════════════════════════════════════════════════════════════════
// 4. WORD-COUNT PLUGIN — plugin state (lesson 13)
// ════════════════════════════════════════════════════════════════
// Demonstrates the { init, apply } pattern for tracking data across
// transactions. The word count lives *inside* the EditorState.

const wordCountKey = new PluginKey("wordCount");

function countWords(doc) {
  const text = doc.textBetween(0, doc.content.size, " ", " ");
  const words = text.split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

const wordCountPlugin = new Plugin({
  key: wordCountKey,
  state: {
    // init: called once when EditorState.create() runs.
    init(_, state) {
      return countWords(state.doc);
    },
    // apply: called on every transaction. Recount only if doc changed.
    apply(tr, value, _oldState, newState) {
      return tr.docChanged ? countWords(newState.doc) : value;
    },
  },
});

// ════════════════════════════════════════════════════════════════
// 5. TODO-HIGHLIGHT PLUGIN — decorations (lesson 16)
// ════════════════════════════════════════════════════════════════
// Inline decorations that highlight every occurrence of "TODO" in red.
// Uses the stateless pattern: recompute decorations from scratch on
// every state update. Simple and correct for a lightweight scan.

const todoHighlightPlugin = new Plugin({
  props: {
    // Lesson 16: the decorations prop returns a DecorationSet.
    // The view calls this on every state update.
    decorations(state) {
      const decos = [];
      state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        const text = node.text;
        let index = 0;
        // Find all "TODO" occurrences (case-sensitive).
        while ((index = text.indexOf("TODO", index)) !== -1) {
          decos.push(
            Decoration.inline(pos + index, pos + index + 4, {
              style: "color: #dc2626; font-weight: bold; background: #fef2f2; border-radius: 2px; padding: 0 2px;",
            })
          );
          index += 4;
        }
      });
      return DecorationSet.create(state.doc, decos);
    },
  },
});

// ════════════════════════════════════════════════════════════════
// 6. INITIAL DOCUMENT — built programmatically (lesson 04)
// ════════════════════════════════════════════════════════════════

const s = notesSchema; // shorthand

const initDoc = s.node("doc", null, [
  s.node("heading", { level: 1 }, [
    s.text("My Notes"),
  ]),
  s.node("paragraph", null, [
    s.text("This editor was built "),
    s.text("from scratch", [s.marks.strong.create()]),
    s.text(" — no "),
    s.text("exampleSetup", [s.marks.code.create()]),
    s.text(". Every feature is a manual composition of ProseMirror primitives."),
  ]),
  s.node("heading", { level: 2 }, [
    s.text("Try these features"),
  ]),
  s.node("paragraph", null, [
    s.text("Mark toggles", [s.marks.strong.create()]),
    s.text(": press "),
    s.text("Mod-b", [s.marks.code.create()]),
    s.text(" for bold, "),
    s.text("Mod-i", [s.marks.code.create()]),
    s.text(" for italic, "),
    s.text("Mod-`", [s.marks.code.create()]),
    s.text(" for inline code."),
  ]),
  s.node("paragraph", null, [
    s.text("Input rules", [s.marks.strong.create()]),
    s.text(": on an empty line, type "),
    s.text("# ", [s.marks.code.create()]),
    s.text("for h1, "),
    s.text("## ", [s.marks.code.create()]),
    s.text("for h2, "),
    s.text("> ", [s.marks.code.create()]),
    s.text("for blockquote, or "),
    s.text("---", [s.marks.code.create()]),
    s.text(" for a horizontal rule."),
  ]),
  s.node("paragraph", null, [
    s.text("History", [s.marks.strong.create()]),
    s.text(": press "),
    s.text("Mod-z", [s.marks.code.create()]),
    s.text(" to undo, "),
    s.text("Mod-Shift-z", [s.marks.code.create()]),
    s.text(" to redo."),
  ]),
  s.node("blockquote", null, [
    s.node("paragraph", null, [
      s.text("This is a blockquote. It was created by wrapping a paragraph " +
        "in a blockquote node — the same thing the "),
      s.text("> ", [s.marks.code.create()]),
      s.text("input rule does automatically."),
    ]),
  ]),
  s.node("horizontal_rule"),
  s.node("heading", { level: 3 }, [
    s.text("TODO highlights"),
  ]),
  s.node("paragraph", null, [
    s.text("The word TODO is highlighted in red wherever it appears. " +
      "This is done with inline decorations — the document content " +
      "is unchanged, only the rendering is affected. " +
      "Try typing TODO anywhere to see it light up."),
  ]),
  s.node("paragraph", null, [
    s.text("The status bar below shows the word count, updated live " +
      "via plugin state."),
  ]),
]);

// ════════════════════════════════════════════════════════════════
// 7. ASSEMBLE THE EDITOR (lesson 03)
// ════════════════════════════════════════════════════════════════
// Plugin order matters:
//   - Specific keymaps before general ones (first match wins).
//   - undoInputRule on Backspace before baseKeymap's Backspace.
//   - history() must be present for undo/redo commands to work.

const state = EditorState.create({
  doc: initDoc,
  plugins: [
    // History tracking — must be present for undo/redo (lesson 17)
    history(),

    // Input rules: auto-transform typed patterns (lesson 18)
    notesInputRules,

    // undoInputRule on Backspace: revert the last auto-replacement
    // before baseKeymap's Backspace handler runs (lesson 18)
    keymap({ Backspace: undoInputRule }),

    // Our custom shortcuts: mark toggles + undo/redo (lessons 06, 08)
    notesKeymap,

    // Base keymap: Enter, Backspace, Delete, arrow keys, select-all
    // (lesson 06). This goes last among keymaps — it's the fallback.
    keymap(baseKeymap),

    // Word count: plugin state tracking (lesson 13)
    wordCountPlugin,

    // TODO highlights: inline decorations (lesson 16)
    todoHighlightPlugin,
  ],
});

// ── Status bar ────────────────────────────────────────────────
// External UI that reads plugin state after each transaction.
// This lives outside the editor DOM — it's just a plain <div>.

const wrapper = document.querySelector("#editor");

const statusBar = document.createElement("div");
statusBar.style.cssText =
  "display:flex;gap:16px;align-items:center;padding:8px 12px;" +
  "background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;" +
  "font-family:system-ui,sans-serif;font-size:13px;color:#475569;" +
  "margin-top:8px;";

const wordCountEl = document.createElement("span");
const charCountEl = document.createElement("span");
statusBar.appendChild(wordCountEl);
statusBar.appendChild(charCountEl);

function updateStatusBar(editorState) {
  const words = wordCountKey.getState(editorState);
  const chars = editorState.doc.textContent.length;
  wordCountEl.textContent = `Words: ${words}`;
  charCountEl.textContent = `Characters: ${chars}`;
}

// ── Create the view ───────────────────────────────────────────
// dispatchTransaction is the heart of the data flow:
//   transaction → apply → new state → update view → update UI

const editorMount = document.createElement("div");
wrapper.appendChild(editorMount);
wrapper.appendChild(statusBar);

const view = new EditorView(editorMount, {
  state,
  // Lesson 03: every transaction flows through here.
  // This is where the data cycle completes.
  dispatchTransaction(tr) {
    // 1. Apply the transaction to produce a new immutable state.
    const newState = this.state.apply(tr);
    // 2. Tell the view to re-render with the new state.
    this.updateState(newState);
    // 3. Update external UI that depends on editor state.
    updateStatusBar(newState);
  },
});

// Initial status bar render
updateStatusBar(view.state);

// Focus the editor
view.focus();

// ════════════════════════════════════════════════════════════════
// Exercises:
//   1. Select some text and press Mod-b to toggle bold. Then
//      press Mod-z to undo. The full cycle runs twice: once for
//      the bold toggle, once for the undo.
//
//   2. On an empty line, type "## " (two hashes + space). The
//      paragraph becomes an h2. Press Backspace immediately to
//      undo the input rule conversion.
//
//   3. On an empty line, type "---". It becomes a horizontal rule.
//      This is a custom InputRule with a function handler.
//
//   4. Type "TODO" anywhere and watch the red highlight appear.
//      This is a stateless decoration — recomputed every update.
//
//   5. Watch the word count update as you type. The count lives
//      in plugin state, accessed via wordCountKey.getState().
//
//   6. Challenge: add a "paragraph count" to the status bar.
//      Create a new PluginKey and Plugin with state: { init, apply }.
//
//   7. Challenge: add a "reading time" estimate to the status bar
//      (assume 200 words per minute). You can derive it from the
//      word count without a separate plugin.
