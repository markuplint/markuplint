"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var test_exports = {};
__export(test_exports, {
  run: () => run
});
module.exports = __toCommonJS(test_exports);
var import_node_path = __toESM(require("node:path"), 1);
var import_glob = require("glob");
var import_mocha = __toESM(require("mocha"), 1);
async function run() {
  const testFiles = await (0, import_glob.glob)(import_node_path.default.resolve(__dirname, "*.spec.js"));
  const mocha = new import_mocha.default({
    ui: "tdd",
    color: true
  });
  for (const file of testFiles) {
    mocha.addFile(file);
  }
  return new Promise((resolve) => {
    mocha.run((failures) => {
      if (failures > 0) {
        process.exit(1);
      } else {
        resolve();
      }
    });
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  run
});
