"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Node {
    constructor(nodeName, location, raw, prevNode, nextNode, parentNode) {
        this.type = 'Node';
        this.prevNode = null;
        this.nextNode = null;
        this.parentNode = null;
        this.raw = '';
        this.prevSyntaxicalNode = null;
        this.indentation = null;
        this.rules = {};
        this.document = null;
        /**
         * @WIP
         */
        this.depth = 0;
        this.nodeName = nodeName;
        this.line = location.line;
        this.col = location.col;
        this.endLine = location.endLine;
        this.endCol = location.endCol;
        this.startOffset = location.startOffset;
        this.endOffset = location.endOffset;
        this.raw = raw;
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
            line: this.line || null,
            col: this.col || null,
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
