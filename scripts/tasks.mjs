import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = resolve(rootDir, "package.json");
const command = process.argv[2];
const extraArgs = process.argv.slice(3);

await main().catch(handleFatalError);

async function main() {
  switch (command) {
    case "dev":
      await runVite(["build", "--watch", ...extraArgs]);
      return;
    case "build":
      await runBuild();
      return;
    case "lint":
      await runLint();
      return;
    default:
      console.error(
        `[tasks] unknown command: ${command ?? "(missing)"}\n` +
          "usage: node scripts/tasks.mjs <dev|build|lint>",
      );
      process.exit(1);
  }
}

async function runBuild() {
  await runNodeStep("version-bump", "scripts/bump-extension-version.cjs");
  await runNodeStep("tsc", "node_modules/typescript/bin/tsc", ["--noEmit"]);
  await runVite(["build", ...extraArgs]);
  await runNodeStep("verify-extension", "scripts/verify-extension.cjs");
}

async function runLint() {
  await runNodeStep("oxlint", "node_modules/oxlint/dist/cli.js", [
    "--fix",
    ".",
  ]);
  await runNodeStep("oxfmt", "node_modules/oxfmt/dist/cli.js", ["."]);
  await formatPackageJson();
}

async function runVite(viteArgs) {
  await runNodeStep("vite", "node_modules/vite/bin/vite.js", viteArgs);
}

function runNodeStep(label, scriptPath, args = []) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      process.execPath,
      [resolve(rootDir, scriptPath), ...args],
      {
        cwd: rootDir,
        stdio: "inherit",
      },
    );

    child.once("error", (error) => {
      rejectPromise(
        new Error(`[tasks] failed to start ${label}`, { cause: error }),
      );
    });

    child.once("exit", (code, signal) => {
      if (signal) {
        rejectPromise(
          new Error(
            `[tasks] ${label} exited unexpectedly with signal ${signal}`,
          ),
        );
        return;
      }

      if (code !== 0) {
        rejectPromise(new Error(`[tasks] ${label} exited with code ${code}`));
        return;
      }

      resolvePromise();
    });
  });
}

async function formatPackageJson() {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const formatted = `${formatJsonValue(packageJson)}\n`;
  await writeFile(packageJsonPath, formatted, "utf8");
}

function formatJsonValue(value, indentLevel = 0, currentKey = null) {
  if (Array.isArray(value)) {
    return formatJsonArray(value, indentLevel);
  }

  if (value && typeof value === "object") {
    return formatJsonObject(
      value,
      indentLevel,
      shouldAlignObjectKeys(currentKey),
    );
  }

  return JSON.stringify(value);
}

function formatJsonArray(items, indentLevel) {
  if (items.length === 0) {
    return "[]";
  }

  const indent = getIndent(indentLevel);
  const childIndent = getIndent(indentLevel + 1);
  const lines = items.map(
    (item) => `${childIndent}${formatJsonValue(item, indentLevel + 1)}`,
  );

  return `[\n${lines.join(",\n")}\n${indent}]`;
}

function formatJsonObject(objectValue, indentLevel, alignKeys) {
  const entries = Object.entries(objectValue);

  if (entries.length === 0) {
    return "{}";
  }

  const indent = getIndent(indentLevel);
  const childIndent = getIndent(indentLevel + 1);
  const serializedKeys = entries.map(([key]) => JSON.stringify(key));
  const keyWidth = alignKeys
    ? Math.max(...serializedKeys.map((serializedKey) => serializedKey.length))
    : 0;
  const lines = entries.map(([key, nestedValue], index) => {
    const serializedKey = serializedKeys[index];
    const paddedKey = alignKeys
      ? serializedKey.padEnd(keyWidth, " ")
      : serializedKey;

    return (
      `${childIndent}${paddedKey}${alignKeys ? " : " : ": "}` +
      formatJsonValue(nestedValue, indentLevel + 1, key)
    );
  });

  return `{\n${lines.join(",\n")}\n${indent}}`;
}

function shouldAlignObjectKeys(currentKey) {
  return currentKey === "scripts" || currentKey === "devDependencies";
}

function getIndent(indentLevel) {
  return "  ".repeat(indentLevel);
}

function handleFatalError(error) {
  console.error(error);
  process.exitCode = 1;
}
