// Local-discovery entrypoint (opencode v2).
// `.opencode/plugins/` discovery resolves a package directory to its root
// index file and does not consult package.json `exports`, so a checkout
// symlinked under `.opencode/plugins/` would otherwise be skipped silently.
// Published npm installs are unaffected: resolvers prefer `exports`.
export { default } from "./dist/src/index.js";
