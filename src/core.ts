import parser, {
	Element,
	Node,
} from './parser';
import Rule, {
	VerifiedResult,
	VerifyReturn,
} from './rule';
import {
	PermittedContent,
	Ruleset,
} from './ruleset';

export async function verify (html: string, ruleset: Ruleset, rules: Rule[], locale: string) {
	if (!locale) {
		locale = '';
	}
	const nodeTree = parser(html);
	const reports: VerifiedResult[] = [];
	for (const rule of rules) {
		if (ruleset.rules && ruleset.rules[rule.name]) {
			const config = rule.optimizeOption(ruleset.rules[rule.name]);
			const verifyReturns = await rule.verify(nodeTree, config, ruleset, locale);
			const results: VerifiedResult[] = verifyReturns.map((v) => Object.assign(v, { ruleId: rule.name }));
			reports.push(...results);
		}
	}
	return reports;
}
