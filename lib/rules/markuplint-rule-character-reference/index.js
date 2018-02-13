"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
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
    async verify(document, messages) {
        const reports = [];
        const targetNodes = [];
        await document.walkOn('Text', async (node) => {
            if (!node.rule) {
                return;
            }
            const ms = node.rule.severity === 'error' ? 'must' : 'should';
            const message = messages(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
            targetNodes.push({
                severity: node.rule.severity,
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
            const severity = node.rule.severity;
            const ms = severity === 'error' ? 'must' : 'should';
            const message = messages(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
            for (const attr of node.attributes) {
                if (!attr.value) {
                    continue;
                }
                targetNodes.push({
                    severity,
                    line: attr.value.line,
                    col: attr.value.col + (attr.value.quote ? 1 : 0),
                    raw: attr.value.value,
                    message,
                });
            }
        });
        for (const targetNode of targetNodes) {
            const escapedText = targetNode.raw.replace(/&(?:[a-z]+|#[0-9]+|x[0-9]);/ig, ($0) => '*'.repeat($0.length));
            custom_rule_1.default.charLocator(defaultChars, escapedText, targetNode.line, targetNode.col).forEach((location) => {
                reports.push({
                    severity: targetNode.severity,
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
