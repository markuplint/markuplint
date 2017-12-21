"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
const rule_1 = require("./rule");
async function verify(html, ruleset, rules, locale) {
    if (!locale) {
        locale = '';
    }
    const nodeTree = parser_1.default(html);
    const reports = [];
    for (const rule of rules) {
        if (ruleset.rules && ruleset.rules[rule.name]) {
            const config = rule.optimizeOption(ruleset.rules[rule.name]);
            let results;
            if (rule instanceof rule_1.CustomRule) {
                results = await rule.verify(nodeTree, config, ruleset, locale);
            }
            else {
                const verifyReturns = await rule.verify(nodeTree, config, ruleset, locale);
                results = verifyReturns.map((v) => Object.assign(v, { ruleId: rule.name }));
            }
            reports.push(...results);
        }
    }
    return reports;
}
exports.verify = verify;
