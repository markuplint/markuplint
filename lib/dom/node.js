"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
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
            line: this.location.line || null,
            col: this.location.col || null,
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
}
exports.default = Node;
