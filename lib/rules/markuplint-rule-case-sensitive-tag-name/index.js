"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const element_1 = require("../../dom/element");
const end_tag_node_1 = require("../../dom/end-tag-node");
const custom_rule_1 = require("../../rule/custom-rule");
const messages_1 = require("../messages");
exports.default = custom_rule_1.default.create({
    name: 'case-sensitive-tag-name',
    defaultLevel: 'warning',
    defaultValue: 'lower',
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        await document.walk(async (node) => {
            if ((node instanceof element_1.default && node.namespaceURI === 'http://www.w3.org/1999/xhtml')
                ||
                    node instanceof end_tag_node_1.default) {
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
                        col: node instanceof element_1.default
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
