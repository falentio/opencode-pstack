import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkPlanContent, potetoCheckPlanTool } from "../src/poteto-tools/check-plan.ts";

const RULE =
  "Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.";
const LANES = "Ten lanes on the inherited parent model at the PR head";

function laneSet(count: number): string {
  const rows: string[] = [];
  for (let i = 1; i <= count; i++) {
    rows.push(`- [ ] Lane ${i}. Open page and Save \`shot-${i}.png\`. Pass when list shows`);
  }
  return rows.join("\n");
}

function prBody(overrides: { live?: string; perf?: string; gate?: string; gateHead?: string }): string {
  const live =
    overrides.live ??
    `**Verify, live.** ${RULE} ${LANES}\n${laneSet(10)}`;
  const perf =
    overrides.perf ??
    `**Verify, perf.** ${RULE}\n- [ ] Metric. latency\n- [ ] Probe. script\n- [ ] Baseline. main\n- [ ] Rule. budget`;
  const gateHead = overrides.gateHead ?? "**Review gate.**";
  const gateBody = overrides.gate ?? "- [ ] Attach screenshot and video for operator review";
  return [
    "**Depends on.** root",
    "**Files.**\n- [ ] Touch `a.ts`",
    "**Build.**\n- [ ] Run `pnpm build`",
    "**You see.**\n- [ ] Open app and see list",
    `**Verify, unit.** ${RULE}\n- [ ] Run \`pnpm test\``,
    live,
    perf,
    `${gateHead}\n${gateBody}`,
    "**Merge.**\n- [ ] Merge when green",
  ].join("\n");
}

function planWith(pr: string, head = "# Slice plan"): string {
  return [
    head,
    "",
    "Short intro line.",
    "",
    "## How to read this",
    "One box is one unit of work",
    "Each box names the evidence",
    "Check a box only when its evidence exists",
    "See playbooks/ for workflow",
    RULE,
    "",
    "## Program checklist",
    "### Arm the program one",
    "### Spawn owners two",
    "### PR mechanics three",
    "### Verdict and merge four",
    "### Boot recipe five",
    "goal file lives here",
    "Run `git show origin/main:` to compare",
    "Allow 30-minute window",
    "Send status message on done",
    "",
    "## PR1 Slice",
    pr,
    "",
    "## Close the program",
    "Done",
    "",
    "## Appendix A Prototype evidence",
    "Probe notes here",
    "",
  ].join("\n");
}

const VALID_PR = prBody({});
const VALID_PLAN = planWith(VALID_PR);

test("valid plan passes with one report line", () => {
  const result = checkPlanContent(VALID_PLAN, "plan.md");
  assert.deepEqual(result.problems, []);
  assert.equal(result.reportLines.length, 1);
  assert.match(result.reportLines[0] ?? "", /PR1 Slice/);
  assert.match(result.reportLines[0] ?? "", /boxes=20/);
});

test("missing H1 fails", () => {
  const broken = planWith(VALID_PR, "No title here");
  const result = checkPlanContent(broken, "plan.md");
  assert.ok(result.problems.some((p) => p.includes("no H1 title")));
});

test("nine lanes fail the lane count", () => {
  const live = `**Verify, live.** ${RULE} ${LANES}\n${laneSet(9)}`;
  const result = checkPlanContent(planWith(prBody({ live })), "plan.md");
  assert.ok(result.problems.some((p) => p.includes("lanes are [1,2,3,4,5,6,7,8,9]")));
});

test("perf items out of order fail", () => {
  const perf = `**Verify, perf.** ${RULE}\n- [ ] Probe. script\n- [ ] Metric. latency\n- [ ] Baseline. main\n- [ ] Rule. budget`;
  const result = checkPlanContent(planWith(prBody({ perf })), "plan.md");
  assert.ok(result.problems.some((p) => p.includes("perf boxes are")));
});

test("review gate None with boxes fails", () => {
  const result = checkPlanContent(
    planWith(prBody({ gateHead: "**Review gate.** None.", gate: "- [ ] Extra box" })),
    "plan.md",
  );
  assert.ok(result.problems.some((p) => p.includes("says None but has boxes")));
});

test("review gate without operator evidence words fails", () => {
  const result = checkPlanContent(planWith(prBody({ gate: "- [ ] Attach screenshot" })), "plan.md");
  assert.ok(result.problems.some((p) => p.includes('lacks "video"')));
});

test("missing verification rule fails each verify block", () => {
  const live = `**Verify, live.** ${LANES}\n${laneSet(10)}`;
  const result = checkPlanContent(planWith(prBody({ live })), "plan.md");
  assert.ok(result.problems.some((p) => p.includes("Verify, live. does not open with the rule")));
});

test("tool execute returns problems inline without throwing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "poteto-plan-"));
  writeFileSync(join(dir, "plan.md"), planWith(prBody({ gate: "- [ ] Attach screenshot" })), "utf8");
  const output = (await potetoCheckPlanTool.execute(
    { path: "plan.md" },
    { directory: dir } as never,
  )) as string;
  assert.match(output, /1 PR sections, 2 problems/);
  assert.match(output, /Review gate lacks/);
});

test("tool execute resolves a relative path against context directory", async () => {
  const dir = mkdtempSync(join(tmpdir(), "poteto-plan-"));
  writeFileSync(join(dir, "plan.md"), VALID_PLAN, "utf8");
  const output = (await potetoCheckPlanTool.execute(
    { path: "plan.md" },
    { directory: dir } as never,
  )) as string;
  assert.match(output, /1 PR sections, 0 problems/);
});

test("tool execute reports the valid plan shape", async () => {
  const dir = mkdtempSync(join(tmpdir(), "poteto-plan-"));
  writeFileSync(join(dir, "plan.md"), VALID_PLAN, "utf8");
  const output = (await potetoCheckPlanTool.execute(
    { path: join(dir, "plan.md") },
    { directory: dir } as never,
  )) as string;
  assert.match(output, /PR1 Slice\s+boxes=20/);
  assert.match(output, /1 PR sections, 0 problems/);
});
