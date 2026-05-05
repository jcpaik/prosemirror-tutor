// 08-marks.js
// Marks In Depth: bold, italic, code, and link marks with a debug panel
// showing stored marks and marks at the current cursor position.
//
// Demonstrates:
//   - Schema with strong, em, code (excludes: "_"), and link (with href attr)
//   - Keyboard shortcuts bound to toggleMark
//   - A button that prompts for a URL and applies a link mark
//   - A debug panel showing storedMarks and active marks at the cursor

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema: four marks with different behaviors ────────────
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
    text: { group: "inline", inline: true },
  },
  marks: {
    // ── strong: standard bold mark ──
    strong: {
      toDOM() { return ["strong", 0]; },
      parseDOM: [{ tag: "strong" }, { tag: "b" }],
    },

    // ── em: standard italic mark ──
    em: {
      toDOM() { return ["em", 0]; },
      parseDOM: [{ tag: "em" }, { tag: "i" }],
    },

    // ── code: excludes ALL other marks ──
    // When you apply code to bold text, bold is stripped.
    // When text is code-marked, you can't add bold or italic to it.
    code: {
      excludes: "_",  // "_" is the wildcard — excludes every other mark
      toDOM() { return ["code", 0]; },
      parseDOM: [{ tag: "code" }],
    },

    // ── link: has an href attribute, inclusive: false ──
    // inclusive: false means typing at the end of a link does NOT extend it.
    // This is the standard behavior for links — you don't want every
    // character typed after a link to become part of the link.
    link: {
      attrs: { href: { default: "" } },
      inclusive: false,
      toDOM(mark) {
        return ["a", {
          href: mark.attrs.href,
          title: mark.attrs.href,
          style: "color: #1a73e8; text-decoration: underline;",
        }, 0];
      },
      parseDOM: [{
        tag: "a[href]",
        getAttrs(dom) {
          return { href: dom.getAttribute("href") };
        },
      }],
    },
  },
});

// ── Build initial document with various marks ──────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("heading", { level: 2 }, [
    mySchema.text("Marks In Depth"),
  ]),

  mySchema.node("paragraph", null, [
    mySchema.text("This is "),
    mySchema.text("bold", [mySchema.marks.strong.create()]),
    mySchema.text(", "),
    mySchema.text("italic", [mySchema.marks.em.create()]),
    mySchema.text(", and "),
    mySchema.text("bold italic", [
      mySchema.marks.strong.create(),
      mySchema.marks.em.create(),
    ]),
    mySchema.text(" text. Try toggling with Mod-b, Mod-i, Mod-`."),
  ]),

  mySchema.node("paragraph", null, [
    mySchema.text("This is "),
    mySchema.text("inline code", [mySchema.marks.code.create()]),
    mySchema.text(" — select it and try Mod-b. Nothing happens because "),
    mySchema.text("code", [mySchema.marks.code.create()]),
    mySchema.text(" excludes all other marks."),
  ]),

  mySchema.node("paragraph", null, [
    mySchema.text("Here is a "),
    mySchema.text("link to example.com", [
      mySchema.marks.link.create({ href: "https://example.com" }),
    ]),
    mySchema.text(". Place cursor right after the link and type — "),
    mySchema.text("the link does not extend (inclusive: false)."),
  ]),

  mySchema.node("paragraph", null, [
    mySchema.text("Place cursor in plain text, press Mod-b (don't type yet), "),
    mySchema.text("then check the debug panel for storedMarks."),
  ]),
]);

// ── Create editor state with toggleMark keybindings ────────
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),

    // Mark toggle shortcuts
    keymap({
      "Mod-b": toggleMark(mySchema.marks.strong),
      "Mod-i": toggleMark(mySchema.marks.em),
      "Mod-`": toggleMark(mySchema.marks.code),
    }),

    keymap(baseKeymap),
  ],
});

// ── "Add Link" button ──────────────────────────────────────
const btnContainer = document.createElement("div");
btnContainer.style.cssText = "margin:8px 0;";

const linkBtn = document.createElement("button");
linkBtn.textContent = "Add Link";
linkBtn.style.cssText =
  "padding:4px 12px;font-size:13px;cursor:pointer;" +
  "border:1px solid #aaa;border-radius:4px;background:#f8f8f8;";
btnContainer.appendChild(linkBtn);

// Keyboard shortcut hint
const hint = document.createElement("span");
hint.style.cssText = "margin-left:12px;font-size:12px;color:#666;";
hint.textContent = "Shortcuts: Mod-b (bold)  Mod-i (italic)  Mod-` (code)";
btnContainer.appendChild(hint);

document.querySelector("#editor").parentNode.insertBefore(
  btnContainer, document.querySelector("#editor"),
);

// ── Debug panel showing marks at cursor and storedMarks ────
const debugEl = document.createElement("pre");
debugEl.style.cssText =
  "margin:12px 0;padding:12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:12px;max-height:350px;overflow:auto;line-height:1.5;" +
  "white-space:pre-wrap;word-break:break-word;";
document.querySelector("#editor").parentNode.appendChild(debugEl);

function updateDebug(view) {
  const { doc, selection, storedMarks } = view.state;
  const { from, to } = selection;
  const lines = [];

  // ── 1. Stored marks ──
  // storedMarks is non-null only when the user has explicitly toggled
  // a mark with a collapsed cursor. It shows what marks will apply to
  // the next typed character.
  lines.push("═══ STORED MARKS ═══");
  if (storedMarks) {
    if (storedMarks.length === 0) {
      lines.push("  [] (explicitly empty — next char gets no marks)");
    } else {
      const names = storedMarks.map(m => {
        const attrs = Object.keys(m.attrs).length
          ? ` ${JSON.stringify(m.attrs)}` : "";
        return `${m.type.name}${attrs}`;
      });
      lines.push(`  [${names.join(", ")}]`);
    }
  } else {
    lines.push("  null (inheriting marks from surrounding text)");
  }

  // ── 2. Marks at cursor position ──
  // When the cursor is collapsed, $from.marks() tells us which marks
  // the text around the cursor carries. This is what gets inherited
  // when storedMarks is null.
  lines.push("\n═══ MARKS AT CURSOR ═══");
  const $from = doc.resolve(from);
  const marksAtCursor = $from.marks();
  if (marksAtCursor.length === 0) {
    lines.push("  (none)");
  } else {
    marksAtCursor.forEach(m => {
      const attrs = Object.keys(m.attrs).length
        ? ` ${JSON.stringify(m.attrs)}` : "";
      lines.push(`  • ${m.type.name}${attrs}`);
    });
  }

  // ── 3. Marks in selection (when text is selected) ──
  if (from !== to) {
    lines.push(`\n═══ MARKS IN SELECTION (${from}–${to}) ═══`);
    // Collect all unique marks across the selection
    const markSet = new Map();
    doc.nodesBetween(from, to, (node) => {
      if (node.isText) {
        node.marks.forEach(m => {
          const key = m.type.name + JSON.stringify(m.attrs);
          if (!markSet.has(key)) {
            markSet.set(key, m);
          }
        });
      }
    });
    if (markSet.size === 0) {
      lines.push("  (no marks in selection)");
    } else {
      for (const [, m] of markSet) {
        const attrs = Object.keys(m.attrs).length
          ? ` ${JSON.stringify(m.attrs)}` : "";
        lines.push(`  • ${m.type.name}${attrs}`);
      }
    }
  }

  // ── 4. Exclusion demo ──
  // Show which marks the code mark excludes
  lines.push("\n═══ MARK EXCLUSION INFO ═══");
  const codeMark = mySchema.marks.code;
  lines.push(`  code.spec.excludes = "${codeMark.spec.excludes}"`);
  lines.push("  → code cannot coexist with any other mark");
  const linkMark = mySchema.marks.link;
  lines.push(`  link.spec.inclusive = ${linkMark.spec.inclusive}`);
  lines.push("  → typing at link boundary does not extend the link");

  // ── 5. Inline content of current block ──
  lines.push(`\n═══ INLINE CONTENT OF CURRENT BLOCK ═══`);
  const parent = $from.parent;
  if (parent.inlineContent) {
    parent.forEach((child, offset) => {
      if (child.isText) {
        const marks = child.marks.map(m => m.type.name).join(", ");
        const markStr = marks ? ` [${marks}]` : "";
        lines.push(`  "${child.text}"${markStr}`);
      }
    });
  } else {
    lines.push("  (parent is not an inline-content node)");
  }

  debugEl.textContent = lines.join("\n");
}

// ── Create the editor view ─────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
    updateDebug(this);
  },
});

// ── Link button handler ────────────────────────────────────
// Prompts for a URL and applies (or removes) the link mark.
linkBtn.addEventListener("click", () => {
  const { state } = view;
  const { from, to } = state.selection;

  // Check if the selection already has a link
  const hasLink = state.doc.rangeHasMark(from, to, mySchema.marks.link);

  if (hasLink) {
    // Remove the link mark from the selection
    const tr = state.tr.removeMark(from, to, mySchema.marks.link);
    view.dispatch(tr);
  } else {
    // Prompt for URL and apply the link mark
    const href = prompt("Enter URL:", "https://");
    if (href) {
      const mark = mySchema.marks.link.create({ href });
      const tr = state.tr.addMark(from, to, mark);
      view.dispatch(tr);
    }
  }
  view.focus();
});

// Initial debug panel render
updateDebug(view);

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Select some plain text and press Mod-b to bold it.
//      Then press Mod-i to also italicize. Check the debug panel —
//      you should see both [strong, em] on that text.
//
//   2. Select the bold-italic text and press Mod-`. Notice how
//      bold and italic are stripped — code excludes all other marks.
//      Now try Mod-b on code text: nothing happens.
//
//   3. Place cursor (no selection) in plain text. Press Mod-b.
//      DON'T TYPE YET. Look at the debug panel — storedMarks should
//      show [strong]. Now type a character: it appears bold.
//      Press Mod-b again to cancel the stored mark.
//
//   4. Click right at the END of the link text, then type. The new
//      characters should NOT be linked — that's inclusive: false.
//      Now try the same at the end of bold text — it stays bold
//      because strong has inclusive: true (the default).
//
//   5. Select text and click "Add Link" to apply a link mark.
//      Select linked text and click "Add Link" again to remove it.
