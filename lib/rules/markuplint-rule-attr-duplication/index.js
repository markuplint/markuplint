"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
exports.default = custom_rule_1.default.create({
    name: 'attr-duplication',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, messages) {
        const reports = [];
        const message = messages('Duplicate {0}', 'attribute name');
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            const attrNameStack = [];
            for (const attr of node.attributes) {
                const attrName = attr.name.toLowerCase();
                if (attrNameStack.includes(attrName)) {
                    reports.push({
                        severity: node.rule.severity,
                        message,
                        line: attr.location.line,
                        col: attr.location.col,
                        raw: attr.raw,
                    });
                }
                else {
                    attrNameStack.push(attrName);
                }
            }
        });
        return reports;
    },
});
