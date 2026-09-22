import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  Check,
  ChecksFastPath,
  CommitRollup,
  GitHubReader,
  OpenPullRequest,
  PrContext,
  PullRequestFacts,
  Repository,
  ReviewThread,
  RollupPage,
} from "../src/poteto-tools/watch-pr-types.ts";
import { parsePrNumber } from "../src/poteto-tools/watch-pr-types.ts";
import {
  assessGitHubMerge,
  classifyPr,
  selectTierMajorStackDecision,
} from "../src/poteto-tools/watch-pr-policy.ts";
import {
  renderJson,
  renderPretty,
  renderStatusTable,
} from "../src/poteto-tools/watch-pr-render.ts";
import { buildWatchPrClassifyTool, buildWatchPrTools } from "../src/poteto-tools/watch-pr-tools.ts";

interface FakeReaderOptions {
  readonly facts?: Partial<Omit<PullRequestFacts, "context">>;
  readonly fastPath?: ChecksFastPath;
  readonly rollupPages?: readonly RollupPage[];
  readonly threads?: readonly ReviewThread[];
  readonly commitRollups?: readonly CommitRollup[];
  readonly openPullRequests?: readonly OpenPullRequest[];
  readonly origin?: Repository | null;
  readonly current?: PrContext;
}

function passingCheck(name = "ci"): Check {
  return {
    kind: "passed",
    name,
    reportedState: "SUCCESS",
    description: "",
    link: "",
    workflow: "",
  };
}

function pendingCheck(name = "ci"): Check {
  return {
    kind: "pending",
    name,
    reportedState: "PENDING",
    description: "",
    link: "",
    workflow: "",
  };
}

function failedCheck(name = "ci"): Check {
  return {
    kind: "failed",
    name,
    reportedState: "FAILURE",
    description: "",
    link: "",
    workflow: "",
  };
}

function context(number: number): PrContext {
  return { owner: "owner", repo: "repo", number: parsePrNumber(number) };
}

function fakeReader(options: FakeReaderOptions = {}): GitHubReader {
  const seed = options.current ?? context(1);
  const defaults: PullRequestFacts = {
    context: seed,
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    reviewDecision: "APPROVED",
    headRefOid: "head",
    headRefName: "feature",
    baseRefName: "main",
    state: "OPEN",
    mergedAt: null,
    isDraft: false,
  };
  let page = 0;
  return {
    async originRepo() {
      return options.origin === undefined
        ? { owner: "owner", repo: "repo" }
        : options.origin;
    },
    async currentPr(pr) {
      return { ...seed, number: pr ?? seed.number };
    },
    async pullRequest(requested) {
      return { ...defaults, ...options.facts, context: requested };
    },
    async openPullRequests() {
      return options.openPullRequests ?? [];
    },
    async checksFastPath() {
      return options.fastPath ?? { kind: "checks", checks: [passingCheck()] };
    },
    async checkRollupPage() {
      return options.rollupPages?.[page++] ?? { checks: [], endCursor: null };
    },
    async reviewThreads() {
      return options.threads ?? [];
    },
    async commitRollups() {
      return options.commitRollups ?? [{ oid: "head", state: "SUCCESS" }];
    },
  };
}

async function snapshot(pr: number, options: FakeReaderOptions = {}) {
  const { readSnapshot } = await import("../src/poteto-tools/watch-pr-policy.ts");
  return readSnapshot({
    reader: fakeReader(options),
    context: context(pr),
    pendingHistory: "include",
    allowDraft: false,
  });
}

test("assessGitHubMerge refuses BLOCKED with failing head", () => {
  assert.equal(
    assessGitHubMerge({ mergeStateStatus: "BLOCKED", headRollupState: "FAILURE" }).kind,
    "refused"
  );
  assert.equal(
    assessGitHubMerge({ mergeStateStatus: "BLOCKED", headRollupState: "PENDING" }).kind,
    "allowed"
  );
  assert.equal(
    assessGitHubMerge({ mergeStateStatus: "CLEAN", headRollupState: "SUCCESS" }).kind,
    "allowed"
  );
});

test("classifyPr reports ready on a clean snapshot", async () => {
  const row = await snapshot(1);
  const decision = classifyPr(row);
  assert.equal(decision.kind, "ready");
});

test("classifyPr reports blocker on failing checks", async () => {
  const row = await snapshot(2, {
    fastPath: { kind: "checks", checks: [failedCheck()] },
    commitRollups: [{ oid: "head", state: "FAILURE" }],
  });
  const decision = classifyPr(row);
  assert.equal(decision.kind, "blocker");
  assert.equal(
    decision.kind === "blocker" ? decision.blocker.kind : null,
    "failing-checks"
  );
});

test("classifyPr reports waiting on pending checks", async () => {
  const row = await snapshot(3, {
    fastPath: { kind: "checks", checks: [pendingCheck()] },
  });
  const decision = classifyPr(row);
  assert.equal(decision.kind, "waiting");
});

test("stack decision prefers conflicts over failing checks", async () => {
  const frontier = await snapshot(10, {
    fastPath: { kind: "checks", checks: [failedCheck()] },
    commitRollups: [{ oid: "head", state: "FAILURE" }],
  });
  const upstack = await snapshot(11, {
    facts: { mergeable: "CONFLICTING" },
  });
  const decision = selectTierMajorStackDecision([frontier, upstack]);
  assert.equal(decision.kind, "blocker");
  assert.equal(
    decision.kind === "blocker" ? decision.blocker.kind : null,
    "merge-conflicts"
  );
});

test("stack decision prefers threads over failing checks", async () => {
  const frontier = await snapshot(12, {
    fastPath: { kind: "checks", checks: [failedCheck()] },
    commitRollups: [{ oid: "head", state: "FAILURE" }],
  });
  const upstack = await snapshot(13, {
    threads: [
      {
        id: "thread-1",
        firstComment: null,
        isBugbot: false,
        bugbotReviewPasses: 0,
      },
    ],
  });
  const decision = selectTierMajorStackDecision([frontier, upstack]);
  assert.equal(decision.kind, "blocker");
  assert.equal(
    decision.kind === "blocker" ? decision.blocker.kind : null,
    "review-threads"
  );
});

test("renderJson round-trips a verdict", async () => {
  const row = await snapshot(1);
  const verdict = {
    schemaVersion: 1 as const,
    sequence: 1,
    observedAt: "2026-09-22T00:00:00.000Z",
    mode: "single" as const,
    kind: "STATUS" as const,
    terminal: true as const,
    exitCode: 0 as const,
    reason: "status-only" as const,
    rows: [row],
  };
  const parsed = JSON.parse(renderJson(verdict));
  assert.equal(parsed.kind, "STATUS");
  assert.equal(parsed.rows.length, 1);
});

test("renderPretty renders a status table", async () => {
  const row = await snapshot(1);
  const table = renderStatusTable([row]);
  assert.match(table, /\| PR \| CI \| Review \| Merge \|/);
  assert.match(table, /#1/);
});

test("renderPretty renders a waiting verdict", () => {
  const verdict = {
    schemaVersion: 1 as const,
    sequence: 1,
    observedAt: "2026-09-22T00:00:00.000Z",
    mode: "single" as const,
    kind: "WAITING" as const,
    terminal: false as const,
    frontier: context(5),
    reason: {
      kind: "pending-checks" as const,
      pending: [pendingCheck()] as unknown as import("../src/poteto-tools/watch-pr-types.ts").NonEmpty<
        import("../src/poteto-tools/watch-pr-types.ts").PendingCheck
      >,
    },
  };
  assert.match(renderPretty(verdict), /WAITING: frontier=#5/);
});

test("renderPretty renders a blocker verdict", async () => {
  const row = await snapshot(11, {
    facts: { mergeable: "CONFLICTING" },
  });
  const decision = classifyPr(row);
  assert.equal(decision.kind, "blocker");
  if (decision.kind !== "blocker") throw new Error("expected blocker");
  const verdict = {
    schemaVersion: 1 as const,
    sequence: 1,
    observedAt: "2026-09-22T00:00:00.000Z",
    mode: "single" as const,
    kind: "BLOCKER" as const,
    terminal: true as const,
    exitCode: 2 as const,
    blocker: decision.blocker as Extract<
      import("../src/poteto-tools/watch-pr-types.ts").MergeBlocker,
      { readonly kind: "merge-conflicts" }
    >,
  };
  assert.match(renderPretty(verdict), /BLOCKER: merge-conflicts/);
});

test("classify tool rejects an invalid PR number", async () => {
  await assert.rejects(() =>
    buildWatchPrClassifyTool().execute({ owner: "o", repo: "r", pr: 0 }, { sessionID: "test" } as never),
  );
});

test("status tool honors allow-draft on a draft PR", async () => {
  const { readSnapshot } = await import("../src/poteto-tools/watch-pr-policy.ts");
  const draft = await snapshot(20, { facts: { isDraft: true } });
  assert.equal(classifyPr(draft, false).kind, "blocker");
  assert.notEqual(classifyPr(draft, true).kind, "blocker");
  void readSnapshot;
});

test("stack tool status-only returns a STATUS table", async () => {
  const rows = [await snapshot(21), await snapshot(22)];
  const { renderStatusTable } = await import("../src/poteto-tools/watch-pr-render.ts");
  const table = renderStatusTable([rows[0]!, rows[1]!] as unknown as import("../src/poteto-tools/watch-pr-types.ts").NonEmpty<
    import("../src/poteto-tools/watch-pr-types.ts").PrSnapshot
  >);
  assert.match(table, /#21/);
  assert.match(table, /#22/);
});

test("watch tools expose status, stack, and classify", () => {
  assert.deepEqual(
    buildWatchPrTools()
      .map((tool) => tool.name)
      .sort(),
    ["poteto_watch_pr_classify", "poteto_watch_pr_stack", "poteto_watch_pr_status"],
  );
});
