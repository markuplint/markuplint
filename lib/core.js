"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = __importDefault(require("./parser"));
class Markuplint {
    constructor(html, ruleset, locale) {
        this.document = parser_1.default(html, ruleset);
        this.ruleset = ruleset;
        this.locale = locale;
    }
    async verify() {
        const reports = this.ruleset.verify(this.document, this.locale);
        return reports;
    }
}
exports.default = Markuplint;
