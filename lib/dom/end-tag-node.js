"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("./node");
class EndTagNode extends node_1.default {
    constructor() {
        super(...arguments);
        this.type = 'EndTag';
    }
}
exports.default = EndTagNode;
