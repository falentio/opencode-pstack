import { isAbsolute, resolve } from "node:path";
import { tool, type ToolContext, type ToolDefinition } from "@opencode-ai/plugin";
import {
  NotFoundError,
  UserError,
  openStore,
  type Counts,
  type Frontier,
  type InboxPointer,
  type OpenGate,
  type StatusReport,
  type Store,
  type Unit,
  type Verdict,
} from "./orch-store.ts";

const DISPLAY_LIMIT = 4;

function countLine(value: Counts): string {
  const entries = Object.entries(value);
  return entries.length === 0
    ? "none"
    : entries.map(([name, count]) => `${name}=${count}`).join(", ");
}

function unitLine(unit: Unit): string {
  return [
    unit.id,
    unit.track,
    unit.state,
    unit.branch,
    unit.pr,
    unit.sha,
    unit.brief,
  ].join("\t");
}

function pointerLine(pointer: InboxPointer): string {
  return [
    pointer.ts,
    pointer.agent,
    pointer.unit,
    pointer.status,
    pointer.report,
  ].join("\t");
}

function gateLine(gate: OpenGate): string {
  return [
    gate.id,
    gate.question,
    gate.options,
    gate.defaultAnswer,
  ].join("\t");
}

function compactRows<T>(
  rows: readonly T[],
  format: (row: T) => string,
  empty: string,
  limit: number | null = DISPLAY_LIMIT,
): string {
  if (rows.length === 0) {
    return empty;
  }
  const visible = limit === null ? rows : rows.slice(0, limit);
  const lines = visible.map(format);
  if (limit !== null && rows.length > limit) {
    lines.push(`... ${rows.length - limit} more; narrow with state/track filters or limit`);
  }
  return lines.join("\n");
}

function frontierLine(value: Frontier): string {
  const prs =
    value.prs.length === 0
      ? "none"
      : value.prs
          .map(
            (row) =>
              `${row.branches}#${row.pr}@${row.sha}:${row.state}`,
          )
          .join(",");
  return `generation=${value.generation} prs=${prs} lowest-unmerged=${value.lowestUnmerged ?? "none"}`;
}

function statusLines(report: StatusReport): string {
  const visible = report.summary.openGateIds.slice(0, DISPLAY_LIMIT);
  const more =
    report.summary.openGateIds.length > DISPLAY_LIMIT
      ? `,+${report.summary.openGateIds.length - DISPLAY_LIMIT} more`
      : "";
  return [
    `counts: units=${report.units.length}; states=${countLine(report.summary.unitStates)}; ledger=${countLine(report.summary.ledgerVerdicts)}`,
    `changed: ${report.changed}`,
    `gates open: ${report.summary.openGateIds.length}${
      visible.length > 0 ? `; ids=${visible.join(",")}${more}` : ""
    }`,
  ].join("\n");
}

function resolveStore(raw: string, directory: string): string {
  return isAbsolute(raw) ? raw : resolve(directory, raw);
}

async function withStore<T>(
  context: ToolContext,
  storePath: string,
  operation: (store: Store) => Promise<T>,
  compact: (result: T) => string,
): Promise<string> {
  const notices: string[] = [];
  const store = openStore(resolveStore(storePath, context.directory), {
    force: process.env["POTETO_ORCH_FORCE"] === "1",
    onLockStolen: (holder) => void notices.push(`notice: stealing store lock held by pid ${holder}`),
    onStaleLock: (holder) => void notices.push(`notice: replacing stale store lock (pid ${holder} is dead)`),
  });
  try {
    const rendered = compact(await operation(store));
    return [...notices, rendered].filter((part) => part.length > 0).join("\n");
  } catch (error) {
    if (error instanceof NotFoundError && error.output !== undefined) {
      return [...notices, error.output.compact].filter((part) => part.length > 0).join("\n");
    }
    throw error;
  } finally {
    await store.close();
  }
}

function parsePrPin(value: string): readonly number[] {
  return value.split(",").map((part) => {
    const parsed = Number(part);
    if (!/^[1-9]\d*$/.test(part) || !Number.isSafeInteger(parsed)) {
      throw new UserError(`invalid PR pin entry ${JSON.stringify(part)}`);
    }
    return parsed;
  });
}

const storeArg = {
  store: tool.schema.string().describe("Store directory, absolute or relative to the session directory."),
};

export const potetoOrchInitTool: ToolDefinition = tool({
  description: "Initialize a poteto orchestrate store directory.",
  args: { ...storeArg },
  execute: async (args, context) =>
    withStore(context, args.store, (store) => store.init(), (result) => `initialized ${result.store}`),
});

export const potetoOrchUnitAddTool: ToolDefinition = tool({
  description: "Add a work unit to the orchestrate store.",
  args: {
    ...storeArg,
    id: tool.schema.string().describe("Unit id."),
    track: tool.schema.string().describe("Unit track."),
    brief: tool.schema.string().optional().describe("Short brief."),
  },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) => store.units.add({ id: args.id, track: args.track, brief: args.brief }),
      unitLine,
    ),
});

export const potetoOrchUnitSetTool: ToolDefinition = tool({
  description: "Update a work unit state, branch, PR, or SHA.",
  args: {
    ...storeArg,
    id: tool.schema.string().describe("Unit id."),
    state: tool.schema.string().describe("New state."),
    branch: tool.schema.string().optional().describe("Branch name."),
    pr: tool.schema.number().int().min(1).optional().describe("Pull request number."),
    sha: tool.schema.string().optional().describe("Commit SHA."),
  },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) =>
        store.units.set({ id: args.id, state: args.state, branch: args.branch, pr: args.pr, sha: args.sha }),
      unitLine,
    ),
});

export const potetoOrchUnitGetTool: ToolDefinition = tool({
  description: "Get one work unit by id.",
  args: {
    ...storeArg,
    id: tool.schema.string().describe("Unit id."),
  },
  execute: async (args, context) =>
    withStore(context, args.store, (store) => store.units.get(args.id), unitLine),
});

export const potetoOrchUnitListTool: ToolDefinition = tool({
  description: "List work units, optionally filtered by state or track.",
  args: {
    ...storeArg,
    state: tool.schema.string().optional().describe("Filter by state."),
    track: tool.schema.string().optional().describe("Filter by track."),
    limit: tool.schema.number().int().min(1).optional().describe("Max rows before truncating with a more-hint."),
  },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) => store.units.list({ state: args.state, track: args.track }),
      (rows) => compactRows(rows, unitLine, "(no units)", args.limit ?? DISPLAY_LIMIT),
    ),
});

export const potetoOrchUnitCountsTool: ToolDefinition = tool({
  description: "Count work units by state.",
  args: { ...storeArg },
  execute: async (args, context) =>
    withStore(context, args.store, (store) => store.units.counts(), countLine),
});

export const potetoOrchLedgerRecordTool: ToolDefinition = tool({
  description: "Record a verification verdict for a PR at a SHA.",
  args: {
    ...storeArg,
    pr: tool.schema.number().int().min(1).describe("Pull request number."),
    sha: tool.schema.string().describe("Commit SHA."),
    verdict: tool.schema.string().describe("One of live-ui-verified, unit-test-verified, type-check-only, verifier-blocked, verifier-failed."),
    evidence: tool.schema.string().describe("Evidence path or note."),
    verifier: tool.schema.string().optional().describe("Verifier name."),
  },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) =>
        store.ledger.record({
          pr: args.pr,
          sha: args.sha,
          verdict: args.verdict as Verdict,
          evidence: args.evidence,
          verifier: args.verifier,
        }),
      (row) => `${row.pr}\t${row.sha}\t${row.verdict}`,
    ),
});

export const potetoOrchLedgerCheckTool: ToolDefinition = tool({
  description: "Check the verification verdict for a PR at a SHA. Returns NOT-VERIFIED when absent.",
  args: {
    ...storeArg,
    pr: tool.schema.number().int().min(1).describe("Pull request number."),
    sha: tool.schema.string().describe("Commit SHA."),
  },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) => store.ledger.check({ pr: args.pr, sha: args.sha }),
      (row) => row.verdict,
    ),
});

export const potetoOrchLedgerSummaryTool: ToolDefinition = tool({
  description: "Count verification verdicts.",
  args: { ...storeArg },
  execute: async (args, context) =>
    withStore(context, args.store, (store) => store.ledger.summary(), countLine),
});

export const potetoOrchInboxPushTool: ToolDefinition = tool({
  description: "Push an agent status pointer into the inbox.",
  args: {
    ...storeArg,
    agent: tool.schema.string().describe("Agent name."),
    unit: tool.schema.string().describe("Unit id."),
    status: tool.schema.string().describe("Status text."),
    report: tool.schema.string().optional().describe("Report path or note."),
  },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) =>
        store.inbox.push({ agent: args.agent, unit: args.unit, status: args.status, report: args.report }),
      (result) => `${result.pointer.unit}\t${result.pointer.status}\t${result.filename}`,
    ),
});

export const potetoOrchInboxDrainTool: ToolDefinition = tool({
  description: "Drain inbox pointers, or peek without draining when peek is true.",
  args: {
    ...storeArg,
    peek: tool.schema.boolean().optional().describe("Read without draining."),
  },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) => (args.peek === true ? store.inbox.peek() : store.inbox.drain()),
      (rows) => compactRows(rows, pointerLine, "(empty)", null),
    ),
});

export const potetoOrchInboxCountTool: ToolDefinition = tool({
  description: "Count inbox pointers.",
  args: { ...storeArg },
  execute: async (args, context) =>
    withStore(context, args.store, (store) => store.inbox.count(), String),
});

export const potetoOrchGateParkTool: ToolDefinition = tool({
  description: "Park an open decision gate.",
  args: {
    ...storeArg,
    id: tool.schema.string().describe("Gate id."),
    question: tool.schema.string().describe("Gate question."),
    options: tool.schema.string().describe("Gate options."),
    defaultAnswer: tool.schema.string().describe("Default answer."),
  },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) =>
        store.gates.park({
          id: args.id,
          question: args.question,
          options: args.options,
          defaultAnswer: args.defaultAnswer,
        }),
      (result) => `${result.id}\topen`,
    ),
});

export const potetoOrchGateResolveTool: ToolDefinition = tool({
  description: "Resolve an open decision gate with the chosen answer.",
  args: {
    ...storeArg,
    id: tool.schema.string().describe("Gate id."),
    answer: tool.schema.string().describe("Chosen answer."),
  },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) => store.gates.resolve({ id: args.id, answer: args.answer }),
      (result) => `${result.id}\tresolved\t${result.answer}`,
    ),
});

export const potetoOrchGateListTool: ToolDefinition = tool({
  description: "List open decision gates.",
  args: { ...storeArg },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) => store.gates.list(),
      (rows) => compactRows(rows, gateLine, "(no open gates)"),
    ),
});

export const potetoOrchFrontierSetTool: ToolDefinition = tool({
  description: "Discover stacked PRs via gh in repo and set the frontier. Optional prs pin is a comma-separated PR list.",
  args: {
    ...storeArg,
    repo: tool.schema.string().describe("Repository directory."),
    prs: tool.schema.string().optional().describe("Comma-separated expected PR order pin."),
  },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) =>
        store.frontier.set({
          repo: resolveStore(args.repo, context.directory),
          prs: args.prs === undefined ? undefined : parsePrPin(args.prs),
        }),
      frontierLine,
    ),
});

export const potetoOrchFrontierShowTool: ToolDefinition = tool({
  description: "Show the current stack frontier.",
  args: { ...storeArg },
  execute: async (args, context) =>
    withStore(context, args.store, (store) => store.frontier.show(), frontierLine),
});

export const potetoOrchStatusTool: ToolDefinition = tool({
  description: "Render status.md and print the summary counts, change text, and open gates.",
  args: { ...storeArg },
  execute: async (args, context) =>
    withStore(context, args.store, (store) => store.status.render(), statusLines),
});

export const potetoOrchStandingAddTool: ToolDefinition = tool({
  description: "Append a standing order line.",
  args: {
    ...storeArg,
    line: tool.schema.string().describe("Standing order text."),
  },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) => store.standing.add({ line: args.line }),
      (item) => `${item.number}. ${item.line}`,
    ),
});

export const potetoOrchStandingShowTool: ToolDefinition = tool({
  description: "Show standing orders.",
  args: { ...storeArg },
  execute: async (args, context) =>
    withStore(
      context,
      args.store,
      (store) => store.standing.show(),
      (rows) => compactRows(rows, (item) => `${item.number}. ${item.line}`, "(no standing orders)"),
    ),
});

export const potetoOrchTools: Record<string, ToolDefinition> = {
  poteto_orch_init: potetoOrchInitTool,
  poteto_orch_unit_add: potetoOrchUnitAddTool,
  poteto_orch_unit_set: potetoOrchUnitSetTool,
  poteto_orch_unit_get: potetoOrchUnitGetTool,
  poteto_orch_unit_list: potetoOrchUnitListTool,
  poteto_orch_unit_counts: potetoOrchUnitCountsTool,
  poteto_orch_ledger_record: potetoOrchLedgerRecordTool,
  poteto_orch_ledger_check: potetoOrchLedgerCheckTool,
  poteto_orch_ledger_summary: potetoOrchLedgerSummaryTool,
  poteto_orch_inbox_push: potetoOrchInboxPushTool,
  poteto_orch_inbox_drain: potetoOrchInboxDrainTool,
  poteto_orch_inbox_count: potetoOrchInboxCountTool,
  poteto_orch_gate_park: potetoOrchGateParkTool,
  poteto_orch_gate_list: potetoOrchGateListTool,
  poteto_orch_gate_resolve: potetoOrchGateResolveTool,
  poteto_orch_frontier_set: potetoOrchFrontierSetTool,
  poteto_orch_frontier_show: potetoOrchFrontierShowTool,
  poteto_orch_status: potetoOrchStatusTool,
  poteto_orch_standing_add: potetoOrchStandingAddTool,
  poteto_orch_standing_show: potetoOrchStandingShowTool,
};
