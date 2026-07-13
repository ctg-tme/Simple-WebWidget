import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/deploy-pages.yml", import.meta.url),
  "utf8",
);

test("pins every GitHub Action to an immutable full commit SHA", () => {
  const actionReferences = [...workflow.matchAll(/uses:\s+[^@\s]+@([^\s#]+)/g)];

  assert.ok(actionReferences.length > 0);

  for (const [, reference] of actionReferences) {
    assert.match(reference, /^[a-f0-9]{40}$/);
  }
});

test("isolates build permissions from deployment credentials", () => {
  const buildJob = workflow.slice(
    workflow.indexOf("  build:"),
    workflow.indexOf("  deploy:"),
  );
  const deployJob = workflow.slice(workflow.indexOf("  deploy:"));

  assert.match(buildJob, /permissions:\s*\n\s+contents: read/);
  assert.doesNotMatch(buildJob, /pages: write|id-token: write/);
  assert.match(buildJob, /run: npm ci/);
  assert.match(buildJob, /run: npm run build/);

  assert.match(deployJob, /needs: build/);
  assert.match(deployJob, /pages: write/);
  assert.match(deployJob, /id-token: write/);
  assert.doesNotMatch(deployJob, /npm ci|npm run build/);
});

test("configures Dependabot for npm and GitHub Actions", async () => {
  const dependabot = await readFile(
    new URL("../.github/dependabot.yml", import.meta.url),
    "utf8",
  );

  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /package-ecosystem: github-actions/);
});
