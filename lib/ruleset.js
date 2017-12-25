"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
// TODO: @types
// @ts-ignore
const cosmiconfig = require("cosmiconfig");
const explorer = cosmiconfig('markuplint');
const readFile = util.promisify(fs.readFile);
class Ruleset {
    constructor(rules) {
    }
    async load(configDir) {
        const data = await explorer.load(configDir);
        const cofing = data.config;
        const filepath = data.filepath;
        console.log(`Loaded: ${filepath}`);
    }
}
exports.Ruleset = Ruleset;
