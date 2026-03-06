# Project Setup

## Stack

- **Runtime**: Node.js + npm
- **Dev server / Bundler**: [Vite](https://vite.dev) — serves `index.html` at `localhost:5173` with hot-reload, zero config
- **Editor library**: [ProseMirror](https://prosemirror.net)

## Installed ProseMirror Packages

| Package | Purpose |
|---|---|
| `prosemirror-model` | Document model — nodes, marks, schemas |
| `prosemirror-state` | Editor state — content, selection, transactions |
| `prosemirror-view` | Renders editor to DOM, handles input |
| `prosemirror-schema-basic` | Basic schema (paragraph, heading, bold, italic, …) |
| `prosemirror-schema-list` | List node types (ordered, bullet) |
| `prosemirror-keymap` | Bind keyboard shortcuts to commands |
| `prosemirror-commands` | Built-in editing commands (join, lift, select-all, …) |
| `prosemirror-history` | Undo / redo |
| `prosemirror-example-setup` | Convenience bundle: keymap + input rules + menu bar + history |

## Project Structure

```
index.html          ← split-screen tutorial page (code editor + live preview)
                       includes a draggable divider between panels
src/
  tutor.js          ← module registry, import transform, code execution, UI wiring,
                       draggable divider logic, optgroup dropdown for examples/exercises
  tutor.css         ← split-panel layout, divider styling
examples/           ← one JS file per tutorial lesson (read-only demos)
  manifest.json     ← JSON list of examples for the dropdown
  01-basic-editor.js
  02-from-scratch.js
  03-transactions.js
  04-document-model.js
exercises/          ← coding exercises with TODO markers for the learner
  manifest.json     ← JSON list of exercises for the dropdown
  01-schema.js      ← Build a custom schema (heading, paragraph, blockquote)
  02-transactions.js ← Dispatch transactions (insert, delete, replace)
  03-doc-model.js   ← Explore the document model (resolve, nodeAt, descendants)
lessons/            ← markdown lesson notes
  01-node-and-npm.md
  02-bridging-npm-to-browser.md
  03-schema-state-view-transactions.md
  04-document-model-and-positions.md
docs/prosemirror/   ← official ProseMirror docs (.gitignored)
  guide.md          ← full guide (Intro, Documents, Schemas, Transforms, State, View, Commands, Collab)
  reference.md      ← API reference for all 12 modules
scripts/
  fetch-docs.sh     ← downloads fresh copies of the official docs (requires pandoc)
.gitignore
package.json
CLAUDE.md
SETUP.md            ← this file
```

## Commands

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server → http://localhost:5173
npm run fetch-docs # download official ProseMirror docs (requires pandoc)
```

## UI Features

- **Draggable divider**: drag the vertical bar between the code and result panels to resize them
- **Grouped dropdown**: the selector shows "Examples" (read-only demos) and "Exercises" (coding challenges with TODOs) as separate groups

## Adding a New Example

1. Create `examples/NN-your-topic.js`
2. Add an entry to `examples/manifest.json` with `file` and `title`
3. The dev server hot-reloads automatically; select the new example from the dropdown

## Adding a New Exercise

1. Create `exercises/NN-your-topic.js` with instructions, starter code, and `// TODO:` markers
2. Add an entry to `exercises/manifest.json` with `file` and `title`
3. It appears under the "Exercises" group in the dropdown
