# @falentio/opencode-pstack

An OpenCode plugin port of the [pstack](https://github.com/cursor/plugins/tree/main/pstack)
plugin by Lauren Tan. pstack is a set of rigorous agent workflow skills and
subagents from the Cursor plugin ecosystem, ported to run natively inside
OpenCode.

## Install

Add the package to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@falentio/opencode-pstack"]
}
```

For a local checkout, point at the package directory instead:

```json
{
  "plugin": ["/abs/path/to/your/checkout"]
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
the other skills as needed. OpenCode subagents always inherit the parent chat
model. OpenCode does not support selecting a different model for an individual
subagent, so every `Task` call omits `Task.model`. Parallel subagents provide
independent passes, not model diversity.

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
- Cursor's pstack relies on per-subagent model selection for some delegates,
  reviewer panels, and judges. OpenCode has no per-subagent model selection.
  This port therefore omits `Task.model` everywhere and runs every subagent on
  the parent chat model. The skills retain parallelism and independent review,
  but cannot provide Cursor's model diversity.

## Development

```bash
pnpm install
pnpm check
```

`pnpm check` runs typecheck, build, and the `node --test` suite against the
bundled skills and agents.

## Release

Update `package.json` to the release version, then push a matching version tag:

```bash
pnpm version patch --no-git-tag-version
git add package.json
git commit -m "release: v0.1.1"
git tag v0.1.1
git push origin main v0.1.1
```

The publish workflow accepts tags in the `v<version>` format. It runs the full
check suite, verifies the npm tarball in a temporary OpenCode installation, and
publishes that exact tarball.

Add a granular npm publish token with two-factor-authentication bypass to the
repository secret `NPM_TOKEN`. Keep the token scoped to this package and set an
expiration date.
