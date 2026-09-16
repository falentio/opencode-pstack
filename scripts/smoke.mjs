#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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

const PORT = 4500 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}`;
const sandbox = mkdtempSync(join(tmpdir(), `pstack-smoke-${mode}-`));
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (key === "OPENCODE" || key.startsWith("OPENCODE_")) delete env[key];
}
env.HOME = join(sandbox, "home");
env.XDG_CONFIG_HOME = join(sandbox, "config");
env.XDG_DATA_HOME = join(sandbox, "data");
env.XDG_CACHE_HOME = join(sandbox, "cache");
for (const dir of [env.HOME, env.XDG_CONFIG_HOME, env.XDG_DATA_HOME, env.XDG_CACHE_HOME]) {
  mkdirSync(dir, { recursive: true });
}

const config =
  mode === "plugin"
    ? { $schema: "https://opencode.ai/config.json", plugin: [packageRoot] }
    : mode === "manual"
      ? { $schema: "https://opencode.ai/config.json", skills: { paths: [join(packageRoot, "skills")] } }
      : { $schema: "https://opencode.ai/config.json" };
writeFileSync(join(sandbox, "opencode.json"), JSON.stringify(config, null, 2) + "\n");

const server = spawn("opencode", ["serve", "--port", String(PORT)], {
  cwd: sandbox,
  env,
  stdio: "ignore",
});

let exiting = false;
const finish = (code) => {
  if (exiting) return;
  exiting = true;
  server.kill("SIGKILL");
  rmSync(sandbox, { recursive: true, force: true });
  process.exit(code);
};

server.on("error", (error) => {
  console.log(`smoke(${mode}): SKIP, ${error.code === "ENOENT" ? "opencode not on PATH" : error.message}`);
  finish(isCI ? 1 : 0);
});

async function get(path) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return await res.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

const skills = await get("/skill");
const agents = await get("/agent");
if (!skills) {
  console.log(`smoke(${mode}): SKIP, server did not start`);
  finish(isCI ? 1 : 0);
}

const skillNames = skills.map((s) => s.name);
const agentNames = (agents ?? []).map((a) => a.name);
const hasSkill = skillNames.includes("poteto-mode");
const hasAgent = agentNames.includes("poteto-agent");

console.log(`smoke(${mode}): ${skillNames.length} skills, ${agentNames.length} agents`);
console.log(`  poteto-mode=${hasSkill} poteto-agent=${hasAgent}`);

const pass =
  mode === "plugin"
    ? hasSkill && hasAgent
    : mode === "manual"
      ? hasSkill && !hasAgent
      : !hasSkill && !hasAgent;
console.log(`smoke(${mode}): ${pass ? "PASS" : "FAIL"}`);
finish(pass ? 0 : 1);
