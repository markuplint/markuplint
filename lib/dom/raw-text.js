"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const text_node_1 = require("./text-node");
class RawText extends text_node_1.default {
    constructor() {
        super(...arguments);
        this.type = 'RawText';
    }
}
exports.default = RawText;
