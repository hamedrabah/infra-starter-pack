import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scanRepository } from "../src/scan.js";
import { generateStarter } from "../src/generate.js";

const fixture = path.resolve("test/fixtures/basic");

test("scanner finds frameworks, OpenAPI, and routes", async () => {
  const report = await scanRepository(fixture);
  assert.equal(report.name, "tiny-api");
  assert.deepEqual(report.frameworks, ["React", "Express"]);
  assert.equal(report.openapi[0].title, "Tiny API");
  assert.deepEqual(report.routes.map((route) => `${route.method} ${route.path}`), ["GET /health", "POST /widgets"]);
});

test("generator writes Mintlify docs and workflow", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "infra-starter-"));
  await fs.cp(fixture, temp, { recursive: true });
  const report = await scanRepository(temp);
  const files = await generateStarter(report);
  assert(files.includes("docs.json"));
  const config = JSON.parse(await fs.readFile(path.join(temp, "docs.json"), "utf8"));
  assert.equal(config.navigation.groups[1].openapi, "openapi.yaml");
  const quality = await fs.readFile(path.join(temp, "docs/quality.mdx"), "utf8");
  assert.match(quality, /Replay QA tests a running web application/);
});

test("generator protects user-owned files", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "infra-starter-owned-"));
  await fs.cp(fixture, temp, { recursive: true });
  await fs.writeFile(path.join(temp, "docs.json"), "{}\n");
  const report = await scanRepository(temp);
  await assert.rejects(generateStarter(report), /Refusing to overwrite user-owned file/);
});
