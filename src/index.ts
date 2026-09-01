import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config, Plugin, PluginInput } from "@opencode-ai/plugin";
import { loadCatalog } from "./catalog.ts";

// dist/index.js sits one level under the package root.
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// The v1 Config type does not declare the runtime-supported `skills` key.
type ConfigWithSkills = Config & { skills?: { paths?: string[] } };

const PstackPlugin: Plugin = async ({ client }) => ({
  async config(input) {
    try {
      const catalog = loadCatalog(packageRoot);
      if (!existsSync(catalog.skillsDir)) {
        await log(client, "warn", "pstack skills directory not found", {
          skillsDir: catalog.skillsDir,
        });
        return;
      }
      const config = input as ConfigWithSkills;
      config.skills ??= { paths: [] };
      config.skills.paths ??= [];
      config.skills.paths.push(catalog.skillsDir);
      input.agent ??= {};
      for (const agent of catalog.agents) {
        input.agent[agent.name] = {
          description: agent.description,
          mode: "subagent",
          prompt: agent.prompt,
        };
      }
    } catch (error) {
      await log(client, "error", "failed to register pstack skills and agents", {
        error: String(error),
      });
    }
  },
});

async function log(
  client: PluginInput["client"],
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
) {
  await client.app.log({
    body: {
      service: "opencode-pstack",
      level,
      message,
      extra,
    },
  });
}

export default PstackPlugin;