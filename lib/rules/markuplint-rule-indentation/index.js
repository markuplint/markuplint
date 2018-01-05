"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
/**
 * `Indentation`
 *
 * *Core rule*
 */
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'indentation';
        this.defaultLevel = 'warning';
    }
    async verify(document, config, ruleset) {
        const reports = [];
        let lastNode;
        await document.walk(async (node) => {
            if (node instanceof parser_1.GhostNode) {
                return;
            }
            if (node instanceof parser_1.TextNode) {
                if (node instanceof parser_1.RawTextNode) {
                    return;
                }
                const matched = node.raw.match(/(^\s*)([^\s]+)/);
                if (matched) {
                    const spaces = matched[1];
                    if (!spaces) {
                        return;
                    }
                    const spaceLines = spaces.split(/\r?\n/);
                    const line = spaceLines.length + node.line - 1;
                    const lastSpace = spaceLines.pop();
                    if (!lastSpace) {
                        return;
                    }
                    const report = indent(lastSpace, node, `${lastSpace}`, line, config);
                    if (report) {
                        reports.push(report);
                    }
                }
            }
            if (lastNode instanceof parser_1.TextNode) {
                const matched = lastNode.raw.match(/\r?\n([ \t]+$)/);
                if (matched) {
                    const spaces = matched[1];
                    if (!spaces) {
                        throw new TypeError(`Expected error.`);
                    }
                    const report = indent(spaces, node, `${spaces}`, node.line, config);
                    if (report) {
                        reports.push(report);
                    }
                }
            }
            lastNode = node;
        });
        return reports;
    }
}
exports.default = default_1;
function indent(spaces, node, raw, line, config) {
    if (config.value === 'tab') {
        if (!/^\t*$/.test(spaces)) {
            return {
                level: config.level,
                message: 'Expected spaces. Indentaion is required tabs.',
                line,
                col: 1,
                raw,
            };
        }
    }
    if (typeof config.value === 'number') {
        if (!/^ *$/.test(spaces)) {
            return {
                level: config.level,
                message: 'Expected spaces. Indentaion is required spaces.',
                line,
                col: 1,
                raw,
            };
        }
        else if (spaces.length % config.value) {
            return {
                level: config.level,
                message: `Expected spaces. Indentaion is required ${config.value} width spaces.`,
                line,
                col: 1,
                raw,
            };
        }
    }
}
