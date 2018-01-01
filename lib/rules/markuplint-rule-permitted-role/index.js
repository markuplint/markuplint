"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'permitted-role';
    }
    async verify(document, config, ruleset, locale) {
        const reports = [];
        const message = await messages_1.default(locale, `This value of {0} attribute is not permitted`, '"role"');
        await document.walkOn('Element', async (node) => {
            if (!ruleset.nodeRules) {
                return;
            }
            for (const nodeRule of ruleset.nodeRules) {
                if (nodeRule.tagName === node.nodeName) {
                    const roleAttr = node.getAttribute('role');
                    if (roleAttr) {
                        const role = roleAttr.value || '';
                        const permittedRoles = nodeRule.roles;
                        if (permittedRoles[0] === 'None') {
                            reports.push({
                                level: config.level,
                                message,
                                line: roleAttr.location.line,
                                col: roleAttr.location.col,
                                raw: roleAttr.raw,
                            });
                        }
                        else if (permittedRoles[0] === 'Any') {
                            // no error
                        }
                        else if (!nodeRule.roles.includes(role.trim().toLowerCase())) {
                            reports.push({
                                level: config.level,
                                message,
                                line: roleAttr.location.line,
                                col: roleAttr.location.col,
                                raw: roleAttr.raw,
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
