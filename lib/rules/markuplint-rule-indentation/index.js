"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
exports.default = custom_rule_1.default.create({
    name: 'indentation',
    defaultLevel: 'warning',
    defaultValue: 2,
    defaultOptions: null,
    async verify(document, messages) {
        const reports = [];
        await document.walkOn('Node', async (node) => {
            if (!node.rule) {
                return;
            }
            const ms = node.rule.severity === 'error' ? 'must' : 'should';
            if (node.indentation) {
                let spec = null;
                if (node.rule.value === 'tab' && node.indentation.type !== 'tab') {
                    spec = 'tab';
                }
                else if (typeof node.rule.value === 'number' && node.indentation.type !== 'space') {
                    spec = 'space';
                }
                else if (typeof node.rule.value === 'number' && node.indentation.type === 'space' && node.indentation.width % node.rule.value) {
                    spec = messages(`{0} width spaces`, `${node.rule.value}`);
                }
                if (spec) {
                    const message = messages(`{0} ${ms} be {1}`, 'Indentation', spec);
                    reports.push({
                        severity: node.rule.severity,
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
