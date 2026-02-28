# Lesson 01: Node.js and npm

## Node.js

- A JavaScript runtime — runs JS outside the browser (on your machine, servers, CLI tools).
- In our project, Node never runs the editor code. The browser does. Node is only used as a dev toolchain.

## npm

- A **package manager**, not a project manager.
- Two jobs:
  1. **Registry**: people publish packages to npmjs.com. You pull them with `npm install`.
  2. **Dependency tracking**: records what your package depends on and locks exact versions.

## Key insight: everything is a package

- npm manages **packages**. `npm init` creates a new package (a directory with `package.json`).
- Your project is itself a package. The dependencies you install are also packages. Same format, same rules.
- You _use_ your package as a project, but to npm it's just another package.

## The files npm manages

| File/Folder | Created by | Purpose |
|---|---|---|
| `package.json` | `npm init` | Manifest — name, version, dependencies you declare |
| `package-lock.json` | `npm install` | Auto-generated — locks exact versions for reproducible installs |
| `node_modules/` | `npm install` | Auto-generated — the actual downloaded package code |

- `node_modules/` is never committed (it's huge and reproducible from the lock file).
- `package-lock.json` is committed so others get identical installs.

## The sequence

1. `npm init` → creates `package.json` (the manifest)
2. `npm install prosemirror-state` → adds it to `package.json`, downloads into `node_modules/`, updates lock file
3. Someone clones your repo → runs `npm install` → lock file reproduces the same `node_modules/`
