import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_REPLAY_API = "https://qa.replay.io/api/v1";

function projectIdFrom(value) {
  return value?.project_id || value?.id || value?.project?.id || null;
}

async function request(apiBase, token, pathname, options = {}) {
  const response = await fetch(`${apiBase.replace(/\/$/, "")}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) {
    const detail = body?.detail || body?.message || text || response.statusText;
    throw new Error(`Replay QA API ${response.status}: ${detail}`);
  }
  return body;
}

export async function createReplayProject({
  token,
  targetUrl,
  name,
  instructions = "Explore the app and test the main user journeys, error states, and regressions.",
  designDocument,
  reverseProxy = false,
  budget = 20,
  apiBase = DEFAULT_REPLAY_API
}) {
  if (!token) throw new Error("Missing Replay token. Set REPLAY_QA_TOKEN or pass --token.");
  if (!targetUrl) throw new Error("Replay QA needs a running app URL via --target-url.");
  const body = {
    name: name || new URL(targetUrl).hostname,
    target_url: targetUrl,
    instructions,
    use_reverse_proxy: reverseProxy,
    budget
  };
  if (designDocument) body.design_document = designDocument;
  const project = await request(apiBase, token, "/projects", { method: "POST", body: JSON.stringify(body) });
  const projectId = projectIdFrom(project);
  if (!projectId) throw new Error("Replay created a project but returned no recognizable project id.");
  return { projectId, project };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForReplayProject({
  token,
  projectId,
  apiBase = DEFAULT_REPLAY_API,
  pollMs = 15_000,
  timeoutMs = 30 * 60_000,
  onPoll = () => {}
}) {
  const started = Date.now();
  let status = null;
  let timing = null;
  while (Date.now() - started < timeoutMs) {
    [status, timing] = await Promise.all([
      request(apiBase, token, `/projects/${encodeURIComponent(projectId)}/status`),
      request(apiBase, token, `/projects/${encodeURIComponent(projectId)}/timing`)
    ]);
    onPoll({ status, timing, elapsedMs: Date.now() - started });
    if (timing?.finished_at) {
      const bugs = await request(apiBase, token, `/projects/${encodeURIComponent(projectId)}/bugs?page_size=100`);
      return { projectId, status, timing, bugs };
    }
    await delay(pollMs);
  }
  throw new Error(`Replay QA did not finish within ${Math.round(timeoutMs / 60_000)} minutes.`);
}

export async function writeReplayReport(file, report) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return destination;
}
