# opencode-pstack

An OpenCode plugin port of the [pstack](https://github.com/cursor/plugins/tree/main/pstack)
plugin by Lauren Tan. pstack is a set of rigorous agent workflow skills and
subagents from the Cursor plugin ecosystem, ported to run natively inside
OpenCode.

## Install

Add the package to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-pstack"]
}
```

For a local checkout, point at the package directory instead:

```json
{
  "plugin": ["/abs/path/to/opencode-pstack"]
}
```

On the next OpenCode start, the plugin registers its `skills/` directory and
its two subagents into the OpenCode config. Skills appear in the native `skill`
tool. The agents `poteto-agent` and `comment-sicko` are available as subagents.
No files are copied anywhere.

## Get started

Run the `poteto-mode` skill at the start of a task:

```
/poteto-mode this pr has a subtle bug where the scroll drifts every 750ms. repro first, then fix and verify.
```

`poteto-mode` reads your request, picks from a set of playbooks, and routes to
the other skills as needed. Subagents inherit the parent chat model by default. Name a model in a `Task` call when a particular subagent needs to differ.

New here? The [pstack guide](docs/guide/README.md) walks you through a first
real task, from setup and prompting through verification and overnight runs.

## How the port works

OpenCode loads plugins as npm packages and does not scan them for skills or
agents. This plugin's `config` hook registers both programmatically:

- `config.skills.paths` is extended with the package's `skills/` directory, so
  the native `skill` tool discovers every skill.
- `config.agent` is extended with `poteto-agent` and `comment-sicko`, reading
  each agent's `description` and body from the bundled markdown files.

The `config` hook is the only surface. It adds to the user's config; it never
replaces existing skill paths or clobbers existing agents.

## Differences from the Cursor plugin

- Two skill frontmatter `name` fields were normalized to their directory names
  (`Poteto Mode` → `poteto-mode`, `Make Bot UI` → `make-bot-ui`), because
  OpenCode requires the frontmatter `name` to equal the skill directory name.
- The two agents are registered with `mode: subagent`; Cursor used its own
  `is_background` flag which OpenCode does not understand.
- The Cursor `automations/benny` directory is not ported. Those are Slack issue
  automations that depend on Cursor's automation runtime; OpenCode has no
  equivalent.
- Model choices and reviewer defaults in the skills reference Cursor's
  `Task` subagent API. The skills are instruction documents, so they remain
  useful, but the model names they mention (`grok-4.6-fast-xhigh`,
  `claude-fable-5-thinking-max`, etc.) are examples from the Cursor setup;
  OpenCode exposes providers under `provider/model-id` names.

## Development

```bash
pnpm install
pnpm check
```

`pnpm check` runs typecheck, build, and the `node --test` suite against the
bundled skills and agents.