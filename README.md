# opencode-pstack

An OpenCode plugin starter package.

## Development

```bash
pnpm install
pnpm check
```

The plugin entrypoint is `src/index.ts`. Add hooks, tools, or other OpenCode
extensions there and export them from the plugin function.

## Local Usage

Build the package, then add it to an OpenCode project in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/absolute/path/to/opencode-pstack"]
}
```

For a published package, use `"opencode-pstack"` instead.
