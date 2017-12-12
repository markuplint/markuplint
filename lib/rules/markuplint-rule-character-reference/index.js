"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
const findLocation_1 = require("../../util/findLocation");
const messages_1 = require("../messages");
const defaultChars = [
    '"',
    '&',
    '<',
    '>',
];
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'character-reference';
    }
    async verify(document, config, ruleset, locale) {
        const reports = [];
        const ms = config.level === 'error' ? 'must' : 'should';
        const message = await messages_1.default(locale, `{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
        document.walk((node) => {
            const targetNodes = [];
            if (node instanceof parser_1.TextNode) {
                targetNodes.push({
                    line: node.line,
                    col: node.col,
                    raw: node.raw,
                });
            }
            else if (node instanceof parser_1.Element) {
                targetNodes.push(...node.attributes.map((attr) => {
                    return {
                        line: attr.location.line,
                        col: attr.location.col + attr.name.length + (attr.equal || '').length + 1,
                        raw: attr.value || '',
                    };
                }));
            }
            for (const targetNode of targetNodes) {
                const escapedText = targetNode.raw.replace(/&(?:[a-z]+|#[0-9]+|x[0-9]);/ig, ($0) => '*'.repeat($0.length));
                findLocation_1.default(defaultChars, escapedText, targetNode.line, targetNode.col).forEach((foundLocation) => {
                    reports.push({
                        level: config.level,
                        message,
                        line: foundLocation.line,
                        col: foundLocation.col,
                        raw: foundLocation.raw,
                    });
                });
            }
        });
        return reports;
    }
}
exports.default = default_1;
