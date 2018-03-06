"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
exports.default = custom_rule_1.default.create({
    name: 'async-attr-in-script',
    defaultLevel: 'warning',
    defaultValue: 'always',
    defaultOptions: null,
    async verify(document, messages) {
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
                const message = messages(necessary, '{$} attribute');
                reports.push({
                    severity: node.rule.severity,
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
