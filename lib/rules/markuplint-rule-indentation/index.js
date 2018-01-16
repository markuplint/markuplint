"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
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
        this.defaultValue = 2;
    }
    async verify(document, config, ruleset, locale) {
        const reports = [];
        const ms = config.level === 'error' ? 'must' : 'should';
        await document.walk(async (node) => {
            if (node instanceof parser_1.Node) {
                if (node.indentation) {
                    let spec = null;
                    if (config.value === 'tab' && node.indentation.type !== 'tab') {
                        spec = 'tab';
                    }
                    else if (typeof config.value === 'number' && node.indentation.type !== 'space') {
                        spec = 'space';
                    }
                    else if (typeof config.value === 'number' && node.indentation.type === 'space' && node.indentation.width % config.value) {
                        spec = await messages_1.default(locale, `{0} width spaces`, `${config.value}`);
                    }
                    if (spec) {
                        const message = await messages_1.default(locale, `{0} ${ms} be {1}`, 'Indentation', spec);
                        reports.push({
                            level: config.level,
                            message,
                            line: node.indentation.line,
                            col: 1,
                            raw: node.indentation.raw,
                        });
                    }
                }
            }
        });
        return reports;
    }
}
exports.default = default_1;
