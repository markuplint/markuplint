"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
const quoteList = {
    double: '"',
    single: "'",
};
exports.default = custom_rule_1.default.create({
    name: 'attr-value-quotes',
    defaultLevel: 'warning',
    defaultValue: 'double',
    defaultOptions: null,
    async verify(document, messages) {
        const reports = [];
        document.syncWalkOn('Element', (node) => {
            const message = messages('{0} is must {1} on {2}', 'Attribute value', 'quote', `${node.rule.value} quotation mark`);
            for (const attr of node.attributes) {
                if (attr.value != null && attr.value.quote !== quoteList[node.rule.value]) {
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
    async fix(document) {
        document.syncWalkOn('Element', (node) => {
            for (const attr of node.attributes) {
                const quote = quoteList[node.rule.value];
                if (attr.value != null && attr.value.quote !== quote) {
                    attr.value.fix(null, quoteList[node.rule.value]);
                }
            }
        });
    },
});
