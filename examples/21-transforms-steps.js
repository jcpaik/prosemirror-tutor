// 21-transforms-steps.js
// Transforms and Steps: the low-level machinery behind every document change.
//
// This example demonstrates:
//   - Creating a Transform directly (not via state.tr)
//   - Logging each step as JSON
//   - Inverting steps to restore the original document
//   - Inspecting tr.steps after an editor edit

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { Transform, Step } from "prosemirror-transform";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema ─────────────────────────────────────────────────
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

// ── Build the initial document ─────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("heading", { level: 2 }, [
    mySchema.text("Transforms & Steps"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Edit this text to see steps in the log below."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Each keystroke creates a ReplaceStep."),
  ]),
]);

// ── Info panel ─────────────────────────────────────────────
const panelEl = document.createElement("pre");
panelEl.style.cssText =
  "margin:12px 0;padding:12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:12px;max-height:500px;overflow:auto;line-height:1.5;" +
  "white-space:pre-wrap;word-break:break-word;";
document.querySelector("#editor").parentNode.appendChild(panelEl);

// Helper: append a section to the panel
function logSection(title, lines) {
  panelEl.textContent += `\n═══ ${title} ═══\n` + lines.join("\n") + "\n";
}

// ────────────────────────────────────────────────────────────
// DEMO 1: Create a Transform directly (not via state.tr)
// ────────────────────────────────────────────────────────────
// A Transform wraps a document and accumulates Step objects.
// Here we use Transform helper methods, then inspect the steps.

const tr1 = new Transform(initDoc);

// Delete " & Steps" from the heading.
// Heading opens at pos 0, content starts at pos 1.
// "Transforms" = pos 1..10 (10 chars), " " = 11, "& Steps" = 12..18.
// So " & Steps" spans positions 11..19 (exclusive end).
tr1.delete(11, 19);

// Insert " Demo" at the end of the (now shorter) heading text.
// After deletion, heading content runs from pos 1..10 = "Transforms".
// Position 11 is right after the "s" in "Transforms".
// Note: insertText is only on Transaction, so we use insert() with a text node.
tr1.insert(11, mySchema.text(" Demo"));

const lines1 = [];
lines1.push(`Steps accumulated: ${tr1.steps.length}`);
tr1.steps.forEach((step, i) => {
  lines1.push(`  Step ${i}: ${JSON.stringify(step.toJSON())}`);
});
lines1.push(`\nOriginal heading: "${initDoc.child(0).textContent}"`);
lines1.push(`After transform:  "${tr1.doc.child(0).textContent}"`);
logSection("DEMO 1: Transform with multiple steps", lines1);

// ────────────────────────────────────────────────────────────
// DEMO 2: Step inversion — undo a step manually
// ────────────────────────────────────────────────────────────
// We take the first step from the transform above, apply it,
// then apply its inverse to get back to the original.

const step = tr1.steps[0]; // the delete step
const afterStep = step.apply(initDoc);
const inverse = step.invert(initDoc); // needs the doc BEFORE the step
const restored = inverse.apply(afterStep.doc);

const lines2 = [];
lines2.push(`Original doc heading:  "${initDoc.child(0).textContent}"`);
lines2.push(`After step (delete):   "${afterStep.doc.child(0).textContent}"`);
lines2.push(`After inverse (undo):  "${restored.doc.child(0).textContent}"`);
lines2.push(`\nStep JSON:    ${JSON.stringify(step.toJSON())}`);
lines2.push(`Inverse JSON: ${JSON.stringify(inverse.toJSON())}`);
lines2.push(`\nDocs match after inversion: ${initDoc.eq(restored.doc)}`);
logSection("DEMO 2: Step inversion (manual undo)", lines2);

// ────────────────────────────────────────────────────────────
// DEMO 3: AddMarkStep via Transform.addMark
// ────────────────────────────────────────────────────────────
// Apply bold to the word "Edit" in the second paragraph.
// Second paragraph opens at pos 20 (after heading).
// Let's find the right positions dynamically.

let editFrom = -1, editTo = -1;
initDoc.descendants((node, pos) => {
  if (node.isText && node.text.startsWith("Edit")) {
    editFrom = pos;
    editTo = pos + 4; // "Edit" is 4 characters
  }
});

if (editFrom >= 0) {
  const tr2 = new Transform(initDoc);
  tr2.addMark(editFrom, editTo, mySchema.marks.strong.create());

  const lines3 = [];
  lines3.push(`Steps: ${tr2.steps.length}`);
  tr2.steps.forEach((step, i) => {
    lines3.push(`  Step ${i}: ${JSON.stringify(step.toJSON())}`);
  });
  lines3.push(`\nStep type name: ${tr2.steps[0].toJSON().stepType}`);
  logSection("DEMO 3: AddMarkStep (bold on 'Edit')", lines3);
}

// ────────────────────────────────────────────────────────────
// DEMO 4: Step serialization round-trip
// ────────────────────────────────────────────────────────────
const json = step.toJSON();
const fromJson = Step.fromJSON(mySchema, json);
const result2 = fromJson.apply(initDoc);

const lines4 = [];
lines4.push(`Serialized step: ${JSON.stringify(json, null, 2)}`);
lines4.push(`\nDeserialized and applied successfully: ${!result2.failed}`);
lines4.push(`Result matches original apply: ${afterStep.doc.eq(result2.doc)}`);
logSection("DEMO 4: Step serialization round-trip", lines4);

// ────────────────────────────────────────────────────────────
// DEMO 5: Live editor — inspect tr.steps on every edit
// ────────────────────────────────────────────────────────────
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
  ],
});

// Separator before live log
const liveHeader = document.createElement("h4");
liveHeader.textContent = "Live transaction log (type in the editor above):";
liveHeader.style.cssText = "margin:16px 0 4px;";
document.querySelector("#editor").parentNode.appendChild(liveHeader);

const liveLogEl = document.createElement("pre");
liveLogEl.style.cssText =
  "margin:0 0 12px;padding:12px;background:#fffff0;border:1px solid #e0d890;" +
  "font-size:12px;max-height:250px;overflow:auto;line-height:1.5;" +
  "white-space:pre-wrap;word-break:break-word;";
document.querySelector("#editor").parentNode.appendChild(liveLogEl);

let txCount = 0;

const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    txCount++;

    if (tr.steps.length > 0) {
      const lines = [`── Transaction #${txCount} (${tr.steps.length} step${tr.steps.length > 1 ? "s" : ""}) ──`];
      tr.steps.forEach((step, i) => {
        const json = step.toJSON();
        lines.push(`  [${i}] ${json.stepType}: ${JSON.stringify(json)}`);
      });
      lines.push(`  docChanged: ${tr.docChanged}`);
      liveLogEl.textContent = lines.join("\n") + "\n\n" + liveLogEl.textContent;
    }

    // Apply the transaction as usual
    const newState = this.state.apply(tr);
    this.updateState(newState);
  },
});

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Type a character in the editor — the live log shows a ReplaceStep with
//      the inserted text in its slice. Note the from/to positions.
//
//   2. Select a word and press Mod-b (if you add toggleMark) or look at
//      DEMO 3 above — the step type changes to "addMark".
//
//   3. Press Enter to split a paragraph. The ReplaceStep's slice will have
//      openStart and openEnd of 1, representing the paragraph split.
//
//   4. Look at DEMO 2's inversion output. Try adding more steps to tr1 and
//      verify that inverting them all (in reverse order) restores the original.
//
//   5. Copy a step's JSON from the log, paste it into Step.fromJSON(schema, json)
//      in the console, and apply it to a document — this is how collab works.
