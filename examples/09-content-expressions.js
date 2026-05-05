// 09-content-expressions.js
// Content Expressions: how schemas enforce document structure.
//
// This example builds a "recipe" editor with a rigid schema:
//   doc = title, then ingredients section, then steps section.
// Each section has its own content rules. Try deleting a section --
// ProseMirror will recreate it to keep the document valid.
//
// A panel below the editor shows the content expression for each node type.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Recipe Schema ──────────────────────────────────────────
// The doc node requires exactly: title, then ingredients, then steps.
// This rigid structure is enforced by content expressions.
const recipeSchema = new Schema({
  nodes: {
    // The root: a fixed sequence of three sections, in order.
    doc: { content: "title ingredients steps" },

    // Title section: contains zero or more text nodes (can be empty).
    title: {
      content: "text*",
      toDOM() {
        return ["h1", { class: "recipe-title" }, 0];
      },
      parseDOM: [{ tag: "h1.recipe-title" }],
    },

    // Ingredients section: must contain one or more ingredient nodes.
    // The "+" means you can never delete the last ingredient.
    ingredients: {
      content: "ingredient+",
      toDOM() {
        return [
          "div",
          { class: "recipe-section ingredients" },
          ["h2", "Ingredients"],
          ["ul", 0],
        ];
      },
      parseDOM: [{ tag: "div.ingredients" }],
    },

    // A single ingredient item. Contains text.
    ingredient: {
      content: "text*",
      toDOM() {
        return ["li", { class: "ingredient" }, 0];
      },
      parseDOM: [{ tag: "li.ingredient" }],
    },

    // Steps section: must contain one or more step nodes.
    steps: {
      content: "step+",
      toDOM() {
        return [
          "div",
          { class: "recipe-section steps" },
          ["h2", "Steps"],
          ["ol", 0],
        ];
      },
      parseDOM: [{ tag: "div.steps" }],
    },

    // A single step. Contains text.
    step: {
      content: "text*",
      toDOM() {
        return ["li", { class: "step" }, 0];
      },
      parseDOM: [{ tag: "li.step" }],
    },

    // Text node -- every schema needs one.
    text: { inline: true },
  },
});

// ── Build the initial recipe document ──────────────────────
const initDoc = recipeSchema.node("doc", null, [
  // Title: exactly one, required by doc's content expression
  recipeSchema.node("title", null, [
    recipeSchema.text("Chocolate Chip Cookies"),
  ]),

  // Ingredients section: one or more ingredients ("+")
  recipeSchema.node("ingredients", null, [
    recipeSchema.node("ingredient", null, [
      recipeSchema.text("2 cups flour"),
    ]),
    recipeSchema.node("ingredient", null, [
      recipeSchema.text("1 cup butter"),
    ]),
    recipeSchema.node("ingredient", null, [
      recipeSchema.text("1 cup chocolate chips"),
    ]),
  ]),

  // Steps section: one or more steps ("+")
  recipeSchema.node("steps", null, [
    recipeSchema.node("step", null, [
      recipeSchema.text("Mix dry ingredients together."),
    ]),
    recipeSchema.node("step", null, [
      recipeSchema.text("Cream butter and sugar, then add to dry mix."),
    ]),
    recipeSchema.node("step", null, [
      recipeSchema.text("Fold in chocolate chips and bake at 350F for 12 min."),
    ]),
  ]),
]);

// ── Editor state with undo/redo and basic keys ─────────────
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
  ],
});

// ── Inject some CSS for the recipe sections ────────────────
const style = document.createElement("style");
style.textContent = `
  .recipe-title {
    font-size: 1.4em;
    color: #333;
    border-bottom: 2px solid #e0c080;
    padding-bottom: 4px;
    margin-bottom: 12px;
  }
  .recipe-section {
    margin: 8px 0;
    padding: 8px;
    border-left: 3px solid #c0d0e0;
    background: #f8fafc;
  }
  .recipe-section h2 {
    font-size: 1em;
    color: #666;
    margin: 0 0 6px 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .recipe-section ul, .recipe-section ol {
    margin: 0;
    padding-left: 20px;
  }
  .recipe-section li {
    margin: 2px 0;
  }
  .ingredients { border-left-color: #80c080; }
  .steps { border-left-color: #8080c0; }
`;
document.head.appendChild(style);

// ── Info panel: display content expressions ────────────────
const infoEl = document.createElement("pre");
infoEl.style.cssText =
  "margin:12px 0;padding:12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:12px;max-height:300px;overflow:auto;line-height:1.6;" +
  "white-space:pre-wrap;word-break:break-word;";

function buildInfoText(schema) {
  const lines = [];
  lines.push("=== CONTENT EXPRESSIONS FOR EACH NODE TYPE ===\n");

  // Iterate over all node types in the schema and display their content expr
  for (const name in schema.nodes) {
    const nodeType = schema.nodes[name];
    // nodeType.spec.content holds the raw content expression string
    const expr = nodeType.spec.content || "(leaf node)";
    const group = nodeType.spec.group || "(none)";
    lines.push(`  ${name}`);
    lines.push(`    content: "${expr}"`);
    lines.push(`    group:   ${group}`);
    lines.push("");
  }

  lines.push("=== HOW ENFORCEMENT WORKS ===\n");
  lines.push("  Try these experiments:");
  lines.push("  1. Select all (Cmd/Ctrl+A) and delete. The doc rebuilds with");
  lines.push("     empty title, one ingredient, and one step -- the minimum");
  lines.push("     valid document per the content expressions.");
  lines.push("");
  lines.push("  2. Delete all text in an ingredient, then backspace to try");
  lines.push("     removing the ingredient node. If it's the last one, it");
  lines.push("     stays -- ingredients requires ingredient+ (at least one).");
  lines.push("");
  lines.push("  3. Try typing in the title. The title allows text* so it can");
  lines.push("     be empty or have text, but it always remains in the doc.");

  return lines.join("\n");
}

document.querySelector("#editor").parentNode.appendChild(infoEl);
infoEl.textContent = buildInfoText(recipeSchema);

// ── Create the view ────────────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
  },
});

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Select all (Cmd/Ctrl+A) and delete. Watch the editor rebuild the
//      minimum valid document: an empty title, one empty ingredient, and
//      one empty step. This is the content expressions in action.
//
//   2. Try to delete the last ingredient by selecting it and pressing
//      backspace. The schema requires "ingredient+" (at least one), so
//      ProseMirror keeps a placeholder.
//
//   3. Modify the schema: change ingredients content to "ingredient*"
//      (zero or more). Now you CAN delete all ingredients. Compare the
//      behavior with "ingredient+" vs "ingredient*".
//
//   4. Add a new node type "note" with content "text*" and add it to
//      the doc content expression as an optional section:
//        doc: { content: "title ingredients steps note?" }
//      The "?" means the note section is optional -- it can appear or not.
//
//   5. Try building an invalid document programmatically (e.g., a doc
//      with only a title). Observe the RangeError ProseMirror throws.
