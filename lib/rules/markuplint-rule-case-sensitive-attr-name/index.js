"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'case-sensitive-attr-name';
        this.defaultLevel = 'warning';
        this.defaultValue = 'lower';
    }
    async verify(document, config, ruleset) {
        const reports = [];
        document.walk((node) => {
            if (node instanceof parser_1.Element && node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
                if (node.attributes) {
                    for (const attr of node.attributes) {
                        for (const rawAttr of attr.rawAttr) {
                            if (/[A-Z]/.test(rawAttr.name)) {
                                reports.push({
                                    level: this.defaultLevel,
                                    message: 'HTML attribute name must be lowercase',
                                    line: rawAttr.line,
                                    col: rawAttr.col,
                                    raw: rawAttr.raw,
                                });
                            }
                        }
                    }
                }
            }
        });
        return reports;
    }
}
exports.default = default_1;
