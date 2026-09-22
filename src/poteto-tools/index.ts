import type { ToolDefinition } from "@opencode-ai/plugin";
import { potetoCheckPlanTool } from "./check-plan.ts";
import { potetoOrchTools } from "./orch-tools.ts";

export const potetoTools: Record<string, ToolDefinition> = {
  poteto_check_plan: potetoCheckPlanTool,
  ...potetoOrchTools,
};

export { potetoCheckPlanTool };
export { potetoOrchTools };
