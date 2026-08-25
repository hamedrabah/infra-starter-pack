import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_REPLAY_API = "https://qa.replay.io/api/v1";
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

function projectIdFrom(value) {
  return value?.project_id || value?.id || value?.project?.id || null;
}

function validateHttpUrl(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label} must be a valid URL.`); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`${label} must use http or https.`);
  if (url.username || url.password) throw new Error(`${label} must not contain embedded credentials.`);
  return url;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(apiBase, token, pathname, options = {}) {
  const method = options.method || "GET";
  const maxRetries = method === "GET" ? (options.maxRetries ?? DEFAULT_MAX_RETRIES) : 0;
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  for (let attempt = 0; ; attempt += 1) {
    let response;
    try {
      response = await fetch(`${apiBase.replace(/\/$/, "")}${pathname}`, {
        ...options,
        signal: AbortSignal.timeout(requestTimeoutMs),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {})
        }
      });
    } catch (error) {
      if (attempt < maxRetries && error?.name !== "AbortError" && error?.name !== "TimeoutError") {
        await delay(250 * 2 ** attempt);
        continue;
      }
      if (error?.name === "AbortError" || error?.name === "TimeoutError") {
        throw new Error(`Replay QA API request timed out after ${requestTimeoutMs}ms.`);
      }
      throw new Error(`Replay QA API request failed: ${error.message}`);
    }
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
    if (response.ok) return body;

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < maxRetries) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await delay(Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 10_000) : 250 * 2 ** attempt);
      continue;
    }
    const detail = String(body?.detail || body?.message || text || response.statusText).slice(0, 500);
    throw new Error(`Replay QA API ${response.status}: ${detail}`);
  }
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
  if (!token) throw new Error("Missing Replay token. Set REPLAY_QA_TOKEN.");
  if (!targetUrl) throw new Error("Replay QA needs a running app URL via --target-url.");
  const parsedTarget = validateHttpUrl(targetUrl, "Replay target URL");
  validateHttpUrl(apiBase, "Replay API base URL");
  if (!Number.isFinite(budget) || budget < 0) throw new Error("Replay budget must be a non-negative number.");
  const body = {
    name: name || parsedTarget.hostname,
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

export async function waitForReplayProject({
  token,
  projectId,
  apiBase = DEFAULT_REPLAY_API,
  pollMs = 15_000,
  timeoutMs = 30 * 60_000,
  onPoll = () => {}
}) {
  if (!token) throw new Error("Missing Replay token. Set REPLAY_QA_TOKEN.");
  if (!projectId) throw new Error("Replay project id is required.");
  if (!Number.isFinite(pollMs) || pollMs < 0) throw new Error("Replay poll interval must be a non-negative number.");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("Replay timeout must be a positive number.");
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
      const bugs = await request(apiBase, token, `/projects/${encodeURIComponent(projectId)}/bugs?status=open&page_size=100`);
      return { projectId, status, timing, bugs };
    }
    await delay(pollMs);
  }
  throw new Error(`Replay QA did not finish within ${Math.round(timeoutMs / 60_000)} minutes.`);
}

export async function writeReplayReport(file, report) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await fs.chmod(destination, 0o600);
  return destination;
}
