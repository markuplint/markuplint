"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse5 = require("parse5");
const parseRawTag_1 = require("./parseRawTag");
class Node {
    constructor(props) {
        this.type = null;
        this.prevNode = null;
        this.nextNode = null;
        this.parentNode = null;
        this.raw = '';
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
    toJSON() {
        return {
            nodeName: this.nodeName,
            isGhost: true,
        };
    }
}
exports.GhostNode = GhostNode;
class Element extends Node {
    constructor(props) {
        super(props);
        this.type = 'Element';
        this.childNodes = [];
        this.endOffset = null;
        this.startTagLocation = null;
        this.endTagLocation = null;
        this.namespaceURI = props.namespaceURI;
        this.attributes = props.attributes;
        if (props.location) {
            this.endOffset = props.location.endOffset || null;
            this.startTagLocation = props.location.startTag || null;
            this.endTagLocation = props.location.endTag || null;
        }
        this.raw = props.raw;
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
    toJSON() {
        return {
            nodeName: this.nodeName,
            line: this.line || null,
            col: this.col || null,
            childNodes: this.childNodes,
        };
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
    constructor(props) {
        super(props);
        this.type = 'Text';
        this.textContent = props.textContent;
        this.raw = props.raw;
    }
}
exports.TextNode = TextNode;
class RawTextNode extends TextNode {
    constructor(props) {
        super(props);
        this.type = 'RawText';
        this.textContent = props.textContent;
        this.raw = props.raw;
    }
}
exports.RawTextNode = RawTextNode;
class CommentNode extends Node {
    constructor(props) {
        super(props);
        this.type = 'Comment';
        this.data = props.data;
        this.raw = props.raw;
    }
}
exports.CommentNode = CommentNode;
class Doctype extends Node {
    constructor(props) {
        super(props);
        this.type = 'Doctype';
        this.publicId = props.publicId;
        this.dtd = props.systemId;
        this.raw = props.raw;
    }
}
exports.Doctype = Doctype;
class EndTagNode extends Node {
    constructor(props) {
        super(props);
        this.type = 'EndTag';
        this.startTagNode = props.startTagNode;
        this.raw = props.raw;
        if (props.location) {
            this.endOffset = props.location.endOffset;
        }
    }
}
exports.EndTagNode = EndTagNode;
class InvalidNode extends GhostNode {
    constructor(props) {
        super(props);
        this.type = 'Invalid';
        this.childNodes = props.childNodes || [];
    }
    toJSON() {
        return {
            nodeName: this.nodeName,
            childNodes: this.childNodes,
            isGhost: true,
        };
    }
}
exports.InvalidNode = InvalidNode;
class Document {
    constructor(nodeTree, rawHtml) {
        this._tree = [];
        this._list = [];
        this._raw = rawHtml;
        this._tree = nodeTree;
        const pos = [];
        let currentOffset = 0;
        syncWalk(nodeTree, (node) => {
            const i = pos.length;
            if (node instanceof Node) {
                currentOffset = node.startOffset != null ? node.startOffset : currentOffset;
            }
            pos.push({ offset: currentOffset, node });
        });
        {
            const lastNode = pos.pop();
            if (lastNode) {
                const matched = lastNode.node.raw.match(/^([^<]+)(<\/body\s*>)+(\s*)(<\/html\s*>)+(\s*)$/i);
                if (!matched) {
                    pos.push(lastNode);
                }
                else {
                    const before = matched[1] || null;
                    const body = matched[2] || null;
                    const sep = matched[3] || null;
                    const html = matched[4] || null;
                    const after = matched[5] || null;
                    if (before) {
                        pos.push({
                            offset: lastNode.offset,
                            node: new TextNode({
                                nodeName: '#text',
                                location: {
                                    line: lastNode.node.line,
                                    col: lastNode.node.col,
                                    startOffset: lastNode.node.startOffset,
                                    endOffset: (lastNode.node.startOffset || 0) + before.length,
                                },
                                prevNode: lastNode.node.prevNode,
                                nextNode: null,
                                parentNode: lastNode.node.parentNode,
                                textContent: before,
                                raw: before,
                            }),
                        });
                    }
                    // TODO: sep
                    // if (sep) {
                    // 	pos.push({
                    // 		pos: lastNode.node.startOffset,
                    // 		node: new TextNode({
                    // 			nodeName: '#text',
                    // 			location: {
                    // 				line: lastNode.node.line,
                    // 				col: lastNode.node.col,
                    // 				startOffset: lastNode.node.startOffset,
                    // 				endOffset: lastNode.node.startOffset + before.length,
                    // 			},
                    // 			prevNode: lastNode.node.prevNode,
                    // 			nextNode: null,
                    // 			parentNode: lastNode.node.parentNode,
                    // 			textContent: before,
                    // 			raw: before,
                    // 		}),
                    // 	});
                    // }
                    // TODO: after
                    // if (after) {
                    // 	pos.push({
                    // 		pos: lastNode.node.startOffset,
                    // 		node: new TextNode({
                    // 			nodeName: '#text',
                    // 			location: {
                    // 				line: lastNode.node.line,
                    // 				col: lastNode.node.col,
                    // 				startOffset: lastNode.node.startOffset,
                    // 				endOffset: lastNode.node.startOffset + before.length,
                    // 			},
                    // 			prevNode: lastNode.node.prevNode,
                    // 			nextNode: null,
                    // 			parentNode: lastNode.node.parentNode,
                    // 			textContent: before,
                    // 			raw: before,
                    // 		}),
                    // 	});
                    // }
                }
            }
        }
        pos.forEach(({ node, offset }, i) => {
            if (i === 0 && offset > 0) {
                const firstTextContent = rawHtml.slice(0, offset);
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
                    raw: firstTextContent,
                });
                pos.push({ offset: 0, node: firstTextNode });
            }
            if (node instanceof Element) {
                if (node.startTagLocation) {
                    if (node.endTagLocation && node.endTagLocation.startOffset != null && node.endTagLocation.endOffset != null) {
                        const endTagRaw = rawHtml.slice(node.endTagLocation.startOffset, node.endTagLocation.endOffset);
                        const endTagName = endTagRaw.replace(/^<\/((?:[a-z]+:)?[a-z]+(?:-[a-z]+)*)\s*>/i, '$1');
                        const endTag = new EndTagNode({
                            nodeName: endTagName,
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
                            raw: endTagRaw,
                        });
                        pos.push({ offset: node.endTagLocation.startOffset, node: endTag });
                    }
                }
            }
        });
        pos.sort((a, b) => a.offset - b.offset);
        this._list = pos.map(p => p.node);
    }
    get root() {
        return {
            childNodes: this._tree,
        };
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
        if (node instanceof Element || node instanceof InvalidNode || node instanceof OmittedElement) {
            await walk(node.childNodes, walker);
        }
    }
}
function syncWalk(nodeList, walker) {
    for (const node of nodeList) {
        walker(node);
        if (node instanceof Element || node instanceof InvalidNode || node instanceof OmittedElement) {
            syncWalk(node.childNodes, walker);
        }
    }
}
function setLocation(location) {
    if (location == null) {
        return null;
    }
    return {
        line: location.line,
        col: location.col,
        startOffset: location.startOffset,
        endOffset: location.endOffset,
    };
}
// tslint:disable-next-line:cyclomatic-complexity
function nodeize(p5node, prev, parent, rawHtml) {
    let node;
    switch (p5node.nodeName) {
        case '#documentType': {
            if (!p5node.__location) {
                return new InvalidNode({
                    nodeName: '#invalid',
                    childNodes: traverse(p5node, parent, rawHtml),
                    prevNode: prev,
                    nextNode: null,
                    parentNode: parent,
                });
            }
            const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
            node = new Doctype({
                nodeName: '#doctype',
                location: setLocation(p5node.__location),
                prevNode: prev,
                nextNode: null,
                parentNode: parent,
                publicId: p5node.publicId || null,
                systemId: p5node.systemId || null,
                raw,
            });
            break;
        }
        case '#text': {
            if (!p5node.__location) {
                return new InvalidNode({
                    nodeName: '#invalid',
                    childNodes: traverse(p5node, parent, rawHtml),
                    prevNode: prev,
                    nextNode: null,
                    parentNode: parent,
                });
            }
            const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
            if (parent && /^(?:script|style)$/i.test(parent.nodeName)) {
                node = new RawTextNode({
                    nodeName: p5node.nodeName,
                    location: setLocation(p5node.__location),
                    prevNode: prev,
                    nextNode: null,
                    parentNode: parent,
                    textContent: p5node.value,
                    raw,
                });
            }
            else {
                node = new TextNode({
                    nodeName: p5node.nodeName,
                    location: setLocation(p5node.__location),
                    prevNode: prev,
                    nextNode: null,
                    parentNode: parent,
                    textContent: p5node.value,
                    raw,
                });
            }
            break;
        }
        case '#comment': {
            if (!p5node.__location) {
                return new InvalidNode({
                    nodeName: '#invalid',
                    childNodes: traverse(p5node, parent, rawHtml),
                    prevNode: prev,
                    nextNode: null,
                    parentNode: parent,
                });
            }
            const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
            // @ts-ignore
            node = new CommentNode({
                nodeName: p5node.nodeName,
                location: setLocation(p5node.__location),
                prevNode: prev,
                nextNode: null,
                parentNode: parent,
                // @ts-ignore
                data: p5node.data,
                raw,
            });
            break;
        }
        default: {
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
                            endOffset: null,
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
                        endOffset: p5node.__location.endOffset,
                        startTag: p5node.__location.startTag,
                        endTag: p5node.__location.endTag || null,
                    },
                    prevNode: prev,
                    nextNode: null,
                    parentNode: parent,
                    raw,
                });
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
            node.childNodes = traverse(p5node, node, rawHtml);
        }
    }
    return node;
}
function traverse(rootNode, parentNode = null, rawHtml) {
    const nodeList = [];
    let prev = null;
    for (const p5node of rootNode.childNodes) {
        const node = nodeize(p5node, prev, parentNode, rawHtml);
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
    const nodeTree = traverse(doc, null, html);
    return new Document(nodeTree, html);
}
exports.default = parser;
