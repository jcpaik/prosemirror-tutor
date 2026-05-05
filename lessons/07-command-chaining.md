# 07 - Command Chaining

## The loop need

One key can mean different edits in different states. Backspace is the clearest
example:

- If text is selected, delete it.
- If the cursor is at the start of a block, join with the previous block.
- If a leaf node is before the cursor, select that node.
- Otherwise, let the browser delete a character.

A keymap accepts one command per key. `chainCommands` lets that one command try
several possibilities in order.

The related example is `examples/07-command-chaining.js`.

## `chainCommands`

```js
import { chainCommands } from "prosemirror-commands";

const backspace = chainCommands(
  deleteSelection,
  joinBackward,
  selectNodeBackward,
);
```

The returned value is itself a command. It receives `(state, dispatch, view)`,
passes those arguments to each inner command, and stops at the first `true`.

If every command returns `false`, the chain returns `false`.

## Built-in chains

`baseKeymap` uses chains for context-sensitive editing keys.

Backspace:

```js
chainCommands(deleteSelection, joinBackward, selectNodeBackward)
```

Enter:

```js
chainCommands(
  newlineInCode,
  createParagraphNear,
  liftEmptyBlock,
  splitBlock,
)
```

Delete:

```js
chainCommands(deleteSelection, joinForward, selectNodeForward)
```

Each command is small. The chain provides the control flow.

## Add custom behavior by prepending

Put your more specific command first:

```js
function exitHeadingOnEnter(state, dispatch) {
  const { $from } = state.selection;
  if ($from.parent.type.name !== "heading") return false;

  if (dispatch) {
    const paragraph = state.schema.nodes.paragraph.create();
    const pos = $from.after();
    dispatch(state.tr.insert(pos, paragraph));
  }
  return true;
}

const enter = chainCommands(
  exitHeadingOnEnter,
  newlineInCode,
  createParagraphNear,
  liftEmptyBlock,
  splitBlock,
);
```

Returning `false` means "not my case." Returning `true` means "handled," even
if the command deliberately dispatched nothing.

## Why swallowing can be useful

Sometimes the right behavior is to block a browser action:

```js
function preventBackspaceInLockedNode(state) {
  const { $from } = state.selection;
  return $from.parent.type.name === "locked";
}
```

This returns `true` without dispatching. The key was handled, so the browser
does not run its default behavior.

## Where this sits in the loop

Chaining sits inside a command slot:

```txt
keydown -> keymap -> chained command
  -> first applicable command -> transaction -> next state
```

It is control flow for competing interpretations of the same user intent.

## Key idea

`chainCommands` keeps complex keys understandable by making each possible
behavior a small command and trying them from most specific to most general.
