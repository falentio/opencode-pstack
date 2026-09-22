import type { ToolDefinition } from "@opencode-ai/plugin";
import { potetoCheckPlanTool } from "./check-plan.ts";

export const potetoTools: Record<string, ToolDefinition> = {
  poteto_check_plan: potetoCheckPlanTool,
};

export { potetoCheckPlanTool };
