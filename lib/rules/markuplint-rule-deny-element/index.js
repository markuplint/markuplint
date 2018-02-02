"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
exports.default = rule_1.CustomRule.create({
    name: 'deny-element',
    defaultLevel: 'warning',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            const message = await messages_1.default(locale, '{0} は許可されていません');
            reports.push({
                level: node.rule.level,
                message,
                line: node.line,
                col: node.col,
                raw: node.raw,
            });
        });
        return reports;
    },
});
