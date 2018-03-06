"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const element_1 = __importDefault(require("./element"));
const omitted_element_1 = __importDefault(require("./omitted-element"));
async function walk(nodeList, walker) {
    for (const node of nodeList) {
        await walker(node);
        if (node instanceof element_1.default || node instanceof omitted_element_1.default) {
            await walk(node.childNodes, walker);
        }
        if (node instanceof element_1.default && node.endTagNode) {
            await walker(node.endTagNode);
        }
    }
}
exports.walk = walk;
