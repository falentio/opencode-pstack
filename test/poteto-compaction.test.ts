import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildResumeContext,
  findPotetoEvidence,
  handleCompacting,
  takePendingResume,
  type PotetoEvidence,
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
});

test("findPotetoEvidence matches the expanded skill content without a slash", () => {
  const out = findPotetoEvidence([userText("# Poteto mode\n\n## Non-negotiables\n\ndo the task")]);
  assert.ok(out);
  assert.equal(out.kind, "slash-command");
});

test("findPotetoEvidence rejects compact and longer slash command names", () => {
  for (const text of ["/poteto-mode-compact", "/poteto-mode-compact-extra", "/poteto-mode_extra"]) {
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
    "/poteto-mode disable for now",
    "/poteto-mode turn off please",
    "/poteto-mode quit",
  ];
  for (const text of cases) {
    assert.equal(findPotetoEvidence([userText(text)]), null, text);
  }
});

test("findPotetoEvidence keeps expanded skill content whose instruction says stop", () => {
  const out = findPotetoEvidence([
    userText("# Poteto mode\n\n## Non-negotiables\n\nIf unsure, stop and ask for clarification.\n\nreply and stop."),
  ]);
  assert.ok(out);
  assert.equal(out.kind, "slash-command");
});

test("findPotetoEvidence matches a skill call for poteto-mode", () => {
  const out = findPotetoEvidence([toolMessage("skill", { name: "poteto-mode" })]);
  assert.ok(out);
  assert.equal(out.kind, "skill-call");
});

test("findPotetoEvidence reads serialized exact skill input", () => {
  const out = findPotetoEvidence([toolMessage("skill", '{"name":"poteto-mode"}')]);
  assert.ok(out);
  assert.equal(out.kind, "skill-call");
});

test("findPotetoEvidence ignores a skill call for another skill", () => {
  for (const input of [
    { name: "other-skill" },
    { name: "poteto-mode-compact" },
    { name: "poteto-mode-compact-extra" },
    { description: "poteto-mode" },
  ]) {
    const out = findPotetoEvidence([toolMessage("skill", input)]);
    assert.equal(out, null);
  }
});

test("findPotetoEvidence matches a task spawn for poteto-agent", () => {
  const out = findPotetoEvidence([toolMessage("task", { subagent_type: "poteto-agent" })]);
  assert.ok(out);
  assert.equal(out.kind, "agent-spawn");
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

test("buildResumeContext names the kind, embeds the skill text, and keeps the pickup path", () => {
  const skillText = "# Poteto mode\n\n## Non-negotiables\n\nread the Principles section in full.";
  for (const kind of ["slash-command", "skill-call", "agent-spawn"] as const) {
    const text = buildResumeContext({ kind, detail: "x" }, skillText);
    assert.ok(text.includes(kind));
    assert.ok(text.includes("skills/poteto-mode/playbooks/session-pickup.md"));
    assert.ok(text.includes(skillText));
    assert.ok(text.toLowerCase().includes("if the user opted out"));
    assert.ok(!text.includes("—"));
  }
});

test("handleCompacting returns the found evidence and pushes one entry", async () => {
  const logs: unknown[] = [];
  const client = fakeClient(
    [userText("hi"), userText("/poteto-mode go"), toolMessage("skill", { name: "poteto-mode" })],
    logs,
  );
  const output: { context: string[]; prompt?: string } = { context: [] };
  const skillText = "# Poteto mode\n\nbody";
  const evidence = await handleCompacting(client as never, "s1", output, skillText);
  assert.ok(evidence);
  assert.equal(evidence.kind, "slash-command");
  assert.equal(output.context.length, 1);
  assert.equal(output.context[0], buildResumeContext(evidence, skillText));
  assert.equal(output.prompt, undefined);
});

test("handleCompacting returns null when no evidence exists", async () => {
  const logs: unknown[] = [];
  const client = fakeClient([userText("hello there")], logs);
  const output: { context: string[]; prompt?: string } = { context: [] };
  const evidence = await handleCompacting(client as never, "s1", output, "body");
  assert.equal(evidence, null);
  assert.deepEqual(output.context, []);
  assert.equal(output.prompt, undefined);
});

test("handleCompacting fails closed when message fetch throws", async () => {
  const logs: unknown[] = [];
  const client = fakeClient(new Error("boom"), logs);
  const output: { context: string[]; prompt?: string } = { context: [] };
  const evidence = await handleCompacting(client as never, "s1", output, "body");
  assert.equal(evidence, null);
  assert.deepEqual(output.context, []);
  assert.equal(output.prompt, undefined);
  assert.equal(logs.length, 1);
});

test("takePendingResume is one-shot per session", () => {
  const pending = new Map<string, PotetoEvidence>();
  const evidence: PotetoEvidence = { kind: "skill-call", detail: "x" };
  const skillText = "# Poteto mode\n\nbody";
  pending.set("s1", evidence);

  const injected: string[] = [];
  const first = takePendingResume(pending, "s1");
  if (first) injected.push(buildResumeContext(first, skillText));
  assert.equal(injected.length, 1);

  const second = takePendingResume(pending, "s1");
  if (second) injected.push(buildResumeContext(second, skillText));
  assert.equal(injected.length, 1);

  const other = takePendingResume(pending, "s2");
  if (other) injected.push(buildResumeContext(other, skillText));
  assert.equal(injected.length, 1);
});
