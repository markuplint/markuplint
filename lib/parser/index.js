"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse5 = require("parse5");
const parseRawTag_1 = require("./parseRawTag");
class Node {
    constructor(props) {
        this.prevNode = null;
        this.nextNode = null;
        this.parentNode = null;
        this.nodeName = props.nodeName;
        if (props.location) {
            this.line = props.location.line;
            this.col = props.location.col;
            this.startOffset = props.location.startOffset;
        }
        this.prevNode = props.prevNode;
        this.nextNode = props.nextNode;
        this.parentNode = props.parentNode;
    }
    toString() {
        return `<${this.nodeName}>`;
    }
}
exports.Node = Node;
class Element extends Node {
    constructor(props) {
        super(props);
        this.raw = '';
        this.namespaceURI = props.namespaceURI;
        this.attributes = props.attributes;
        this.childNodes = props.childNodes;
        this.endOffset = props.location.endOffset || null;
        this.startTagLocation = props.location.startTag || null;
        this.endTagLocation = props.location.endTag || null;
    }
    toString() {
        return `<${this.nodeName}>`;
    }
}
exports.Element = Element;
class TextNode extends Node {
    constructor(props) {
        super(props);
        this.textContent = props.textContent;
    }
}
exports.TextNode = TextNode;
class Doctype extends Node {
    constructor(props) {
        super(props);
        this.publicId = props.publicId;
        this.dtd = props.systemId;
    }
}
exports.Doctype = Doctype;
class EndTagNode extends Node {
    constructor(props) {
        super(props);
        this.startTagNode = props.startTagNode;
    }
}
exports.EndTagNode = EndTagNode;
class InvalidNode extends Node {
    constructor(props) {
        super(props);
        this.childNodes = props.childNodes;
    }
}
exports.InvalidNode = InvalidNode;
class Document {
    constructor(nodes, rawHtml) {
        this._tree = [];
        this._list = [];
        this._raw = rawHtml;
        this._tree = nodes;
        const pos = [];
        walk(nodes, (node) => {
            const i = pos.length;
            if (node instanceof InvalidNode) {
                return;
            }
            if (i === 0 && node.startOffset > 0) {
                const firstTextContent = rawHtml.slice(0, node.startOffset);
                const firstTextNode = new TextNode({
                    nodeName: '#text',
                    location: {
                        line: 0,
                        col: 0,
                        startOffset: 0,
                        endOffset: null,
                    },
                    prevNode: null,
                    nextNode: node,
                    parentNode: null,
                    textContent: firstTextContent,
                });
                pos.push({ pos: 0, node: firstTextNode });
            }
            pos.push({ pos: node.startOffset, node });
            if (node instanceof Element) {
                if (node.startTagLocation) {
                    const raw = rawHtml.slice(node.startTagLocation.startOffset, node.startTagLocation.endOffset);
                    node.raw = raw;
                    if (node.endTagLocation) {
                        const endTag = new EndTagNode({
                            nodeName: `/${node.nodeName}`,
                            location: {
                                line: node.endTagLocation.line,
                                col: node.endTagLocation.col,
                                startOffset: node.endTagLocation.startOffset,
                                endOffset: node.endTagLocation.endOffset,
                            },
                            prevNode: null,
                            nextNode: null,
                            parentNode: node.parentNode,
                            startTagNode: node,
                        });
                        pos.push({ pos: endTag.startOffset, node: endTag });
                    }
                }
                else {
                    // Self closing tag
                    const raw = rawHtml.slice(node.startOffset, node.endOffset || node.startOffset);
                    node.raw = raw;
                }
                // Get raw tag name and attributes
                //
                // NOTE:
                // "parse5" parser will normalize the case of the tag and attribute name.
                // And duplicated attribute will leave one.
                //
                if (node.raw) {
                    const rawTag = parseRawTag_1.parseRawTag(node.raw);
                    node.nodeName = rawTag.tagName;
                    for (const attr of node.attributes) {
                        for (const rawAttr of rawTag.attrs) {
                            if (attr.name === rawAttr.name.toLowerCase()) {
                                attr.rawAttr.push(rawAttr);
                            }
                        }
                    }
                }
            }
        });
        pos.sort((a, b) => a.pos - b.pos);
        this._list = pos.map(p => p.node);
    }
    get root() {
        return {
            childNodes: this._tree,
        };
    }
    walk(walker) {
        for (const node of this._list) {
            walker(node);
        }
    }
    getNode(index) {
        return this._tree[index];
    }
}
exports.Document = Document;
function walk(nodeList, walker) {
    for (const node of nodeList) {
        walker(node);
        if (node instanceof Element || node instanceof InvalidNode) {
            walk(node.childNodes, walker);
        }
    }
}
function nodeize(p5node, prev, parent) {
    if (!p5node.__location) {
        return new InvalidNode({
            nodeName: '#invalid',
            location: null,
            childNodes: traverse(p5node, parent),
            prevNode: prev,
            nextNode: null,
            parentNode: parent,
        });
    }
    let node;
    switch (p5node.nodeName) {
        case '#documentType': {
            node = new Doctype({
                nodeName: '#doctype',
                location: {
                    line: p5node.__location.line,
                    col: p5node.__location.col,
                    startOffset: p5node.__location.startOffset,
                    endOffset: p5node.__location.endOffset,
                },
                prevNode: prev,
                nextNode: null,
                parentNode: parent,
                publicId: p5node.publicId || null,
                systemId: p5node.systemId || null,
            });
            break;
        }
        case '#text': {
            node = new TextNode({
                nodeName: p5node.nodeName,
                location: {
                    line: p5node.__location.line,
                    col: p5node.__location.col,
                    startOffset: p5node.__location.startOffset,
                    endOffset: p5node.__location.endOffset,
                },
                prevNode: prev,
                nextNode: null,
                parentNode: parent,
                textContent: p5node.value,
            });
            break;
        }
        default: {
            node = new Element({
                nodeName: p5node.tagName,
                namespaceURI: p5node.namespaceURI,
                attributes: p5node.attrs ? p5node.attrs.map((attr) => {
                    if (!p5node.__location || !p5node.__location.attrs) {
                        throw new Error();
                    }
                    const location = p5node.__location.attrs[attr.name];
                    if (!location) {
                        throw new Error();
                    }
                    return {
                        name: attr.name,
                        value: attr.value,
                        col: location.col,
                        line: location.line,
                        startOffset: location.startOffset,
                        endOffset: location.endOffset,
                        rawAttr: [],
                    };
                }) : [],
                location: {
                    line: p5node.__location.line,
                    col: p5node.__location.col,
                    startOffset: p5node.__location.startOffset,
                    endOffset: p5node.__location.endOffset,
                    startTag: p5node.__location.startTag || null,
                    endTag: p5node.__location.endTag || null,
                },
                prevNode: prev,
                nextNode: null,
                parentNode: parent,
                childNodes: traverse(p5node, parent),
            });
        }
    }
    return node;
}
function traverse(rootNode, parentNode = null) {
    const nodeList = [];
    let prev = null;
    for (const p5node of rootNode.childNodes) {
        const node = nodeize(p5node, prev, parentNode);
        if (prev) {
            prev.nextNode = node;
        }
        prev = node;
        nodeList.push(node);
    }
    return nodeList;
}
function parser(html) {
    const doc = parse5.parse(html, {
        locationInfo: true,
    });
    const nodeList = traverse(doc);
    return new Document(nodeList, html);
}
exports.default = parser;
