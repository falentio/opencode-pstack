import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildResumeContext,
  findPotetoEvidence,
  findPotetoEvidenceV2,
  resumeSystemPart,
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

test("buildResumeContext names the kind, orders re-invocation, and keeps the pickup path", () => {
  for (const kind of ["slash-command", "skill-call", "agent-spawn"] as const) {
    const text = buildResumeContext({ kind, detail: "x" });
    assert.ok(text.includes(kind));
    assert.ok(text.includes("skills/poteto-mode/playbooks/session-pickup.md"));
    assert.ok(text.toLowerCase().includes("re-invoke"));
    assert.ok(text.includes("poteto-mode"));
    assert.ok(text.toLowerCase().includes("if the user opted out"));
    assert.ok(!text.includes("# Poteto mode"));
    assert.ok(!text.includes("—"));
  }
});

test("findPotetoEvidenceV2 matches a v2 user message with a slash command", () => {
  const out = findPotetoEvidenceV2([{ role: "user", parts: [{ type: "text", text: "please /poteto-mode resume" }] }]);
  assert.ok(out);
  assert.equal(out.kind, "slash-command");
});

test("findPotetoEvidenceV2 matches expanded skill content and rejects opt out", () => {
  const out = findPotetoEvidenceV2([{ role: "user", content: "# Poteto mode\n\ndo the task" }]);
  assert.ok(out);
  assert.equal(out.kind, "slash-command");
  assert.equal(findPotetoEvidenceV2([{ role: "user", content: "/poteto-mode opt out now" }]), null);
});

test("findPotetoEvidenceV2 matches v2 tool-call parts for skill and subagent", () => {
  const skill = findPotetoEvidenceV2([
    { role: "assistant", parts: [{ type: "tool-call", name: "skill", input: { name: "poteto-mode" } }] },
  ]);
  assert.ok(skill);
  assert.equal(skill.kind, "skill-call");
  const agent = findPotetoEvidenceV2([
    { role: "assistant", parts: [{ type: "tool-call", name: "subagent", input: { subagent_type: "poteto-agent" } }] },
  ]);
  assert.ok(agent);
  assert.equal(agent.kind, "agent-spawn");
});

test("findPotetoEvidenceV2 returns null without poteto markers", () => {
  assert.equal(findPotetoEvidenceV2([{ role: "user", parts: [{ type: "text", text: "hello there" }] }]), null);
  assert.equal(findPotetoEvidenceV2([]), null);
});

test("resumeSystemPart wraps the resume context as a text part", () => {
  const part = resumeSystemPart({ kind: "skill-call", detail: "x" });
  assert.equal(part.type, "text");
  assert.ok(part.text.includes("skill-call"));
  assert.ok(part.text.includes("session-pickup.md"));
});

test("takePendingResume is one-shot per session", () => {
  const pending = new Map<string, PotetoEvidence>();
  const evidence: PotetoEvidence = { kind: "skill-call", detail: "x" };
  pending.set("s1", evidence);

  const injected: string[] = [];
  const first = takePendingResume(pending, "s1");
  if (first) injected.push(buildResumeContext(first));
  assert.equal(injected.length, 1);

  const second = takePendingResume(pending, "s1");
  if (second) injected.push(buildResumeContext(second));
  assert.equal(injected.length, 1);

  const other = takePendingResume(pending, "s2");
  if (other) injected.push(buildResumeContext(other));
  assert.equal(injected.length, 1);
});
