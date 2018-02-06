"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const text_node_1 = __importDefault(require("./text-node"));
class RawText extends text_node_1.default {
    constructor() {
        super(...arguments);
        this.type = 'RawText';
    }
}
exports.default = RawText;
