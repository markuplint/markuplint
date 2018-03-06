"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = __importDefault(require("./node"));
class Doctype extends node_1.default {
    constructor(nodeName, raw, line, col, startOffset, prevNode, nextNode, publicId, systemId) {
        super(nodeName, raw, line, col, startOffset, prevNode, nextNode, null);
        this.type = 'Doctype';
        this.publicId = publicId;
        this.dtd = systemId;
    }
}
exports.default = Doctype;
