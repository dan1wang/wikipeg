/* eslint-disable no-console */

"use strict";

const execSync = require("child_process").execSync;
const fs = require("fs-extra");
const tmp = require("tmp");

// Create a staging directory for the kitchen sink
const stagingDir = tmp.dirSync({ keep: false, unsafeCleanup: true });
const stagingPath = stagingDir.name;

try {
  // Create an edge package and copy it to the staging directory
  const pkg = require("../package.json");
  execSync("npm pack",  { stdio : "pipe" });
  // execSync("npm pack",  {silent : true });
  fs.renameSync(`${pkg.name}-${pkg.version}.tgz`, "wikipeg-edge.tgz");
  fs.moveSync("wikipeg-edge.tgz", `${stagingPath}/wikipeg-edge.tgz`);

  // Copy the benchmark test files to the staging directory
  fs.copySync("benchmark", `${stagingPath}/`);
  fs.copySync("examples/css.pegjs", `${stagingPath}/css.pegjs`);
  fs.copySync("examples/json.pegjs", `${stagingPath}/json.pegjs`);

  // Install WikiPeg (edge and stable)
  execSync("npm install", { cwd: `${stagingPath}/`});

  // TODO: process arguments and pass to benchmark/run
  const args = '';

  // Run benchmark tests (edge and stable)
  execSync(
    `node run ${args}`,
    { cwd: `${stagingPath}/`, stdio : "inherit" }
  );

} finally {
  // Clean up staging directory
  stagingDir.removeCallback();
}

