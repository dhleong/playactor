#!/usr/bin/env node

import path from "path";
import { CLI, Shim } from "clime";
import { RootProxyDevice } from "./root-proxy-device";

// The second parameter is the path to folder that contains command modules.
const cli = new CLI("playactor", path.join(__dirname, "commands"));

if (process.argv[0].endsWith("ts-node")) {
    CLI.commandModuleExtension = ".ts";
}

// clime doesn't currently have a way to ignore or hide specific args,
// so let's do it manually here:
const args = RootProxyDevice.removeProxiedUserId([...process.argv]);

// Clime in its core provides an object-based command-line infrastructure.
// To have it work as a common CLI, a shim needs to be applied:
const shim = new Shim(cli);
shim.execute(args);
