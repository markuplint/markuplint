"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
exports.default = custom_rule_1.default.create({
    name: 'name',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, messages) {
        const reports = [];
        const message = messages('error');
        await document.walkOn('Node', async (node) => {
            if (!node.rule) {
                return;
            }
            if (true) {
                // reports.push({
                // 	level: node.rule.level,
                // 	message,
                // 	line: node.line,
                // 	col: node.col,
                // 	raw: node.raw,
                // });
            }
        });
        return reports;
    },
});
