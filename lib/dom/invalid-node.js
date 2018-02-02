"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("./node");
class InvalidNode extends node_1.default {
    constructor() {
        super(...arguments);
        this.type = 'Invalid';
    }
}
exports.default = InvalidNode;
