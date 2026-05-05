# 12 - Selections

## The Need

Every transaction needs to know where the user's intent lands. Typing inserts
at the cursor. Delete removes the selected range. A button command may replace
the current selection or move it somewhere else.

That intent is stored in `state.selection`.

See `examples/12-selections.js` for buttons that set cursor selections, node
selections, and all-document selections while a debug panel shows the live
selection fields.

## Where This Sits in the Loop

```txt
user click/drag/key
  -> EditorView reads DOM selection
  -> EditorState.selection
  -> command builds transaction
  -> tr.setSelection(...) or document step maps selection
  -> new EditorState.selection
```

Selections are state, so changing one means dispatching a transaction.

## The Three Built-In Selection Shapes

`TextSelection` is the normal cursor or text range inside textblocks.

```js
import { TextSelection } from "prosemirror-state"

const tr = state.tr
tr.setSelection(TextSelection.create(tr.doc, 5))
view.dispatch(tr)
```

Pass a third argument for a range:

```js
TextSelection.create(tr.doc, 5, 12)
```

`NodeSelection` selects one whole selectable node. The position is the position
before that node.

```js
import { NodeSelection } from "prosemirror-state"

tr.setSelection(NodeSelection.create(tr.doc, hrPos))
```

`AllSelection` selects the whole document.

```js
import { AllSelection } from "prosemirror-state"

tr.setSelection(new AllSelection(tr.doc))
```

## The Fields You Actually Use

Every selection has:

- `from` and `to`: ordered document positions
- `anchor` and `head`: the fixed side and moving side of the selection
- `$from`, `$to`, `$anchor`, `$head`: resolved positions
- `empty`: true for a cursor

For most commands, `from` and `to` are enough.

```js
function deleteSelection(state, dispatch) {
  if (state.selection.empty) return false
  if (dispatch) dispatch(state.tr.deleteSelection())
  return true
}
```

Use `anchor` and `head` only when direction matters, such as preserving which
side of a drag moved last.

## Use tr.doc After Steps

Transactions can change the document before you set the selection. Create the
selection against `tr.doc`, not the old `state.doc`.

```js
let tr = state.tr.insertText("Hello ")
tr.setSelection(TextSelection.create(tr.doc, 7))
view.dispatch(tr)
```

ProseMirror maps the transaction's current selection through document-changing
steps. If a deletion happens before the cursor, the cursor shifts with the
document.

```js
let tr = state.tr
console.log(tr.selection.from) // 10
tr.delete(6, 8)
console.log(tr.selection.from) // 8
```

If you want a different result, call `tr.setSelection(...)` after the document
steps.

## Finding a Valid Selection

After transforms, you may know a nearby position but not whether it is a valid
cursor spot. Use the helpers on `Selection`.

```js
import { Selection } from "prosemirror-state"

tr.setSelection(Selection.near(tr.doc.resolve(pos), 1))
tr.setSelection(Selection.atStart(tr.doc))
tr.setSelection(Selection.atEnd(tr.doc))
```

These are control helpers: they let your command recover a valid user location
after changing the document.

## Takeaways

- Selection is where edit intent lands in the document.
- Selection changes go through transactions.
- `TextSelection` handles cursors and text ranges.
- `NodeSelection` selects one selectable node.
- `AllSelection` selects the entire document.
- Build selections from `tr.doc` after any steps in the same transaction.
