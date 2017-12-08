"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
async function verify(html, ruleset, rules, locale) {
    if (!locale) {
        locale = '';
    }
    const nodeTree = parser_1.default(html);
    const reports = [];
    for (const rule of rules) {
        if (ruleset.rules && ruleset.rules[rule.name]) {
            const config = rule.optimizeOption(ruleset.rules[rule.name]);
            reports.push(...await rule.verify(nodeTree, config, ruleset, locale));
        }
    }
    return reports;
}
exports.verify = verify;
