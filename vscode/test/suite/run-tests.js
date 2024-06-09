"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_test_electron = require("@vscode/test-electron");
function createSettings() {
  const userDataDirectory = import_node_path.default.resolve(process.cwd(), ".tmp", "vscode-test");
  const settingsFile = import_node_path.default.join(userDataDirectory, "User", "settings.json");
  const defaultSettings = {
    "markuplint.debug": true,
    "security.workspace.trust.enabled": false
  };
  import_node_fs.default.mkdirSync(import_node_path.default.dirname(settingsFile), { recursive: true });
  import_node_fs.default.writeFileSync(settingsFile, JSON.stringify(defaultSettings, void 0, 4));
  return userDataDirectory;
}
async function main() {
  try {
    const userDataDirectory = createSettings();
    const extensionDevelopmentPath = import_node_path.default.resolve(__dirname, "..", "..");
    const extensionTestsPath = import_node_path.default.resolve(__dirname, "index.js");
    const workspacePath = import_node_path.default.resolve(process.cwd(), "test", "test.code-workspace");
    await (0, import_test_electron.runTests)({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        workspacePath,
        "--skip-welcome",
        "--disable-extensions",
        "--skip-release-notes",
        "--user-data-dir",
        userDataDirectory
      ]
    });
  } catch (error) {
    console.error("Failed to run tests");
    if (error instanceof Error) {
      console.error("error message: " + error.message);
      console.error("error name: " + error.name);
      console.error("error stack: " + error.stack);
    } else {
      console.error("No error object: " + JSON.stringify(error));
    }
    process.exit(1);
  }
}
main().catch((error) => console.error(error));
