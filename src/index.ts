import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config, Plugin, PluginInput } from "@opencode-ai/plugin";
import { loadCatalog } from "./catalog.ts";
import { buildResumeContext, handleCompacting, takePendingResume, type PotetoEvidence } from "./poteto-compaction.ts";

// dist/index.js sits one level under the package root.
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// The v1 Config type does not declare the runtime-supported `skills` key.
type ConfigWithSkills = Config & { skills?: { paths?: string[] } };

const PstackPlugin: Plugin = async ({ client }) => {
  const pendingResume = new Map<string, PotetoEvidence>();
  return {
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
    async "experimental.session.compacting"(input, output) {
      const evidence = await handleCompacting(client, input.sessionID, output);
      if (evidence) pendingResume.set(input.sessionID, evidence);
    },
    async "experimental.chat.system.transform"(input, output) {
      if (!input.sessionID) return;
      const evidence = takePendingResume(pendingResume, input.sessionID);
      if (!evidence) return;
      output.system.push(buildResumeContext(evidence));
    },
  };
};

async function log(
  client: PluginInput["client"],
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
) {
  await client.app.log({
    body: {
      service: "@falentio/opencode-pstack",
      level,
      message,
      extra,
    },
  });
}

export default PstackPlugin;