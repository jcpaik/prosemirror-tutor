// 14-plugin-props.js
// Plugin Props and View Lifecycle: event handlers, editable control,
// and the view callback for side effects.
//
// This example demonstrates three plugins:
//   1. A handleDoubleClick plugin that logs info about the double-clicked node.
//   2. An editable plugin that locks the editor when content exceeds 100 chars.
//   3. A view-lifecycle plugin that shows a live character count and cleans up
//      on destroy.
//
// A log panel at the bottom shows events as they happen.

import { EditorState, Plugin } from "prosemirror-state";
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
      attrs: { level: { default: 2 } },
      toDOM(node) { return ["h" + node.attrs.level, 0]; },
      parseDOM: [
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

// ── Log panel ──────────────────────────────────────────────────
// A simple <pre> element that collects log messages for visibility.

const logEl = document.createElement("pre");
logEl.style.cssText =
  "margin:12px 0;padding:12px;background:#1a1a2e;color:#e0e0e0;" +
  "font-size:12px;max-height:200px;overflow:auto;line-height:1.5;" +
  "white-space:pre-wrap;word-break:break-word;border:1px solid #333;";

function log(msg) {
  const time = new Date().toLocaleTimeString();
  logEl.textContent += `[${time}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight; // auto-scroll to bottom
}

// ── Plugin 1: handleDoubleClick ────────────────────────────────
// Logs information about whatever node you double-click on.
// Returns false so the default double-click behavior (word select) still runs.

const doubleClickPlugin = new Plugin({
  props: {
    handleDoubleClick(view, pos, event) {
      // nodeAt returns the node directly at this position, if any.
      const node = view.state.doc.nodeAt(pos);
      if (node) {
        const marks = node.marks.map(m => m.type.name);
        const markStr = marks.length ? ` [marks: ${marks.join(", ")}]` : "";
        if (node.isText) {
          log(`Double-click on text "${node.text}"${markStr} at pos ${pos}`);
        } else {
          log(`Double-click on <${node.type.name}> (size ${node.nodeSize}) at pos ${pos}`);
        }
      } else {
        // pos might be between nodes (e.g., at the very start of a block)
        const $pos = view.state.doc.resolve(pos);
        log(`Double-click at pos ${pos} inside <${$pos.parent.type.name}> (depth ${$pos.depth})`);
      }
      return false; // let default word-selection happen
    },
  },
});

// ── Plugin 2: editable based on character count ────────────────
// When the document's text exceeds 100 characters, the editor becomes
// read-only. The status indicator (created by Plugin 3) will reflect this.

const MAX_CHARS = 100;

const editablePlugin = new Plugin({
  props: {
    editable(state) {
      const charCount = state.doc.textContent.length;
      return charCount < MAX_CHARS;
    },
  },
});

// ── Plugin 3: view lifecycle — character counter ───────────────
// Uses the `view` callback to create a status bar above the log.
// The `update` method refreshes the count on every state change.
// The `destroy` method removes the DOM element when the view is torn down.

const charCountPlugin = new Plugin({
  view(editorView) {
    // ── Setup: create the status bar DOM element ──
    const statusBar = document.createElement("div");
    statusBar.style.cssText =
      "margin:8px 0;padding:8px 12px;background:#f0f4f8;" +
      "border:1px solid #c0d0e0;font-size:13px;font-family:monospace;" +
      "display:flex;justify-content:space-between;";

    const countSpan = document.createElement("span");
    const editableSpan = document.createElement("span");
    statusBar.appendChild(countSpan);
    statusBar.appendChild(editableSpan);

    // Insert the status bar right after the editor
    editorView.dom.parentNode.appendChild(statusBar);

    log("charCountPlugin: view created, status bar added to DOM");

    // ── Refresh helper ──
    function refresh(state) {
      const charCount = state.doc.textContent.length;
      countSpan.textContent = `Characters: ${charCount} / ${MAX_CHARS}`;

      const isEditable = charCount < MAX_CHARS;
      editableSpan.textContent = isEditable ? "Editable" : "Read-only (limit reached)";
      editableSpan.style.color = isEditable ? "#2a7d2a" : "#c0392b";
      editableSpan.style.fontWeight = "bold";
    }

    // Initial render
    refresh(editorView.state);

    return {
      update(view, prevState) {
        // Only re-render when the document actually changed.
        // This avoids unnecessary DOM writes on selection-only changes.
        if (view.state.doc !== prevState.doc) {
          const charCount = view.state.doc.textContent.length;
          const prevCount = prevState.doc.textContent.length;
          log(`charCountPlugin: doc changed (${prevCount} -> ${charCount} chars)`);
          refresh(view.state);
        }
      },

      destroy() {
        // Clean up: remove the status bar from the DOM.
        statusBar.remove();
        log("charCountPlugin: view destroyed, status bar removed");
      },
    };
  },
});

// ── Initial document ───────────────────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("heading", { level: 2 }, [
    mySchema.text("Plugin Props Demo"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Double-click any word to see info in the log. "),
    mySchema.text("Type text", [mySchema.marks.strong.create()]),
    mySchema.text(" until you hit the 100-character limit."),
  ]),
  mySchema.node("blockquote", null, [
    mySchema.node("paragraph", null, [
      mySchema.text("Try double-clicking inside this blockquote."),
    ]),
  ]),
]);

// ── Editor state and view ──────────────────────────────────────
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
    // Our three custom plugins:
    doubleClickPlugin,   // logs double-click info
    editablePlugin,      // locks editor at 100 chars
    charCountPlugin,     // live character count display
  ],
});

const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
    // dispatchTransaction is itself a "prop" on the view, but it's special:
    // it controls the entire state update cycle. Plugins cannot override it.
  },
});

// Append the log panel after the editor and status bar
view.dom.parentNode.appendChild(logEl);

// Initial log message
log("Editor ready. Plugins active: doubleClickPlugin, editablePlugin, charCountPlugin");
log(`Current character count: ${view.state.doc.textContent.length} / ${MAX_CHARS}`);

// ────────────────────────────────────────────────────────────────
// Exercises:
//
//   1. Double-click on different words. Notice the log shows the text node
//      content and any marks (bold, italic) on that node.
//
//   2. Type enough text to exceed 100 characters. Watch the status bar
//      change to "Read-only" and notice you can no longer type. Use
//      Ctrl/Cmd-Z to undo and get back below the limit.
//
//   3. Double-click inside the blockquote. Notice the resolved position
//      shows a higher depth.
//
//   4. Look at the charCountPlugin's view callback. The `update` method
//      checks `view.state.doc !== prevState.doc` — this is a cheap
//      reference comparison that avoids re-rendering when only the
//      selection changed.
//
//   5. Challenge: add a handlePaste prop to doubleClickPlugin that logs
//      the number of top-level nodes being pasted. Remember to return
//      false so the paste still goes through.
