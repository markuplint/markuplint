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
    function Node(node) {
        this.nodeName = node.nodeName;
        // console.log(node);
    }
    return Node;
}());
exports.Node = Node;
var Doctype = /** @class */ (function (_super) {
    __extends(Doctype, _super);
    function Doctype(node) {
        var _this = _super.call(this, node) || this;
        _this.publicId = node.publicId;
        _this.dtd = node.systemId;
        return _this;
    }
    return Doctype;
}(Node));
exports.Doctype = Doctype;
var NodeTree = /** @class */ (function () {
    function NodeTree(nodeTree) {
        var _this = this;
        this._ = [];
        _walk(nodeTree, function (n) {
            switch (n.nodeName) {
                case '#documentType': {
                    _this._docType = new Doctype(n);
                    _this._.push(_this._docType);
                    break;
                }
                default: {
                    if (n.__location && !isNaN(n.__location.col)) {
                        _this._.push(new Node(n));
                    }
                }
            }
        });
    }
    NodeTree.prototype.walk = function (walker) {
        for (var _i = 0, _a = this._; _i < _a.length; _i++) {
            var node = _a[_i];
            walker(node);
        }
    };
    NodeTree.prototype.getNode = function (index) {
        return this._[index];
    };
    return NodeTree;
}());
exports.NodeTree = NodeTree;
function _walk(nodeList, walker) {
    for (var _i = 0, nodeList_1 = nodeList; _i < nodeList_1.length; _i++) {
        var node = nodeList_1[_i];
        walker(node);
        if (node.childNodes && node.childNodes.length) {
            _walk(node.childNodes, walker);
        }
    }
}
function parser(html) {
    var doc = parse5.parse(html, { locationInfo: true });
    var nodeTree = new NodeTree(doc.childNodes);
    return nodeTree;
}
exports.default = parser;
