"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("./node");
class TextNode extends node_1.default {
    constructor() {
        super(...arguments);
        this.type = 'Text';
    }
}
exports.default = TextNode;
