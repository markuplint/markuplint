"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = __importDefault(require("./node"));
class CommentNode extends node_1.default {
    constructor(nodeName, location, raw, prevNode, nextNode, parentNode, data) {
        super(nodeName, location, raw, prevNode, nextNode, parentNode);
        this.type = 'Comment';
        this.data = data;
    }
}
exports.default = CommentNode;
