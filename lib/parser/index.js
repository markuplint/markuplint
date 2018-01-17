"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse5 = require("parse5");
const parseRawTag_1 = require("./parseRawTag");
const getCol_1 = require("./getCol");
const getLine_1 = require("./getLine");
const tagSplitter_1 = require("./tagSplitter");
class Node {
    constructor(props) {
        this.type = null;
        this.prevNode = null;
        this.nextNode = null;
        this.parentNode = null;
        this.raw = '';
        this.indentation = null;
        this.depth = 0;
        this.nodeName = props.nodeName;
        this.line = props.location.line;
        this.col = props.location.col;
        this.endLine = getLine_1.default(props.raw, this.line);
        this.endCol = getCol_1.default(props.raw, this.col);
        this.startOffset = props.location.startOffset;
        this.endOffset = props.location.endOffset;
        this.prevNode = props.prevNode;
        this.nextNode = props.nextNode;
        this.parentNode = props.parentNode;
        this.raw = props.raw;
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
}
exports.Node = Node;
class GhostNode {
    constructor(props) {
        this.type = null;
        this.prevNode = null;
        this.nextNode = null;
        this.parentNode = null;
        this.raw = '';
        this.nodeName = props.nodeName;
        this.prevNode = props.prevNode;
        this.nextNode = props.nextNode;
        this.parentNode = props.parentNode;
    }
    toString() {
        return this.raw;
    }
}
exports.GhostNode = GhostNode;
class Element extends Node {
    constructor(props, rawHtml) {
        super(props);
        this.type = 'Element';
        this.childNodes = [];
        this.endTagLocation = null;
        this.endTagNode = null;
        this.namespaceURI = props.namespaceURI;
        this.attributes = props.attributes;
        this.startTagLocation = props.location.startTag;
        this.endTagLocation = props.location.endTag || null;
        if (this.endTagLocation && this.endTagLocation.startOffset != null && this.endTagLocation.endOffset != null) {
            const endTagRaw = rawHtml.slice(this.endTagLocation.startOffset, this.endTagLocation.endOffset);
            const endTagName = endTagRaw.replace(/^<\/((?:[a-z]+:)?[a-z]+(?:-[a-z]+)*)\s*>/i, '$1');
            const endTag = new EndTagNode({
                nodeName: endTagName,
                location: {
                    line: this.endTagLocation.line,
                    col: this.endTagLocation.col,
                    startOffset: this.endTagLocation.startOffset,
                    endOffset: this.endTagLocation.endOffset,
                },
                prevNode: null,
                nextNode: null,
                parentNode: this.parentNode,
                startTagNode: this,
                raw: endTagRaw,
            });
            this.endTagNode = endTag;
        }
    }
    getAttribute(attrName) {
        for (const attr of this.attributes) {
            if (attr.name.toLowerCase() === attrName.toLowerCase()) {
                return attr;
            }
        }
    }
    get id() {
        return this.getAttribute('id');
    }
    get classList() {
        const classAttr = this.getAttribute('class');
        if (!classAttr || !classAttr.value) {
            return [''];
        }
        return classAttr.value.split(/\s+/).map(c => c.trim()).filter(c => c);
    }
}
exports.Element = Element;
class OmittedElement extends GhostNode {
    constructor(props) {
        super(props);
        this.type = 'OmittedElement';
        this.attributes = [];
        this.childNodes = [];
    }
}
exports.OmittedElement = OmittedElement;
class TextNode extends Node {
    constructor() {
        super(...arguments);
        this.type = 'Text';
    }
}
exports.TextNode = TextNode;
class RawTextNode extends TextNode {
    constructor() {
        super(...arguments);
        this.type = 'RawText';
    }
}
exports.RawTextNode = RawTextNode;
class CommentNode extends Node {
    constructor(props) {
        super(props);
        this.type = 'Comment';
        this.data = props.data;
    }
}
exports.CommentNode = CommentNode;
class Doctype extends Node {
    constructor(props) {
        super(props);
        this.type = 'Doctype';
        this.publicId = props.publicId;
        this.dtd = props.systemId;
    }
}
exports.Doctype = Doctype;
class EndTagNode extends Node {
    constructor(props) {
        super(props);
        this.type = 'EndTag';
        this.startTagNode = props.startTagNode;
    }
}
exports.EndTagNode = EndTagNode;
class InvalidNode extends Node {
    constructor(props) {
        super(props);
        this.type = 'Invalid';
    }
}
exports.InvalidNode = InvalidNode;
class Document {
    // tslint:disable-next-line:cyclomatic-complexity
    constructor(nodeTree, rawHtml, nodeRules) {
        this._tree = [];
        this._list = [];
        this._raw = rawHtml;
        this._tree = nodeTree;
        this._nodeRules = nodeRules;
        const pos = [];
        let prevLine = 1;
        let prevCol = 1;
        let currentStartOffset = 0;
        let currentEndOffset = 0;
        syncWalk(nodeTree, (node) => {
            if (node instanceof Node) {
                currentStartOffset = node.startOffset;
                const diff = currentStartOffset - currentEndOffset;
                if (diff > 0) {
                    const html = rawHtml.slice(currentEndOffset, currentStartOffset);
                    // console.log(`diff: ${diff} => "${spaces.replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/\s/g, '␣')}"`);
                    if (/^\s+$/.test(html)) {
                        const spaces = html;
                        const textNode = new TextNode({
                            nodeName: '#ws',
                            location: {
                                line: prevLine,
                                col: prevCol,
                                startOffset: currentEndOffset,
                                endOffset: currentEndOffset + spaces.length,
                            },
                            prevNode: node.prevNode,
                            nextNode: node,
                            parentNode: node.parentNode,
                            raw: spaces,
                        });
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
            if (node instanceof GhostNode) {
                continue;
            }
            lastNode = node;
        }
        // remove duplicated node
        const stack = {};
        const removeIndexes = [];
        pos.forEach(({ node, startOffset, endOffset }, i) => {
            if (node instanceof Node) {
                const id = `${node.line}:${node.col}:${node.endLine}:${node.endCol}`;
                if (stack[id] != null) {
                    const iA = stack[id];
                    const iB = i;
                    const a = pos[iA].node;
                    const b = node;
                    if (a instanceof InvalidNode && b instanceof InvalidNode) {
                        removeIndexes.push(iB);
                    }
                    else if (a instanceof InvalidNode) {
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
                const lastTextNode = new TextNode({
                    nodeName: '#text',
                    location: {
                        line: lastNode ? lastNode.endLine : 0,
                        col: lastNode ? lastNode.endCol : 0,
                        startOffset: endOffset,
                        endOffset: endOffset + lastTextContent.length,
                    },
                    prevNode: lastNode || null,
                    nextNode: node,
                    parentNode: null,
                    raw: lastTextContent,
                });
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
            if (node instanceof Node) {
                node.prevSyntaxicalNode = prevSyntaxicalNode;
                prevSyntaxicalNode = node;
                if (node.prevSyntaxicalNode instanceof TextNode) {
                    const prevSyntaxicalTextNode = node.prevSyntaxicalNode;
                    // concat contiguous textNodes
                    if (node instanceof TextNode) {
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
            if (node instanceof Node) {
                if (node.prevSyntaxicalNode instanceof TextNode) {
                    const prevSyntaxicalTextNode = node.prevSyntaxicalNode;
                    // indentation meta-infomation
                    if (!(prevSyntaxicalTextNode instanceof RawTextNode)) {
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
                if (node instanceof TextNode && !(node instanceof RawTextNode)) {
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
            if (n instanceof Node) {
                return `[${n.line}:${n.col}]>[${n.endLine}:${n.endCol}](${n.startOffset},${n.endOffset})${n instanceof OmittedElement ? '???' : ''}${n.nodeName}: ${n.toString().replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/\s/g, '␣')}`;
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
            if (node instanceof Node && node.is(type)) {
                await walker(node);
            }
        }
    }
    syncWalk(walker) {
        for (const node of this._list) {
            walker(node);
        }
    }
    getNode(index) {
        return this._tree[index];
    }
}
exports.Document = Document;
async function walk(nodeList, walker) {
    for (const node of nodeList) {
        await walker(node);
        if (node instanceof Element || node instanceof OmittedElement) {
            await walk(node.childNodes, walker);
        }
        if (node instanceof Element && node.endTagNode) {
            await walker(node.endTagNode);
        }
    }
}
function syncWalk(nodeList, walker) {
    for (const node of nodeList) {
        walker(node);
        if (node instanceof Element || node instanceof OmittedElement) {
            syncWalk(node.childNodes, walker);
        }
        if (node instanceof Element && node.endTagNode) {
            walker(node.endTagNode);
        }
    }
}
// tslint:disable-next-line:cyclomatic-complexity
function nodeize(p5node, prev, parent, rawHtml) {
    const nodes = [];
    switch (p5node.nodeName) {
        case '#documentType': {
            if (!p5node.__location) {
                throw new Error('Invalid Syntax');
            }
            const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
            const node = new Doctype({
                nodeName: '#doctype',
                location: {
                    line: p5node.__location.line,
                    col: p5node.__location.col,
                    startOffset: p5node.__location.startOffset,
                    endOffset: p5node.__location.startOffset + raw.length,
                },
                prevNode: prev,
                nextNode: null,
                parentNode: parent,
                publicId: p5node.publicId || null,
                systemId: p5node.systemId || null,
                raw,
            });
            nodes.push(node);
            break;
        }
        case '#text': {
            if (!p5node.__location) {
                throw new Error('Invalid Syntax');
            }
            const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
            if (parent && /^(?:script|style)$/i.test(parent.nodeName)) {
                const node = new RawTextNode({
                    nodeName: p5node.nodeName,
                    location: {
                        line: p5node.__location.line,
                        col: p5node.__location.col,
                        startOffset: p5node.__location.startOffset,
                        endOffset: p5node.__location.startOffset + raw.length,
                    },
                    prevNode: prev,
                    nextNode: null,
                    parentNode: parent,
                    raw,
                });
                nodes.push(node);
            }
            else {
                const tokens = tagSplitter_1.default(raw, p5node.__location.line, p5node.__location.col);
                let startOffset = p5node.__location.startOffset;
                for (const token of tokens) {
                    const endOffset = startOffset + token.raw.length;
                    if (token.type === 'text') {
                        const node = new TextNode({
                            nodeName: p5node.nodeName,
                            location: {
                                line: token.line,
                                col: token.col,
                                startOffset,
                                endOffset,
                            },
                            prevNode: prev,
                            nextNode: null,
                            parentNode: parent,
                            raw: token.raw,
                        });
                        prev = node;
                        startOffset = endOffset;
                        nodes.push(node);
                    }
                    else {
                        const node = new InvalidNode({
                            nodeName: '#invalid',
                            location: {
                                line: token.line,
                                col: token.col,
                                startOffset,
                                endOffset,
                            },
                            prevNode: prev,
                            nextNode: null,
                            parentNode: parent,
                            raw: token.raw,
                        });
                        prev = node;
                        startOffset = endOffset;
                        nodes.push(node);
                    }
                }
            }
            break;
        }
        case '#comment': {
            if (!p5node.__location) {
                throw new Error('Invalid Syntax');
            }
            const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
            const node = new CommentNode({
                nodeName: p5node.nodeName,
                location: {
                    line: p5node.__location.line,
                    col: p5node.__location.col,
                    startOffset: p5node.__location.startOffset,
                    endOffset: p5node.__location.startOffset + raw.length,
                },
                prevNode: prev,
                nextNode: null,
                parentNode: parent,
                // @ts-ignore
                data: p5node.data,
                raw,
            });
            nodes.push(node);
            break;
        }
        default: {
            let node = null;
            if (p5node.__location) {
                const raw = p5node.__location.startTag
                    ?
                        rawHtml.slice(p5node.__location.startTag.startOffset, p5node.__location.startTag.endOffset)
                    :
                        rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
                const rawTag = parseRawTag_1.parseRawTag(raw, p5node.__location.line, p5node.__location.col);
                const nodeName = rawTag.tagName;
                const attributes = [];
                for (const attr of rawTag.attrs) {
                    attributes.push({
                        name: attr.name,
                        value: attr.value,
                        location: {
                            line: attr.line,
                            col: attr.col,
                            startOffset: -1,
                            endOffset: attr.raw.length - 1,
                        },
                        quote: attr.quote,
                        equal: attr.equal,
                        invalid: attr.invalid,
                        raw: attr.raw,
                    });
                }
                node = new Element({
                    nodeName,
                    namespaceURI: p5node.namespaceURI,
                    attributes,
                    location: {
                        line: p5node.__location.line,
                        col: p5node.__location.col,
                        startOffset: p5node.__location.startOffset,
                        endOffset: p5node.__location.startOffset + raw.length,
                        startTag: p5node.__location.startTag,
                        endTag: p5node.__location.endTag || null,
                    },
                    prevNode: prev,
                    nextNode: null,
                    parentNode: parent,
                    raw,
                }, rawHtml);
            }
            else {
                node = new OmittedElement({
                    nodeName: p5node.nodeName,
                    namespaceURI: p5node.namespaceURI,
                    prevNode: prev,
                    nextNode: null,
                    parentNode: parent,
                });
            }
            if (node) {
                node.childNodes = traverse(p5node, node, rawHtml);
                nodes.push(node);
            }
        }
    }
    return nodes;
}
function traverse(rootNode, parentNode = null, rawHtml) {
    const nodeList = [];
    let prev = null;
    for (const p5node of rootNode.childNodes) {
        const nodes = nodeize(p5node, prev, parentNode, rawHtml);
        for (const node of nodes) {
            if (prev) {
                prev.nextNode = node;
            }
            prev = node;
            nodeList.push(node);
        }
    }
    return nodeList;
}
function parser(html, nodeRules) {
    const doc = parse5.parse(html, {
        locationInfo: true,
    });
    const nodeTree = traverse(doc, null, html);
    return new Document(nodeTree, html, nodeRules);
}
exports.default = parser;
