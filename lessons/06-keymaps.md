# 06 - Keymaps

## The loop need

Keyboard input must become editor intent. Some keys should run custom commands,
some should use ProseMirror defaults, and unhandled keys should fall through to
normal browser behavior.

The keymap plugin provides that routing.

The related example is `examples/06-keymaps.js`.

## A keymap maps keys to commands

```js
import { keymap } from "prosemirror-keymap";

const customKeys = keymap({
  "Mod-Shift-d": duplicateParagraph,
  "Mod-Shift-t": insertTimestamp,
});
```

`keymap(...)` returns a plugin. Add it to `EditorState.create({ plugins })`.

When the view receives a `keydown`, the plugin checks whether the key matches a
binding. If it does, it calls the command with `(state, dispatch, view)`.

## Key names

Key strings use modifiers followed by the key:

| Token | Meaning |
|---|---|
| `Mod` | Cmd on macOS, Ctrl on Windows/Linux |
| `Ctrl` | Ctrl on every platform |
| `Shift` | Shift |
| `Alt` | Alt/Option |
| `Enter` | Enter/Return |
| `Backspace` | Backspace |
| `ArrowUp` | Arrow key names |
| `a` | Lowercase letter keys |

Prefer `Mod` for ordinary shortcuts so the binding feels native on each
platform.

## Plugin order is priority

Multiple keymap plugins can be installed. They are tried in plugin order. The
first command that returns `true` handles the event.

```js
const state = EditorState.create({
  schema,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap({ "Enter": customEnter }),
    keymap(baseKeymap),
  ],
});
```

Put app-specific keys before `baseKeymap`. Keep `baseKeymap` last so it can
handle standard editing behavior such as Enter and Backspace when your custom
commands pass.

## What happens on keydown

```txt
view receives keydown
  -> first keymap checks binding
  -> matching command runs
  -> true: stop and suppress native event
  -> false: try next keymap
  -> none handled: browser default may run
```

This is why command return values matter. `true` means "handled." `false`
means "try someone else."

## Where this sits in the loop

Keymaps sit between browser keyboard events and commands:

```txt
keydown -> keymap plugin -> command -> transaction -> next state -> render
```

They do not edit documents directly. They choose which command gets a chance to
create the transaction.

## Key idea

Keymaps are priority-ordered keyboard routers. They translate key combinations
into command calls and let the command contract decide whether the loop should
continue.
