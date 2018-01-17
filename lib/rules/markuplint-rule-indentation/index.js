"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
exports.default = rule_1.CustomRule.create({
    name: 'indentation',
    defaultLevel: 'warning',
    defaultValue: 2,
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        await document.walkOn('Node', async (node) => {
            if (!node.rule) {
                return;
            }
            const ms = node.rule.level === 'error' ? 'must' : 'should';
            if (node.indentation) {
                let spec = null;
                if (node.rule.value === 'tab' && node.indentation.type !== 'tab') {
                    spec = 'tab';
                }
                else if (typeof node.rule.value === 'number' && node.indentation.type !== 'space') {
                    spec = 'space';
                }
                else if (typeof node.rule.value === 'number' && node.indentation.type === 'space' && node.indentation.width % node.rule.value) {
                    spec = await messages_1.default(locale, `{0} width spaces`, `${node.rule.value}`);
                }
                if (spec) {
                    const message = await messages_1.default(locale, `{0} ${ms} be {1}`, 'Indentation', spec);
                    reports.push({
                        level: node.rule.level,
                        message,
                        line: node.indentation.line,
                        col: 1,
                        raw: node.indentation.raw,
                    });
                }
            }
        });
        return reports;
    },
});
