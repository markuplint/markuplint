"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ghost_node_1 = require("./ghost-node");
class OmittedElement extends ghost_node_1.default {
    constructor(nodeName, prevNode, nextNode, parentNode, namespaceURI) {
        super(nodeName, prevNode, nextNode, parentNode);
        this.type = 'OmittedElement';
        this.attributes = [];
        this.childNodes = [];
        this.namespaceURI = namespaceURI;
    }
}
exports.default = OmittedElement;
