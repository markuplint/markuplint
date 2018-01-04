import {
	Document,
} from '../../parser';
import Rule, {
	RuleConfig,
	VerifyReturn,
} from '../../rule';
import Ruleset from '../../ruleset';
import messages from '../messages';

export type DefaultValue = null;
export interface Options {}

export default class extends Rule<DefaultValue, Options> {
	public name = 'permitted-role';

	public async verify (document: Document, config: RuleConfig<DefaultValue, Options>, ruleset: Ruleset, locale: string) {
		const reports: VerifyReturn[] = [];
		const message = await messages(locale, `Values allowed for {0} attributes are {$}`, '"role"');
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
						if (!permittedRoles) {
							continue;
						}
						let isError = false;
						const permittedRolesStrings = [];
						roleCheckLoop:
						for (const permittedRole of permittedRoles) {
							if (typeof permittedRole === 'string') {
								permittedRolesStrings.push(permittedRole);
								if (permittedRole === 'None') {
									isError = true;
								} else if (permittedRoles[0] === 'Any') {
									isError = false;
									break;
								} else if (permittedRole === role.trim().toLowerCase()) {
									break;
								} else if (permittedRole !== role.trim().toLowerCase()) {
									isError = true;
								}
							} else {
								for (const attr of permittedRole.attrConditions) {
									const nodeAttrValue = node.getAttribute(attr.attrName);
									if (!nodeAttrValue) {
										continue;
									}
									for (const value of attr.values) {
										// tslint:disable-next-line:cyclomatic-complexity
										if (nodeAttrValue.value === value) {
											permittedRolesStrings.push(permittedRole.role);
											if (permittedRole.role === 'None') {
												isError = true;
											} else if (permittedRoles[0] === 'Any') {
												isError = false;
												break;
											} else if (permittedRole.role === role.trim().toLowerCase()) {
												console.log(`✅ ${node.raw} cheking role: "${permittedRole.role}", type: "${value}"`);
												isError = false;
												break roleCheckLoop;
											} else if (permittedRole.role !== role.trim().toLowerCase()) {
												console.log(`❌ ${node.raw} cheking role: "${permittedRole.role}", type: "${value}"`);
												isError = true;
											}
										}
									}
								}
							}
						}
						if (isError) {
							reports.push({
								level: config.level,
								message: message.replace('{$}', permittedRolesStrings.map((s) => `"${s}"`).join(', ')),
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
