"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'deprecated-element';
    }
    async verify(document, config, ruleset, locale) {
        const reports = [];
        const message = await messages_1.default(locale, `{0} is {1}`, 'Element', 'deprecated');
        await document.walkOn('Element', async (node) => {
            if (!ruleset.nodeRules) {
                return;
            }
            for (const nodeRule of ruleset.nodeRules) {
                if (nodeRule.tagName === node.nodeName) {
                    if (nodeRule.obsolete) {
                        reports.push({
                            level: config.level,
                            message,
                            line: node.line,
                            col: node.col + 1,
                            raw: node.nodeName,
                        });
                    }
                }
            }
        });
        return reports;
    }
}
exports.default = default_1;
