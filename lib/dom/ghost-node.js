"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class GhostNode {
    constructor(nodeName, prevNode, nextNode, parentNode) {
        this.type = null;
        this.prevNode = null;
        this.nextNode = null;
        this.parentNode = null;
        this.raw = '';
        this.rules = {};
        this.nodeName = nodeName;
        this.prevNode = prevNode;
        this.nextNode = nextNode;
        this.parentNode = parentNode;
    }
    toString() {
        return this.raw;
    }
}
exports.default = GhostNode;
