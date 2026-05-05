# 05 - Commands

## The loop need

Users do not think in transactions. They think "delete this," "make it bold,"
or "insert a rule here." ProseMirror needs a small adapter from user intent to
transaction.

That adapter is a command.

```js
(state, dispatch, view) => boolean
```

The related example is `examples/05-commands.js`.

## Command contract

A command receives:

- `state`: the current `EditorState`.
- `dispatch`: optional function for sending a transaction.
- `view`: optional `EditorView`, used only when DOM/view access is needed.

It returns:

- `true` when it handled the intent.
- `false` when it cannot handle the current state.

## Dry run first, dispatch second

Because `dispatch` is optional, the same command can answer two questions.

```js
deleteSelection(view.state);                // can this run?
deleteSelection(view.state, view.dispatch); // run it
```

This powers toolbar state. A "Delete selection" button can be disabled by
calling the command without `dispatch`.

A command with no `dispatch` should not cause side effects. It should only
return whether it is applicable.

## Custom command shape

```js
function insertHR(state, dispatch) {
  const hrType = state.schema.nodes.horizontal_rule;
  if (!hrType) return false;

  const { $from, $to } = state.selection;
  if (!$from.parent.canReplaceWith($from.index(), $to.index(), hrType)) {
    return false;
  }

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(hrType.create()));
  }
  return true;
}
```

The pattern is:

1. Read the current state and selection.
2. Check whether the intent is valid here.
3. If `dispatch` exists, build and dispatch a transaction.
4. Return `true` or `false`.

## Built-in commands

`prosemirror-commands` includes common editing actions:

| Command | Purpose |
|---|---|
| `deleteSelection` | Delete selected content |
| `joinBackward` | Join the current block with the previous block |
| `joinForward` | Join the current block with the next block |
| `selectAll` | Select the whole document |
| `toggleMark(type)` | Add or remove a mark |
| `baseKeymap` | Default command bindings for editing keys |

## Commands can be used from buttons or keys

A button can run a command directly:

```js
button.addEventListener("mousedown", (event) => {
  event.preventDefault();
  insertHR(view.state, view.dispatch, view);
  view.focus();
});
```

A keymap can run the same command from a shortcut:

```js
keymap({
  "Mod-Shift-h": insertHR,
});
```

The command does not care where the intent came from.

## Where this sits in the loop

Commands sit between input and transaction:

```txt
button or key -> command(state, dispatch, view) -> transaction -> next state
```

They keep intent reusable. The same operation can be bound to a toolbar, menu,
keyboard shortcut, or test.

## Key idea

A command is the standard ProseMirror shape for "try this edit against the
current state, and dispatch a transaction only if it makes sense."
