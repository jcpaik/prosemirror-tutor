# 26 - Collaborative Editing Concepts

## Start with the distributed loop

One editor loop is local:

```text
transaction -> new state -> view update
```

Collaboration adds another loop around it:

```text
local transaction -> send steps -> authority orders them
remote steps -> receive transaction -> local state updates
```

The matching example is `examples/26-collaborative-editing.js`.

## The authority owns the order

ProseMirror collaboration uses a central authority model. The authority is the
source of truth for the order of accepted steps.

Each accepted step increments the document version. In the simple model, the
version is just the number of accepted steps.

```text
authority version 5
client A sends steps based on 5 -> accepted, version becomes 7
client B sends steps based on 5 -> stale, must receive and rebase
```

A minimal authority stores:

- The canonical document.
- All accepted steps.
- The client ID for each step.
- A way to notify connected clients.

```js
class Authority {
  constructor(doc) {
    this.doc = doc;
    this.steps = [];
    this.stepClientIDs = [];
    this.onNewSteps = [];
  }

  receiveSteps(version, steps, clientID) {
    if (version !== this.steps.length) return false;

    for (const step of steps) {
      const result = step.apply(this.doc);
      if (result.failed) return false;
      this.doc = result.doc;
      this.steps.push(step);
      this.stepClientIDs.push(clientID);
    }

    this.onNewSteps.forEach(f => f());
    return true;
  }

  stepsSince(version) {
    return {
      steps: this.steps.slice(version),
      clientIDs: this.stepClientIDs.slice(version),
    };
  }
}
```

Real servers need persistence, authentication, transport, and error handling,
but the conceptual job stays small: order steps and publish accepted steps.

## The collab plugin tracks local uncertainty

`prosemirror-collab` supplies the client-side state machine.

```js
import {
  collab,
  sendableSteps,
  receiveTransaction,
  getVersion,
} from "prosemirror-collab";

const state = EditorState.create({
  doc: authority.doc,
  plugins: [collab({ version: authority.steps.length })],
});
```

The plugin tracks:

- The confirmed version this client has seen.
- Local steps that have been applied optimistically but not confirmed.

The user's typing still feels instant because local transactions apply
immediately. Confirmation catches up afterward.

## Sending local steps

After each local transaction, ask the plugin whether it has unconfirmed steps to
send.

```js
dispatchTransaction(tr) {
  const newState = view.state.apply(tr);
  view.updateState(newState);

  const sendable = sendableSteps(newState);
  if (sendable) {
    authority.receiveSteps(
      sendable.version,
      sendable.steps,
      sendable.clientID,
    );
  }
}
```

`sendableSteps` returns `null` when there is nothing to send. Otherwise it
returns `{ version, steps, clientID, origins }`.

## Receiving remote steps

When the authority reports new steps, pull everything since this client's
confirmed version and turn those steps into a transaction.

```js
const version = getVersion(view.state);
const data = authority.stepsSince(version);

if (data.steps.length) {
  const tr = receiveTransaction(view.state, data.steps, data.clientIDs);
  view.dispatch(tr);
}
```

`receiveTransaction` integrates the remote steps and updates the collab plugin
state.

## Rebasing is mapping applied to steps

The hard case is: this client has unconfirmed local steps, and remote steps
arrive first. The local steps were written against an older document.

`receiveTransaction` rebases them:

```text
base -> local A
base -> remote X

becomes

base -> remote X -> mapped local A'
```

This uses the mapping machinery from the mapping lesson. If a remote step deletes the
content a local step depended on, that local step may be dropped.

## Where this sits in the loop

```text
Local command/input
  dispatches transaction with steps

collab plugin
  records unconfirmed local steps

Authority
  accepts ordered steps by version

receiveTransaction
  applies remote steps and rebases local pending steps
```

Collaboration is not a separate document model. It is transactions and steps
crossing a network boundary.

## Takeaways

- The authority decides the canonical order of steps.
- Versions are step counts in the basic model.
- `collab` tracks confirmed and unconfirmed local work.
- `sendableSteps` sends local steps; `receiveTransaction` receives remote ones.
- Mapping is what lets pending local work survive remote edits.
