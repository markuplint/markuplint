"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = __importDefault(require("./dom/parser"));
class Markuplint {
    constructor(html, ruleset, messenger) {
        this.document = parser_1.default(html, ruleset);
        this.ruleset = ruleset;
        this.messenger = messenger;
    }
    async verify() {
        const reports = this.ruleset.verify(this.document, this.messenger);
        return reports;
    }
}
exports.default = Markuplint;
