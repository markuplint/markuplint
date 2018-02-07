"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const parse5_1 = __importDefault(require("parse5"));
const parse_raw_tag_1 = __importDefault(require("./parse-raw-tag"));
const tag_splitter_1 = __importDefault(require("./tag-splitter"));
const document_1 = __importDefault(require("../dom/document"));
const comment_node_1 = __importDefault(require("../dom/comment-node"));
const doctype_1 = __importDefault(require("../dom/doctype"));
const element_1 = __importDefault(require("../dom/element"));
const end_tag_node_1 = __importDefault(require("../dom/end-tag-node"));
const invalid_node_1 = __importDefault(require("../dom/invalid-node"));
const omitted_element_1 = __importDefault(require("../dom/omitted-element"));
const raw_text_1 = __importDefault(require("../dom/raw-text"));
const text_node_1 = __importDefault(require("../dom/text-node"));
function parser(html, ruleset) {
    const doc = parse5_1.default.parse(html, {
        locationInfo: true,
    });
    const nodeTree = traverse(doc, null, html);
    return new document_1.default(nodeTree, html, ruleset);
}
exports.default = parser;
// tslint:disable-next-line:cyclomatic-complexity
function nodeize(p5node, prev, parent, rawHtml) {
    const nodes = [];
    switch (p5node.nodeName) {
        case '#documentType': {
            if (!p5node.__location) {
                throw new Error('Invalid Syntax');
            }
            const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
            const node = new doctype_1.default('#doctype', raw, p5node.__location.line, p5node.__location.col, p5node.__location.startOffset, prev, null, parent, p5node.publicId || null, p5node.systemId || null);
            nodes.push(node);
            break;
        }
        case '#text': {
            if (!p5node.__location) {
                throw new Error('Invalid Syntax');
            }
            const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
            if (parent && /^(?:script|style)$/i.test(parent.nodeName)) {
                const node = new raw_text_1.default(p5node.nodeName, raw, p5node.__location.line, p5node.__location.col, p5node.__location.startOffset, prev, null, parent);
                nodes.push(node);
            }
            else {
                const tokens = tag_splitter_1.default(raw, p5node.__location.line, p5node.__location.col);
                let startOffset = p5node.__location.startOffset;
                for (const token of tokens) {
                    const endOffset = startOffset + token.raw.length;
                    if (token.type === 'text') {
                        const node = new text_node_1.default(p5node.nodeName, token.raw, token.line, token.col, startOffset, prev, null, parent);
                        prev = node;
                        startOffset = endOffset;
                        nodes.push(node);
                    }
                    else {
                        const node = new invalid_node_1.default('#invalid', token.raw, token.line, token.col, startOffset, prev, null, parent);
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
            const node = new comment_node_1.default(p5node.nodeName, raw, p5node.__location.line, p5node.__location.col, p5node.__location.startOffset, prev, null, parent, 
            // @ts-ignore
            p5node.data);
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
                const rawTag = parse_raw_tag_1.default(raw, p5node.__location.line, p5node.__location.col);
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
                let endTag = null;
                const endTagLocation = p5node.__location.endTag;
                if (endTagLocation) {
                    const endTagRaw = rawHtml.slice(endTagLocation.startOffset, endTagLocation.endOffset);
                    const endTagName = endTagRaw.replace(/^<\/((?:[a-z]+:)?[a-z]+(?:-[a-z]+)*)\s*>/i, '$1');
                    endTag = new end_tag_node_1.default(endTagName, endTagRaw, endTagLocation.line, endTagLocation.col, endTagLocation.startOffset, null, null, parent);
                }
                node = new element_1.default(nodeName, raw, p5node.__location.line, p5node.__location.col, p5node.__location.startOffset, prev, null, parent, attributes, p5node.namespaceURI, endTag);
                if (endTag) {
                    // @ts-ignore
                    endTag.startTagNode = node;
                }
            }
            else {
                node = new omitted_element_1.default(p5node.nodeName, prev, null, parent, p5node.namespaceURI);
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
