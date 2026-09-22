export type PotetoEvidence = {
  kind: "slash-command" | "skill-call" | "agent-spawn";
  detail: string;
};

type PotetoPart = {
  type: string;
  text?: unknown;
  tool?: unknown;
  state?: { input?: unknown };
};

type PotetoMessageInfo = { role: string };

export type PotetoSessionMessage = {
  info: PotetoMessageInfo;
  parts: PotetoPart[];
};

const MAX_MESSAGES = 300;
const SLASH_COMMAND_PATTERN = /(^|\s)\/poteto-mode(?![\w-])/;
const OPT_OUT_PATTERN = /\b(opt\s*-?\s*out|disable|turn\s+off|quit)\b/i;
const SKILL_CONTENT_MARKER = "# Poteto mode";

const SESSION_PICKUP_PATH = "skills/poteto-mode/playbooks/session-pickup.md";
const SKILL_NAME = "poteto-mode";

export function findPotetoEvidence(messages: readonly PotetoSessionMessage[]): PotetoEvidence | null {
  try {
    const limit = Math.min(messages.length, MAX_MESSAGES);
    for (let i = 0; i < limit; i++) {
      const message = messages[i];
      if (!message || !message.info || !Array.isArray(message.parts)) continue;
      const slash = matchSlashCommand(message);
      if (slash) return slash;
      const tool = matchToolPart(message);
      if (tool) return tool;
    }
    return null;
  } catch {
    return null;
  }
}

export function findPotetoEvidenceV2(messages: readonly unknown[]): PotetoEvidence | null {
  try {
    const limit = Math.min(messages.length, MAX_MESSAGES);
    for (let i = 0; i < limit; i++) {
      const message = messages[i];
      let role = "";
      try {
        const record = message as Record<string, unknown>;
        if (record && typeof record["role"] === "string") role = record["role"] as string;
        else {
          const info = record?.["info"] as Record<string, unknown> | undefined;
          if (info && typeof info["role"] === "string") role = info["role"] as string;
        }
      } catch {
        role = "";
      }
      let text: string;
      try {
        text = JSON.stringify(message) ?? "";
      } catch {
        continue;
      }
      if (role === "user" || role === "") {
        if (text.includes(SKILL_CONTENT_MARKER) || SLASH_COMMAND_PATTERN.test(text)) {
          const instruction = text.includes(SKILL_CONTENT_MARKER)
            ? text.slice(text.indexOf(SKILL_CONTENT_MARKER) + SKILL_CONTENT_MARKER.length)
            : text;
          if (!OPT_OUT_PATTERN.test(instruction)) {
            return { kind: "slash-command", detail: instruction.trim().slice(0, 200) };
          }
        }
      }
      if (text.includes("poteto-mode") && (text.includes("skill") || text.includes("tool-call"))) {
        return { kind: "skill-call", detail: `skill tool invoked for ${SKILL_NAME}` };
      }
      if (text.includes("poteto-agent")) {
        return { kind: "agent-spawn", detail: "task tool spawned poteto-agent" };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function buildResumeContext(evidence: PotetoEvidence): string {
  return `Poteto mode is still active, loaded earlier via ${evidence.kind}. Re-invoke the ${SKILL_NAME} skill via the skill tool now, before any other work, and follow the copy it returns rather than stale instructions from before the summary. Resume from the compaction summary using ${SESSION_PICKUP_PATH}. If the user opted out, ignore this note.`;
}

export function resumeSystemPart(evidence: PotetoEvidence): { type: "text"; text: string } {
  return { type: "text", text: buildResumeContext(evidence) };
}

export function takePendingResume(
  pending: Map<string, PotetoEvidence>,
  sessionID: string,
): PotetoEvidence | undefined {
  const evidence = pending.get(sessionID);
  if (evidence) pending.delete(sessionID);
  return evidence;
}

function matchSlashCommand(message: PotetoSessionMessage): PotetoEvidence | null {
  if (message.info.role !== "user") return null;
  const text = message.parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("\n");
  const expanded = text.includes(SKILL_CONTENT_MARKER);
  if (!SLASH_COMMAND_PATTERN.test(text) && !expanded) return null;
  const instruction = expanded ? text.slice(text.indexOf(SKILL_CONTENT_MARKER) + SKILL_CONTENT_MARKER.length) : text;
  if (OPT_OUT_PATTERN.test(instruction)) return null;
  return {
    kind: "slash-command",
    detail: instruction.trim().slice(0, 200),
  };
}

function matchToolPart(message: PotetoSessionMessage): PotetoEvidence | null {
  for (const part of message.parts) {
    if (part.type !== "tool" || typeof part.tool !== "string") continue;
    const input = part.state?.input;
    if (part.tool === "skill" && matchSkillName(input)) {
      return { kind: "skill-call", detail: `skill tool invoked for ${SKILL_NAME}` };
    }
    if (part.tool === "task" && inputMentions(input, "poteto-agent")) {
      return { kind: "agent-spawn", detail: "task tool spawned poteto-agent" };
    }
  }
  return null;
}

function matchSkillName(input: unknown): boolean {
  return readStringField(input, "name") === SKILL_NAME;
}

function readStringField(input: unknown, field: "name" | "subagent_type"): string | null {
  if (typeof input === "string") {
    try {
      const parsed = input as unknown;
      void parsed;
      const reparsed: unknown = JSON.parse(input);
      if (reparsed && typeof reparsed === "object") return readStringField(reparsed, field);
    } catch {
      return input;
    }
    return input;
  }
  if (!input || typeof input !== "object") return null;
  const value = (input as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

function inputMentions(input: unknown, needle: string): boolean {
  try {
    if (typeof input === "string") return input.toLowerCase().includes(needle);
    if (!input || typeof input !== "object") return false;
    return JSON.stringify(input).toLowerCase().includes(needle);
  } catch {
    return false;
  }
}
