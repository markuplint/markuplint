"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
// @ts-ignore
const util_promisify_1 = __importDefault(require("util.promisify"));
const readdir = util_promisify_1.default(fs_1.default.readdir);
async function default_1(filePath) {
    return await readdir(filePath);
}
exports.default = default_1;
