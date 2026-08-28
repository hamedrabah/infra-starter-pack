function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function list(values, empty = "None detected") {
  return values.length ? values.join(", ") : empty;
}

export function formatMarkdownReport(report) {
  const addNow = report.toolingRecommendations.filter((item) => item.fit === "add-now");
  const conditional = report.toolingRecommendations.filter((item) => item.fit !== "add-now");
  const rows = [...addNow, ...conditional].map((item) =>
    `| ${escapeCell(item.tool)} | ${item.fit === "add-now" ? "Add now" : "Conditional"} | ${escapeCell(item.reason)} |`
  );

  return [
    `# Infrastructure report: ${report.name}`,
    "",
    `> Generated from repository evidence by [Infra Starter Pack](https://github.com/hamedrabah/infra-starter-pack).`,
    "",
    "## Repository signals",
    "",
    `- **Files scanned:** ${report.totals.files}`,
    `- **Source files:** ${report.totals.sourceFiles}`,
    `- **Languages:** ${list(report.languages.map((item) => `${item.name} (${item.files})`))}`,
    `- **Frameworks:** ${list(report.frameworks)}`,
    `- **Package manager:** ${report.packageManager || "Not detected"}`,
    `- **OpenAPI contracts:** ${report.openapi.length}`,
    `- **Observed or inferred routes:** ${report.routes.length}`,
    "",
    "## Recommended controls",
    "",
    "| Tool | Fit | Evidence |",
    "| --- | --- | --- |",
    ...rows,
    "",
    "## Evidence boundaries",
    "",
    "This report does not execute repository code. Route detection is heuristic; OpenAPI remains the authoritative source for API documentation. Hosted integrations require explicit authentication by the repository owner.",
    ""
  ].join("\n");
}
