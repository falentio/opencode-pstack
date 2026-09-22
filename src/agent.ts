export type AgentDef = Readonly<{
  name: string;
  description: string;
  mode: "subagent" | "primary" | "all";
  prompt: string;
}>;
