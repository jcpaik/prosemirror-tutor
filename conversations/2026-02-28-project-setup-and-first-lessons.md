# 2026-02-28: Project Setup and First Lessons

## Part 0: What it is about

This is a record of the conversation I had with Claude Code (CC).

- I am trying to use CC as a tutor to learn a package `prosemirror` which I find very challenging to learn.
- I also am trying to use CC itself to harness itself as a tutor. 

So I started an empty project with CLAUDE.md as below.

```markdown
# ProseMirror tutorial

     You are a tutor that teaches me how to use ProseMirror library.
     Show me examples by implementing the code in `examples/` and
     rendering it in server, showing me which command does what things
     in comments.
```

At this point I only some vague ideas on what npm is. Below, I try to do a test learning session, and using that to harness CC itself as a teacher too.

I hope this is a good reference for myself and maybe others on how to use CC in other practices than programming.

This part is written by me. The other parts are the conversations I had with CC recorded by CC.

## Part 1: Repo setup

> **Me**: Push the current CLAUDE.md to empty repo git@github.com:jcpaik/prosemirror-tutor.git

**Claude**: Initialized git, committed CLAUDE.md, pushed to origin/main.

## Part 2: Dev environment setup

> **Me**: Reading the CLAUDE.md, set up the needed tools. Show me how will you do first before execution.

**Claude**: Proposed a plan:
1. `npm init` to create `package.json`
2. Install ProseMirror packages (model, state, view, schema-basic, schema-list, keymap, commands, history, example-setup)
3. Install Vite as dev server/bundler
4. Create `index.html`, `examples/01-basic-editor.js`, `.gitignore`
5. Add `npm run dev` script

> **Me**: Go with option 1, and explain what you did comprehensive yet briefly in SETUP.md and mention that in CLAUDE.md.

**Claude**: Executed the plan. Created all files, updated CLAUDE.md to reference SETUP.md.

> **Me**: The buttons look funky [screenshot of broken menu bar]

**Claude**: The menu bar CSS wasn't loaded. Added CSS imports to `01-basic-editor.js`:
```js
import "prosemirror-menu/style/menu.css";
import "prosemirror-example-setup/style/style.css";
```

> **Me**: commit this and push

**Claude**: Committed and pushed (`1727b58`).

## Part 3: Learning session — Node, npm, project structure

> **Me**: OK. First of all, I want to understand the project structure better. We now start our first lesson, where you are a senior programmer and teacher. I proactively will ask questions. You will answer, and potentially supply other materials to explore. I will eventually end the learning session and also make it into a skill so that I don't have to repeat myself that you are a senior programmer / teacher.

**Claude**: Sounds good. Fire away with your first question — I'm ready.

> **Me**: Let's start with project structure. I always don't get what is a node project. Like, node is like... a JS interpreter. Right? And npm is node project manager + package manager. People put node packages on internet and I use them, right? npm tracks dependency. Check if above is correct.

**Claude**: Mostly right, with clarifications:
- Node.js is a JS runtime (interpreter + standard library). Runs JS outside the browser.
- npm is a **package manager**, not a project manager. Two jobs: (1) registry at npmjs.com where people publish packages, (2) dependency tracking in `package.json` and `package-lock.json`.
- npm doesn't manage project structure or build steps — that's on you or tools like Vite.
- Important: in our project, Node never runs the editor code. The browser does. Node/npm is only the dev toolchain. Vite bundles everything into browser-ready JS.

> **Me**: Then what does `npm init` do? Doesn't it initialize a project?

**Claude**: Fair point — `npm init` does create the initial `package.json`, which makes a directory a "node project." But that's where it stops. It creates the manifest file and manages dependencies. It doesn't scaffold folders, set up build tools, or create config files. So "package manager that also initializes the manifest" is more accurate than "project manager."

> **Me**: Hmm.. I'm having a headache now. `npm init` does initialize a minimal node project. Why do I have to bother with vite or any other framework? More vanilla, less dependencies, better it is.

**Claude**: Explained the core problem step by step:
1. Browser loads `index.html`
2. HTML references `01-basic-editor.js`
3. That JS has `import ... from "prosemirror-state"`
4. Browser sees `"prosemirror-state"` — just a name, not a URL. Browser can't resolve it.
5. `node_modules/` exists on disk but browsers can't read from it.

Vite's job is narrow: it intercepts bare imports like `"prosemirror-state"` and resolves them to actual files in `node_modules/`. Thinnest possible bridge.

Without Vite, alternatives are: copy-paste source files (fragile), or use CDN URLs (skip npm entirely).

> **Me**: OK I'm having another headache. Let's put vite aside for now. So `npm init` sets up minimal node project, which is essentially a file `node_modules` containing downloaded modules for this node project, and some json files that keeps track of versionings and dependencies of used node modules. Correct?

**Claude**: Almost. `npm init` only creates `package.json`. There's no `node_modules/` yet. That appears when you run `npm install`. The three things:
- `package.json` — you declare what you need (created by `npm init`)
- `package-lock.json` — auto-generated, locks exact versions
- `node_modules/` — auto-generated, the actual downloaded code (never committed)

Sequence: `npm init` → `package.json` → `npm install <pkg>` → `node_modules/` + `package-lock.json`

> **Me**: Hmmm.... so npm init starts a new package? Given that the name is `package.json`?

**Claude**: Yes. In npm's world, your project is itself a package. No distinction — a package is just a directory with a `package.json`. The packages in `node_modules/` each have their own `package.json` too. Same format. Packages all the way down.

> **Me**: OK OK so this is very important. npm is _package manager_ and `npm init` starts a new package, which we use it as like a project.

**Claude**: Yes. That's exactly right.

> **Me**: Write current findings to lessons/ directory.

**Claude**: Created `lessons/01-node-npm-project-structure.md`.

> **Me**: Hmm... can you challenge the view that something like vite is needed? I need both pros and cons of the choice.

**Claude**: Steelmanned the "no Vite" approach:
- You can use CDN URLs: `import { EditorState } from "https://esm.sh/prosemirror-state"` — no Node, no npm, no bundler. Just HTML.
- Or use browser-native import maps to map bare names to CDN URLs.

Trade-offs:
| | CDN / import maps | npm + Vite |
|---|---|---|
| Simplicity | Just HTML files, zero tooling | Need Node, npm, Vite |
| Offline dev | No | Yes |
| Version control | Pin in URL or trust CDN | Lock file pins exact versions |
| Dependencies | List every sub-dep manually | npm handles transitives |
| CSS imports | Manual `<link>` tags | `import "foo/style.css"` works |
| Hot reload | Manual refresh | Automatic |

For a learning project, CDN approach is honestly fine. We went with Vite because ProseMirror has many interconnected packages with transitive dependencies.

> **Me**: Hmmm I just don't get CDN nor what you mean. I honestly don't know where I got confused too. We should start with how web servers work maybe? Like, what problem in the beginning Vite solves?

**Claude**: Went from the ground up:
1. You type a URL → browser asks the server for the page
2. Server sends `index.html`
3. Browser sees `<script src="...">` → asks for that file
4. Server sends the JS
5. Browser reads JS, sees `import ... from "prosemirror-state"` → needs that too
6. **Problem**: `"prosemirror-state"` is just a name, not a URL. Browser is stuck.

A simple server (like `python3 -m http.server`) just serves files. It can't rewrite bare imports.

**Vite is a web server that's smart enough to solve step 6.** It rewrites bare imports to actual `node_modules/` paths before sending to the browser.

> **Me**: Yes, please update that in lesson file

**Claude**: Updated the lesson with the step-by-step browser loading explanation.

> **Me**: Relative imports sounds fine though?

**Claude**: It sounds fine until you look inside `node_modules/`. You could rewrite your own imports to relative paths. But the code *inside* `prosemirror-state` also uses bare imports like `import { ... } from "prosemirror-model"`. You'd have to edit third-party code that gets wiped on every `npm install`. Relative imports work for your own code; the problem is packages use bare imports internally and you can't change that.

> **Me**: So: `vite` fires up a smart server that allows me to import node packages directly, and do hot reloading, and allow to import css directly etc. Right? I think I'm afraid that I depend on one framework in the beginning as a beginner. Hmm... do I need something like this essentially, as npm package is not meant as a whole webpage with `index.html`, but pure JS package???

**Claude**: Yes, exactly. npm packages are JS code, not webpages. Something always has to bridge that gap. But Vite is a **build tool, not a framework**. Your code doesn't depend on it — look at `01-basic-editor.js`, there's nothing Vite-specific. If you swapped Vite for webpack, zero lines of application code change. It's like choosing a text editor — doesn't affect the code itself.

> **Me**: update the lesson file with this

**Claude**: Updated lesson with sections on relative imports, the fundamental gap, and Vite as build tool vs framework.

> **Me**: Divide sections of the lesson file by npm and vite/other bridges.

**Claude**: Reorganized into Part 1 (Node.js and npm) and Part 2 (Bridging npm to browser).

> **Me**: Split into two files please?

**Claude**: Split into `lessons/01-node-and-npm.md` and `lessons/02-bridging-npm-to-browser.md`, removed the old combined file.

## Part 4: Setting up for future sessions

> **Me**: I want to set up this Claude Code so that next time I fire up CC then I can talk with you, ask questions, learn things, and store the results in lessons/ file. How can I set it up?

**Claude**: Updated `CLAUDE.md` with:
- Role: senior programmer and teacher
- Workflow: examples in `examples/`, lessons in `lessons/`, conversations in `conversations/`
- References: read existing lessons at session start to avoid repeating material

> **Me**: Store current conversation in conversations/ folder

**Claude**: Saved this conversation.
