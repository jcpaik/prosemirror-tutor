// 26-collaborative-editing.js
// Collaborative Editing: two editors sharing one document via a central Authority.
//
// This example creates two ProseMirror editor instances ("Client A" and
// "Client B") that synchronize through an in-memory Authority. Typing in one
// editor appears in the other after a brief simulated network delay. A log
// panel at the bottom shows every step being sent, received, and applied.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema } from "prosemirror-schema-basic";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { history, undo, redo } from "prosemirror-history";
import { collab, sendableSteps, receiveTransaction, getVersion } from "prosemirror-collab";

// ── Logging utility ────────────────────────────────────────
// All collab events appear here so you can follow the protocol.
const logLines = [];
const MAX_LOG_LINES = 80;
function log(msg) {
  logLines.push(msg);
  if (logLines.length > MAX_LOG_LINES) logLines.shift();
  renderLog();
}

// ── Authority ──────────────────────────────────────────────
// The central source of truth. In a real app this lives on a server.
// It stores every step ever applied and the client ID that produced it.
class Authority {
  constructor(doc) {
    this.doc = doc;            // The canonical document
    this.steps = [];           // All accepted steps, in order
    this.stepClientIDs = [];   // Parallel array: who sent each step
    this.onNewSteps = [];      // Callbacks to notify clients
  }

  // Called when a client wants to submit steps.
  // `version` is the step count the client thinks the doc is at.
  // If it doesn't match our current count, the steps are stale → reject.
  receiveSteps(version, steps, clientID) {
    if (version !== this.steps.length) {
      log(`[Authority] REJECTED steps from ${clientID} (version ${version}, current ${this.steps.length})`);
      return false;
    }

    // Apply each step to the authoritative document
    steps.forEach(step => {
      const result = step.apply(this.doc);
      this.doc = result.doc;
      this.steps.push(step);
      this.stepClientIDs.push(clientID);
    });

    log(`[Authority] Accepted ${steps.length} step(s) from ${clientID}  →  version ${this.steps.length}`);

    // Notify all connected clients that new steps are available
    this.onNewSteps.forEach(f => f());
    return true;
  }

  // Returns all steps (and their client IDs) since a given version.
  stepsSince(version) {
    return {
      steps: this.steps.slice(version),
      clientIDs: this.stepClientIDs.slice(version),
    };
  }
}

// ── Build the initial document ─────────────────────────────
const initDoc = schema.node("doc", null, [
  schema.node("paragraph", null, [
    schema.text("Type in either editor. Changes sync through the Authority."),
  ]),
  schema.node("paragraph", null, [
    schema.text("Watch the log below to see steps being sent and received."),
  ]),
]);

const authority = new Authority(initDoc);

// ── Simulated network delay (ms) ───────────────────────────
// Set to 0 for instant sync, or increase to see the lag.
const NETWORK_DELAY = 300;

// ── Create a collaborative editor ──────────────────────────
// This function wires up one editor instance to the shared Authority.
function createCollabEditor(place, clientName) {
  const state = EditorState.create({
    doc: authority.doc,
    plugins: [
      // The collab plugin tracks which version this client has confirmed
      // and which local steps are still unconfirmed.
      collab({ version: authority.steps.length }),
      history(),
      keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
      keymap(baseKeymap),
    ],
  });

  const view = new EditorView(place, {
    state,
    dispatchTransaction(transaction) {
      // 1. Apply the transaction locally (instant — no waiting)
      const newState = view.state.apply(transaction);
      view.updateState(newState);

      // 2. Check if there are unconfirmed steps to send
      const sendable = sendableSteps(newState);
      if (sendable) {
        log(`[${clientName}] Sending ${sendable.steps.length} step(s) (based on version ${sendable.version})`);

        // Simulate network delay before the Authority receives the steps
        setTimeout(() => {
          authority.receiveSteps(sendable.version, sendable.steps, sendable.clientID);
        }, NETWORK_DELAY);
      }
    },
  });

  // Listen for new steps from the Authority.
  // When the Authority accepts steps (from ANY client), every client
  // is notified and pulls the steps it hasn't seen yet.
  authority.onNewSteps.push(function () {
    // Simulate network delay for receiving
    setTimeout(() => {
      const version = getVersion(view.state);
      const newData = authority.stepsSince(version);
      if (newData.steps.length === 0) return;

      log(`[${clientName}] Receiving ${newData.steps.length} step(s) (version ${version} → ${version + newData.steps.length})`);

      // receiveTransaction builds a transaction that:
      //   - Applies the remote steps
      //   - Rebases any unconfirmed local steps on top of them
      const tr = receiveTransaction(view.state, newData.steps, newData.clientIDs);
      view.dispatch(tr);
    }, NETWORK_DELAY);
  });

  return view;
}

// ── Build the UI ───────────────────────────────────────────
const root = document.querySelector("#editor");
root.innerHTML = "";
root.style.cssText = "display:flex; flex-direction:column; gap:12px;";

// Header
const header = document.createElement("div");
header.innerHTML =
  "<strong>Collaborative Editing Demo</strong> — two editors, one Authority. " +
  "Network delay: " + NETWORK_DELAY + "ms.";
header.style.cssText = "font-size:13px; color:#555; margin-bottom:4px;";
root.appendChild(header);

// Editor containers side by side
const editorsRow = document.createElement("div");
editorsRow.style.cssText = "display:flex; gap:12px;";
root.appendChild(editorsRow);

function makeEditorPanel(label) {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "flex:1; min-width:0;";

  const labelEl = document.createElement("div");
  labelEl.textContent = label;
  labelEl.style.cssText =
    "font-weight:bold; font-size:13px; margin-bottom:4px; padding:4px 8px;" +
    "background:#e8edf2; border-radius:4px 4px 0 0;";
  wrapper.appendChild(labelEl);

  const editorEl = document.createElement("div");
  editorEl.style.cssText = "border:1px solid #c0d0e0; min-height:100px;";
  wrapper.appendChild(editorEl);

  editorsRow.appendChild(wrapper);
  return editorEl;
}

const editorA = makeEditorPanel("Client A");
const editorB = makeEditorPanel("Client B");

// Log panel
const logLabel = document.createElement("div");
logLabel.textContent = "Collab Log";
logLabel.style.cssText =
  "font-weight:bold; font-size:13px; margin-bottom:4px; padding:4px 8px;" +
  "background:#e8edf2; border-radius:4px 4px 0 0;";
root.appendChild(logLabel);

const logEl = document.createElement("pre");
logEl.style.cssText =
  "margin:0; padding:8px; background:#f0f4f8; border:1px solid #c0d0e0;" +
  "font-size:11px; max-height:200px; overflow:auto; line-height:1.4;" +
  "white-space:pre-wrap; word-break:break-word;";
root.appendChild(logEl);

function renderLog() {
  logEl.textContent = logLines.join("\n");
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Create the two editors ─────────────────────────────────
log("[Authority] Initial document loaded (version 0)");

const viewA = createCollabEditor(editorA, "Client A");
const viewB = createCollabEditor(editorB, "Client B");

log("[System] Both editors connected. Start typing!");

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Type a few characters in Client A. After the network delay,
//      watch them appear in Client B. Check the log to see the
//      version numbers incrementing.
//
//   2. Type simultaneously in BOTH editors. The Authority accepts
//      whoever arrives first and the other client's steps get
//      rebased automatically. Watch the log for "Receiving" messages.
//
//   3. Try changing NETWORK_DELAY to 0 at the top of this file.
//      With zero delay the sync is instant — both editors feel
//      like one.
//
//   4. Change NETWORK_DELAY to 1000 (1 second). Type fast in both
//      editors. Notice how the collab plugin gracefully merges
//      even heavily overlapping edits.
//
//   5. Look at the Authority class. It never does anything clever —
//      it just stores steps and applies them. All the rebasing
//      intelligence lives in the collab plugin's receiveTransaction.
