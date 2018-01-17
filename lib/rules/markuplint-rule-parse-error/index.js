"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require("../../parser/");
const rule_1 = require("../../rule");
exports.default = rule_1.CustomRule.create({
    name: 'parse-error',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        // const message = await messages(locale, `Values allowed for {0} attributes are {$}`, '"role"');
        let hasBody = false;
        await document.walk(async (node) => {
            if (node instanceof _1.Element || node instanceof _1.OmittedElement) {
                if (node.nodeName.toLowerCase() === 'body') {
                    hasBody = true;
                }
            }
            if (node instanceof _1.InvalidNode) {
                if (!node.rule) {
                    return;
                }
                if (hasBody && node.raw.indexOf('<body') === 0) {
                    reports.push({
                        level: node.rule.level,
                        message: '"body"要素はDOMツリー上に既に暗黙的に生成されています。',
                        line: node.line,
                        col: node.col,
                        raw: node.raw,
                    });
                }
                else {
                    reports.push({
                        level: node.rule.level,
                        message: 'パースできない不正なノードです。',
                        line: node.line,
                        col: node.col,
                        raw: node.raw,
                    });
                }
            }
        });
        return reports;
    },
});
