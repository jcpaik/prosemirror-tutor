# 09 - Content Expressions

## The loop need

Every transaction proposes a next document. ProseMirror needs a way to decide
whether that next document is valid before the view renders it.

Content expressions are the schema's grammar for valid child nodes.

The related example is `examples/09-content-expressions.js`.

## A schema rule as a loop guard

```js
const recipeSchema = new Schema({
  nodes: {
    doc: { content: "title ingredients steps" },
    title: { content: "text*" },
    ingredients: { content: "ingredient+" },
    ingredient: { content: "text*" },
    steps: { content: "step+" },
    step: { content: "text*" },
    text: { inline: true },
  },
});
```

This says a recipe document must always contain exactly a title, then an
ingredients section, then a steps section. Each section has its own child
grammar.

If an edit would leave the document without a required part, ProseMirror must
reject the edit or repair toward the minimum valid content.

## Expression syntax

| Expression | Meaning |
|---|---|
| `"paragraph"` | Exactly one paragraph |
| `"paragraph+"` | One or more paragraphs |
| `"paragraph*"` | Zero or more paragraphs |
| `"caption?"` | Optional caption |
| `"paragraph{2}"` | Exactly two paragraphs |
| `"paragraph{1,5}"` | One to five paragraphs |
| `"paragraph{2,}"` | Two or more paragraphs |

A space-separated sequence requires order:

```txt
"heading paragraph+"
```

Parentheses and `|` express alternatives:

```txt
"(paragraph | blockquote)+"
```

## Groups keep rules flexible

Groups name families of node types:

```js
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    heading: { group: "block", content: "inline*" },
    blockquote: { group: "block", content: "block+" },
    text: { group: "inline", inline: true },
    image: { group: "inline", inline: true },
  },
});
```

Now `"block+"` means one or more nodes from the `block` group. Adding another
block node later does not require changing every expression that accepts blocks.

Use explicit names for fixed structures, such as `"title ingredients steps"`.
Use groups for flexible regions, such as `"block+"` or `"inline*"`.

## What enforcement feels like

Content expressions are active rules, not comments.

- Constructing an invalid node with `schema.node(...)` throws.
- Transactions check whether replacements fit the parent content expression.
- Required content cannot simply disappear from the document.
- Some transforms create filler content to preserve validity.

For example, if `ingredients` requires `ingredient+`, deleting the last
ingredient would violate the grammar. The editor must keep or recreate a valid
ingredient node.

## Minimum valid content

`createAndFill` can create a node and add required child content when possible:

```js
const emptyRecipe = recipeSchema.nodes.doc.createAndFill();
```

That idea also shows up during editing. When the user deletes aggressively,
ProseMirror still tries to leave a valid document shape.

## Where this sits in the loop

Content expressions guard the state transition:

```txt
transaction proposes next doc
  -> schema content expressions check validity
  -> valid state
  -> view renders
```

They are the reason commands can rely on structural invariants instead of
defensively handling every impossible document shape.

## Key idea

The schema is the loop's validity grammar. Content expressions say which child
nodes may exist, in what order, and how many, so every rendered state remains a
valid ProseMirror document.
