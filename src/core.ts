import parser, {
	Element,
	Node,
} from './parser';
import Rule, {
	VerifiedReport,
} from './rule';
import {
	PermittedContent,
	Ruleset,
} from './ruleset';

export function verify (html: string, ruleset: Ruleset, rules: Rule[]) {
	const nodeTree = parser(html);
	const reports: VerifiedReport[] = [];
	for (const rule of rules) {
		if (ruleset.rules[rule.name]) {
			reports.push(...rule.verify(nodeTree, ruleset));
		}
	}
	return reports;
}
