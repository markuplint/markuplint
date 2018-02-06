"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
const messages_1 = __importDefault(require("../messages"));
exports.default = custom_rule_1.default.create({
    name: 'id-duplication',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        const message = await messages_1.default(locale, 'Duplicate {0}', 'attribute id value');
        const idStack = [];
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            const id = node.id;
            if (id && id.value) {
                if (idStack.includes(id.value)) {
                    reports.push({
                        severity: node.rule.severity,
                        message,
                        line: id.location.line,
                        col: id.location.col,
                        raw: id.raw,
                    });
                }
                idStack.push(id.value);
            }
        });
        return reports;
    },
});
