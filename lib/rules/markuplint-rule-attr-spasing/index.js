"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
exports.default = custom_rule_1.default.create({
    name: 'attr-spasing',
    defaultLevel: 'warning',
    defaultValue: true,
    defaultOptions: {
        lineBreak: 'either',
        width: 1,
    },
    async verify(document, messages) {
        const reports = [];
        const message = messages('error');
        document.syncWalkOn('Element', (node) => {
            const attrs = node.attributes;
            for (const attr of attrs) {
                const hasSpace = !!attr.beforeSpaces.raw;
                const hasLineBreak = /\r?\n/.test(attr.beforeSpaces.raw);
                // console.log({ attr: `${attr.beforeSpaces.raw}${attr.raw}`,  hasSpace, hasLineBreak });
                if (!hasSpace) {
                    reports.push({
                        severity: node.rule.severity,
                        message: messages('スペースが必要です'),
                        line: attr.beforeSpaces.line,
                        col: attr.beforeSpaces.col,
                        raw: attr.beforeSpaces.raw,
                    });
                }
                else {
                    if (hasLineBreak) {
                        if (node.rule.option.lineBreak === 'never') {
                            reports.push({
                                severity: node.rule.severity,
                                message: messages('改行はしないでください'),
                                line: attr.beforeSpaces.line,
                                col: attr.beforeSpaces.col,
                                raw: attr.beforeSpaces.raw,
                            });
                        }
                    }
                    else {
                        if (node.rule.option.lineBreak === 'always') {
                            reports.push({
                                severity: node.rule.severity,
                                message: messages('改行してください'),
                                line: attr.beforeSpaces.line,
                                col: attr.beforeSpaces.col,
                                raw: attr.beforeSpaces.raw,
                            });
                        }
                        if (node.rule.option.width && node.rule.option.width !== attr.beforeSpaces.raw.length) {
                            reports.push({
                                severity: node.rule.severity,
                                message: messages('スペースは{0}つにしてください', node.rule.option.width),
                                line: attr.beforeSpaces.line,
                                col: attr.beforeSpaces.col,
                                raw: attr.beforeSpaces.raw,
                            });
                        }
                    }
                }
            }
        });
        return reports;
    },
});
