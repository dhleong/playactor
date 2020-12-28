#!/usr/bin/env node

import path from "path";
import { CLI, Shim } from "clime";

// The second parameter is the path to folder that contains command modules.
const cli = new CLI("playground", path.join(__dirname, "commands"));

if (process.argv[0].endsWith("ts-node")) {
    CLI.commandModuleExtension = ".ts";
}

// Clime in its core provides an object-based command-line infrastructure.
// To have it work as a common CLI, a shim needs to be applied:
const shim = new Shim(cli);
shim.execute(process.argv);
