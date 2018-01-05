"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse5 = require("parse5");
const parseRawTag_1 = require("./parseRawTag");
function getLine(html, line) {
    return html.split(/\r?\n/).length - 1 + line;
}
function getCol(html, col) {
    const lines = html.split(/\r?\n/);
    const lineCount = lines.length;
    const lastLine = lines.pop();
    return lineCount > 1 ? lastLine.length : col + html.length;
}
class Node {
    constructor(props) {
        this.type = null;
        this.prevNode = null;
        this.nextNode = null;
        this.parentNode = null;
        this.raw = '';
        this.nodeName = props.nodeName;
        this.line = props.location.line;
        this.col = props.location.col;
        this.endLine = getLine(props.raw, this.line);
        this.endCol = getCol(props.raw, this.col);
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
    toJSON() {
        return {
            nodeName: this.nodeName,
            isGhost: true,
        };
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
    }
}
exports.TextNode = TextNode;
class RawTextNode extends TextNode {
    constructor(props) {
        super(props);
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
        // create EndTagNode
        // pos.forEach(({node, startOffset, endOffset}) => {
        // 	if (node instanceof Element) {
        // 		if (node.startTagLocation) {
        // 			if (node.endTagLocation && node.endTagLocation.startOffset != null && node.endTagLocation.endOffset != null) {
        // 				const endTagRaw = rawHtml.slice(node.endTagLocation.startOffset, node.endTagLocation.endOffset);
        // 				const endTagName = endTagRaw.replace(/^<\/((?:[a-z]+:)?[a-z]+(?:-[a-z]+)*)\s*>/i, '$1');
        // 				const endTag = new EndTagNode({
        // 					nodeName: endTagName,
        // 					location: {
        // 						line: node.endTagLocation.line,
        // 						col: node.endTagLocation.col,
        // 						startOffset: node.endTagLocation.startOffset,
        // 						endOffset: node.endTagLocation.endOffset,
        // 					},
        // 					prevNode: null,
        // 					nextNode: null,
        // 					parentNode: node.parentNode,
        // 					startTagNode: node,
        // 					raw: endTagRaw,
        // 				});
        // 				node.endTagNode = endTag;
        // 				pos.push({
        // 					node: endTag,
        // 					startOffset: node.endTagLocation.startOffset,
        // 					endOffset: node.endTagLocation.startOffset + endTagRaw.length,
        // 				});
        // 			}
        // 		}
        // 	}
        // });
        pos.sort((a, b) => a.startOffset - b.startOffset);
        // last child text node of body
        let lastChildTextNode = null;
        let lastChildTextNodeEndOffset = null;
        for (const { node, startOffset, endOffset } of pos) {
            if (node.nodeName === 'body' && node instanceof Element || node instanceof OmittedElement) {
                const child = node.childNodes[node.childNodes.length - 1];
                if (child instanceof TextNode) {
                    lastChildTextNode = child;
                }
            }
        }
        for (const { node, startOffset, endOffset } of pos) {
            if (lastChildTextNodeEndOffset != null) {
                continue;
            }
            if (node.nodeName === 'body' && node instanceof Element && node.endTagNode) {
                lastChildTextNodeEndOffset = node.endTagNode.startOffset;
                break;
            }
        }
        for (const { node, startOffset, endOffset } of pos) {
            if (lastChildTextNodeEndOffset != null) {
                continue;
            }
            if (node.nodeName === 'html' && node instanceof Element && node.endTagNode) {
                lastChildTextNodeEndOffset = node.endTagNode.startOffset;
                break;
            }
        }
        if (lastChildTextNode && lastChildTextNodeEndOffset != null) {
            lastChildTextNode.endOffset = lastChildTextNodeEndOffset;
            const raw = rawHtml.slice(lastChildTextNode.startOffset, lastChildTextNode.endOffset);
            lastChildTextNode.raw = raw;
        }
        // create Last spaces
        pos.forEach(({ node, startOffset, endOffset }, i) => {
            if (i === pos.length - 1) {
                const lastTextContent = rawHtml.slice(endOffset);
                if (!lastTextContent) {
                    return;
                }
                if (node instanceof GhostNode) {
                    return;
                }
                const lastTextNode = new TextNode({
                    nodeName: '#eof',
                    location: {
                        line: node.endLine,
                        col: node.endCol,
                        startOffset: endOffset,
                        endOffset: endOffset + lastTextContent.length,
                    },
                    prevNode: null,
                    nextNode: node,
                    parentNode: null,
                    raw: lastTextContent,
                });
                pos.push({
                    node: lastTextNode,
                    startOffset: endOffset,
                    endOffset: endOffset + lastTextContent.length,
                });
            }
        });
        this._list = pos.map(p => p.node);
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
        return JSON.parse(JSON.stringify(this._list));
    }
    toDebugMap() {
        return this.list.map((n) => {
            if (n instanceof Node) {
                return `[${n.line}:${n.col}]>[${n.endLine}:${n.endCol}](${n.startOffset},${n.endOffset})${n.nodeName}: ${n.toString().replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/\s/g, '␣')}`;
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
        if (node instanceof Element || node instanceof InvalidNode || node instanceof OmittedElement) {
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
        if (node instanceof Element || node instanceof InvalidNode || node instanceof OmittedElement) {
            syncWalk(node.childNodes, walker);
        }
        if (node instanceof Element && node.endTagNode) {
            walker(node.endTagNode);
        }
    }
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
            // bodyの最後の子のテキストノードだけおかしい
            const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
            if (parent && /^(?:script|style)$/i.test(parent.nodeName)) {
                node = new RawTextNode({
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
            }
            else {
                node = new TextNode({
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
