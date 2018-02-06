"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const ghost_node_1 = __importDefault(require("./ghost-node"));
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
