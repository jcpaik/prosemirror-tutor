# 01 - Node.js and npm

## The immediate need

We want to run a real ProseMirror editor in the browser: DOM on screen, user
input, transactions, and re-rendering. The browser runs the editor code. Node.js
and npm exist here so we can install that code and start the local development
server that serves it.

## Node.js

Node.js is a JavaScript runtime outside the browser. In this project, Node is
not the editor runtime. It runs tools:

- `npm install` to fetch packages.
- `npm run dev` to start Vite.
- `npm run fetch-docs` to download local ProseMirror docs.

The editor itself runs after the browser loads one of the runnable example
files.

## npm

npm is a package manager. It does two practical jobs for this project:

1. Fetches packages from the npm registry.
2. Records exact dependency versions so the same editor can run later.

ProseMirror is distributed as npm packages: `prosemirror-state`,
`prosemirror-view`, `prosemirror-model`, `prosemirror-commands`, and others.

## The files npm manages

| File or folder | Created by | Purpose |
|---|---|---|
| `package.json` | `npm init` or edits | Declares scripts and dependencies |
| `package-lock.json` | `npm install` | Locks exact package versions |
| `node_modules/` | `npm install` | Downloaded package code |

Commit `package.json` and `package-lock.json`. Do not commit `node_modules/`;
it is reproducible from the lock file.

## Why this matters for the editor loop

The ProseMirror loop needs importable modules:

```js
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
```

npm puts those modules on disk. Vite, introduced next, makes them loadable by
the browser.

## Sequence

1. `npm install` downloads the declared packages.
2. `npm run dev` starts the Vite server.
3. The browser opens the tutorial page.
4. An example file imports ProseMirror modules and creates an editor.

## Key idea

Node and npm are setup machinery for the browser editing loop. They give us the
packages and commands needed to run examples, but they are not the place where
ProseMirror renders or handles input.
