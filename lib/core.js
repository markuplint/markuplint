"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
function verify(html, ruleset, rules) {
    const nodeTree = parser_1.default(html);
    const reports = [];
    for (const rule of rules) {
        if (ruleset.rules && ruleset.rules[rule.name]) {
            reports.push(...rule.verify(nodeTree, ruleset));
        }
    }
    return reports;
}
exports.verify = verify;
