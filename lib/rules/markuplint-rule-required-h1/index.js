"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'required-h1';
        this.defaultOptions = { 'expected-once': true };
    }
    async verify(document, config, ruleset, locale) {
        const reports = [];
        const h1Stack = [];
        document.syncWalk((node) => {
            if (node instanceof parser_1.Element) {
                if (node.nodeName.toLowerCase() === 'h1') {
                    h1Stack.push(node);
                }
            }
        });
        if (h1Stack.length === 0) {
            const message = await messages_1.default(locale, 'Missing {0}', 'h1 element');
            reports.push({
                level: config.level,
                message,
                line: 1,
                col: 1,
                raw: document.raw.slice(0, 1),
            });
        }
        else if (config.option && config.option['expected-once'] && h1Stack.length > 1) {
            const message = await messages_1.default(locale, 'Duplicate {0}', 'h1 element');
            reports.push({
                level: config.level,
                message,
                line: h1Stack[1].line,
                col: h1Stack[1].col,
                raw: h1Stack[1].raw,
            });
        }
        return reports;
    }
}
exports.default = default_1;
