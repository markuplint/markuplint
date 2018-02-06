"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
const messages_1 = __importDefault(require("../messages"));
exports.default = custom_rule_1.default.create({
    name: 'deny-element',
    defaultLevel: 'warning',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            const message = await messages_1.default(locale, '{0} は許可されていません');
            reports.push({
                severity: node.rule.severity,
                message,
                line: node.line,
                col: node.col,
                raw: node.raw,
            });
        });
        return reports;
    },
});
