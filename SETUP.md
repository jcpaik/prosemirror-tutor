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
index.html          ← entry page, mounts the editor
examples/           ← one JS file per tutorial lesson
  01-basic-editor.js
.gitignore
package.json
CLAUDE.md
SETUP.md            ← this file
```

## Commands

```bash
npm install     # install dependencies
npm run dev     # start Vite dev server → http://localhost:5173
```

## Adding a New Example

1. Create `examples/02-your-topic.js`
2. In `index.html`, change the `<script>` src to point to the new file
3. The dev server hot-reloads automatically
