"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
exports.default = rule_1.CustomRule.create({
    name: 'permitted-role',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        // const message = await messages(locale, `Values allowed for {0} attributes are {$}`, '"role"');
        // await document.walkOn('Element', async (node) => {
        // 	if (!node.rule) {
        // 		return;
        // 	}
        // 	const roleAttr = node.getAttribute('role');
        // 	if (roleAttr) {
        // 		const role = roleAttr.value || '';
        // 		// @ts-ignore TODO
        // 		const permittedRoles = node.permittedRoles;
        // 		if (!permittedRoles) {
        // 			return;
        // 		}
        // 		let isError = false;
        // 		const permittedRolesStrings = [];
        // 		roleCheckLoop:
        // 		for (const permittedRole of permittedRoles) {
        // 			if (typeof permittedRole === 'string') {
        // 				permittedRolesStrings.push(permittedRole);
        // 				if (permittedRole === 'None') {
        // 					isError = true;
        // 				} else if (permittedRoles[0] === 'Any') {
        // 					isError = false;
        // 					break;
        // 				} else if (permittedRole === role.trim().toLowerCase()) {
        // 					break;
        // 				} else if (permittedRole !== role.trim().toLowerCase()) {
        // 					isError = true;
        // 				}
        // 			} else {
        // 				for (const attr of permittedRole.attrConditions) {
        // 					const nodeAttrValue = node.getAttribute(attr.attrName);
        // 					if (!nodeAttrValue) {
        // 						continue;
        // 					}
        // 					for (const value of attr.values) {
        // 						// tslint:disable-next-line:cyclomatic-complexity
        // 						if (nodeAttrValue.value === value) {
        // 							permittedRolesStrings.push(permittedRole.role);
        // 							if (permittedRole.role === 'None') {
        // 								isError = true;
        // 							} else if (permittedRoles[0] === 'Any') {
        // 								isError = false;
        // 								break;
        // 							} else if (permittedRole.role === role.trim().toLowerCase()) {
        // 								isError = false;
        // 								break roleCheckLoop;
        // 							} else if (permittedRole.role !== role.trim().toLowerCase()) {
        // 								isError = true;
        // 							}
        // 						}
        // 					}
        // 				}
        // 			}
        // 		}
        // 		if (isError) {
        // 			reports.push({
        // 				level: node.rule.level,
        // 				message: message.replace('{$}', permittedRolesStrings.map((s) => `"${s}"`).join(', ')),
        // 				line: roleAttr.location.line,
        // 				col: roleAttr.location.col,
        // 				raw: roleAttr.raw,
        // 			});
        // 		}
        // 	}
        // });
        return reports;
    },
});
