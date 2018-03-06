"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ghost_node_1 = __importDefault(require("./ghost-node"));
const token_1 = __importDefault(require("./token"));
class Node extends token_1.default {
    constructor(nodeName, raw, line, col, startOffset, prevNode, nextNode, parentNode) {
        super(raw, line, col, startOffset);
        this.type = 'Node';
        this.prevNode = null;
        this.nextNode = null;
        this.parentNode = null;
        this.prevSyntaxicalNode = null;
        this.indentation = null;
        this.rules = {};
        this.document = null;
        /**
         * @WIP
         */
        this.depth = 0;
        this.nodeName = nodeName;
        this.prevNode = prevNode;
        this.nextNode = nextNode;
        this.parentNode = parentNode;
    }
    toString() {
        return this.raw;
    }
    toJSON() {
        return {
            nodeName: this.nodeName,
            raw: this.raw,
            line: this.line,
            col: this.col,
            endLine: this.location.endLine,
            endCol: this.location.endCol,
            startOffset: this.location.startOffset,
            endOffset: this.location.endOffset,
        };
    }
    is(type) {
        return this.type === type;
    }
    get rule() {
        if (!this.document) {
            return null;
        }
        if (!this.document.rule) {
            return null;
        }
        const name = this.document.rule.name;
        // @ts-ignore
        const rule = this.rules[name];
        if (rule == null) {
            return null;
        }
        return this.document.rule.optimizeOption(rule);
    }
    get syntaxicalParentNode() {
        let node = this;
        while (node.parentNode && node.parentNode instanceof ghost_node_1.default) {
            node = node.parentNode;
        }
        return node.parentNode;
    }
}
exports.default = Node;
