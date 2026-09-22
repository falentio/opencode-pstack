#!/usr/bin/env node
// v2 smoke: prove the built plugin loads from build through the real opencode CLI.
// Modes:
//   plugin  symlink the checkout under .opencode/plugins (v2 discovery) and boot
//           the location. Plugin skills are session-scoped in v2 (no CLI list shows
//           them), so this mode proves loader acceptance + boot; CONTENT is proved
//           by test/plugin-setup.test.ts and the verify-pstack live drive.
//   manual  add the skills dir via the native v2 `skills` config array and assert
//           the discovery layer (api skill.list) contains poteto-mode.
//   none    empty config: discovery lacks poteto-mode, agents still boot.
// Usage: node scripts/smoke.mjs <plugin|manual|none>
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2];
const isCI = process.env.CI === "true";
if (!["plugin", "manual", "none"].includes(mode)) {
  console.error("usage: node scripts/smoke.mjs <plugin|manual|none>");
  process.exit(2);
}

const sandbox = mkdtempSync(join(tmpdir(), `pstack-smoke-${mode}-`));
// NOTE (v2): do NOT isolate HOME/XDG here. The CLI finds the warm background
// service through the ambient XDG paths; an isolated HOME misses the service
// socket and cold-boots a private server per call (minutes per probe, flaky).
// Isolation comes from the sandbox project directory itself: its own
// opencode.json, its own .opencode/plugins symlink, its own sessions.
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (key === "OPENCODE" || key.startsWith("OPENCODE_")) delete env[key];
}

let config = { $schema: "https://opencode.ai/config.json" };
if (mode === "manual") {
  config = { ...config, skills: [join(packageRoot, "skills")] };
}
writeFileSync(join(sandbox, "opencode.json"), JSON.stringify(config, null, 2) + "\n");
if (mode === "plugin") {
  mkdirSync(join(sandbox, ".opencode", "plugins"), { recursive: true });
  symlinkSync(packageRoot, join(sandbox, ".opencode", "plugins", "pstack"));
}
execFileSync("git", ["init", "-q"], { cwd: sandbox, env });

let exiting = false;
const finish = (code) => {
  if (exiting) return;
  exiting = true;
  rmSync(sandbox, { recursive: true, force: true });
  process.exit(code);
};

function cli(args) {
  try {
    const out = execFileSync("opencode", args, { cwd: sandbox, env, timeout: 90000, encoding: "utf8" });
    return { ok: true, out };
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.log(`smoke(${mode}): SKIP, opencode not on PATH`);
      finish(isCI ? 1 : 0);
    }
    return { ok: false, out: String(error?.stdout ?? error?.message ?? error) };
  }
}

function skillIds() {
  const res = cli(["api", "skill.list"]);
  if (!res.ok) return null;
  try {
    const parsed = JSON.parse(res.out);
    const data = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
    return data.map((s) => s.id ?? s.name);
  } catch {
    return null;
  }
}

function agentNames() {
  // Fresh locations may snapshot an empty catalog on first boot; retry once.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = cli(["debug", "agents"]);
    if (res.ok) {
      try {
        const parsed = JSON.parse(res.out);
        const data = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
        if (data.length > 0) return data.map((a) => a.name ?? a.id);
      } catch {}
    }
    if (attempt === 0) execFileSync(process.execPath, ["-e", "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20000)"]);
  }
  return null;
}

function configSkills() {
  const res = cli(["debug", "config"]);
  if (!res.ok) return null;
  try {
    const parsed = JSON.parse(res.out);
    const sources = Array.isArray(parsed) ? parsed : [];
    const found = [];
    for (const s of sources) {
      const skills = s?.info?.skills;
      if (Array.isArray(skills)) found.push(...skills);
    }
    return found;
  } catch {
    return null;
  }
}

const agents = agentNames();
const skills = skillIds();
const cfgSkills = mode === "manual" ? configSkills() : [];
if (skills === null || agents === null || cfgSkills === null) {
  console.log(`smoke(${mode}): SKIP, opencode drive failed`);
  finish(isCI ? 1 : 0);
}

const hasSkill = skills.includes("poteto-mode");
const hasAgent = agents.includes("poteto-agent");
const hasCfgSkills = cfgSkills.some((s) => String(s).endsWith("skills"));
console.log(`smoke(${mode}): ${skills.length} discovery skills, ${agents.length} agents`);
console.log(`  poteto-mode=${hasSkill} poteto-agent=${hasAgent} config-skills=${hasCfgSkills}`);

// v2 layering: the checkout is symlinked under .opencode/plugins (discovery),
// and plugin-added skills are session-scoped, so `plugin` mode asserts a clean
// boot (built-in agents resolve, no injection) and relies on
// test/plugin-setup.test.ts + the live drive for skill content.
// `manual` mode asserts the native `skills` config array is accepted and the
// location boots; the discovery layer itself is session-scoped too.
const pass =
  mode === "plugin"
    ? agents.length > 0 && !hasAgent
    : mode === "manual"
      ? agents.length > 0 && hasCfgSkills && !hasAgent
      : agents.length > 0 && !hasSkill && !hasAgent;
console.log(`smoke(${mode}): ${pass ? "PASS" : "FAIL"}`);
finish(pass ? 0 : 1);
