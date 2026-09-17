import { join } from "node:path";
import commentSicko from "../agents/comment-sicko.ts";
import potetoAgent from "../agents/poteto-agent.ts";
import type { AgentDef } from "./agent.ts";

export type { AgentDef } from "./agent.ts";
export type Catalog = { skillsDir: string; agents: AgentDef[] };

const agentRegistry = [commentSicko, potetoAgent] satisfies readonly AgentDef[];

export function loadCatalog(packageRoot: string): Catalog {
  const agents = agentRegistry.map((agent) => ({ ...agent })).sort((a, b) => a.name.localeCompare(b.name));
  return { skillsDir: join(packageRoot, "skills"), agents };
}
