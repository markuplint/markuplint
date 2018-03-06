"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = __importDefault(require("./node"));
class TextNode extends node_1.default {
    constructor() {
        super(...arguments);
        this.type = 'Text';
    }
}
exports.default = TextNode;
