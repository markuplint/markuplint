"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
exports.default = custom_rule_1.default.create({
    name: 'class-naming',
    defaultLevel: 'warning',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, messages) {
        const reports = [];
        // const message = messages(`{0} of {1} ${ms} be {2}`, 'Attribute name', 'HTML', `${config.value}case`);
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            if (node.rule.value) {
                const classPatterns = Array.isArray(node.rule.value) ? node.rule.value : [node.rule.value];
                for (const classPattern of classPatterns) {
                    for (const className of node.classList) {
                        if (!match(className, classPattern)) {
                            const attr = node.getAttribute('class');
                            if (!attr) {
                                continue;
                            }
                            reports.push({
                                severity: node.rule.severity,
                                message: `"${className}" class name is unmatched pattern of "${classPattern}"`,
                                line: attr.location.line,
                                col: attr.location.col,
                                raw: attr.raw,
                            });
                        }
                    }
                }
            }
        });
        return reports;
    },
});
function match(needle, pattern) {
    const matches = pattern.match(/^\/(.*)\/(i|g|m)*$/);
    if (matches && matches[1]) {
        const re = matches[1];
        const flag = matches[2];
        return new RegExp(re, flag).test(needle);
    }
    return needle === pattern;
}
