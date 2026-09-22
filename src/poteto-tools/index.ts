import type { ToolDefinition } from "@opencode-ai/plugin";
import { potetoCheckPlanTool } from "./check-plan.ts";
import { potetoOrchTools } from "./orch-tools.ts";
import { potetoWatchPrTools } from "./watch-pr-tools.ts";

export const potetoTools: Record<string, ToolDefinition> = {
  poteto_check_plan: potetoCheckPlanTool,
  ...potetoOrchTools,
  ...potetoWatchPrTools,
};

export { potetoCheckPlanTool };
export { potetoOrchTools };
export { potetoWatchPrTools };
