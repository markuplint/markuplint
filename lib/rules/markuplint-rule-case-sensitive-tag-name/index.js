"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require("../../parser/");
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
exports.default = rule_1.CustomRule.create({
    name: 'case-sensitive-tag-name',
    defaultLevel: 'warning',
    defaultValue: 'lower',
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        await document.walk(async (node) => {
            if ((node instanceof _1.Element && node.namespaceURI === 'http://www.w3.org/1999/xhtml')
                ||
                    node instanceof _1.EndTagNode) {
                if (!node.rule) {
                    return;
                }
                const ms = node.rule.level === 'error' ? 'must' : 'should';
                const deny = node.rule.value === 'lower' ? /[A-Z]/ : /[a-z]/;
                const message = await messages_1.default(locale, `{0} of {1} ${ms} be {2}`, 'Tag name', 'HTML', `${node.rule.value}case`);
                if (deny.test(node.nodeName)) {
                    reports.push({
                        level: node.rule.level,
                        message,
                        line: node.line,
                        col: node instanceof _1.Element
                            ?
                                node.col + 1 // remove "<" char.
                            :
                                node.col + 2,
                        raw: node.nodeName,
                    });
                }
            }
        });
        return reports;
    },
});
