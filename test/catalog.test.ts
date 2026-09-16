import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog, parseAgentMarkdown } from "../src/catalog.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("parseAgentMarkdown extracts description and prompt", () => {
  const out = parseAgentMarkdown(
    [
      "---",
      "name: test-agent",
      "description: does a thing",
      "---",
      "# Body",
      "Instructions here.",
      "",
    ].join("\n"),
  );
  assert.equal(out.name, "test-agent");
  assert.equal(out.description, "does a thing");
  assert.equal(out.prompt, "# Body\nInstructions here.");
});

test("parseAgentMarkdown handles missing name", () => {
  const out = parseAgentMarkdown("---\ndescription: only description\n---\nBody.\n");
  assert.equal(out.name, "");
  assert.equal(out.description, "only description");
  assert.equal(out.prompt, "Body.");
});

test("parseAgentMarkdown returns raw text when no frontmatter", () => {
  const out = parseAgentMarkdown("# Just a body\n");
  assert.equal(out.name, "");
  assert.equal(out.description, "");
  assert.equal(out.prompt, "# Just a body");
});

test("parseAgentMarkdown keeps a colon inside a plain description", () => {
  const out = parseAgentMarkdown("---\nname: a\ndescription: Reviews code: quality\n---\nBody.\n");
  assert.equal(out.description, "Reviews code: quality");
});

test("parseAgentMarkdown strips matching quotes", () => {
  const out = parseAgentMarkdown("---\ndescription: \"quoted: value\"\n---\nBody.\n");
  assert.equal(out.description, "quoted: value");
});

test("parseAgentMarkdown rejects a block scalar instead of returning the marker", () => {
  assert.throws(
    () => parseAgentMarkdown("---\ndescription: >\n  folded text\n---\nBody.\n"),
    /block scalar/,
  );
});

test("parseAgentMarkdown rejects a flow collection", () => {
  assert.throws(() => parseAgentMarkdown("---\ndescription: [a, b]\n---\nBody.\n"), /flow collection/);
});

test("parseAgentMarkdown ignores unknown keys that use unsupported scalar forms", () => {
  const out = parseAgentMarkdown(
    ["---", "name: a", "description: fine", "tools: { bash: false }", "---", "Body."].join("\n"),
  );
  assert.equal(out.name, "a");
  assert.equal(out.description, "fine");
});

test("loadCatalog finds the skills dir and both agents", () => {
  const catalog = loadCatalog(packageRoot);
  assert.ok(catalog.skillsDir.endsWith("skills"));
  assert.deepEqual(catalog.agents.map((a) => a.name), ["comment-sicko", "poteto-agent"]);
  for (const agent of catalog.agents) {
    assert.ok(agent.description.length > 0);
    assert.ok(agent.prompt.length > 0);
  }
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