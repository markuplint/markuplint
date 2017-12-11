"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse5 = require("parse5");
const parseRawTag_1 = require("./parseRawTag");
class Node {
    constructor(props) {
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
}
exports.Node = Node;
class Element extends Node {
    constructor(props) {
        super(props);
        this.namespaceURI = props.namespaceURI;
        this.attributes = props.attributes;
        this.childNodes = props.childNodes;
        this.endOffset = props.location.endOffset || null;
        this.startTagLocation = props.location.startTag || null;
        this.endTagLocation = props.location.endTag || null;
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
}
exports.Element = Element;
class TextNode extends Node {
    constructor(props) {
        super(props);
        this.textContent = props.textContent;
        this.raw = props.raw;
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
        this.raw = props.raw;
        if (props.location) {
            this.endOffset = props.location.endOffset;
        }
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
            pos.push({ pos: node.startOffset, node });
        });
        // {
        // 	const lastNode = pos.pop();
        // 	if (lastNode) {
        // 		const matched = lastNode.node.raw.match(/^([^<]+)(<\/body\s*>)+(\s*)(<\/html\s*>)+(\s*)$/i);
        // 		if (matched) {
        // 			const before = matched[1] || null;
        // 			const body = matched[2] || null;
        // 			const sep = matched[3] || null;
        // 			const html = matched[4] || null;
        // 			const after = matched[5] || null;
        // 			if (before) {
        // 				pos.push({
        // 					pos: lastNode.node.startOffset,
        // 					node: new TextNode({
        // 						nodeName: '#text',
        // 						location: {
        // 							line: lastNode.node.line,
        // 							col: lastNode.node.col,
        // 							startOffset: lastNode.node.startOffset,
        // 							endOffset: lastNode.node.startOffset + before.length,
        // 						},
        // 						prevNode: lastNode.node.prevNode,
        // 						nextNode: null,
        // 						parentNode: lastNode.node.parentNode,
        // 						textContent: before,
        // 						raw: before,
        // 					}),
        // 				});
        // 			}
        // 			// TODO: sep
        // 			// if (sep) {
        // 			// 	pos.push({
        // 			// 		pos: lastNode.node.startOffset,
        // 			// 		node: new TextNode({
        // 			// 			nodeName: '#text',
        // 			// 			location: {
        // 			// 				line: lastNode.node.line,
        // 			// 				col: lastNode.node.col,
        // 			// 				startOffset: lastNode.node.startOffset,
        // 			// 				endOffset: lastNode.node.startOffset + before.length,
        // 			// 			},
        // 			// 			prevNode: lastNode.node.prevNode,
        // 			// 			nextNode: null,
        // 			// 			parentNode: lastNode.node.parentNode,
        // 			// 			textContent: before,
        // 			// 			raw: before,
        // 			// 		}),
        // 			// 	});
        // 			// }
        // 			// TODO: after
        // 			// if (after) {
        // 			// 	pos.push({
        // 			// 		pos: lastNode.node.startOffset,
        // 			// 		node: new TextNode({
        // 			// 			nodeName: '#text',
        // 			// 			location: {
        // 			// 				line: lastNode.node.line,
        // 			// 				col: lastNode.node.col,
        // 			// 				startOffset: lastNode.node.startOffset,
        // 			// 				endOffset: lastNode.node.startOffset + before.length,
        // 			// 			},
        // 			// 			prevNode: lastNode.node.prevNode,
        // 			// 			nextNode: null,
        // 			// 			parentNode: lastNode.node.parentNode,
        // 			// 			textContent: before,
        // 			// 			raw: before,
        // 			// 		}),
        // 			// 	});
        // 			// }
        // 		}
        // 	}
        // }
        pos.forEach(({ node }, i) => {
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
                    raw: firstTextContent,
                });
                pos.push({ pos: 0, node: firstTextNode });
            }
            if (node instanceof Element) {
                if (node.startTagLocation) {
                    if (node.endTagLocation) {
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
                        pos.push({ pos: endTag.startOffset, node: endTag });
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
    get raw() {
        return this._raw;
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
function nodeize(p5node, prev, parent, rawHtml) {
    if (!p5node.__location) {
        return new InvalidNode({
            nodeName: '#invalid',
            location: null,
            childNodes: traverse(p5node, parent, rawHtml),
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
            const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
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
                raw,
            });
            break;
        }
        default: {
            const raw = p5node.__location.startTag && p5node.__location.endTag
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
                    startTag: p5node.__location.startTag || null,
                    endTag: p5node.__location.endTag || null,
                },
                prevNode: prev,
                nextNode: null,
                parentNode: parent,
                childNodes: traverse(p5node, parent, rawHtml),
                raw,
            });
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
    const nodeList = traverse(doc, null, html);
    return new Document(nodeList, html);
}
exports.default = parser;
