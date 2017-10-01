import parser from './parser';
import Rule from './rule';
import {
	Ruleset,
} from './ruleset';

export function verify (html: string, ruleset: Ruleset, rules: Rule[]) {
	const nodeTree = parser(html);
	const reports: string[] = [];
	if (ruleset && ruleset.rules && ruleset.rules.require) {
		for (const require in ruleset.rules.require) {
			let isExist = false;
			nodeTree.walk((n) => {
				if (n.nodeName === require) {
					isExist = true;
				}
			});
			if (!isExist) {
				reports.push(`${require} is reqired.`)
			}
		}
	}
	return reports;
}
