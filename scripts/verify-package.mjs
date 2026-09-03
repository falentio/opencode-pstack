import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const expectedName = "@falentio/opencode-pstack";
const expectedVersion = packageJson.version;
const packDirectory = mkdtempSync(join(tmpdir(), "opencode-pstack-pack-"));
const fixtureDirectory = mkdtempSync(join(tmpdir(), "opencode-pstack-consumer-"));
const githubOutput = process.env.GITHUB_OUTPUT;
let keepPackDirectory = false;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || "no output";
    throw new Error(`${command} ${args.join(" ")} failed: ${detail}`);
  }
  return result.stdout;
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function readTarJson(tarball, path) {
  return JSON.parse(run("tar", ["-xOf", tarball, `package/${path}`]));
}

try {
  check(typeof expectedVersion === "string" && expectedVersion.length > 0, "package.json must define a version");
  for (const path of ["dist/index.js", "dist/index.d.ts", "dist/catalog.js", "dist/catalog.d.ts"]) {
    check(existsSync(join(repoRoot, path)), `build output is missing: ${path}`);
  }

  const packOutput = run("npm", ["pack", "--json", "--pack-destination", packDirectory]);
  const packResults = JSON.parse(packOutput);
  check(Array.isArray(packResults) && packResults.length === 1, "npm pack must produce exactly one tarball");

  const tarball = resolve(packDirectory, packResults[0].filename);
  check(existsSync(tarball), `npm pack did not create ${tarball}`);
  const archivePaths = new Set(
    run("tar", ["-tzf", tarball])
      .split(/\r?\n/)
      .filter(Boolean)
      .map((path) => path.replace(/\/$/, ""))
      .filter((path) => path.startsWith("package/") && path !== "package")
      .map((path) => path.slice("package/".length)),
  );
  const packedPackage = readTarJson(tarball, "package.json");
  check(packedPackage.name === expectedName, `packed package name is ${packedPackage.name}`);
  check(packedPackage.version === expectedVersion, `packed package version is ${packedPackage.version}`);

  const localSkills = readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `skills/${entry.name}/SKILL.md`)
    .sort();
  const requiredPaths = [
    "dist/index.js",
    "dist/index.d.ts",
    "dist/catalog.js",
    "dist/catalog.d.ts",
    "README.md",
    "LICENSE",
    "agents/comment-sicko.md",
    "agents/poteto-agent.md",
    "docs/guide/README.md",
    ...localSkills,
  ];
  for (const path of requiredPaths) check(archivePaths.has(path), `packed file is missing: ${path}`);

  const leakedPaths = [...archivePaths].filter(
    (path) =>
      path === "src" ||
      path.startsWith("src/") ||
      path === "test" ||
      path.startsWith("test/") ||
      path === "tests" ||
      path.startsWith("tests/") ||
      path.startsWith(".github/") ||
      path.startsWith(".circleci/") ||
      path.startsWith(".gitlab/") ||
      /(^|\/)(?:pnpm-lock\.yaml|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|bun\.lockb?|[^/]+\.lock)$/.test(path),
  );
  check(leakedPaths.length === 0, `forbidden packed files: ${leakedPaths.join(", ")}`);

  writeFileSync(
    join(fixtureDirectory, "package.json"),
    `${JSON.stringify({ name: "opencode-pstack-consumer", private: true }, null, 2)}\n`,
  );
  run("npm", ["install", "--prefix", fixtureDirectory, "--no-package-lock", "--no-save", tarball]);

  const npmRoot = run("npm", ["root", "--prefix", fixtureDirectory]).trim();
  const installedPackage = resolve(npmRoot, ...expectedName.split("/"));
  check(existsSync(join(installedPackage, "package.json")), `installed package is missing: ${installedPackage}`);
  check(readTarJson(tarball, "package.json").name === expectedName, "verified package identity changed");
  run("opencode", ["--version"]);
  run("bash", [join(repoRoot, "scripts/verify.sh")], {
    cwd: repoRoot,
    env: { ...process.env, PLUGIN_PATH: installedPackage },
  });

  const release = Object.freeze({
    tag: `v${expectedVersion}`,
    name: expectedName,
    version: expectedVersion,
    tarball,
  });
  if (githubOutput) {
    appendFileSync(githubOutput, `tarball=${release.tarball}\nintegrity=${packResults[0].integrity}\n`);
    keepPackDirectory = true;
  }
  console.log(`PACKAGE VERIFY PASS ${release.name}@${release.version}`);
} catch (error) {
  console.error(`PACKAGE VERIFY FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  rmSync(fixtureDirectory, { recursive: true, force: true });
  if (!keepPackDirectory) rmSync(packDirectory, { recursive: true, force: true });
}
