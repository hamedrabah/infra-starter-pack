const TOOL_CATALOG = {
  trufflehog: {
    tool: "TruffleHog",
    company: "Truffle Security",
    category: "Secret scanning",
    url: "https://trufflesecurity.com/trufflehog",
    setup: "Generated GitHub Actions workflow scans changed commits for verified and unknown secrets."
  },
  socket: {
    tool: "Socket",
    company: "Socket",
    category: "Dependency security",
    url: "https://docs.socket.dev/docs/socket-for-github-installation",
    setup: "Install the Socket GitHub App or run `socket scan create --report` with an API token."
  },
  braintrust: {
    tool: "Braintrust",
    company: "Braintrust",
    category: "AI evaluations",
    url: "https://www.braintrust.dev/docs/evaluate/run-evaluations",
    setup: "Add deterministic evals and run `bt eval --no-input` in CI with `BRAINTRUST_API_KEY`."
  },
  stainless: {
    tool: "Stainless",
    company: "Stainless",
    category: "SDK generation",
    url: "https://www.stainless.com/docs/quickstart-cli/",
    setup: "Use the detected OpenAPI contract to generate typed SDKs, a CLI, or an MCP server."
  }
};

function recommendation(key, fit, reason, automated = false) {
  return { ...TOOL_CATALOG[key], fit, reason, automated };
}

export function recommendTools(report) {
  const recommendations = [
    recommendation("trufflehog", "add-now", "Every repository can accidentally commit credentials; this check needs no vendor token.", true)
  ];

  if (report.signals?.dependencyManifests?.length) {
    const count = report.signals.dependencyManifests.length;
    recommendations.push(recommendation(
      "socket",
      "add-now",
      `${count} dependency manifest${count === 1 ? " was" : "s were"} detected. Socket adds install-time and pull-request supply-chain policy.`
    ));
  }

  recommendations.push(recommendation(
    "braintrust",
    report.signals?.aiDependencies?.length ? "add-now" : "conditional",
    report.signals?.aiDependencies?.length
      ? `AI dependencies detected: ${report.signals.aiDependencies.join(", ")}. Add regression evals before model or prompt changes ship.`
      : "Use when the repository adds model calls, prompts, or agent workflows; generic repositories do not need an eval platform yet."
  ));

  recommendations.push(recommendation(
    "stainless",
    report.openapi?.length ? "add-now" : "conditional",
    report.openapi?.length
      ? `${report.openapi.length} OpenAPI contract${report.openapi.length === 1 ? " was" : "s were"} detected, so generated client SDKs can stay synchronized with the API.`
      : "Use after an authoritative OpenAPI contract exists; inferred routes are not a safe SDK-generation input."
  ));

  return recommendations;
}
