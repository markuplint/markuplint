"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const read_text_file_1 = __importDefault(require("../util/read-text-file"));
const is_remote_file_1 = __importDefault(require("./is-remote-file"));
async function resolveFile(address) {
    if (is_remote_file_1.default(address)) {
        const res = await node_fetch_1.default(address);
        return await res.text();
    }
    else {
        return await read_text_file_1.default(address);
    }
}
exports.resolveFile = resolveFile;
