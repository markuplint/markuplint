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
        const message = await messages_1.default(locale, `{0} ${ms} be {1}`, 'Illegal characters in node or attribute value', 'escape in character reference');
        let i = 0;
        document.walk((node) => {
            if (node instanceof parser_1.TextNode) {
                findLocation_1.default(defaultChars, node.raw, node.line, node.col).forEach((foundLocation) => {
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
