"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'parse-error';
    }
    async verify(document, config, ruleset, locale) {
        const reports = [];
        // const message = await messages(locale, `Values allowed for {0} attributes are {$}`, '"role"');
        let hasBody = false;
        await document.walk(async (node) => {
            if (node instanceof parser_1.Element || node instanceof parser_1.OmittedElement) {
                if (node.nodeName.toLowerCase() === 'body') {
                    hasBody = true;
                }
            }
            if (node instanceof parser_1.InvalidNode) {
                if (hasBody && node.raw.indexOf('<body') === 0) {
                    reports.push({
                        level: config.level,
                        message: '"body"要素はDOMツリー上に既に暗黙的に生成されています。',
                        line: node.line,
                        col: node.col,
                        raw: node.raw,
                    });
                }
                else {
                    reports.push({
                        level: config.level,
                        message: 'パースできない不正なノードです。',
                        line: node.line,
                        col: node.col,
                        raw: node.raw,
                    });
                }
            }
        });
        return reports;
    }
}
exports.default = default_1;
