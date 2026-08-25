import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createReplayProject, waitForReplayProject, writeReplayReport } from "../src/replay.js";

test("Replay client creates, polls, and returns bugs", async (context) => {
  const requests = [];
  let statusAttempts = 0;
  const server = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization, body });
    response.setHeader("content-type", "application/json");
    if (request.method === "POST" && request.url === "/api/v1/projects") {
      response.end(JSON.stringify({ project_id: "project-123", url: "https://qa.replay.io/project-123" }));
    } else if (request.url === "/api/v1/projects/project-123/status") {
      statusAttempts += 1;
      if (statusAttempts === 1) {
        response.statusCode = 503;
        response.end(JSON.stringify({ detail: "temporary" }));
      } else {
        response.end(JSON.stringify({ open_bug_count: 1 }));
      }
    } else if (request.url === "/api/v1/projects/project-123/timing") {
      response.end(JSON.stringify({ finished_at: "2026-08-24T12:00:00Z" }));
    } else if (request.url === "/api/v1/projects/project-123/bugs?status=open&page_size=100") {
      response.end(JSON.stringify({ items: [{ id: "bug-1", status: "open" }] }));
    } else {
      response.statusCode = 404;
      response.end(JSON.stringify({ detail: "not found" }));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const { port } = server.address();
  const apiBase = `http://127.0.0.1:${port}/api/v1`;

  const created = await createReplayProject({
    apiBase,
    token: "lqa_test",
    targetUrl: "https://preview.example.com",
    name: "Fixture",
    budget: 10
  });
  assert.equal(created.projectId, "project-123");
  const sent = JSON.parse(requests[0].body);
  assert.equal(sent.target_url, "https://preview.example.com");
  assert.equal(sent.budget, 10);
  assert.equal(requests[0].authorization, "Bearer lqa_test");

  const finished = await waitForReplayProject({ apiBase, token: "lqa_test", projectId: created.projectId, pollMs: 1, timeoutMs: 1000 });
  assert.equal(finished.bugs.items[0].id, "bug-1");
  assert.equal(statusAttempts, 2);
});

test("Replay client validates targets before creating a project", async () => {
  await assert.rejects(
    createReplayProject({ token: "lqa_test", targetUrl: "file:///etc/passwd" }),
    /must use http or https/
  );
  await assert.rejects(
    createReplayProject({ token: "lqa_test", targetUrl: "https://user:pass@example.com" }),
    /must not contain embedded credentials/
  );
  await assert.rejects(
    createReplayProject({ token: "lqa_test", targetUrl: "https://example.com", budget: -1 }),
    /non-negative number/
  );
});

test("Replay report is written with owner-only permissions", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "infra-replay-report-"));
  const destination = await writeReplayReport(path.join(temp, "report.json"), { bugs: [] });
  const stat = await fs.stat(destination);
  assert.equal(stat.mode & 0o777, 0o600);
});
