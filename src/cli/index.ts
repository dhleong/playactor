#!/usr/bin/env node

import { Shim } from "clime";
import { cli } from "./clime";
import { RootProxyDevice } from "./root-proxy-device";

// clime doesn't currently have a way to ignore or hide specific args,
// so let's do it manually here:
const args = RootProxyDevice.removeProxiedUserId([...process.argv]);

// Clime in its core provides an object-based command-line infrastructure.
// To have it work as a common CLI, a shim needs to be applied:
const shim = new Shim(cli);
shim.execute(args);
