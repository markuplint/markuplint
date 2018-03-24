"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
// @ts-ignore
const util_promisify_1 = __importDefault(require("util.promisify"));
const readFile = util_promisify_1.default(fs_1.default.readFile);
async function default_1(filePath) {
    return await readFile(filePath, 'utf-8');
}
exports.default = default_1;
