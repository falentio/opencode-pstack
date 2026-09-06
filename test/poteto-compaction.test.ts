import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildResumeContext,
  findPotetoEvidence,
  handleCompacting,
  type PotetoSessionMessage,
} from "../src/poteto-compaction.ts";

function userText(text: string): PotetoSessionMessage {
  return { info: { role: "user" }, parts: [{ type: "text", text }] };
}

function toolMessage(tool: string, input: unknown): PotetoSessionMessage {
  return { info: { role: "assistant" }, parts: [{ type: "tool", tool, state: { input } }] };
}

function fakeClient(data: PotetoSessionMessage[] | Error, logs: unknown[]) {
  return {
    session: {
      messages: async () => {
        if (data instanceof Error) throw data;
        return { data };
      },
    },
    app: {
      log: async (entry: unknown) => {
        logs.push(entry);
      },
    },
  };
}

test("findPotetoEvidence matches a slash command", () => {
  const out = findPotetoEvidence([userText("please /poteto-mode resume")]);
  assert.ok(out);
  assert.equal(out.kind, "slash-command");
  assert.equal(out.mode, "full");
});

test("findPotetoEvidence matches the compact slash command", () => {
  const out = findPotetoEvidence([userText("please /poteto-mode-compact resume")]);
  assert.ok(out);
  assert.equal(out.kind, "slash-command");
  assert.equal(out.mode, "compact");
});

test("findPotetoEvidence rejects longer slash command names", () => {
  for (const text of ["/poteto-mode-compact-extra", "/poteto-mode_extra"]) {
    assert.equal(findPotetoEvidence([userText(text)]), null, text);
  }
});

test("findPotetoEvidence ignores mere discussion without a slash", () => {
  const out = findPotetoEvidence([userText("poteto-mode is interesting, tell me more")]);
  assert.equal(out, null);
});

test("findPotetoEvidence ignores assistant slash text", () => {
  const out = findPotetoEvidence([
    { info: { role: "assistant" }, parts: [{ type: "text", text: "/poteto-mode go" }] },
  ]);
  assert.equal(out, null);
});

test("findPotetoEvidence ignores a slash command with same-message opt out", () => {
  const cases = [
    "/poteto-mode opt out",
    "/poteto-mode please opt-out now",
    "/poteto-mode stop",
    "/poteto-mode disable for now",
    "/poteto-mode turn off please",
    "/poteto-mode exit",
    "/poteto-mode quit",
    "/poteto-mode-compact opt out",
  ];
  for (const text of cases) {
    assert.equal(findPotetoEvidence([userText(text)]), null, text);
  }
});

test("findPotetoEvidence matches a skill call for poteto-mode", () => {
  const out = findPotetoEvidence([toolMessage("skill", { name: "poteto-mode" })]);
  assert.ok(out);
  assert.equal(out.kind, "skill-call");
  assert.equal(out.mode, "full");
});

test("findPotetoEvidence matches an exact compact skill call", () => {
  const out = findPotetoEvidence([toolMessage("skill", { name: "poteto-mode-compact" })]);
  assert.ok(out);
  assert.equal(out.kind, "skill-call");
  assert.equal(out.mode, "compact");
});

test("findPotetoEvidence reads serialized exact skill input", () => {
  const out = findPotetoEvidence([toolMessage("skill", '{"name":"poteto-mode-compact"}')]);
  assert.ok(out);
  assert.equal(out.mode, "compact");
});

test("findPotetoEvidence ignores a skill call for another skill", () => {
  for (const input of [
    { name: "other-skill" },
    { name: "poteto-mode-compact-extra" },
    { description: "poteto-mode-compact" },
  ]) {
    const out = findPotetoEvidence([toolMessage("skill", input)]);
    assert.equal(out, null);
  }
});

test("findPotetoEvidence matches a task spawn for poteto-agent", () => {
  const out = findPotetoEvidence([toolMessage("task", { subagent_type: "poteto-agent" })]);
  assert.ok(out);
  assert.equal(out.kind, "agent-spawn");
  assert.equal(out.mode, "full");
});

test("findPotetoEvidence ignores a task spawn for another agent", () => {
  const out = findPotetoEvidence([toolMessage("task", { subagent_type: "other-agent" })]);
  assert.equal(out, null);
});

test("findPotetoEvidence returns the first hit in order", () => {
  const out = findPotetoEvidence([
    toolMessage("task", { subagent_type: "poteto-agent" }),
    userText("/poteto-mode go"),
  ]);
  assert.ok(out);
  assert.equal(out.kind, "agent-spawn");
});

test("findPotetoEvidence caps the scan at 300 messages", () => {
  const filler = Array.from({ length: 300 }, () => userText("just chatting"));
  const out = findPotetoEvidence([...filler, userText("/poteto-mode go")]);
  assert.equal(out, null);
});

test("findPotetoEvidence stays closed on malformed shapes", () => {
  const out = findPotetoEvidence([
    { info: { role: "user" }, parts: [{ type: "text", text: 42 } as unknown as string as never] } as unknown as PotetoSessionMessage,
    { info: { role: "assistant" }, parts: [{ type: "tool", tool: "skill" }] } as unknown as PotetoSessionMessage,
  ]);
  assert.equal(out, null);
});

test("buildResumeContext names the kind and stays under 80 words", () => {
  for (const mode of ["full", "compact"] as const) {
    for (const kind of ["slash-command", "skill-call", "agent-spawn"] as const) {
      const text = buildResumeContext({ kind, mode, detail: "x" });
      assert.ok(text.includes(kind));
      const skillPath = mode === "compact" ? "skills/poteto-mode-compact/SKILL.md" : "skills/poteto-mode/SKILL.md";
      const pickupPath =
        mode === "compact"
          ? "skills/poteto-mode-compact/playbooks/session-pickup.md"
          : "skills/poteto-mode/playbooks/session-pickup.md";
      assert.ok(text.includes(skillPath));
      assert.ok(text.includes(pickupPath));
      assert.ok(text.toLowerCase().includes("if the user opted out"));
      assert.ok(!text.includes("—"));
      assert.ok(!text.includes(":"));
      assert.ok(text.split(/\s+/).filter(Boolean).length < 80);
    }
  }
});

test("handleCompacting stays idle when no evidence exists", async () => {
  const logs: unknown[] = [];
  const client = fakeClient([userText("hello there")], logs);
  const output: { context: string[]; prompt?: string } = { context: [] };
  await handleCompacting(client as never, "s1", output);
  assert.deepEqual(output.context, []);
  assert.equal(output.prompt, undefined);
});

test("handleCompacting pushes one entry when evidence exists", async () => {
  const logs: unknown[] = [];
  const client = fakeClient(
    [userText("hi"), userText("/poteto-mode go"), toolMessage("skill", { name: "poteto-mode" })],
    logs,
  );
  const output: { context: string[]; prompt?: string } = { context: [] };
  await handleCompacting(client as never, "s1", output);
  assert.equal(output.context.length, 1);
  assert.ok(output.context[0].includes("slash-command"));
  assert.equal(output.prompt, undefined);
});

test("handleCompacting resumes compact mode from compact evidence", async () => {
  const logs: unknown[] = [];
  const client = fakeClient([toolMessage("skill", { name: "poteto-mode-compact" })], logs);
  const output: { context: string[]; prompt?: string } = { context: [] };
  await handleCompacting(client as never, "s1", output);
  assert.equal(output.context.length, 1);
  assert.ok(output.context[0].includes("skills/poteto-mode-compact/SKILL.md"));
  assert.ok(output.context[0].includes("skills/poteto-mode-compact/playbooks/session-pickup.md"));
  assert.equal(output.prompt, undefined);
});

test("handleCompacting fails closed when message fetch throws", async () => {
  const logs: unknown[] = [];
  const client = fakeClient(new Error("boom"), logs);
  const output: { context: string[]; prompt?: string } = { context: [] };
  await handleCompacting(client as never, "s1", output);
  assert.deepEqual(output.context, []);
  assert.equal(output.prompt, undefined);
  assert.equal(logs.length, 1);
});
