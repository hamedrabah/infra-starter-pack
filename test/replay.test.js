import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createReplayProject, waitForReplayProject } from "../src/replay.js";

test("Replay client creates, polls, and returns bugs", async (context) => {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization, body });
    response.setHeader("content-type", "application/json");
    if (request.method === "POST" && request.url === "/api/v1/projects") {
      response.end(JSON.stringify({ project_id: "project-123", url: "https://qa.replay.io/project-123" }));
    } else if (request.url === "/api/v1/projects/project-123/status") {
      response.end(JSON.stringify({ open_bug_count: 1 }));
    } else if (request.url === "/api/v1/projects/project-123/timing") {
      response.end(JSON.stringify({ finished_at: "2026-08-24T12:00:00Z" }));
    } else if (request.url === "/api/v1/projects/project-123/bugs?page_size=100") {
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
});
