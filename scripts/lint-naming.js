#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function kebabCase(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function getWorkspacePackageFiles() {
  return [
    path.join(repoRoot, "apps", "api-worker", "package.json"),
    path.join(repoRoot, "apps", "admin-app", "package.json"),
    path.join(repoRoot, "apps", "worker-app", "package.json"),
    path.join(repoRoot, "packages", "types", "package.json"),
    path.join(repoRoot, "packages", "ui", "package.json"),
  ];
}

function expectedNameFromPath(packageJsonPath) {
  const relative = path.relative(repoRoot, path.dirname(packageJsonPath));
  const parts = relative.split(path.sep);
  if (parts.length !== 2) {
    return null;
  }

  const [, dirName] = parts;
  return `@safetywallet/${dirName}`;
}

function run() {
  const errors = [];

  const rootPackage = readJson(path.join(repoRoot, "package.json"));
  if (rootPackage.name !== "safetywallet") {
    errors.push(
      `Root package name must be \"safetywallet\" but found \"${rootPackage.name}\".`,
    );
  }

  for (const packageJsonPath of getWorkspacePackageFiles()) {
    const pkg = readJson(packageJsonPath);
    const expectedName = expectedNameFromPath(packageJsonPath);
    const relativePath = path.relative(repoRoot, packageJsonPath);

    if (!expectedName) {
      errors.push(`Could not infer expected name for ${relativePath}.`);
      continue;
    }

    if (pkg.name !== expectedName) {
      errors.push(
        `${relativePath}: expected \"${expectedName}\" but found \"${pkg.name}\".`,
      );
    }

    const suffix = expectedName.replace("@safetywallet/", "");
    if (!kebabCase(suffix)) {
      errors.push(
        `${relativePath}: expected suffix \"${suffix}\" must be kebab-case.`,
      );
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      process.stderr.write(`${error}\n`);
    }
    process.exit(1);
  }

  process.stdout.write("Naming lint passed.\n");
}

run();
