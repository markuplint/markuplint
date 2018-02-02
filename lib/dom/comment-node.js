"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("./node");
class CommentNode extends node_1.default {
    constructor(nodeName, location, raw, prevNode, nextNode, parentNode, data) {
        super(nodeName, location, raw, prevNode, nextNode, parentNode);
        this.type = 'Comment';
        this.data = data;
    }
}
exports.default = CommentNode;
