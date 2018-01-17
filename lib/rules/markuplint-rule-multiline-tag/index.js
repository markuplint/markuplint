"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
exports.default = rule_1.CustomRule.create({
    name: 'name',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        const message = await messages_1.default(locale, 'error');
        await document.walkOn('Node', async (node) => {
            if (!node.rule) {
                return;
            }
            if (true) {
                // reports.push({
                // 	level: node.rule.level,
                // 	message,
                // 	line: node.line,
                // 	col: node.col,
                // 	raw: node.raw,
                // });
            }
        });
        return reports;
    },
});
