import fs from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { scanRepository } from "./scan.js";
import { generateStarter } from "./generate.js";
import { createReplayProject, waitForReplayProject, writeReplayReport } from "./replay.js";

function summary(report) {
  console.log(pc.bold(`\n${report.name}`));
  console.log(`  ${report.totals.files} files · ${report.totals.sourceFiles} source files`);
  console.log(`  Languages: ${report.languages.map((item) => item.name).join(", ") || "none detected"}`);
  console.log(`  Frameworks: ${report.frameworks.join(", ") || "none detected"}`);
  console.log(`  OpenAPI: ${report.openapi.length} spec(s) · Routes: ${report.routes.length} detected`);
  console.log(`  Tooling: ${report.toolingRecommendations.filter((item) => item.fit === "add-now").map((item) => item.tool).join(", ")}`);
}

async function readDesignDocument(root) {
  const files = ["README.md", "readme.md", "docs/index.mdx"];
  for (const relative of files) {
    const value = await fs.readFile(path.join(root, relative), "utf8").catch(() => null);
    if (value) return value.slice(0, 40_000);
  }
  return undefined;
}

async function launchReplay(root, options, name) {
  const targetUrl = options.targetUrl || process.env.REPLAY_QA_TARGET_URL;
  const token = process.env.REPLAY_QA_TOKEN;
  const reverseProxy = Boolean(options.reverseProxy || /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::|\/|$)/.test(targetUrl || ""));
  const { projectId, project } = await createReplayProject({
    token,
    targetUrl,
    name,
    instructions: options.instructions,
    reverseProxy,
    budget: Number(options.budget),
    designDocument: await readDesignDocument(root)
  });
  console.log(pc.green(`\nReplay QA project created: ${projectId}`));
  if (project.url) console.log(`  Dashboard: ${project.url}`);
  if (project.reverse_proxy_setup_url) console.log(`  Connect localhost: ${project.reverse_proxy_setup_url}`);
  if (!options.wait) return { projectId, project };
  console.log("  Waiting for autonomous exploration and testing…");
  const result = await waitForReplayProject({
    token,
    projectId,
    timeoutMs: Number(options.timeout) * 60_000,
    onPoll: ({ status, elapsedMs }) => {
      const open = status?.bugs?.open ?? status?.open_bug_count ?? "?";
      console.log(`  ${Math.round(elapsedMs / 1000)}s · open bugs: ${open}`);
    }
  });
  if (options.report) {
    const destination = await writeReplayReport(path.resolve(root, options.report), result);
    console.log(`  Report: ${destination}`);
  }
  const bugItems = result.bugs?.items || result.bugs?.results || result.bugs?.bugs || [];
  if (options.failOnBugs && bugItems.length > 0) {
    throw new Error(`Replay QA found ${bugItems.length} open bug${bugItems.length === 1 ? "" : "s"}.`);
  }
  return result;
}

function replayOptions(command, { requireTarget = false } = {}) {
  const targetOption = requireTarget ? "requiredOption" : "option";
  return command
    [targetOption]("-u, --target-url <url>", "deployed or localhost web app URL", process.env.REPLAY_QA_TARGET_URL)
    .option("--instructions <text>", "flows Replay QA should prioritize", "Explore the main user journeys, error states, and regressions.")
    .option("--budget <credits>", "Replay QA credit budget", "20")
    .option("--reverse-proxy", "use Replay's localhost reverse proxy")
    .option("--wait", "wait until Replay QA is idle, then fetch bugs")
    .option("--fail-on-bugs", "exit non-zero when Replay QA returns open bugs (requires --wait)")
    .option("--timeout <minutes>", "maximum wait time", "30")
    .option("--report <file>", "write the final Replay QA JSON report");
}

export async function run(argv) {
  const program = new Command()
    .name("infra-starter")
    .description("Generate Mintlify docs and connect a repository to Replay QA")
    .version("0.1.0");

  program.command("scan")
    .argument("[directory]", "repository directory", ".")
    .option("--json", "print machine-readable JSON")
    .action(async (directory, options) => {
      const report = await scanRepository(directory);
      if (options.json) console.log(JSON.stringify(report, null, 2)); else summary(report);
    });

  const init = program.command("init")
    .description("scan this repo, generate Mintlify docs, and optionally launch Replay QA")
    .argument("[directory]", "repository directory", ".")
    .option("--force", "overwrite existing generated target files")
    .option("--with-replay", "launch Replay QA after generating docs");
  replayOptions(init);
  init.action(async (directory, options) => {
    if (options.failOnBugs && !options.wait) throw new Error("--fail-on-bugs requires --wait.");
    const report = await scanRepository(directory);
    summary(report);
    const files = await generateStarter(report, { force: options.force });
    console.log(pc.green(`\nGenerated ${files.length} files for Mintlify + GitHub CI.`));
    for (const file of files) console.log(`  ${file}`);
    if (options.withReplay || options.targetUrl) await launchReplay(report.root, options, report.name);
    else console.log(pc.dim("\nNext: npx mint@latest validate, then connect the repo in Mintlify."));
  });

  const replay = replayOptions(program.command("replay")
    .description("launch a Replay QA project for a running build")
    .argument("[directory]", "repository directory", "."), { requireTarget: true });
  replay.action(async (directory, options) => {
    if (options.failOnBugs && !options.wait) throw new Error("--fail-on-bugs requires --wait.");
    const report = await scanRepository(directory);
    await launchReplay(report.root, options, report.name);
  });

  await program.parseAsync(argv);
}
