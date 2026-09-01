import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

export type AgentDef = { name: string; description: string; prompt: string };
export type Catalog = { skillsDir: string; agents: AgentDef[] };

export function loadCatalog(packageRoot: string): Catalog {
  const agentsDir = join(packageRoot, "agents");
  const agents = readdirSync(agentsDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const parsed = parseAgentMarkdown(readFileSync(join(agentsDir, file), "utf8"));
      return {
        name: parsed.name || basename(file, ".md"),
        description: parsed.description,
        prompt: parsed.prompt,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return { skillsDir: join(packageRoot, "skills"), agents };
}

export function parseAgentMarkdown(markdown: string): AgentDef {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { name: "", description: "", prompt: markdown.trim() };
  }
  let name = "";
  let description = "";
  let bodyStart = lines.length;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "---") {
      bodyStart = i + 1;
      break;
    }
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim();
    const value = unquote(line.slice(colon + 1).trim());
    if (key === "name") name = value;
    else if (key === "description") description = value;
  }
  return { name, description, prompt: lines.slice(bodyStart).join("\n").trim() };
}

function unquote(value: string): string {
  const quote = value.charCodeAt(0);
  if (value.length >= 2 && quote === value.charCodeAt(value.length - 1) && (quote === 34 || quote === 39)) {
    return value.slice(1, -1);
  }
  return value;
}