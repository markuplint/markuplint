"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
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
