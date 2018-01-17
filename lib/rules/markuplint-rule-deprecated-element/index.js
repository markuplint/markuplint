"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
exports.default = rule_1.CustomRule.create({
    name: 'deprecated-element',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        const message = await messages_1.default(locale, `{0} is {1}`, 'Element', 'deprecated');
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            if (node.obsolete) {
                reports.push({
                    level: node.rule.level,
                    message,
                    line: node.line,
                    col: node.col + 1,
                    raw: node.nodeName,
                });
            }
        });
        return reports;
    },
});
