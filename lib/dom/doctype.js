"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("./node");
class Doctype extends node_1.default {
    constructor(nodeName, location, raw, prevNode, nextNode, parentNode, publicId, systemId) {
        super(nodeName, location, raw, prevNode, nextNode, parentNode);
        this.type = 'Doctype';
        this.publicId = publicId;
        this.dtd = systemId;
    }
}
exports.default = Doctype;
