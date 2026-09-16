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
    if (key !== "name" && key !== "description") continue;
    const value = parseScalar(line.slice(colon + 1).trim(), key);
    if (key === "name") name = value;
    else description = value;
  }
  return { name, description, prompt: lines.slice(bodyStart).join("\n").trim() };
}

// The agent frontmatter this package ships uses plain and quoted scalars.
// Reject the other YAML scalar forms on the two keys this parser reads, so a
// future edit that reaches for a block scalar or flow collection fails loudly
// instead of registering a description that is literally ">".
function parseScalar(raw: string, key: string): string {
  if (raw === "") return "";
  if (raw === ">" || raw === "|" || raw.startsWith(">") || raw.startsWith("|")) {
    throw new Error(`agent frontmatter ${key} uses a block scalar, which this parser does not support`);
  }
  if (raw.startsWith("[") || raw.startsWith("{")) {
    throw new Error(`agent frontmatter ${key} uses a flow collection, which this parser does not support`);
  }
  const quote = raw.charCodeAt(0);
  if (raw.length >= 2 && quote === raw.charCodeAt(raw.length - 1) && (quote === 34 || quote === 39)) {
    return raw.slice(1, -1);
  }
  return raw;
}
