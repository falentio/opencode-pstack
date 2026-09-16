import { test } from "node:test";
import assert from "node:assert/strict";
import PstackPlugin from "../src/index.ts";

function fakeClient(messages: unknown[]) {
  return {
    session: { messages: async () => ({ data: messages }) },
    app: { log: async () => {} },
  };
}

function userText(text: string) {
  return { info: { role: "user" }, parts: [{ type: "text", text }] };
}

test("session.deleted drops the pending resume for that session", async () => {
  const client = fakeClient([userText("/poteto-mode go")]);
  const plugin = await PstackPlugin({ client } as never);
  const hooks = plugin as {
    "experimental.session.compacting": (input: { sessionID: string }, output: { context: string[] }) => Promise<void>;
    "experimental.chat.system.transform": (input: { sessionID: string }, output: { system: string[] }) => Promise<void>;
    event: (input: { event: { type: string; properties: { info: { id: string } } } }) => Promise<void>;
  };

  await hooks["experimental.session.compacting"]({ sessionID: "s1" }, { context: [] });
  await hooks.event({ event: { type: "session.deleted", properties: { info: { id: "s1" } } } });

  const output = { system: [] as string[] };
  await hooks["experimental.chat.system.transform"]({ sessionID: "s1" }, output);
  assert.deepEqual(output.system, []);
});

test("a live session still receives the resume note", async () => {
  const client = fakeClient([userText("/poteto-mode go")]);
  const plugin = await PstackPlugin({ client } as never);
  const hooks = plugin as {
    "experimental.session.compacting": (input: { sessionID: string }, output: { context: string[] }) => Promise<void>;
    "experimental.chat.system.transform": (input: { sessionID: string }, output: { system: string[] }) => Promise<void>;
  };

  await hooks["experimental.session.compacting"]({ sessionID: "s2" }, { context: [] });
  const output = { system: [] as string[] };
  await hooks["experimental.chat.system.transform"]({ sessionID: "s2" }, output);
  assert.equal(output.system.length, 1);
});
