"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
const quote = {
    double: '"',
    single: "'",
};
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'attr-value-quotes';
        this.defaultLevel = 'warning';
        this.defaultValue = 'double';
    }
    async verify(document, config, ruleset, locale) {
        const reports = [];
        const message = await messages_1.default(locale, '{0} is must {1} on {2}', 'Attribute value', 'quote', `${config.value} quotation mark`);
        await document.walk(async (node) => {
            if (node instanceof parser_1.Element) {
                for (const attr of node.attributes) {
                    if (attr.value != null && attr.quote !== quote[config.value]) {
                        reports.push({
                            level: config.level,
                            message,
                            line: attr.location.line,
                            col: attr.location.col,
                            raw: attr.raw,
                        });
                    }
                }
            }
        });
        return reports;
    }
}
exports.default = default_1;
