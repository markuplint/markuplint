"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
// TODO: @types
// @ts-ignore
const cosmiconfig_1 = __importDefault(require("cosmiconfig"));
const explorer = cosmiconfig_1.default('markuplint');
async function searchAndLoad(fileOrDir) {
    let data;
    // load as file
    try {
        data = await explorer.load(null, fileOrDir);
        // console.log({data, fileOrDir});
    }
    catch (err) {
        if (err.code !== 'EISDIR') {
            throw err;
        }
    }
    // load as dir
    if (!data) {
        data = await explorer.load(fileOrDir);
    }
    // console.log(`search rc file on "${configDir}"`);
    if (!data || !data.config) {
        throw new Error('markuplint rc file not found');
    }
    const filePath = data.filepath;
    const config = data.config;
    // console.log(`RC file Loaded: "${filePath}"`);
    return {
        filePath,
        config,
    };
}
exports.default = searchAndLoad;
