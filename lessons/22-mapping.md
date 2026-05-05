# 22 - Mapping and Position Tracking

## Start with the control problem

The rendering loop creates a new document after every transaction. Any stored
position from the old document may now be wrong.

```text
old bookmark position -> transaction changes doc -> mapped bookmark position
```

This is the concrete problem solved by mapping. The matching example is
`examples/22-mapping.js`, where a visible bookmark survives edits.

## One step gives one StepMap

Every step knows how positions move across that one change. `step.getMap()`
returns a `StepMap`.

```js
const map = step.getMap();

const newPos = map.map(oldPos);
```

A `StepMap` stores changed ranges as triples:

```text
start, oldSize, newSize
```

Positions before the changed range stay put. Positions after it shift by
`newSize - oldSize`. Positions inside the changed range need a policy.

## A transaction gives a Mapping

A transaction often contains multiple steps. `tr.mapping` chains their maps so a
position can move from the document before the transaction to the document after
the transaction.

```js
function apply(tr, value) {
  if (!tr.docChanged) return value;
  return { pos: tr.mapping.map(value.pos) };
}
```

This is the core pattern for plugin state that stores document positions:
bookmarks, annotation anchors, external cursors, lightweight indexes, and
decoration positions.

## Bias decides which side survives

When a position lands exactly at inserted or replaced content, there may be two
reasonable answers: before the new content or after it.

```js
mapping.map(pos, 1);  // bias right, the default
mapping.map(pos, -1); // bias left
```

Ask the product question:

- A cursor after typed text usually wants bias right.
- A marker attached before a replaced range may want bias left.
- An annotation inside deleted content may need to disappear instead.

## mapResult tells you when content was deleted

`map` gives the new position. `mapResult` gives the new position plus deletion
information.

```js
const result = tr.mapping.mapResult(anchorPos, 1);

if (result.deleted) {
  // Drop the annotation instead of pretending it still points somewhere useful.
} else {
  anchorPos = result.pos;
}
```

Use `mapResult` when silently relocating would be misleading.

## Decorations already use this pattern

`DecorationSet.map(mapping, doc)` maps an existing decoration set through a
transaction. You can also recompute decorations from scratch, but mapping is
the efficient route when the set is large or expensive to build.

The same idea appears in collaboration: unconfirmed local steps are mapped
through remote steps so they can be rebased on the newer document.

## Where this sits in the loop

```text
Transaction
  contains steps

Each step
  contributes a StepMap

tr.mapping
  translates old positions into new positions

Plugin/collab/decorations
  keep their anchors aligned with the new state
```

Mapping is the answer whenever a feature stores positions across transactions.

## Takeaways

- A raw position number belongs to one document version.
- `StepMap` maps across one step; `Mapping` maps across many steps.
- Bias controls which side of a change a position lands on.
- `mapResult` helps decide whether an anchor should be kept or dropped.
