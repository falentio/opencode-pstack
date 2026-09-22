import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isAbsolute } from "node:path";
import type { Skill } from "@opencode/plugin";
import type { AgentDef } from "./agent.ts";

export type { AgentDef } from "./agent.ts";
export type Catalog = { skillsDir: string; agentsDir: string; agents: AgentDef[] };

export type SkillDef = {
  id: string;
  name: string;
  description: string;
  path: string;
  content: string;
};

export function loadSkillDefs(skillsDir: string): SkillDef[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
  const skills: SkillDef[] = [];
  for (const id of entries) {
    const skillPath = join(skillsDir, id, "SKILL.md");
    let text: string;
    try {
      text = readFileSync(skillPath, "utf8");
    } catch {
      continue;
    }
    const { data, body } = splitFrontmatter(text);
    const name = (data["name"] ?? id).trim();
    const description = (data["description"] ?? "").trim();
    if (description.length === 0) continue;
    skills.push({ id, name, description, path: skillPath, content: body.trim() + "\n" });
  }
  return skills.sort((a, b) => a.id.localeCompare(b.id));
}

export function toSkillInfo(skill: SkillDef): Skill.Info {
  if (skill.id.length === 0) throw new Error("skill has empty id");
  if (skill.name.length === 0) throw new Error(`skill ${skill.id} has empty name`);
  if (skill.description.length === 0) throw new Error(`skill ${skill.id} has empty description`);
  if (!isAbsolute(skill.path)) throw new Error(`skill ${skill.id} path is not absolute`);
  if (skill.content.length === 0) throw new Error(`skill ${skill.id} has empty content`);
  return skill as unknown as Skill.Info;
}

export function parseAgentFile(name: string, text: string): AgentDef {
  const { data, body } = splitFrontmatter(text);
  const description = (data["description"] ?? "").trim();
  const mode = (data["mode"] ?? "subagent").trim();
  if (description.length === 0) throw new Error(`agent ${name} has no description frontmatter`);
  if (mode !== "subagent" && mode !== "primary" && mode !== "all") {
    throw new Error(`agent ${name} has unknown mode ${JSON.stringify(mode)}`);
  }
  return { name, description, mode, prompt: body.trim() + "\n" };
}

export function splitFrontmatter(text: string): { data: Record<string, string>; body: string } {
  const data: Record<string, string> = {};
  if (!text.startsWith("---")) return { data, body: text };
  const lines = text.split("\n");
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if ((lines[i] ?? "").trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { data, body: text };
  for (const line of lines.slice(1, end)) {
    if (line === undefined || line.trim() === "" || /^\s/.test(line)) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key !== "") data[key] = value;
  }
  return { data, body: lines.slice(end + 1).join("\n") };
}

export function loadCatalog(packageRoot: string): Catalog {
  const skillsDir = join(packageRoot, "skills");
  const agentsDir = join(packageRoot, "agents");
  let entries: string[] = [];
  try {
    entries = readdirSync(agentsDir);
  } catch {
    entries = [];
  }
  const agents = entries
    .filter((entry) => entry.endsWith(".md"))
    .map((entry) => {
      const name = entry.slice(0, -".md".length);
      return parseAgentFile(name, readFileSync(join(agentsDir, entry), "utf8"));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return { skillsDir, agentsDir, agents };
}
