---
name: text-tree-diagrams
description: Render call stacks, flow diagrams, sequence diagrams, file trees, and other hierarchical structures as clear ASCII-style text trees. Use this skill whenever the user asks for a diagram, how the code works, execution path, hierarchy, or asks to improve an existing tree. Apply these conventions to every diagram response
---

## Call-stack Tree Diagrams

Use this format when the main information is hierarchical: call stacks, flow diagrams, sequence-like flows, file trees, module trees, and execution plans. Make the tree the primary artifact and keep surrounding prose short.

During planning, explain procedure, endpoint, or method structure with a tree instead of implementation code unless the user requests code.

### Tree Structure

- Put the root or entry point on the first line.
- Put one node on each line.
- Indent each child by four spaces relative to its parent. Nodes at the same depth must start in the same column.
- Use `├──` for a sibling followed by another sibling, and `└──` for the final sibling.
- Carry `│` through an ancestor that has later siblings. Use spaces when that ancestor is the final sibling.
- Order calls or steps from top to bottom. Use nesting to show containment or call depth.
- Keep lifecycle steps, long-running loops, and per-item or per-request work visibly separate when they repeat differently.
- Keep one tree uninterrupted. Use blank lines only between separate trees or before footnotes.

### Inline Annotations

- Put a short reason or qualifier after a node with `←`. Keep it to eight words or fewer when possible.
- Use a footnote marker such as `[1]` when an explanation would make the tree hard to scan.
- Keep annotations on the same line as their node. Put longer context below the tree in a **Footnotes** table.

```text
loadConfig(".env") ← read environment variables
authenticate() ← validate session or JWT
throw 401 ← stop the request
```

```text
connectDB(url) [1]
```

| Marker | Context |
| --- | --- |
| [1] | A shared pool avoids a connection handshake per request. |

Footnotes are optional when every node is self-explanatory.

### Control Flow

Label repetition explicitly and indent the repeated work beneath the loop.

```text
listen(port)
└── for each request:
    ├── parseHeaders()
    └── process(request)
```

For bounded retries or numbered iterations, make the attempts siblings of the retry node:

```text
connectDB(url)
└── retry loop ×3:
    ├── attempt 1: openSocket() ✗ timeout
    ├── attempt 2: openSocket() ✗ timeout
    └── attempt 3: openSocket() ✓ connected
```

Represent conditional branches as children of the decision or routing node. Use `otherwise` for the final branch:

```text
routeMatch(url)
├── if /api/*:
│   └── handleAPI()
├── if /static/*:
│   └── serveFile()
└── otherwise:
    └── serveIndex()
```

Nested conditionals follow the same indentation rule:

```text
authenticate()
├── if token valid:
│   └── attachUser()
└── otherwise:
    └── throw 401
```

### Status Markers

- Use `✓` for success, optionally followed by the result: `✓ connected`.
- Use `✗` for failure, followed by the reason when useful: `✗ deadlock`.
- Keep the marker on the same line as the operation it describes.

## Example

### Server Startup and Request Handling

```text
main()
├── init() ← entry point; runs first
│   ├── loadConfig(".env") ← read environment
│   ├── connectDB(url) [1]
│   │   └── retry loop ×3
│   │       ├── attempt 1: openSocket() ✗ timeout
│   │       ├── attempt 2: openSocket() ✗ timeout
│   │       └── attempt 3: openSocket() ✓ connected
│   └── registerPlugins()
│       └── for each plugin in [auth, cache, cors]:
│           └── plugin.setup() ← run setup hook
├── listen(port) ← blocking loop
│   └── for each request:
│       ├── parseHeaders() ← method, path, cookies
│       ├── routeMatch(url) [2]
│       │   ├── if /api/*:
│       │   │   └── handleAPI()
│       │   ├── if /static/*:
│       │   │   └── serveFile()
│       │   └── otherwise:
│       │       └── serveIndex()
│       ├── authenticate() ← validate session or JWT
│       │   ├── if token valid:
│       │   │   └── attachUser()
│       │   └── otherwise:
│       │       └── throw 401 ← stop request
│       └── handler.process()
│           ├── validateBody() ← required fields and types
│           ├── if businessRule(X): [3]
│           │   └── applyDiscount()
│           └── saveToDb()
│               └── retry loop [4]
│                   ├── attempt 1: insert() ✗ deadlock
│                   └── attempt 2: insert() ✓ success
└── cleanup() [5]
    ├── disconnectDB()
    └── flushLogs()
```

**Footnotes**

| Marker | Context |
| --- | --- |
| [1] | A shared pool avoids opening a new database connection per request. |
| [2] | Prefix routing selects the API, static-file, or SPA pipeline. |
| [3] | The promotion rule is gated by the current campaign and user segment. |
| [4] | The bounded retry absorbs transient database deadlocks; the final failure propagates. |
| [5] | Graceful shutdown stops intake, drains work, flushes logs, and closes sockets. |
