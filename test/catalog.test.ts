import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog, loadSkillDefs, parseAgentFile, splitFrontmatter } from "../src/catalog.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("loadCatalog finds the skills dir and both markdown agents", () => {
  const catalog = loadCatalog(packageRoot);
  assert.ok(catalog.skillsDir.endsWith("skills"));
  assert.deepEqual(
    catalog.agents.map((agent) => agent.name),
    ["comment-sicko", "poteto-agent"],
  );
  for (const agent of catalog.agents) {
    assert.equal(agent.mode, "subagent");
    assert.ok(agent.description.length > 0);
    assert.ok(agent.prompt.length > 0);
  }
  assert.ok(catalog.agents[0]!.prompt.includes("# Comment Sicko"));
  assert.ok(catalog.agents[1]!.prompt.includes("# Poteto subagent"));
  assert.ok(catalog.agents[0]!.description.startsWith("A deranged comment-hater"));
  assert.ok(catalog.agents[1]!.description.startsWith("Routing target"));
});

test("loadCatalog returns no agents when the agents dir is missing", () => {
  const packageRootWithoutAgents = join(packageRoot, "missing-package-root");
  const catalog = loadCatalog(packageRootWithoutAgents);
  assert.equal(catalog.skillsDir, join(packageRootWithoutAgents, "skills"));
  assert.deepEqual(catalog.agents, []);
});

test("agents ship as markdown files", () => {
  assert.deepEqual(readdirSync(join(packageRoot, "agents")).sort(), ["comment-sicko.md", "poteto-agent.md"]);
});

test("parseAgentFile reads description, mode, and body", () => {
  const agent = parseAgentFile("demo", "---\ndescription: Does things\nmode: subagent\n---\n\n# Demo\n\nBody.\n");
  assert.equal(agent.name, "demo");
  assert.equal(agent.description, "Does things");
  assert.equal(agent.mode, "subagent");
  assert.ok(agent.prompt.includes("# Demo"));
  assert.throws(() => parseAgentFile("demo", "---\ndescription: x\nmode: bogus\n---\nbody\n"));
  assert.throws(() => parseAgentFile("demo", "---\nmode: subagent\n---\nbody\n"));
});

test("loadSkillDefs finds the bundle with stable ids", () => {
  const skills = loadSkillDefs(join(packageRoot, "skills"));
  assert.ok(skills.length >= 50);
  const poteto = skills.find((skill) => skill.id === "poteto-mode");
  assert.ok(poteto);
  assert.ok(poteto.description.length > 0);
  assert.ok(poteto.content.includes("# Poteto mode"));
  assert.deepEqual(skills, skills.slice().sort((a, b) => a.id.localeCompare(b.id)));
});

test("loadSkillDefs skips directories without a description", () => {
  assert.deepEqual(loadSkillDefs(join(packageRoot, "missing-package-root", "skills")), []);
});

test("splitFrontmatter keeps bodies without frontmatter intact", () => {
  assert.deepEqual(splitFrontmatter("just body"), { data: {}, body: "just body" });
});

test("every skill frontmatter name matches its directory name", () => {
  const skillsDir = join(packageRoot, "skills");
  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const bad: Array<{ dir: string; name: string }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const raw = readFileSync(join(skillsDir, entry.name, "SKILL.md"), "utf8");
    const parsed = parseFrontmatterName(raw);
    if (parsed !== entry.name) bad.push({ dir: entry.name, name: parsed });
  }
  assert.deepEqual(bad, []);
});

function parseFrontmatterName(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return "";
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "---") break;
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    if (line.slice(0, colon).trim() === "name") {
      return line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}
