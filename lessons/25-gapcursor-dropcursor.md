# 25 - Gap Cursor and Drop Cursor

## Start with view affordances

Some editor problems are not new document types or new commands. They are
interaction affordances around positions that are hard for the user to see or
reach.

```text
arrow/click/drag event -> view plugin -> selection or visual indicator
```

The matching example is `examples/25-gapcursor-dropcursor.js`.

## The gap cursor makes awkward positions reachable

A normal `TextSelection` must live in text. A `NodeSelection` selects a whole
node. Neither says, "put the cursor between these two block nodes that have no
text between them."

`prosemirror-gapcursor` adds a `GapCursor` selection plus a plugin that creates
that selection from clicks and arrow keys.

```js
import { gapCursor } from "prosemirror-gapcursor";

const state = EditorState.create({
  schema,
  plugins: [
    gapCursor(),
    keymap(baseKeymap),
  ],
});
```

Typical places that need it:

- Between adjacent horizontal rules.
- Before or after leaf block nodes.
- Around block nodes where no text cursor position exists.

When the gap cursor is active and the user types, ProseMirror can create a
textblock at that position and continue with a normal text selection.

## The gap cursor is still a selection

`GapCursor` extends ProseMirror's `Selection`. It has `from` and `to` at the
same position, like a cursor.

```js
const typeName = state.selection.constructor.name;

if (typeName === "GapCursor") {
  console.log(state.selection.from);
}
```

You can also import `GapCursor` and use `instanceof` when that fits your module
setup.

To make it visible, include the gap cursor CSS. In this tutor, CSS imports are
stripped, so the example injects equivalent CSS with a `<style>` element.

Node specs can influence this behavior with `allowGapCursor: true` or
`allowGapCursor: false`.

## The drop cursor makes drag targets visible

Dragging content over a ProseMirror view can be ambiguous. `dropCursor()` draws
a thin line where the drop will land.

```js
import { dropCursor } from "prosemirror-dropcursor";

const state = EditorState.create({
  schema,
  plugins: [
    dropCursor({ color: "#4a9eff", width: 2 }),
  ],
});
```

Options:

| Option | Use |
| --- | --- |
| `color` | Indicator color |
| `width` | Indicator width in pixels |
| `class` | CSS class for the indicator |

The plugin listens to drag events, uses the view to find the nearest document
position, and renders an indicator. It does not change the document until a drop
actually happens.

## Why these are plugins, not schema changes

The document model already knows where blocks are. The missing piece is user
control around those positions:

- Gap cursor: create a selection where a text cursor cannot go.
- Drop cursor: show where a pending drag operation would insert content.

Neither feature adds content. Both improve the view's handling of events and
visual feedback.

## Where this sits in the loop

```text
EditorView event handling
  arrow/click/drag events

View plugin
  creates GapCursor selection or drop indicator

Transaction
  selection changes or later document drop changes enter the normal loop
```

`exampleSetup` includes both plugins, which is why early editors already felt
reasonable around awkward block positions.

## Takeaways

- Gap cursor solves unreachable cursor positions between non-text blocks.
- Drop cursor solves invisible drag-and-drop destinations.
- These are view-level affordances, not new document data.
- Use both for editors with leaf blocks, embeds, rules, images, or drag/drop.
