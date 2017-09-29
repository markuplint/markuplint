"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parse5 = require("parse5");
var NodeTree = /** @class */ (function () {
    function NodeTree(nodeTree) {
        this._raw = nodeTree;
    }
    NodeTree.prototype.walk = function (walker) {
        _walk(this._raw, walker);
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
