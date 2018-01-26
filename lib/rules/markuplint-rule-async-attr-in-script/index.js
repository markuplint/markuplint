"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
exports.default = rule_1.CustomRule.create({
    name: 'async-attr-in-script',
    defaultLevel: 'warning',
    defaultValue: 'always',
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            if (!node.matches('script[src]')) {
                return;
            }
            const hasAsyncAttr = !node.hasAttribute('async');
            let bad = false;
            let necessary;
            switch (node.rule.value) {
                case 'always': {
                    necessary = 'Required {0}';
                    bad = hasAsyncAttr;
                    break;
                }
                case 'never': {
                    necessary = 'Not required {0}';
                    bad = !hasAsyncAttr;
                    break;
                }
                default: {
                    return;
                }
            }
            if (bad) {
                const message = await messages_1.default(locale, necessary, '{$} attribute');
                reports.push({
                    level: node.rule.level,
                    message: message.replace('{$}', 'async'),
                    line: node.line,
                    col: node.col,
                    raw: node.raw,
                });
            }
        });
        return reports;
    },
});
