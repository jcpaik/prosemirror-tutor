# 19 - Lists (Schema and Commands)

## Start with the editing loop

The user need is not "add three node specs." The need is: a paragraph should
turn into a list, Enter should split an item, Tab should indent it, and the view
should re-render a valid document after each action.

That means lists are a full loop feature:

```text
button/key -> list command -> transaction steps -> new state -> list DOM
```

The matching example is `examples/19-lists.js`.

## The schema makes list documents legal

Commands can only create nodes that the schema allows. Start by extending the
basic schema:

```js
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

const mySchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
  marks: basicSchema.spec.marks,
});
```

`addListNodes` returns a new node set with:

| Node | DOM | Role |
| --- | --- | --- |
| `ordered_list` | `ol` | Contains `list_item` nodes |
| `bullet_list` | `ul` | Contains `list_item` nodes |
| `list_item` | `li` | Contains the item content |

The second argument is the content expression for each `list_item`.
`"paragraph block*"` means an item starts with a paragraph and may contain more
blocks after it. Since the list nodes are added to the `"block"` group, that
extra `block*` is what permits nested lists.

Use `"paragraph"` if you want flat, single-paragraph list items.

## The commands control list behavior

The schema permits list shape. The commands produce transactions that move the
document into that shape.

```js
import {
  wrapInList,
  splitListItem,
  liftListItem,
  sinkListItem,
} from "prosemirror-schema-list";

const wrapBullet = wrapInList(mySchema.nodes.bullet_list);
const wrapOrdered = wrapInList(mySchema.nodes.ordered_list);
const splitItem = splitListItem(mySchema.nodes.list_item);
const liftItem = liftListItem(mySchema.nodes.list_item);
const sinkItem = sinkListItem(mySchema.nodes.list_item);
```

These are ordinary ProseMirror commands: `(state, dispatch?, view?) =>
boolean`. You can run them from keymaps, buttons, or dry-run checks.

```js
keymap({
  Enter: splitListItem(mySchema.nodes.list_item),
  Tab: sinkListItem(mySchema.nodes.list_item),
  "Shift-Tab": liftListItem(mySchema.nodes.list_item),
});
```

Put this keymap before `baseKeymap`. Inside a list, `splitListItem` handles
Enter. Outside a list, it returns `false`, and the base Enter behavior gets a
turn.

## What each command answers

| Need in the loop | Command |
| --- | --- |
| Turn selected blocks into list items | `wrapInList(listType, attrs?)` |
| Press Enter inside an item | `splitListItem(itemType, itemAttrs?)` |
| Move an item out one level | `liftListItem(itemType)` |
| Move an item under the previous sibling | `sinkListItem(itemType)` |

`sinkListItem` cannot indent the first item in a list because there is no
previous sibling to become its parent.

`splitListItem` has the familiar editor behavior: Enter splits a non-empty item;
Enter on an empty item lifts out of the list.

## Where this sits in the loop

Lists touch both the data grammar and the control layer:

```text
Schema
  allows ordered_list, bullet_list, list_item

Command/keymap/menu
  creates transactions that wrap, split, lift, or sink list items

View
  renders the resulting nodes through their schema DOM specs
```

If list editing fails, ask both questions: "Does the schema allow this shape?"
and "Is the right command getting first chance in the keymap order?"

## Takeaways

- Lists are regular nodes, not a special editor mode.
- `addListNodes` adds the node types; list commands produce the transactions.
- `"paragraph block*"` enables nested lists because list nodes are blocks.
- Toolbar buttons and key bindings use the same command functions.
