# 21 - Transforms and Steps

## Start inside a transaction

In the main loop, commands do not mutate the document. They build a transaction:

```text
command -> tr.insertText/delete/addMark -> steps -> state.apply(tr)
```

This lesson opens that transaction and looks at the machinery inside it. The
matching example is `examples/21-transforms-steps.js`.

## Transform is the step builder

Documents are immutable. A `Transform` starts with a document and accumulates
steps that produce later documents.

```js
import { Transform } from "prosemirror-transform";

const tr = new Transform(doc);
tr.delete(5, 7);
tr.insert(5, schema.text("hi"));

console.log(tr.doc);     // document after both steps
console.log(tr.steps);   // Step objects
console.log(tr.docs);    // documents before each step
console.log(tr.mapping); // maps positions through all steps
```

Most code uses `state.tr`, not `new Transform(doc)`. A transaction is a
`Transform` with editor-state behavior added: selection tracking, metadata,
time, and `scrollIntoView`.

## Steps are the atomic document changes

Transform helper methods create step objects for you. The built-in step classes
cover the common document edits:

| Step | What it represents |
| --- | --- |
| `ReplaceStep` | Insert, delete, or replace content with a slice |
| `ReplaceAroundStep` | Wrap or unwrap content around a preserved gap |
| `AddMarkStep` | Add a mark over inline content |
| `RemoveMarkStep` | Remove a mark over inline content |

Typing a character is usually a `ReplaceStep`. Splitting a paragraph is also a
replace-shaped change. Toggling bold produces mark steps.

## Applying a step

A step can be applied directly, though commands normally let the transaction do
this.

```js
const result = step.apply(doc);

if (result.failed) {
  console.log(result.failed);
} else {
  console.log(result.doc);
}
```

Steps are schema-aware. If the result would violate the schema, the result
fails instead of producing an invalid document.

## Undo and collaboration need step details

Each step can describe its inverse. The inverse needs the document from before
the step because deleted content must be known in order to restore it.

```js
const inverse = step.invert(docBefore);
const restored = inverse.apply(docAfter).doc;
```

Each step can also become JSON and come back from JSON:

```js
import { Step } from "prosemirror-transform";

const json = step.toJSON();
const restored = Step.fromJSON(schema, json);
```

Those two abilities explain why steps matter outside this lesson:

- History stores enough information to invert edits.
- Collaboration sends steps over the network.
- Plugins can inspect `tr.steps` to understand what happened.

## Transaction equals transform plus editor context

When you write a command, this is the usual pattern:

```js
function insertHello(state, dispatch) {
  if (!dispatch) return true;
  dispatch(state.tr.insertText("hello"));
  return true;
}
```

The transaction accumulates steps and maps the selection as those steps are
added. Then `state.apply(tr)` produces the next immutable `EditorState`.

You can inspect the transaction before applying it:

```js
if (tr.docChanged) {
  tr.steps.forEach(step => console.log(step.toJSON()));
}
```

## Where this sits in the loop

```text
Command/input rule/plugin
  calls transaction helpers

Transaction
  stores steps, docs, mapping, selection, metadata

EditorState.apply
  validates and produces the next state
```

Transforms and steps are not usually the API you start with. They are the lower
level explanation for why undo, mapping, and collaboration can work.

## Takeaways

- A transaction is a transform with editor-state context.
- A transform is a sequence of steps applied to an immutable document.
- Steps can apply, fail, invert, map positions, and serialize.
- If you understand steps, history and collaboration stop feeling magical.
