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
		const message = await messages(locale, `This value of {0} attribute is not permitted`, '"role"');
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
						} else if (permittedRoles[0] === 'Any') {
							// no error
						} else if (!nodeRule.roles.includes(role.trim().toLowerCase())) {
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
