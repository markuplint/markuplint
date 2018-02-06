"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = require("../../rule/custom-rule");
const messages_1 = require("../messages");
exports.default = custom_rule_1.default.create({
    name: 'case-sensitive-attr-name',
    defaultLevel: 'warning',
    defaultValue: 'no-upper',
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            const ms = node.rule.severity === 'error' ? 'must' : 'should';
            const deny = node.rule.value === 'no-upper' ? /[A-Z]/ : /[a-z]/;
            const cases = node.rule.value === 'no-upper' ? 'lower' : 'upper';
            const message = await messages_1.default(locale, `{0} of {1} ${ms} be {2}`, 'Attribute name', 'HTML', `${cases}case`);
            if (node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
                if (node.attributes) {
                    for (const attr of node.attributes) {
                        if (deny.test(attr.name)) {
                            reports.push({
                                severity: node.rule.severity,
                                message,
                                line: attr.location.line,
                                col: attr.location.col,
                                raw: attr.name,
                            });
                        }
                    }
                }
            }
        });
        return reports;
    },
});
