"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../parser");
const rule_1 = require("../rule");
/**
 * `Indentation`
 *
 * *Core rule*
 */
class Indentation extends rule_1.default {
    verify(document, ruleset) {
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
                    const rule = ruleset.rules.indentation;
                    if (rule === 'tab') {
                        if (!/^\t+$/.test(spaces)) {
                            const line = node.line;
                            const col = 1;
                            reports.push({
                                message: 'Expected spaces. Indentaion is required tabs.',
                                line,
                                col,
                                raw: `${lastNode.textContent}${node}`,
                            });
                        }
                    }
                    if (typeof rule === 'number') {
                        if (!/^ +$/.test(spaces)) {
                            const line = node.line;
                            const col = 1;
                            reports.push({
                                message: 'Expected spaces. Indentaion is required spaces.',
                                line,
                                col,
                                raw: `${lastNode.textContent}${node}`,
                            });
                        }
                        else if (spaces.length % rule) {
                            const line = node.line;
                            const col = 1;
                            reports.push({
                                message: `Expected spaces. Indentaion is required ${rule} width spaces.`,
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
exports.Indentation = Indentation;
exports.default = new Indentation('indentation');
