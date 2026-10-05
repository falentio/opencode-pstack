import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// Registration path loads from the shipped build (dist/), never src/: the
// package root relative to dist/src/index.js differs from src/index.ts,
// and users execute the built artifact. `pnpm check` builds before testing.
import plugin from "../dist/src/index.js";
import { skillDirNames } from "./skill-dirs.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(packageRoot, "skills");

type Captured = {
  skills: Array<{ id: string; name: string; description: string; path: string; content: string }>;
  tools: Array<{ name: string }>;
  agents: Array<{ id: string; name: string; description?: string; mode: string; system?: string }>;
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
  const agentEditor = {
    list: () => [...captured.agents],
    get: () => undefined,
    default: () => {},
    remove: () => {},
    update: (id: string, fn: (agent: Captured["agents"][number]) => void) => {
      const existing = captured.agents.find((agent) => agent.id === id);
      const agent = existing ?? { id, name: id, mode: "primary", description: undefined, system: undefined };
      fn(agent);
      if (!existing) captured.agents.push(agent);
    },
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
    agent: {
      transform: async (cb: (editor: typeof agentEditor) => void) => {
        cb(agentEditor);
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
  const captured: Captured = { skills: [], tools: [], agents: [], hooks: [] };
  const cleanup = await plugin.setup(mockContext(captured) as never);
  assert.deepEqual(
    captured.skills.map((skill) => skill.id),
    skillDirNames(skillsDir),
    "every skill directory registers",
  );
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
  const captured: Captured = { skills: [], tools: [], agents: [], hooks: [] };
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
  const captured: Captured = { skills: [], tools: [], agents: [], hooks: [] };
  await plugin.setup(mockContext(captured) as never);
  assert.ok(captured.hooks.includes("compaction"), `hooks: ${captured.hooks.join(",")}`);
  assert.ok(captured.hooks.includes("context"), `hooks: ${captured.hooks.join(",")}`);
});

test("v2 setup registers both agents from build", async () => {
  const captured: Captured = { skills: [], tools: [], agents: [], hooks: [] };
  await plugin.setup(mockContext(captured) as never);
  assert.deepEqual(
    captured.agents.map((agent) => agent.id),
    ["comment-sicko", "poteto-agent"],
    "agents registered in stable sorted order",
  );
  for (const agent of captured.agents) {
    assert.equal(agent.mode, "subagent");
    assert.ok(agent.description && agent.description.length > 0);
    assert.ok(agent.system && agent.system.length > 0);
  }
  assert.ok(captured.agents.find((agent) => agent.id === "poteto-agent")!.system!.includes("# Poteto subagent"));
  assert.ok(captured.agents.find((agent) => agent.id === "comment-sicko")!.system!.includes("# Comment Sicko"));
});
