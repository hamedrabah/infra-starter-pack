#!/usr/bin/env node

import { run } from "../src/cli.js";

run(process.argv).catch((error) => {
  console.error(`\ninfra-starter failed: ${error.message}`);
  if (process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
});
