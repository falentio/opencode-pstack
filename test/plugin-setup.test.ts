import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// Registration path loads from the shipped build (dist/), never src/: the
// package root relative to dist/src/index.js differs from src/index.ts,
// and users execute the built artifact. `pnpm check` builds before testing.
import plugin from "../dist/src/index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(packageRoot, "skills");

type Captured = {
  skills: Array<{ id: string; name: string; description: string; path: string; content: string }>;
  tools: Array<{ name: string }>;
  hooks: string[];
};

function mockContext(captured: Captured): unknown {
  const skillEditor = {
    add: (skill: Captured["skills"][number]) => {
      captured.skills.push(skill);
    },
    list: () => [...captured.skills],
    get: () => undefined,
    update: () => {},
    remove: () => {},
  };
  const toolEditor = {
    add: (tool: Captured["tools"][number]) => {
      captured.tools.push(tool);
    },
    list: () => [...captured.tools],
    get: () => undefined,
    update: () => {},
    remove: () => {},
    namespace: () => {},
  };
  return {
    skill: {
      transform: async (cb: (editor: typeof skillEditor) => void) => {
        cb(skillEditor);
        return { dispose: async () => {} };
      },
    },
    tool: {
      transform: async (cb: (editor: typeof toolEditor) => void) => {
        cb(toolEditor);
        return { dispose: async () => {} };
      },
    },
    session: {
      hook: async (name: string) => {
        captured.hooks.push(name);
        return { dispose: async () => {} };
      },
      get: async () => {
        throw new Error("no session in unit test");
      },
    },
    event: {
      subscribe: async function* () {},
    },
  };
}

test("v2 setup registers the skill bundle from build", async () => {
  assert.equal(plugin.id, "pstack");
  const captured: Captured = { skills: [], tools: [], hooks: [] };
  const cleanup = await plugin.setup(mockContext(captured) as never);
  assert.ok(captured.skills.length >= 50, `expected at least 50 skills, saw ${captured.skills.length}`);
  const poteto = captured.skills.find((skill) => skill.id === "poteto-mode");
  assert.ok(poteto, "poteto-mode skill registered");
  assert.ok(poteto.path.startsWith(skillsDir), `skill path outside bundle: ${poteto.path}`);
  assert.ok(poteto.content.includes("# Poteto mode"), "skill body is the real SKILL.md content");
  assert.deepEqual(
    captured.skills.map((skill) => skill.id),
    [...captured.skills.map((skill) => skill.id)].sort(),
    "skills registered in stable sorted order",
  );
  assert.equal(typeof cleanup, "function");
  (cleanup as () => void)();
});

test("v2 setup registers the 25 poteto tools", async () => {
  const captured: Captured = { skills: [], tools: [], hooks: [] };
  await plugin.setup(mockContext(captured) as never);
  assert.equal(captured.tools.length, 25);
  assert.equal(new Set(captured.tools.map((tool) => tool.name)).size, 25);
  for (const name of ["poteto_check_plan", "poteto_orch_init", "poteto_watch_pr_status", "poteto_worktree_audit"]) {
    assert.ok(
      captured.tools.some((tool) => tool.name === name),
      name,
    );
  }
});

test("v2 setup hooks compaction resume and session context", async () => {
  const captured: Captured = { skills: [], tools: [], hooks: [] };
  await plugin.setup(mockContext(captured) as never);
  assert.ok(captured.hooks.includes("compaction"), `hooks: ${captured.hooks.join(",")}`);
  assert.ok(captured.hooks.includes("context"), `hooks: ${captured.hooks.join(",")}`);
});
