"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = require("../../rule/custom-rule");
const messages_1 = require("../messages");
exports.default = custom_rule_1.default.create({
    name: 'id-duplication',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        const message = await messages_1.default(locale, 'Duplicate {0}', 'attribute id value');
        const idStack = [];
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            const id = node.id;
            if (id && id.value) {
                if (idStack.includes(id.value)) {
                    reports.push({
                        level: node.rule.level,
                        message,
                        line: id.location.line,
                        col: id.location.col,
                        raw: id.raw,
                    });
                }
                idStack.push(id.value);
            }
        });
        return reports;
    },
});
