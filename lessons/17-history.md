# 17 - History

## The Need

Undo is not a separate editing system. It is memory attached to the transaction
loop.

When the user types, ProseMirror applies steps. The history plugin remembers
enough step information to build inverse changes later. When the user runs
undo, `undo` dispatches another transaction.

See `examples/17-history.js` for live undo/redo depth, grouping delay, and a
button that dispatches a transaction excluded from history.

## Where This Sits in the Loop

```txt
user edit
  -> transaction with steps
  -> history plugin stores undo event
  -> new state

undo command
  -> history plugin creates inverse transaction
  -> dispatch
  -> new state
```

History is plugin state plus commands.

## Install the History Plugin

```js
import { history, undo, redo } from "prosemirror-history"
import { keymap } from "prosemirror-keymap"

const state = EditorState.create({
  schema,
  plugins: [
    history(),
    keymap({
      "Mod-z": undo,
      "Mod-y": redo
    })
  ]
})
```

`history()` returns a plugin. `undo` and `redo` are commands, so they work in
keymaps, toolbar buttons, and command chains.

On macOS, many editors also bind `"Mod-Shift-z"` to redo.

## Grouping Edits

History groups nearby edits into undo events. The default configuration is:

```js
history({
  depth: 100,
  newGroupDelay: 500
})
```

`depth` is the maximum number of undo events to keep. `newGroupDelay` is the
time window, in milliseconds, for grouping adjacent edits.

Increasing `newGroupDelay` makes larger undo chunks. Decreasing it makes undo
more granular.

## Reading Undo and Redo Depth

Use depth helpers for UI state.

```js
import { undoDepth, redoDepth } from "prosemirror-history"

undoButton.disabled = undoDepth(view.state) === 0
redoButton.disabled = redoDepth(view.state) === 0
```

The example uses these helpers to update a status bar after each dispatched
transaction.

## Excluding a Transaction

Some transactions should affect the document but not become undoable user
edits. Mark them with transaction metadata.

```js
const tr = view.state.tr.insertText("[generated] ")
tr.setMeta("addToHistory", false)
view.dispatch(tr)
```

The history plugin checks `"addToHistory"`. When it is `false`, that
transaction is not added to the undo stack.

This is useful for programmatic cleanup, generated annotations, or remote
collaboration changes that should not be undone as local typing.

## Commands Still Follow the Command Contract

`undo` and `redo` have the normal command shape:

```js
if (undo(view.state)) {
  undo(view.state, view.dispatch)
}
```

Calling without `dispatch` is a dry run. It returns whether the command can
run, which is exactly what toolbar enablement needs.

## Takeaways

- History is undo/redo memory attached to the transaction loop.
- `history()` adds the plugin state that tracks undo and redo events.
- `undo` and `redo` are ordinary commands.
- `depth` limits stored events; `newGroupDelay` controls grouping.
- `undoDepth` and `redoDepth` are for UI feedback.
- `tr.setMeta("addToHistory", false)` excludes a transaction from history.
