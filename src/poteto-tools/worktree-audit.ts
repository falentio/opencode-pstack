import { execFileSync } from "node:child_process";
import { isAbsolute, resolve } from "node:path";
import { tool, type ToolDefinition } from "@opencode-ai/plugin";

export type Bucket =
  | "hold-wip"
  | "hold-open-pr"
  | "verify-recent-chat"
  | "safe"
  | "review";

export interface WorktreeRow {
  readonly size: string;
  readonly age: string;
  readonly merged: string;
  readonly dirty: string;
  readonly remote: string;
  readonly pr: string;
  readonly bucket: Bucket;
  readonly worktree: string;
}

export interface ClassifyInput {
  readonly dirty: string;
  readonly pr: string;
  readonly recent: boolean;
  readonly merged: boolean;
}

export function classifyRow({ dirty, pr, recent, merged }: ClassifyInput): Bucket {
  if (dirty.startsWith("wip:")) return "hold-wip";
  if (pr.includes("OPEN")) return "hold-open-pr";
  if (recent) return "verify-recent-chat";
  if (merged || pr !== "-") return "safe";
  return "review";
}

export const WORKTREE_AUDIT_HEADER =
  "SIZE\tAGE\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_CHAT\tBUCKET\tWORKTREE";

export function formatTable(rows: readonly WorktreeRow[]): string {
  const lines = [WORKTREE_AUDIT_HEADER];
  for (const row of rows) {
    lines.push(
      [
        row.size,
        row.age,
        row.merged,
        row.dirty,
        row.remote,
        row.pr,
        "-",
        row.bucket,
        row.worktree,
      ].join("\t"),
    );
  }
  return lines.join("\n");
}

interface GhPrRow {
  readonly number: number;
  readonly state: string;
  readonly headRefName: string;
}

function outOrNull(file: string, args: readonly string[], cwd: string): string | null {
  try {
    return execFileSync(file, [...args], {
      cwd,
      encoding: "utf8",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

function ok(file: string, args: readonly string[], cwd: string): boolean {
  try {
    execFileSync(file, [...args], {
      cwd,
      encoding: "utf8",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

function resolveRepo(raw: string | undefined, directory: string): string {
  if (raw !== undefined) return isAbsolute(raw) ? raw : resolve(directory, raw);
  const top = outOrNull("git", ["rev-parse", "--show-toplevel"], directory)?.trim();
  return top !== undefined && top.length > 0 ? top : directory;
}

function listWorktrees(repo: string): string[] {
  const out = outOrNull("git", ["worktree", "list", "--porcelain"], repo);
  if (out === null) throw new Error("not in a git repo; pass a repo path");
  const paths: string[] = [];
  for (const line of out.split("\n")) {
    if (line.startsWith("worktree ")) paths.push(line.slice("worktree ".length).trim());
  }
  return paths;
}

function dirtyFromPorcelain(porcelain: string): string {
  if (porcelain.trim() === "") return "clean";
  const lines = porcelain.split("\n").filter((line) => line.length > 0);
  const tracked = lines.filter((line) => !line.startsWith("??"));
  if (tracked.length > 0) return `wip:${tracked.length}`;
  return `scratch:${lines.length}`;
}

function remoteFor(worktree: string, branch: string, head: string, repo: string): string {
  if (branch === "") return "detached";
  if (!ok("git", ["-C", worktree, "show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`], repo)) {
    return "no-remote";
  }
  const originSha = outOrNull("git", ["-C", worktree, "rev-parse", `origin/${branch}`], repo)?.trim() ?? "";
  if (originSha !== "" && originSha === head) return "pushed";
  const count = outOrNull("git", ["-C", worktree, "rev-list", "--count", `origin/${branch}..HEAD`], repo)?.trim() ?? "";
  return `ahead${count}`;
}

function loadPrMap(repo: string): Map<string, string> {
  const out = outOrNull(
    "gh",
    ["pr", "list", "--author", "@me", "--state", "all", "--limit", "1000", "--json", "number,state,headRefName"],
    repo,
  );
  if (out === null) return new Map();
  let parsed: unknown;
  try {
    parsed = JSON.parse(out);
  } catch {
    return new Map();
  }
  if (!Array.isArray(parsed)) return new Map();
  const map = new Map<string, string>();
  for (const entry of parsed) {
    const row = entry as Partial<GhPrRow>;
    if (typeof row.number !== "number" || typeof row.state !== "string" || typeof row.headRefName !== "string") continue;
    if (!map.has(row.headRefName)) map.set(row.headRefName, `#${row.number}/${row.state}`);
  }
  return map;
}

function auditRepo(repo: string): string {
  try {
    execFileSync("git", ["fetch", "origin", "main", "--quiet"], {
      cwd: repo,
      encoding: "utf8",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    // Best-effort like the legacy script. Stale origin/main still yields a useful table.
  }
  const prs = loadPrMap(repo);
  const all = listWorktrees(repo);
  const main = all[0];
  const rest = main === undefined ? [] : all.slice(1);
  const now = Math.floor(Date.now() / 1000);
  const rows: WorktreeRow[] = [];
  for (const wt of rest) {
    const size = outOrNull("du", ["-sh", wt], repo)?.split(/\s+/)[0] ?? "?";
    const head = outOrNull("git", ["-C", wt, "rev-parse", "HEAD"], repo)?.trim() ?? "";
    const headTsRaw = outOrNull("git", ["-C", wt, "log", "-1", "--format=%ct", "HEAD"], repo)?.trim() ?? "";
    const headTs = Number.parseInt(headTsRaw, 10);
    const age = Number.isSafeInteger(headTs) && headTs > 0 ? `${Math.floor((now - headTs) / 86400)}d` : "?";
    // Squash merges never become ancestors of main, so this flag only catches fast-forward and rebase merges. PR state remains the real merged signal.
    const merged = head !== "" && ok("git", ["merge-base", "--is-ancestor", head, "origin/main"], repo) ? "YES" : "no";
    const porcelain = outOrNull("git", ["-C", wt, "status", "--porcelain"], repo) ?? "";
    const dirty = dirtyFromPorcelain(porcelain);
    const branch = outOrNull("git", ["-C", wt, "symbolic-ref", "--quiet", "--short", "HEAD"], repo)?.trim() ?? "";
    const remote = remoteFor(wt, branch, head, repo);
    const pr = branch !== "" ? (prs.get(branch) ?? "-") : "-";
    const bucket = classifyRow({ dirty, pr, recent: false, merged: merged === "YES" });
    rows.push({ size, age, merged, dirty, remote, pr, bucket, worktree: wt });
  }
  return formatTable(rows);
}

export const potetoWorktreeAuditTool: ToolDefinition = tool({
  description:
    "Read-only worktree prune audit. Lists non-main worktrees as TSV with SIZE, AGE, MERGED, DIRTY, REMOTE, PR, LAST_CHAT, BUCKET, WORKTREE. Runs a best-effort git fetch origin main before the merge check like the legacy script. LAST_CHAT is always - because opencode exposes sessions through its session API instead of a transcript dir, so sessionStore is accepted but ignored. Rows stay in git worktree list discovery order. Shells only to git, du, and gh.",
  args: {
    repo: tool.schema.string().optional().describe("Repository directory, absolute or relative to the session directory. Defaults to the session repo top level."),
    sessionStore: tool.schema.string().optional().describe("Accepted for CLI parity but ignored. Opencode has a session API, not a transcript grep dir."),
  },
  execute: async (args, context) => {
    const repo = resolveRepo(args.repo, context.directory);
    return auditRepo(repo);
  },
});

export const potetoWorktreeAuditTools: Record<string, ToolDefinition> = {
  poteto_worktree_audit: potetoWorktreeAuditTool,
};
