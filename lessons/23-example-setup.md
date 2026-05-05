# 23 - exampleSetup (A Prebuilt Loop Bundle)

## Start with the setup need

Early examples need a useful editor before you know how to assemble one. The
need is: create a state whose loop already handles common keys, input rules,
history, menus, and cursor affordances.

`exampleSetup` answers that need with a plugin array:

```js
import { exampleSetup } from "prosemirror-example-setup";

const state = EditorState.create({
  schema,
  plugins: exampleSetup({ schema }),
});
```

The matching example is `examples/23-example-setup.js`.

## It is just plugins

`exampleSetup({ schema })` returns an array of `Plugin` instances. There is no
hidden editor mode. The returned plugins enter the same loop as the plugins you
write yourself.

```text
DOM event -> exampleSetup plugin/keymap/input rule -> transaction -> state
```

The package inspects your schema and only creates features whose node or mark
types exist.

## What it bundles

The exact array is a convenience stack for demos and learning:

| Bundle piece | Loop role |
| --- | --- |
| Input rules | Turn typed patterns into transactions |
| Schema-aware keymap | Bind marks, block types, lists, history keys |
| `baseKeymap` | Provide core editing keys |
| `dropCursor()` | Show drag/drop destination |
| `gapCursor()` | Allow selections at awkward block gaps |
| `menuBar()` | Expose commands as toolbar UI |
| `history()` | Track undo and redo |
| Style plugin | Add the example setup CSS class |

The input rules include common typography replacements and Markdown-like block
shortcuts such as headings, blockquotes, lists, and code blocks when the schema
supports those nodes.

The keymap includes bindings such as `Mod-b`, `Mod-i`, heading shortcuts,
blockquote/list wrapping, list item Enter behavior, undo/redo, lift/join
commands, and parent-node selection when the needed types exist.

## Options are small escape hatches

You can keep most of the bundle and remove or customize selected pieces:

```js
exampleSetup({
  schema,
  menuBar: false,
  history: false,
  mapKeys: { "Mod-b": false },
  floatingMenu: false,
  menuContent: customMenu,
});
```

This is useful during learning or prototyping. For production work, most teams
eventually replace the bundle with an explicit plugin list.

## Why you outgrow it

The moment a feature needs different control, you want to own that part of the
loop directly:

- Custom shortcuts mean owning keymap order.
- Custom menus mean building your own command UI.
- Custom input behavior means choosing rules deliberately.
- Collaboration, validation, or app-specific plugin state means adding your own
  plugins.
- Bundle size and design polish usually matter in a shipped editor.

`exampleSetup` is best treated as a readable reference implementation: a
prebuilt composition of pieces you now understand separately.

## Where this sits in the loop

```text
EditorState.create
  receives plugin array

exampleSetup
  builds a default plugin array from the schema

EditorView
  runs those plugins exactly like any custom plugins
```

When something surprising happens in an early lesson editor, ask which bundled
plugin is responsible. This lesson's example prints the plugin array so you can
see the pieces.

## Takeaways

- `exampleSetup` returns ordinary plugins.
- It bundles many lessons' features into one call.
- It is excellent for demos and learning.
- Replacing it is not a rewrite; it is taking ownership of the plugin array.
