import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore, UserError, NotFoundError } from "../src/poteto-tools/orch-store.ts";
import { buildOrchTools } from "../src/poteto-tools/orch-tools.ts";
import { staticSessionDir } from "../src/poteto-tools/session-dir.ts";

function freshDir(): string {
  return mkdtempSync(join(tmpdir(), "poteto-orch-"));
}

function ctx(dir: string) {
  return { dir, sessionID: "test" };
}

type Ctx = ReturnType<typeof ctx>;

async function dispatch(name: string, args: unknown, context: Ctx): Promise<string> {
  const tool = buildOrchTools({ sessionDir: staticSessionDir(context.dir) }).find((t) => t.name === name);
  if (!tool) throw new Error(`unknown tool ${name}`);
  const out = (await tool.execute(args, { sessionID: context.sessionID })) as { content: string };
  return out.content;
}

const potetoOrchTools: Record<string, { execute: (args: unknown, context: Ctx) => Promise<string> }> = new Proxy(
  {},
  {
    get: (_target, name: string) => ({
      execute: (args: unknown, context: Ctx) => dispatch(name, args, context),
    }),
  },
);

async function initStore(dir: string, name = "store"): Promise<string> {
  const out = (await potetoOrchTools["poteto_orch_init"]!.execute(
    { store: name },
    ctx(dir),
  )) as string;
  assert.match(out, /initialized/);
  return join(dir, name);
}

test("init creates store files", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  for (const file of ["units.tsv", "ledger.tsv", "gates.md", "preferences.md", "frontier.json"]) {
    assert.ok(readFileSync(join(storePath, file), "utf8") !== undefined);
  }
  assert.equal(readFileSync(join(storePath, "units.tsv"), "utf8"), "id\ttrack\tstate\tbranch\tpr\tsha\tbrief\n");
});

test("unit add, set, get, list, counts", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  const store = openStore(storePath);
  try {
    await store.units.add({ id: "u1", track: "t1", brief: "first" });
    await store.units.add({ id: "u2", track: "t2" });
    await assert.rejects(store.units.add({ id: "u1", track: "t1" }), /already exists/);
    const got = await store.units.get("u1");
    assert.equal(got.state, "pending");
    const updated = await store.units.set({ id: "u1", state: "active", branch: "feat", pr: 12, sha: "abc" });
    assert.equal(updated.state, "active");
    assert.equal(updated.pr, "12");
    const byState = await store.units.list({ state: "active" });
    assert.equal(byState.length, 1);
    const byTrack = await store.units.list({ track: "t2" });
    assert.equal(byTrack.length, 1);
    const counts = await store.units.counts();
    assert.deepEqual(counts, { active: 1, pending: 1 });
  } finally {
    await store.close();
  }
});

test("unit tool shells use compact TSV and relative paths", async () => {
  const dir = freshDir();
  await initStore(dir);
  const add = (await potetoOrchTools["poteto_orch_unit_add"]!.execute(
    { store: "store", id: "u1", track: "t1", brief: "b1" },
    ctx(dir),
  )) as string;
  assert.equal(add, "u1\tt1\tpending\t\t\t\tb1");
  const set = (await potetoOrchTools["poteto_orch_unit_set"]!.execute(
    { store: "store", id: "u1", state: "done" },
    ctx(dir),
  )) as string;
  assert.match(set, /u1\tt1\tdone/);
  const get = (await potetoOrchTools["poteto_orch_unit_get"]!.execute(
    { store: "store", id: "u1" },
    ctx(dir),
  )) as string;
  assert.match(get, /done/);
  const list = (await potetoOrchTools["poteto_orch_unit_list"]!.execute(
    { store: "store", state: "done" },
    ctx(dir),
  )) as string;
  assert.match(list, /u1/);
  const empty = (await potetoOrchTools["poteto_orch_unit_list"]!.execute(
    { store: "store", state: "missing" },
    ctx(dir),
  )) as string;
  assert.equal(empty, "(no units)");
});

test("ledger record, check, summary, NOT-VERIFIED", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  const store = openStore(storePath);
  try {
    const row = await store.ledger.record({
      pr: 7, sha: "deadbeef", verdict: "live-ui-verified", evidence: "shot.png", verifier: "ann",
    });
    assert.equal(row.verdict, "live-ui-verified");
    const checked = await store.ledger.check({ pr: 7, sha: "deadbeef" });
    assert.equal(checked.evidence, "shot.png");
    const summary = await store.ledger.summary();
    assert.deepEqual(summary, { "live-ui-verified": 1 });
    await assert.rejects(store.ledger.check({ pr: 9, sha: "nope" }), (error: unknown) => {
      assert.ok(error instanceof NotFoundError);
      assert.equal(error.output?.compact, "NOT-VERIFIED");
      return true;
    });
  } finally {
    await store.close();
  }
  const missing = (await potetoOrchTools["poteto_orch_ledger_check"]!.execute(
    { store: "store", pr: 99, sha: "zzz" },
    ctx(dir),
  )) as string;
  assert.equal(missing, "NOT-VERIFIED");
  const recorded = (await potetoOrchTools["poteto_orch_ledger_record"]!.execute(
    { store: "store", pr: 3, sha: "abc123", verdict: "unit-test-verified", evidence: "log.txt" },
    ctx(dir),
  )) as string;
  assert.equal(recorded, "3\tabc123\tunit-test-verified");
});

test("inbox push, peek, drain", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  const store = openStore(storePath);
  try {
    await store.inbox.push({ agent: "a1", unit: "u1", status: "ok", report: "r1" });
    await store.inbox.push({ agent: "a2", unit: "u2", status: "blocked" });
    assert.equal(await store.inbox.count(), 2);
    const peeked = await store.inbox.peek();
    assert.equal(peeked.length, 2);
    const drained = await store.inbox.drain();
    assert.equal(drained.length, 2);
    assert.equal(await store.inbox.count(), 0);
    assert.deepEqual(await store.inbox.drain(), []);
  } finally {
    await store.close();
  }
});

test("inbox drain tool respects peek flag", async () => {
  const dir = freshDir();
  await initStore(dir);
  await potetoOrchTools["poteto_orch_inbox_push"]!.execute(
    { store: "store", agent: "a1", unit: "u1", status: "ok" },
    ctx(dir),
  );
  const peeked = (await potetoOrchTools["poteto_orch_inbox_drain"]!.execute(
    { store: "store", peek: true },
    ctx(dir),
  )) as string;
  assert.match(peeked, /u1/);
  const drained = (await potetoOrchTools["poteto_orch_inbox_drain"]!.execute(
    { store: "store" },
    ctx(dir),
  )) as string;
  assert.match(drained, /u1/);
  const empty = (await potetoOrchTools["poteto_orch_inbox_drain"]!.execute(
    { store: "store" },
    ctx(dir),
  )) as string;
  assert.equal(empty, "(empty)");
});

test("gate park, list, resolve", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  const store = openStore(storePath);
  try {
    await store.gates.park({ id: "g1", question: "ship?", options: "yes,no", defaultAnswer: "yes" });
    const open = await store.gates.list();
    assert.equal(open.length, 1);
    const resolved = await store.gates.resolve({ id: "g1", answer: "no" });
    assert.equal(resolved.answer, "no");
    assert.deepEqual(await store.gates.list(), []);
    await assert.rejects(store.gates.resolve({ id: "missing", answer: "x" }), NotFoundError);
  } finally {
    await store.close();
  }
  const parked = (await potetoOrchTools["poteto_orch_gate_park"]!.execute(
    { store: join(dir, "store"), id: "g2", question: "q?", options: "a,b", defaultAnswer: "a" },
    ctx(dir),
  )) as string;
  assert.equal(parked, "g2\topen");
  const done = (await potetoOrchTools["poteto_orch_gate_resolve"]!.execute(
    { store: join(dir, "store"), id: "g2", answer: "b" },
    ctx(dir),
  )) as string;
  assert.equal(done, "g2\tresolved\tb");
});

test("standing add and show", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  const store = openStore(storePath);
  try {
    await store.standing.add({ line: "first order" });
    await store.standing.add({ line: "second order" });
    const rows = await store.standing.show();
    assert.deepEqual(rows.map((r) => r.line), ["first order", "second order"]);
  } finally {
    await store.close();
  }
  const added = (await potetoOrchTools["poteto_orch_standing_add"]!.execute(
    { store: "store", line: "third order" },
    ctx(dir),
  )) as string;
  assert.equal(added, "3. third order");
  const shown = (await potetoOrchTools["poteto_orch_standing_show"]!.execute(
    { store: "store" },
    ctx(dir),
  )) as string;
  assert.match(shown, /1\. first order/);
});

test("status render changed text transitions", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  const store = openStore(storePath);
  try {
    const first = await store.status.render();
    assert.equal(first.changed, "first render");
    const second = await store.status.render();
    assert.equal(second.changed, "no derived changes");
    await store.units.add({ id: "u1", track: "t1" });
    const third = await store.status.render();
    assert.match(third.changed, /units/);
    assert.ok(third.summary.unitStates["pending"] === 1);
  } finally {
    await store.close();
  }
});

test("status tool returns counts, changed, and gates lines", async () => {
  const dir = freshDir();
  await initStore(dir);
  const out = (await potetoOrchTools["poteto_orch_status"]!.execute(
    { store: "store" },
    ctx(dir),
  )) as string;
  assert.match(out, /counts: units=/);
  assert.match(out, /changed: first render/);
  assert.match(out, /gates open: 0/);
});

test("second writer is blocked while the lock is held", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  const first = openStore(storePath);
  await first.units.add({ id: "seed", track: "t" });
  const second = openStore(storePath);
  try {
    await assert.rejects(second.units.add({ id: "late", track: "t" }), /store lock held by pid/);
  } finally {
    await second.close();
    await first.close();
  }
  const third = openStore(storePath);
  try {
    const row = await third.units.add({ id: "late", track: "t" });
    assert.equal(row.id, "late");
  } finally {
    await third.close();
  }
});

test("force steals a live lock", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  const first = openStore(storePath);
  await first.units.add({ id: "seed", track: "t" });
  let stolen = "";
  const second = openStore(storePath, {
    force: true,
    onLockStolen: (holder) => {
      stolen = holder;
    },
  });
  try {
    const row = await second.units.add({ id: "stolen", track: "t" });
    assert.equal(row.id, "stolen");
    assert.match(stolen, /\d+/);
  } finally {
    await second.close();
    await first.close();
  }
});

test("stale lock is replaced", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  const probe = openStore(storePath);
  try {
    await probe.units.add({ id: "seed", track: "t" });
  } finally {
    await probe.close();
  }
  writeFileSync(join(storePath, ".orch.lock"), "2147483647\n", "utf8");
  let stale = "";
  const store = openStore(storePath, {
    onStaleLock: (holder) => {
      stale = holder;
    },
  });
  try {
    const row = await store.units.add({ id: "after-stale", track: "t" });
    assert.equal(row.id, "after-stale");
    assert.equal(stale, "2147483647");
  } finally {
    await store.close();
  }
});

test("malformed units.tsv is rejected", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  writeFileSync(join(storePath, "units.tsv"), "wrong\theader\n", "utf8");
  const store = openStore(storePath);
  try {
    await assert.rejects(store.units.list(), /invalid header/);
  } finally {
    await store.close();
  }
  writeFileSync(join(storePath, "units.tsv"), "id\ttrack\tstate\tbranch\tpr\tsha\tbrief\nonly\two\n", "utf8");
  const retry = openStore(storePath);
  try {
    await assert.rejects(retry.units.list(), /malformed row/);
  } finally {
    await retry.close();
  }
});

test("malformed ledger verdict is rejected", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  writeFileSync(
    join(storePath, "ledger.tsv"),
    "pr\tsha\tverdict\tevidence\tverifier\tts\n1\tabc\tbogus\te\tv\tt\n",
    "utf8",
  );
  const store = openStore(storePath);
  try {
    await assert.rejects(store.ledger.summary(), /invalid verdict/);
  } finally {
    await store.close();
  }
});

test("missing leaf verbs are covered by new tools", async () => {
  const dir = freshDir();
  await initStore(dir);
  await potetoOrchTools["poteto_orch_unit_add"]!.execute(
    { store: "store", id: "u1", track: "t1" },
    ctx(dir),
  );
  const counts = (await potetoOrchTools["poteto_orch_unit_counts"]!.execute(
    { store: "store" },
    ctx(dir),
  )) as string;
  assert.equal(counts, "pending=1");
  const summary = (await potetoOrchTools["poteto_orch_ledger_summary"]!.execute(
    { store: "store" },
    ctx(dir),
  )) as string;
  assert.equal(summary, "none");
  const inboxCount = (await potetoOrchTools["poteto_orch_inbox_count"]!.execute(
    { store: "store" },
    ctx(dir),
  )) as string;
  assert.equal(inboxCount, "0");
  await potetoOrchTools["poteto_orch_gate_park"]!.execute(
    { store: "store", id: "g1", question: "q?", options: "a,b", defaultAnswer: "a" },
    ctx(dir),
  );
  const gates = (await potetoOrchTools["poteto_orch_gate_list"]!.execute(
    { store: "store" },
    ctx(dir),
  )) as string;
  assert.match(gates, /g1\tq\?/);
});

test("frontier show starts at generation zero and pin validation holds", async () => {
  const dir = freshDir();
  const storePath = await initStore(dir);
  const store = openStore(storePath);
  try {
    const shown = await store.frontier.show();
    assert.equal(shown.generation, 0);
    assert.deepEqual([...shown.prs], []);
    await assert.rejects(
      store.frontier.set({ repo: dir, prs: [2, 2] }),
      /must not contain duplicates/,
    );
  } finally {
    await store.close();
  }
  const shownTool = (await potetoOrchTools["poteto_orch_frontier_show"]!.execute(
    { store: "store" },
    ctx(dir),
  )) as string;
  assert.match(shownTool, /generation=0/);
  await assert.rejects(
    potetoOrchTools["poteto_orch_frontier_set"]!.execute(
      { store: "store", repo: ".", prs: "1,,2" },
      ctx(dir),
    ),
    UserError,
  );
});
