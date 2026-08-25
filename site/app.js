const replayToggle = document.querySelector("#replay-toggle");
const targetUrl = document.querySelector("#target-url");
const commandOutput = document.querySelector("#command-output");
const copyButton = document.querySelector("#copy-command");
const copyStatus = document.querySelector("#copy-status");

function command() {
  const base = "npx github:hamedrabah/infra-starter-pack init .";
  if (!replayToggle.checked) return base;
  return `# Set REPLAY_QA_TOKEN in your environment first\n${base} --target-url "${targetUrl.value}" --wait`;
}

function renderCommand() {
  targetUrl.disabled = !replayToggle.checked;
  commandOutput.textContent = command();
  copyStatus.textContent = "";
}

replayToggle.addEventListener("change", renderCommand);
targetUrl.addEventListener("input", renderCommand);
copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(command());
    copyStatus.textContent = "Command copied.";
  } catch {
    copyStatus.textContent = "Copy unavailable; select the command manually.";
  }
});
