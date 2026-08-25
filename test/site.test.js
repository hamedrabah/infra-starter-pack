import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

test("showcase references existing local assets and Replay dogfooding", async () => {
  const html = await fs.readFile("site/index.html", "utf8");
  await fs.access("site/styles.css");
  await fs.access("site/app.js");
  assert.match(html, /href="styles\.css"/);
  assert.match(html, /src="app\.js"/);
  assert.match(html, /target of its Replay QA workflow/);
  assert.match(await fs.readFile(".github/workflows/replay-self-test.yml", "utf8"), /--fail-on-bugs/);
});
