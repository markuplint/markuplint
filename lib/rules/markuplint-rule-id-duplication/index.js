"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'id-duplication';
    }
    async verify(document, config, ruleset, locale) {
        const reports = [];
        const message = await messages_1.default(locale, 'Duplicate {0}', 'attribute id value');
        const idStack = [];
        document.walk((node) => {
            if (node instanceof parser_1.Element) {
                const id = node.id;
                if (id) {
                    if (idStack.includes(id.name)) {
                        reports.push({
                            level: config.level,
                            message,
                            line: id.location.line,
                            col: id.location.col,
                            raw: id.raw,
                        });
                    }
                    idStack.push(id.name);
                }
            }
        });
        return reports;
    }
}
exports.default = default_1;
