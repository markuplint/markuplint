"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const element_1 = require("../dom/element");
const omitted_element_1 = require("../dom/omitted-element");
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
