"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = require("../../rule/custom-rule");
const messages_1 = require("../messages");
const quote = {
    double: '"',
    single: "'",
};
exports.default = custom_rule_1.default.create({
    name: 'attr-value-quotes',
    defaultLevel: 'warning',
    defaultValue: 'double',
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            const message = await messages_1.default(locale, '{0} is must {1} on {2}', 'Attribute value', 'quote', `${node.rule.value} quotation mark`);
            for (const attr of node.attributes) {
                if (attr.value != null && attr.quote !== quote[node.rule.value]) {
                    reports.push({
                        severity: node.rule.severity,
                        message,
                        line: attr.location.line,
                        col: attr.location.col,
                        raw: attr.raw,
                    });
                }
            }
        });
        return reports;
    },
});
