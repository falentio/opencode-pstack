import type { ToolDefinition } from "@opencode-ai/plugin";
import { potetoCheckPlanTool } from "./check-plan.ts";
import { potetoOrchTools } from "./orch-tools.ts";
import { potetoWatchPrTools } from "./watch-pr-tools.ts";
import { potetoWorktreeAuditTools } from "./worktree-audit.ts";

export const potetoTools: Record<string, ToolDefinition> = {
  poteto_check_plan: potetoCheckPlanTool,
  ...potetoOrchTools,
  ...potetoWatchPrTools,
  ...potetoWorktreeAuditTools,
};

export { potetoCheckPlanTool };
export { potetoOrchTools };
export { potetoWatchPrTools };
export { potetoWorktreeAuditTools };
