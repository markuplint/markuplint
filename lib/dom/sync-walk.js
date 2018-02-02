"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const element_1 = require("../dom/element");
const omitted_element_1 = require("../dom/omitted-element");
function syncWalk(nodeList, walker) {
    for (const node of nodeList) {
        walker(node);
        if (node instanceof element_1.default || node instanceof omitted_element_1.default) {
            syncWalk(node.childNodes, walker);
        }
        if (node instanceof element_1.default && node.endTagNode) {
            walker(node.endTagNode);
        }
    }
}
exports.syncWalk = syncWalk;
