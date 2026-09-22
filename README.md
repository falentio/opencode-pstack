# @falentio/opencode-pstack

An OpenCode plugin port of the [pstack](https://github.com/cursor/plugins/tree/main/pstack)
plugin by Lauren Tan. pstack is a set of rigorous agent workflow skills and
subagents from the Cursor plugin ecosystem, ported to run natively inside
OpenCode.

## Install

This plugin targets OpenCode v2 only (`@opencode/plugin` 2.x). Add the package
to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@falentio/opencode-pstack"]
}
```

For a local checkout, symlink the package directory under `.opencode/plugins/`:

```bash
mkdir -p .opencode/plugins
ln -s /abs/path/to/your/checkout .opencode/plugins/pstack
```

The checkout root carries a one-line `index.js` re-exporting `dist/src/index.js`
for exactly this case: v2 discovery resolves a package directory to its root
index file and ignores `package.json` `exports`. Published npm installs are
unaffected (resolvers prefer `exports`).

On the next OpenCode start, the plugin registers its skills and its
`poteto_*` tools into each session. Skills appear in the native `skill` tool.
No files are copied anywhere.

### Subagents

OpenCode v2 plugins cannot inject agents (the agent editor exposes update,
remove, and default, but no add). The two subagents therefore ship as files —
copy them into the project to use them as subagents:

```bash
mkdir -p .opencode/agents
cp /abs/path/to/your/checkout/agents/*.md .opencode/agents/
```

The agents `poteto-agent` and `comment-sicko` are then available as subagents
with `mode: subagent`.

## Get started

Run `poteto-mode` for full instructions or `poteto-mode-compact` for the compact
instruction set at the start of a task:

```
/poteto-mode this pr has a subtle bug where the scroll drifts every 750ms. repro first, then fix and verify.
```

Use `/poteto-mode-compact` when you want the same playbook routing with the
compact skill.

`poteto-mode` reads your request, picks from a set of playbooks, and routes to
the other skills as needed. OpenCode subagents always inherit the parent chat
model. OpenCode does not support selecting a different model for an individual
subagent, so every `Task` call omits `Task.model`. Parallel subagents provide
independent passes, not model diversity.

New here? The [pstack guide](docs/guide/README.md) walks you through a first
real task, from setup and prompting through verification and overnight runs.

## How the port works

This plugin is built on the OpenCode v2 plugin API (`Plugin.define` with an
`id` and a `setup(ctx)` entrypoint). `setup` registers everything through
domain transforms and session hooks:

- `ctx.skill.transform` adds the package's `skills/` bundle (50 skills), so
  the native `skill` tool serves every skill inside sessions. Plugin-added
  skills are session-scoped in v2: they never appear in `api skill.list`
  (which shows only the file-discovery layer), and there is no `debug skill`
  command. A live session that loads `poteto-mode` is the registration proof.
- Agents cannot be registered programmatically in v2, so `agents/` ships as
  `poteto-agent.md` and `comment-sicko.md` for file-based install (see above).
  The `src/catalog.ts` parser still validates both files (description,
  `mode: subagent`, prompt body) and the suite enforces it.

The plugin also registers native `poteto_*` tools through the `tool` hook, so
playbooks call tools instead of shelling to scripts:

- `poteto_check_plan` checks a multi-phase plan file.
- `poteto_orch_*` (20 tools) manages the orchestrate store: init, units,
  ledger, inbox, gates, frontier, status, standing orders.
- `poteto_watch_pr_status`, `poteto_watch_pr_stack`, and
  `poteto_watch_pr_classify` read PR state single-shot. Callers re-invoke
  them to poll.
- `poteto_worktree_audit` lists non-main worktrees as TSV.

The transforms only add to the session catalog. They never replace existing
skills or clobber anything. `scripts/smoke.mjs` stays as the dev-only
model-free probe behind `pnpm smoke`: it boots a sandboxed location through
the real CLI and asserts the v2 layering (discovery shows file skills, the
plugin boots clean). Skill content is proved by `test/plugin-setup.test.ts`
and the verify-pstack live drive. It has no tool home.

## Differences from the Cursor plugin

- One skill frontmatter `name` field was normalized to its directory name
  (`Poteto Mode` → `poteto-mode`), because
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
- Four skills are opencode-native additions with no Cursor counterpart in pstack:
  `deslop` (diff cleanup before commit), `control-ui` and `control-cli`
  (drive the real UI or CLI and capture evidence), and `using-git-worktrees`
  (isolated workspaces via native tools or git worktree fallback).
- Stacking uses plain `git` branches plus `gh` (`gh pr create`, `gh pr edit
  --base`, bottom-up `gh` merges). There is no `gt` CLI and no Graphite UI,
  merge-when-ready, or `graphite-base` refs. Loops use background Tasks with
  poll instead of a built-in loop command, and goals live in a goal file the
  run re-reads. Session history comes from the opencode session API, not
  `~/.cursor/projects` transcript paths.

## Development

```bash
pnpm install
pnpm check
```

`pnpm check` runs typecheck, build, and the `node --test` suite against the
bundled skills and agents. It then runs `pnpm smoke`, which drives sandboxed
locations through the real CLI: `none` (empty config, built-ins boot clean),
`manual` (a native v2 `skills` config entry is accepted and the location boots)
and `plugin` (the checkout symlinked under `.opencode/plugins`, clean boot
with no agent injection). It skips rather than fails when `opencode` is not on
`PATH` outside CI. CI treats a missing or unusable OpenCode binary as a failed
smoke test. Skill content is proved by `test/plugin-setup.test.ts`, and
end-to-end skill proof (a live session loading `poteto-mode`) lives in the
verify-pstack skill, which needs model auth that CI smoke deliberately avoids.

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
check suite and publishes the package to npm with provenance.

Publishing uses npm trusted publishing, so the repository stores no publish
token. Set up the trusted publisher once on npmjs.com. Trust the GitHub
repository `falentio/opencode-pstack`, the workflow file `publish.yml`, and the
`npm publish` action. Publishing then authenticates with the GitHub Actions
OIDC identity from that workflow.
