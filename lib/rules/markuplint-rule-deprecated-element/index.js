"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
exports.default = custom_rule_1.default.create({
    name: 'deprecated-element',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, messages) {
        const reports = [];
        const message = messages(`{0} is {1}`, 'Element', 'deprecated');
        await document.walkOn('Element', async (node) => {
            if (node.obsolete) {
                reports.push({
                    severity: node.rule.severity,
                    message,
                    line: node.line,
                    col: node.col + 1,
                    raw: node.nodeName,
                });
            }
        });
        return reports;
    },
});
