"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = require("../../rule/custom-rule");
const messages_1 = require("../messages");
const defaultChars = [
    '"',
    '&',
    '<',
    '>',
];
exports.default = custom_rule_1.default.create({
    name: 'character-reference',
    defaultValue: true,
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        const targetNodes = [];
        await document.walkOn('Text', async (node) => {
            if (!node.rule) {
                return;
            }
            const ms = node.rule.severity === 'error' ? 'must' : 'should';
            const message = await messages_1.default(locale, `{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
            targetNodes.push({
                level: node.rule.severity,
                line: node.line,
                col: node.col,
                raw: node.raw,
                message,
            });
        });
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            const level = node.rule.severity;
            const ms = level === 'error' ? 'must' : 'should';
            const message = await messages_1.default(locale, `{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
            targetNodes.push(...node.attributes.map((attr) => {
                return {
                    level,
                    line: attr.location.line,
                    col: attr.location.col + attr.name.length + (attr.equal || '').length + 1,
                    raw: attr.value || '',
                    message,
                };
            }));
        });
        for (const targetNode of targetNodes) {
            const escapedText = targetNode.raw.replace(/&(?:[a-z]+|#[0-9]+|x[0-9]);/ig, ($0) => '*'.repeat($0.length));
            custom_rule_1.default.charLocator(defaultChars, escapedText, targetNode.line, targetNode.col).forEach((location) => {
                reports.push({
                    severity: targetNode.level,
                    message: targetNode.message,
                    line: location.line,
                    col: location.col,
                    raw: location.raw,
                });
            });
        }
        return reports;
    },
});
