"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
async function verify(html, ruleset, locale) {
    if (!locale) {
        locale = '';
    }
    const nodeTree = parser_1.default(html);
    const reports = ruleset.verify(nodeTree, locale);
    return reports;
}
exports.verify = verify;
