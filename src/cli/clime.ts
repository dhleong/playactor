import path from "path";
import { CLI } from "clime";

// The second parameter is the path to folder that contains command modules.
export const cli = new CLI("playactor", path.join(__dirname, "commands"));

if (process.argv[0].endsWith("ts-node")) {
    CLI.commandModuleExtension = ".ts";
}
