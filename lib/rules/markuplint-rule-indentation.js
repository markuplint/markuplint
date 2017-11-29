"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../parser");
const rule_1 = require("../rule");
/**
 * `Indentation`
 *
 * *Core rule*
 */
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'indentation';
    }
    verify(document, config, ruleset) {
        const reports = [];
        let lastNode;
        document.walk((node) => {
            if (lastNode instanceof parser_1.TextNode) {
                const matched = lastNode.textContent.match(/\n(\s+$)/);
                if (matched) {
                    const spaces = matched[1];
                    if (!spaces) {
                        throw new TypeError(`Expected error.`);
                    }
                    if (config.value === 'tab') {
                        if (!/^\t+$/.test(spaces)) {
                            const line = node.line;
                            const col = 1;
                            reports.push({
                                level: this.defaultLevel,
                                message: 'Expected spaces. Indentaion is required tabs.',
                                line,
                                col,
                                raw: `${lastNode.textContent}${node}`,
                            });
                        }
                    }
                    if (typeof config.value === 'number') {
                        if (!/^ +$/.test(spaces)) {
                            const line = node.line;
                            const col = 1;
                            reports.push({
                                level: this.defaultLevel,
                                message: 'Expected spaces. Indentaion is required spaces.',
                                line,
                                col,
                                raw: `${lastNode.textContent}${node}`,
                            });
                        }
                        else if (spaces.length % config.value) {
                            const line = node.line;
                            const col = 1;
                            reports.push({
                                level: this.defaultLevel,
                                message: `Expected spaces. Indentaion is required ${config.value} width spaces.`,
                                line,
                                col,
                                raw: `${lastNode.textContent}${node}`,
                            });
                        }
                    }
                }
            }
            lastNode = node;
        });
        return reports;
    }
}
exports.default = default_1;
