"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
const messages_1 = __importDefault(require("../messages"));
exports.default = custom_rule_1.default.create({
    name: 'attr-equal-spasing',
    defaultLevel: 'warning',
    defaultValue: 'never',
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        const message = await messages_1.default(locale, 'error');
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            for (const attr of node.attributes) {
                if (!attr.equal) {
                    continue;
                }
                const hasSpaceBefore = /^\s+=/.test(attr.equal);
                const hasSpaceAfter = /=\s+$/.test(attr.equal);
                const beforeNewLine = /^\s*\r?\n\s*=/.test(attr.equal);
                const afterNewLine = /=\s*\r?\n\s*$/.test(attr.equal);
                // console.log({ hasSpaceBefore, hasSpaceAfter, beforeNewLine, afterNewLine, raw: attr.raw });
                let isBad = false;
                switch (node.rule.value) {
                    case 'always': {
                        isBad = !(hasSpaceBefore && hasSpaceAfter);
                        break;
                    }
                    case 'never': {
                        isBad = hasSpaceBefore || hasSpaceAfter;
                        break;
                    }
                    case 'always-single-line': {
                        // or 'no-newline'
                        isBad = beforeNewLine || afterNewLine;
                        break;
                    }
                    case 'never-single-line': {
                        isBad = (hasSpaceBefore && !beforeNewLine) || (hasSpaceAfter && !afterNewLine);
                        break;
                    }
                }
                if (isBad) {
                    reports.push({
                        severity: node.rule.severity,
                        level: node.rule.severity,
                        message: node.rule.value,
                        line: attr.location.line,
                        col: attr.location.col,
                        raw: attr.raw,
                    });
                }
            }
        });
        return reports;
    },
});
