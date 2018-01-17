"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
exports.default = rule_1.CustomRule.create({
    name: 'required-h1',
    defaultValue: true,
    defaultOptions: { 'expected-once': true },
    async verify(document, locale) {
        // @ts-ignore TODO
        const config = document.ruleConfig || {};
        const reports = [];
        const h1Stack = [];
        document.syncWalkOn('Element', (node) => {
            if (node.nodeName.toLowerCase() === 'h1') {
                h1Stack.push(node);
            }
        });
        if (h1Stack.length === 0) {
            const message = await messages_1.default(locale, 'Missing {0}', 'h1 element');
            reports.push({
                level: config.level,
                message,
                line: 1,
                col: 1,
                raw: document.raw.slice(0, 1),
            });
        }
        else if (config.option && config.option['expected-once'] && h1Stack.length > 1) {
            const message = await messages_1.default(locale, 'Duplicate {0}', 'h1 element');
            reports.push({
                level: config.level,
                message,
                line: h1Stack[1].line,
                col: h1Stack[1].col,
                raw: h1Stack[1].raw,
            });
        }
        return reports;
    },
});
