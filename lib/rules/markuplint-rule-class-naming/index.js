"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'class-naming';
        this.defaultLevel = 'warning';
        this.defaultValue = null;
    }
    async verify(document, config, ruleset, locale) {
        const reports = [];
        // const message = await messages(locale, `{0} of {1} ${ms} be {2}`, 'Attribute name', 'HTML', `${config.value}case`);
        await document.walkOn('Element', async (node) => {
            if (config.value) {
                const classPatterns = Array.isArray(config.value) ? config.value : [config.value];
                for (const classPattern of classPatterns) {
                    for (const className of node.classList) {
                        if (!match(className, classPattern)) {
                            const attr = node.getAttribute('class');
                            if (!attr) {
                                continue;
                            }
                            reports.push({
                                level: config.level,
                                message: `"${className}" class name is unmatched pattern of "${classPattern}"`,
                                line: attr.location.line,
                                col: attr.location.col,
                                raw: attr.raw,
                            });
                        }
                    }
                }
            }
        });
        return reports;
    }
}
exports.default = default_1;
function match(needle, pattern) {
    const matches = pattern.match(/^\/(.*)\/(i|g|m)*$/);
    if (matches && matches[1]) {
        const re = matches[1];
        const flag = matches[2];
        return new RegExp(re, flag).test(needle);
    }
    return needle === pattern;
}
