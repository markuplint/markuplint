"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const element_1 = __importDefault(require("./element"));
const ghost_node_1 = __importDefault(require("./ghost-node"));
const invalid_node_1 = __importDefault(require("./invalid-node"));
const node_1 = __importDefault(require("./node"));
const omitted_element_1 = __importDefault(require("./omitted-element"));
const raw_text_1 = __importDefault(require("./raw-text"));
const text_node_1 = __importDefault(require("./text-node"));
const sync_walk_1 = require("./sync-walk");
const get_col_1 = __importDefault(require("../parser/get-col"));
const get_line_1 = __importDefault(require("../parser/get-line"));
class Document {
    // tslint:disable-next-line:cyclomatic-complexity
    constructor(nodeTree, rawHtml, ruleset) {
        this.rule = null;
        this._tree = [];
        this._list = [];
        this._ruleset = null;
        this._raw = rawHtml;
        this._tree = nodeTree;
        this._ruleset = ruleset || null;
        const pos = [];
        let prevLine = 1;
        let prevCol = 1;
        let currentStartOffset = 0;
        let currentEndOffset = 0;
        sync_walk_1.syncWalk(nodeTree, (node) => {
            if (node instanceof node_1.default) {
                currentStartOffset = node.startOffset;
                const diff = currentStartOffset - currentEndOffset;
                if (diff > 0) {
                    const html = rawHtml.slice(currentEndOffset, currentStartOffset);
                    // console.log(`diff: ${diff} => "${spaces.replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/\s/g, '␣')}"`);
                    if (/^\s+$/.test(html)) {
                        const spaces = html;
                        const textNode = new text_node_1.default('#ws', {
                            line: prevLine,
                            col: prevCol,
                            startOffset: currentEndOffset,
                            endOffset: currentEndOffset + spaces.length,
                            endLine: get_line_1.default(spaces, prevLine),
                            endCol: get_col_1.default(spaces, prevCol),
                        }, spaces, node.prevNode, node, node.parentNode);
                        node.prevNode = textNode;
                        pos.push({
                            node: textNode,
                            startOffset: currentEndOffset,
                            endOffset: currentEndOffset + spaces.length,
                        });
                    }
                    else if (/^<\/[a-z0-9][a-z0-9:-]*>$/i) {
                        // close tag
                    }
                    else {
                        throw new Error(`what?!`);
                    }
                }
                currentEndOffset = currentStartOffset + node.raw.length;
                prevLine = node.endLine;
                prevCol = node.endCol;
            }
            pos.push({
                node,
                startOffset: currentStartOffset,
                endOffset: currentEndOffset,
            });
        });
        pos.sort((a, b) => a.startOffset - b.startOffset);
        let lastNode = null;
        for (const { node, startOffset, endOffset } of pos) {
            if (node instanceof ghost_node_1.default) {
                continue;
            }
            lastNode = node;
        }
        // remove duplicated node
        const stack = {};
        const removeIndexes = [];
        pos.forEach(({ node, startOffset, endOffset }, i) => {
            if (node instanceof node_1.default) {
                const id = `${node.line}:${node.col}:${node.endLine}:${node.endCol}`;
                if (stack[id] != null) {
                    const iA = stack[id];
                    const iB = i;
                    const a = pos[iA].node;
                    const b = node;
                    if (a instanceof invalid_node_1.default && b instanceof invalid_node_1.default) {
                        removeIndexes.push(iB);
                    }
                    else if (a instanceof invalid_node_1.default) {
                        removeIndexes.push(iA);
                    }
                    else {
                        removeIndexes.push(iB);
                    }
                }
                stack[id] = i;
            }
        });
        let r = pos.length;
        while (r--) {
            if (removeIndexes.includes(r)) {
                pos.splice(r, 1);
            }
        }
        // create Last spaces
        pos.forEach(({ node, startOffset, endOffset }, i) => {
            if (i === pos.length - 1) {
                const lastTextContent = rawHtml.slice(endOffset);
                if (!lastTextContent) {
                    return;
                }
                const line = lastNode ? lastNode.endLine : 0;
                const col = lastNode ? lastNode.endCol : 0;
                const lastTextNode = new text_node_1.default('#text', {
                    line,
                    col,
                    startOffset: endOffset,
                    endOffset: endOffset + lastTextContent.length,
                    endLine: get_line_1.default(lastTextContent, line),
                    endCol: get_col_1.default(lastTextContent, col),
                }, lastTextContent, lastNode || null, node, null);
                if (lastNode) {
                    lastNode.nextNode = lastTextNode;
                }
                pos.push({
                    node: lastTextNode,
                    startOffset: endOffset,
                    endOffset: endOffset + lastTextContent.length,
                });
            }
        });
        this._list = [];
        let prevSyntaxicalNode = null;
        pos.map(p => p.node).forEach((node) => {
            if (node instanceof node_1.default) {
                node.prevSyntaxicalNode = prevSyntaxicalNode;
                prevSyntaxicalNode = node;
                if (node.prevSyntaxicalNode instanceof text_node_1.default) {
                    const prevSyntaxicalTextNode = node.prevSyntaxicalNode;
                    // concat contiguous textNodes
                    if (node instanceof text_node_1.default) {
                        prevSyntaxicalTextNode.endLine = node.endLine;
                        prevSyntaxicalTextNode.endCol = node.endCol;
                        prevSyntaxicalTextNode.endOffset = node.endOffset;
                        prevSyntaxicalTextNode.raw = prevSyntaxicalTextNode.raw + node.raw;
                        prevSyntaxicalNode = prevSyntaxicalTextNode;
                        return;
                    }
                }
            }
            this._list.push(node);
        });
        for (const node of this._list) {
            if (node instanceof node_1.default) {
                // set self
                node.document = this;
                // indentation meta-infomation
                if (node.prevSyntaxicalNode instanceof text_node_1.default) {
                    const prevSyntaxicalTextNode = node.prevSyntaxicalNode;
                    if (!(prevSyntaxicalTextNode instanceof raw_text_1.default)) {
                        const matched = prevSyntaxicalTextNode.raw.match(/\r?\n([ \t]+$)/);
                        if (matched) {
                            const spaces = matched[1];
                            if (spaces) {
                                node.indentation = {
                                    type: /^\t+$/.test(spaces) ? 'tab' : /^[^\t]+$/.test(spaces) ? 'space' : 'mixed',
                                    width: spaces.length,
                                    raw: spaces,
                                    line: node.line,
                                };
                            }
                        }
                    }
                }
                if (node instanceof text_node_1.default && !(node instanceof raw_text_1.default)) {
                    const matched = node.raw.match(/(^\s*)([^\s]+)/);
                    if (matched) {
                        const spaces = matched[1];
                        if (spaces) {
                            const spaceLines = spaces.split(/\r?\n/);
                            const line = spaceLines.length + node.line - 1;
                            const lastSpace = spaceLines.pop();
                            if (lastSpace) {
                                node.indentation = {
                                    type: /^\t+$/.test(lastSpace) ? 'tab' : /^[^\t]+$/.test(lastSpace) ? 'space' : 'mixed',
                                    width: lastSpace.length,
                                    raw: lastSpace,
                                    line,
                                };
                            }
                        }
                    }
                }
            }
        }
        if (this._ruleset) {
            // nodeRules
            const _ruleset = this._ruleset;
            // tslint:disable-next-line:cyclomatic-complexity
            this.syncWalk((node) => {
                for (const ruleName in _ruleset.rules) {
                    if (_ruleset.rules.hasOwnProperty(ruleName)) {
                        const rule = _ruleset.rules[ruleName];
                        node.rules[ruleName] = rule;
                    }
                }
                for (const nodeRule of _ruleset.nodeRules) {
                    if (nodeRule.rules) {
                        for (const ruleName in nodeRule.rules) {
                            if (nodeRule.rules.hasOwnProperty(ruleName)) {
                                const rule = nodeRule.rules[ruleName];
                                if (nodeRule.tagName || nodeRule.selector) {
                                    if (nodeRule.tagName === node.nodeName) {
                                        node.rules[ruleName] = rule;
                                    }
                                    else if (nodeRule.selector && node instanceof element_1.default) {
                                        if (node.matches(nodeRule.selector)) {
                                            node.rules[ruleName] = rule;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (node instanceof element_1.default) {
                        if (node.nodeName.toLowerCase() === nodeRule.tagName) {
                            node.obsolete = !!nodeRule.obsolete;
                        }
                    }
                }
            });
            // childNodeRules
            const stackNodes = [];
            this.syncWalk((node) => {
                if (node instanceof element_1.default || node instanceof omitted_element_1.default) {
                    for (const nodeRule of _ruleset.childNodeRules) {
                        if (nodeRule.rules) {
                            for (const ruleName in nodeRule.rules) {
                                if (nodeRule.rules.hasOwnProperty(ruleName)) {
                                    const rule = nodeRule.rules[ruleName];
                                    if (nodeRule.tagName || nodeRule.selector) {
                                        if (nodeRule.tagName === node.nodeName) {
                                            stackNodes.push([node, ruleName, rule, !!nodeRule.inheritance]);
                                        }
                                        else if (nodeRule.selector && node instanceof element_1.default) {
                                            if (node.matches(nodeRule.selector)) {
                                                stackNodes.push([node, ruleName, rule, !!nodeRule.inheritance]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            for (const stackNode of stackNodes) {
                const node = stackNode[0];
                const ruleName = stackNode[1];
                const rule = stackNode[2];
                const inheritance = stackNode[3];
                if (inheritance) {
                    sync_walk_1.syncWalk(node.childNodes, (childNode) => {
                        childNode.rules[ruleName] = rule;
                    });
                }
                else {
                    for (const childNode of node.childNodes) {
                        childNode.rules[ruleName] = rule;
                    }
                }
            }
        }
    }
    get raw() {
        return this._raw;
    }
    get list() {
        return this._list;
    }
    toString() {
        const s = [];
        this.syncWalk((node) => {
            s.push(node.raw);
        });
        return s.join('');
    }
    toJSON() {
        return JSON.parse(JSON.stringify(this._tree));
    }
    toDebugMap() {
        return this.list.map((n) => {
            if (n instanceof node_1.default) {
                return `[${n.line}:${n.col}]>[${n.endLine}:${n.endCol}](${n.startOffset},${n.endOffset})${n instanceof omitted_element_1.default ? '???' : ''}${n.nodeName}: ${n.toString().replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/\s/g, '␣')}`;
            }
            else {
                return `[N/A]>[N/A](N/A)${n.nodeName}: ${n.toString()}`;
            }
        });
    }
    async walk(walker) {
        for (const node of this._list) {
            await walker(node);
        }
    }
    async walkOn(type, walker) {
        for (const node of this._list) {
            if (node instanceof node_1.default) {
                if (type === 'Node') {
                    await walker(node);
                }
                else if (node.is(type)) {
                    await walker(node);
                }
            }
        }
    }
    syncWalk(walker) {
        for (const node of this._list) {
            walker(node);
        }
    }
    syncWalkOn(type, walker) {
        for (const node of this._list) {
            if (node instanceof node_1.default) {
                if (type === 'Node') {
                    walker(node);
                }
                else if (node.is(type)) {
                    walker(node);
                }
            }
        }
    }
    getNode(index) {
        return this._tree[index];
    }
    setRule(rule) {
        this.rule = rule;
    }
}
exports.default = Document;
