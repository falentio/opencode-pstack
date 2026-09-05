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
  ];
  for (const text of cases) {
    assert.equal(findPotetoEvidence([userText(text)]), null, text);
  }
});

test("findPotetoEvidence matches a skill call for poteto-mode", () => {
  const out = findPotetoEvidence([toolMessage("skill", { name: "poteto-mode" })]);
  assert.ok(out);
  assert.equal(out.kind, "skill-call");
});

test("findPotetoEvidence ignores a skill call for another skill", () => {
  const out = findPotetoEvidence([toolMessage("skill", { name: "other-skill" })]);
  assert.equal(out, null);
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

test("buildResumeContext names the kind and stays under 80 words", () => {
  for (const kind of ["slash-command", "skill-call", "agent-spawn"] as const) {
    const text = buildResumeContext({ kind, detail: "x" });
    assert.ok(text.includes(kind));
    assert.ok(text.includes("skills/poteto-mode/SKILL.md"));
    assert.ok(text.includes("skills/poteto-mode/playbooks/session-pickup.md"));
    assert.ok(text.toLowerCase().includes("if the user opted out"));
    assert.ok(!text.includes("—"));
    assert.ok(!text.includes(":"));
    assert.ok(text.split(/\s+/).filter(Boolean).length < 80);
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

test("handleCompacting fails closed when message fetch throws", async () => {
  const logs: unknown[] = [];
  const client = fakeClient(new Error("boom"), logs);
  const output: { context: string[]; prompt?: string } = { context: [] };
  await handleCompacting(client as never, "s1", output);
  assert.deepEqual(output.context, []);
  assert.equal(output.prompt, undefined);
  assert.equal(logs.length, 1);
});
