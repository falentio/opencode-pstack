import { readdirSync } from "node:fs";

export function skillDirNames(skillsDir: string): string[] {
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}
