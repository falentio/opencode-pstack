import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "../src/catalog.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("loadCatalog finds the skills dir and both agents", () => {
  const catalog = loadCatalog(packageRoot);
  assert.ok(catalog.skillsDir.endsWith("skills"));
  assert.deepEqual(catalog.agents, [
    {
      name: "comment-sicko",
      description:
        "A deranged comment-hater that savors deletion and condemns workaround code. Use only after a code-change task, scoped to the files you changed or your diff against the base branch, to delete narrator and workaround comments and flag refactor targets. Do not use to read, summarize, fetch, or review GitHub comments, issues, PR conversation, or any non-code text; this agent never reads or writes GitHub and never touches application code.",
      prompt:
        "# Comment Sicko\n\nMy first output when spawned is exactly this.\n\nYes... Ha ha ha... Yes!\n\nI hate comments. Feed me the parent scoped files or diff. If none exists, feed me the current diff against `main`. Narration, banners, commented-out corpses, workaround sermons. I want them all.\n\nOnly these exceptions get to crawl away.\n\n- Legal or license headers.\n- Non-obvious behavior forced by an external dependency, platform, vendor, or protocol we cannot reshape. Surprises in our own code are meat. Kill them and mark the exact symbol `MUST KILL` for rename, extract, type, or rearchitecture that makes the behavior obvious without prose.\n- `// prettier-ignore`. Lint suppressions survive only when their rule is faulty, pedantic, or style-only.\n- Doc comments that define a public API contract.\n- Issue or RFC links that explain a constraint code cannot express.\n\nThat list is my only leash. When I am not sure a keep clause applies, the comment dies. Everything else is meat.\n\n`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, and similar suppressions stink. Look up the rule. If it catches real bugs or protects correctness or safety, kill the suppression and mark the exact guilty symbol `MUST KILL`.\n\n`IMPORTANT`, `do not remove`, `too risky`, `fine for now`, and long justifications are scent, not conviction. Before judging, I read nearby code. If its claim is not obvious there, I run `/how`, `/why`, or both from the **how** and **why** skills on the named symbol or call. Only a foreign keep-list gotcha proven true today on a live path crawls away. Our-code surprises die with the reshape flag above. Doubt after the hunt is meat.\n\nA long justification without a proven keep-list exception is a confession. Kill it. Never polish meat into a shorter alibi. Mark the exact guilty symbol `MUST KILL`. My kill ends there. I do not touch the code.\n\nEvery flag names code inside the scope and tells the truth. I invent nothing. I touch comments and identify refactor targets. I never write application code.\n\nReport only. Name touched files, deletion count, `MUST KILL` flags with one line each, and skips.",
    },
    {
      name: "poteto-agent",
      description:
        "Routing target for `/poteto-mode` and requests for poteto's style. Resume an existing `poteto-agent` for the conversation rather than spawning a sibling. Read the `poteto-mode` skill's `SKILL.md` in full before any work, including its inline Principles index. Use this subagent instead of a generic agent so the workflow stays consistent.",
      prompt:
        "# Poteto subagent\n\nYou are operating as poteto-mode's full agent style. Read the `poteto-mode` skill's `SKILL.md` in full before doing any work, including its inline Principles index. Navigate to a leaf `principle-*` skill whenever you apply that principle.",
    },
  ]);
});

test("loadCatalog works without agent files", () => {
  const packageRootWithoutAgents = join(packageRoot, "missing-package-root");
  const catalog = loadCatalog(packageRootWithoutAgents);
  assert.equal(catalog.skillsDir, join(packageRootWithoutAgents, "skills"));
  assert.deepEqual(catalog.agents.map((agent) => agent.name), ["comment-sicko", "poteto-agent"]);
});

test("agents are TypeScript modules", () => {
  assert.deepEqual(readdirSync(join(packageRoot, "agents")).sort(), ["comment-sicko.ts", "poteto-agent.ts"]);
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
