# 24 - Menu Bar Basics

## Start with the UI need

A toolbar button is not a separate editing system. It is a visible way to run
the same commands that keymaps run.

```text
button click -> command -> transaction -> state.apply -> menu updates
```

The matching example is `examples/24-menu.js`.

## MenuItem exposes a command

`prosemirror-menu` gives you a small UI layer. The basic unit is `MenuItem`.

```js
import { MenuItem, icons } from "prosemirror-menu";
import { toggleMark } from "prosemirror-commands";

const boldItem = new MenuItem({
  run(state, dispatch) {
    toggleMark(schema.marks.strong)(state, dispatch);
  },
  icon: icons.strong,
  title: "Toggle bold",
});
```

`run` is the command entry point. The item may use a label, an icon, or a custom
`render` function.

## Menu state follows editor state

Toolbar UI has three common control questions:

| Question | Callback | Effect |
| --- | --- | --- |
| Should this item exist here? | `select(state)` | Hide when false |
| Can this item run right now? | `enable(state)` | Disable when false |
| Is this state already active? | `active(state)` | Highlight when true |

Examples:

```js
const undoItem = new MenuItem({
  run: undo,
  icon: icons.undo,
  enable(state) { return undo(state); },
});
```

```js
const boldItem = new MenuItem({
  run(state, dispatch) {
    toggleMark(schema.marks.strong)(state, dispatch);
  },
  icon: icons.strong,
  active(state) {
    return markActive(state, schema.marks.strong);
  },
});
```

Use `enable` for actions like undo that should remain visible but unavailable.
Use `active` for toggles like bold. Use `select` when the item would be
irrelevant in the current selection.

## Dropdown groups related commands

A `Dropdown` collects menu items under one label.

```js
import { Dropdown, blockTypeItem } from "prosemirror-menu";

const typeDropdown = new Dropdown([
  blockTypeItem(schema.nodes.paragraph, { label: "Paragraph" }),
  blockTypeItem(schema.nodes.heading, {
    attrs: { level: 1 },
    label: "Heading 1",
  }),
], { label: "Type" });
```

Helpers such as `blockTypeItem` and `wrapItem` create common command-backed
items with useful `run`, `active`, and `select` behavior.

## menuBar is a plugin

`menuBar` returns a normal ProseMirror plugin. Its `content` is an array of
groups, where each group is an array of menu elements.

```js
import { menuBar } from "prosemirror-menu";

const toolbar = menuBar({
  content: [
    [boldItem, italicItem],
    [typeDropdown],
    [undoItem, redoItem],
  ],
});
```

Add it to the state like any other plugin:

```js
const state = EditorState.create({
  doc,
  plugins: [
    history(),
    keymap(baseKeymap),
    toolbar,
  ],
});
```

The plugin wraps the editor DOM, inserts the menu before or after the editor,
and updates each item after state changes.

## Where this sits in the loop

```text
Menu item
  exposes command as UI

menuBar plugin
  renders toolbar and refreshes item state

Command
  dispatches transaction

Editor state
  drives active/enabled/visible menu state
```

Menus are best understood as command adapters. If a toolbar action cannot be
expressed as a command, first ask what transaction it should dispatch.

## Takeaways

- `MenuItem` is command UI.
- `select`, `enable`, and `active` answer different UI state questions.
- `Dropdown` groups items; `menuBar` installs them as a plugin.
- Use built-in helpers for common block, wrap, undo, redo, and icon behavior.
