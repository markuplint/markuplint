"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'void-element-closing';
        this.defaultLevel = 'warning';
    }
    async verify(document, config, ruleset, locale) {
        const reports = [];
        const message = await messages_1.default(locale, `空要素に閉じスラッシュがあります`);
        await document.walkOn('Element', async (node) => {
            // console.log(node);
            // console.log(node.nodeName, node.endTagNode, node.endTagLocation);
            const hasEndTag = !!node.endTagLocation;
            if (!hasEndTag) {
                if (/\/>$/.test(node.raw)) {
                    reports.push({
                        level: this.defaultLevel,
                        message,
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
