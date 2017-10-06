"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var parse5 = require("parse5");
var Node = /** @class */ (function () {
    function Node(props) {
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
    return Node;
}());
exports.Node = Node;
var Element = /** @class */ (function (_super) {
    __extends(Element, _super);
    function Element(props) {
        var _this = _super.call(this, props) || this;
        _this.raw = '';
        _this.attributes = props.attributes;
        _this.childNodes = props.childNodes;
        _this.endOffset = props.location.endOffset || null;
        _this.startTagLocation = props.location.startTag || null;
        _this.endTagLocation = props.location.endTag || null;
        return _this;
    }
    return Element;
}(Node));
exports.Element = Element;
var TextNode = /** @class */ (function (_super) {
    __extends(TextNode, _super);
    function TextNode(props) {
        var _this = _super.call(this, props) || this;
        _this.textContent = props.textContent;
        return _this;
    }
    return TextNode;
}(Node));
exports.TextNode = TextNode;
var Doctype = /** @class */ (function (_super) {
    __extends(Doctype, _super);
    function Doctype(props) {
        var _this = _super.call(this, props) || this;
        _this.publicId = props.publicId;
        _this.dtd = props.systemId;
        return _this;
    }
    return Doctype;
}(Node));
exports.Doctype = Doctype;
var EndTagNode = /** @class */ (function (_super) {
    __extends(EndTagNode, _super);
    function EndTagNode(props) {
        var _this = _super.call(this, props) || this;
        _this.startTagNode = props.startTagNode;
        return _this;
    }
    return EndTagNode;
}(Node));
exports.EndTagNode = EndTagNode;
var InvalidNode = /** @class */ (function (_super) {
    __extends(InvalidNode, _super);
    function InvalidNode(props) {
        var _this = _super.call(this, props) || this;
        _this.childNodes = props.childNodes;
        return _this;
    }
    return InvalidNode;
}(Node));
exports.InvalidNode = InvalidNode;
var Document = /** @class */ (function () {
    function Document(nodes, rawHtml) {
        this._tree = [];
        this._list = [];
        this._raw = rawHtml;
        this._tree = nodes;
        var pos = [];
        walk(nodes, function (node) {
            var i = pos.length;
            if (node instanceof InvalidNode) {
                return;
            }
            if (i === 0 && node.startOffset > 0) {
                var firstTextContent = rawHtml.slice(0, node.startOffset);
                var firstTextNode = new TextNode({
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
            pos.push({ pos: node.startOffset, node: node });
            if (node instanceof Element) {
                if (node.startTagLocation) {
                    var raw = rawHtml.slice(node.startTagLocation.startOffset, node.startTagLocation.endOffset);
                    node.raw = raw;
                    if (node.endTagLocation) {
                        var endTag = new EndTagNode({
                            nodeName: "/" + node.nodeName,
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
                    var raw = rawHtml.slice(node.startOffset, node.endOffset || node.startOffset);
                    node.raw = raw;
                }
            }
        });
        pos.sort(function (a, b) { return a.pos - b.pos; });
        this._list = pos.map(function (p) { return p.node; });
    }
    Object.defineProperty(Document.prototype, "root", {
        get: function () {
            return {
                childNodes: this._tree,
            };
        },
        enumerable: true,
        configurable: true
    });
    Document.prototype.walk = function (walker) {
        for (var _i = 0, _a = this._list; _i < _a.length; _i++) {
            var node = _a[_i];
            walker(node);
        }
    };
    Document.prototype.getNode = function (index) {
        return this._tree[index];
    };
    return Document;
}());
exports.Document = Document;
function walk(nodeList, walker) {
    for (var _i = 0, nodeList_1 = nodeList; _i < nodeList_1.length; _i++) {
        var node = nodeList_1[_i];
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
    var node;
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
                attributes: p5node.attrs ? p5node.attrs[0] || {} : {},
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
function traverse(rootNode, parentNode) {
    if (parentNode === void 0) { parentNode = null; }
    var nodeList = [];
    var prev = null;
    for (var _i = 0, _a = rootNode.childNodes; _i < _a.length; _i++) {
        var p5node = _a[_i];
        var node = nodeize(p5node, prev, parentNode);
        if (prev) {
            prev.nextNode = node;
        }
        prev = node;
        nodeList.push(node);
    }
    return nodeList;
}
function parser(html) {
    var doc = parse5.parse(html, { locationInfo: true });
    var nodeList = traverse(doc);
    return new Document(nodeList, html);
}
exports.default = parser;
