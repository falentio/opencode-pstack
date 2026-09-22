import { tool, type ToolDefinition } from "@opencode-ai/plugin";
import {
  GhGitHubReader,
  WatcherQueryError,
  discoverStack,
  resolveContext,
} from "./watch-pr-github.ts";
import {
  classifyPr,
  readSnapshot,
  selectTierMajorStackDecision,
} from "./watch-pr-policy.ts";
import { renderJson, renderPretty } from "./watch-pr-render.ts";
import type * as T from "./watch-pr-types.ts";
import { nonEmpty, parsePrNumber } from "./watch-pr-types.ts";

export const __test__ = {
  createReader(): T.GitHubReader {
    return new GhGitHubReader();
  },
};

function observedAt(): string {
  return new Date().toISOString();
}

function toBlockerVerdict(
  blocker: T.MergeBlocker,
  mode: "single" | "stack"
): T.BlockerVerdict {
  const base = {
    schemaVersion: 1 as const,
    sequence: 1,
    observedAt: observedAt(),
    mode,
    kind: "BLOCKER" as const,
    terminal: true as const,
  };
  switch (blocker.kind) {
    case "merge-conflicts":
      return { ...base, exitCode: 2 as const, blocker };
    case "review-threads":
      return { ...base, exitCode: 3 as const, blocker };
    case "failing-checks":
      return { ...base, exitCode: 4 as const, blocker };
    case "merge-gate":
      return { ...base, exitCode: 6 as const, blocker };
    default: {
      const exhaustive: never = blocker;
      return exhaustive;
    }
  }
}

function toStatusQueryVerdict(
  failure: T.QueryFailure,
  mode: "single" | "stack"
): T.BlockerVerdict {
  return {
    schemaVersion: 1,
    sequence: 1,
    observedAt: observedAt(),
    mode,
    kind: "BLOCKER",
    terminal: true,
    exitCode: 7,
    blocker: { kind: "status-query", failures: 1, failure },
  };
}

function toReadySingleVerdict(
  pr: T.ReadyPr | T.MergedPr,
  mode: "single" | "stack"
): T.TerminalVerdict {
  return {
    schemaVersion: 1,
    sequence: 1,
    observedAt: observedAt(),
    mode,
    kind: "READY",
    terminal: true,
    exitCode: 0,
    scope: { kind: "single", pr },
  };
}

function toReadyStackVerdict(
  prs: T.NonEmpty<T.ReadyPr | T.MergedPr>
): T.TerminalVerdict {
  return {
    schemaVersion: 1,
    sequence: 1,
    observedAt: observedAt(),
    mode: "stack",
    kind: "READY",
    terminal: true,
    exitCode: 0,
    scope: { kind: "stack", prs },
  };
}

function toWaitingVerdict(
  frontier: T.PrContext,
  pending: T.NonEmpty<T.PendingCheck>,
  mode: "single" | "stack"
): T.WatcherVerdict {
  return {
    schemaVersion: 1,
    sequence: 1,
    observedAt: observedAt(),
    mode,
    kind: "WAITING",
    terminal: false,
    frontier,
    reason: { kind: "pending-checks", pending },
  };
}

function render(
  verdict: T.WatcherVerdict,
  pretty: boolean | undefined
): string {
  return pretty === true ? renderPretty(verdict) : renderJson(verdict);
}

function optionalPrNumber(value: number | undefined): T.PrNumber | null {
  return value === undefined ? null : parsePrNumber(value);
}

type SnapshotArgs = {
  owner?: string;
  repo?: string;
  pr?: number;
  allowDraft?: boolean;
};

async function readSingleSnapshot(
  reader: T.GitHubReader,
  args: SnapshotArgs
): Promise<T.PrSnapshot> {
  const context = await resolveContext({
    reader,
    owner: args.owner ?? null,
    repo: args.repo ?? null,
    pr: optionalPrNumber(args.pr),
  });
  return readSnapshot({
    reader,
    context,
    pendingHistory: "include",
    allowDraft: args.allowDraft ?? false,
  });
}

const allowDraftArg = {
  allowDraft: tool.schema.boolean().optional().describe("Do not treat a draft as a merge gate."),
} as const;

export const potetoWatchPrStatusTool: ToolDefinition = tool({
  description:
    "Read one PR snapshot and classify it ready, waiting, or blocker. Single-shot and read-only; caller re-invokes to poll. Shells only to gh and git.",
  args: {
    owner: tool.schema.string().optional().describe("GitHub repository owner."),
    repo: tool.schema.string().optional().describe("GitHub repository name."),
    pr: tool.schema.number().int().min(1).optional().describe("Pull request number."),
    pretty: tool.schema.boolean().optional().describe("Render human text instead of JSON."),
    ...allowDraftArg,
  },
  execute: async (args) => {
    const reader = __test__.createReader();
    try {
      const snapshot = await readSingleSnapshot(reader, args);
      const decision = classifyPr(snapshot, args.allowDraft ?? false);
      let verdict: T.WatcherVerdict;
      if (decision.kind === "blocker") verdict = toBlockerVerdict(decision.blocker, "single");
      else if (decision.kind === "waiting")
        verdict = toWaitingVerdict(decision.frontier, decision.pending, "single");
      else verdict = toReadySingleVerdict(decision.pr, "single");
      return render(verdict, args.pretty);
    } catch (error) {
      if (!(error instanceof WatcherQueryError)) throw error;
      return render(toStatusQueryVerdict(error.failure, "single"), args.pretty);
    }
  },
});

export const potetoWatchPrStackTool: ToolDefinition = tool({
  description:
    "Read the connected open stack and apply the tier-major decision. Single-shot and read-only; caller re-invokes to poll. Shells only to gh and git.",
  args: {
    owner: tool.schema.string().optional().describe("GitHub repository owner."),
    repo: tool.schema.string().optional().describe("GitHub repository name."),
    pr: tool.schema.number().int().min(1).optional().describe("Seed pull request number."),
    pretty: tool.schema.boolean().optional().describe("Render human text instead of JSON."),
    statusOnly: tool.schema.boolean().optional().describe("Return one STATUS table over the stack instead of a decision."),
    ...allowDraftArg,
  },
  execute: async (args) => {
    const reader = __test__.createReader();
    try {
      const seed = await resolveContext({
        reader,
        owner: args.owner ?? null,
        repo: args.repo ?? null,
        pr: optionalPrNumber(args.pr),
      });
      const contexts = await discoverStack(reader, seed);
      const rows: T.PrSnapshot[] = [];
      for (const context of contexts)
        rows.push(
          await readSnapshot({
            reader,
            context,
            pendingHistory: "include",
            allowDraft: args.allowDraft ?? false,
          })
        );
      const complete = nonEmpty(rows);
      if (complete === null) throw new Error("watch context cannot be empty");
      if (args.statusOnly === true) {
        return render(
          {
            schemaVersion: 1,
            sequence: 1,
            observedAt: observedAt(),
            mode: "stack",
            kind: "STATUS",
            terminal: true,
            exitCode: 0,
            reason: "status-only",
            rows: complete,
          },
          args.pretty,
        );
      }
      const decision = selectTierMajorStackDecision(complete, args.allowDraft ?? false);
      let verdict: T.WatcherVerdict;
      if (decision.kind === "blocker") verdict = toBlockerVerdict(decision.blocker, "stack");
      else if (decision.kind === "waiting")
        verdict = toWaitingVerdict(decision.frontier, decision.pending, "stack");
      else verdict = toReadyStackVerdict(decision.prs);
      return render(verdict, args.pretty);
    } catch (error) {
      if (!(error instanceof WatcherQueryError)) throw error;
      return render(toStatusQueryVerdict(error.failure, "stack"), args.pretty);
    }
  },
});

export const potetoWatchPrClassifyTool: ToolDefinition = tool({
  description:
    "Return the raw snapshot plus decision kind for one PR as JSON. Read-only; shells only to gh and git.",
  args: {
    owner: tool.schema.string().optional().describe("GitHub repository owner."),
    repo: tool.schema.string().optional().describe("GitHub repository name."),
    pr: tool.schema.number().int().min(1).optional().describe("Pull request number."),
    ...allowDraftArg,
  },
  execute: async (args) => {
    const reader = __test__.createReader();
    const context = await resolveContext({
      reader,
      owner: args.owner ?? null,
      repo: args.repo ?? null,
      pr: optionalPrNumber(args.pr),
    });
    const snapshot = await readSnapshot({
      reader,
      context,
      pendingHistory: "include",
      allowDraft: args.allowDraft ?? false,
    });
    const decision = classifyPr(snapshot, args.allowDraft ?? false);
    return `${JSON.stringify({ snapshot, decision })}\n`;
  },
});

export const potetoWatchPrTools: Record<string, ToolDefinition> = {
  poteto_watch_pr_status: potetoWatchPrStatusTool,
  poteto_watch_pr_stack: potetoWatchPrStackTool,
  poteto_watch_pr_classify: potetoWatchPrClassifyTool,
};
