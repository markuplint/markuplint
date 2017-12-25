import parser, {
	Element,
	Node,
} from './parser';
import Rule, {
	CustomRule,
	VerifiedResult,
	VerifyReturn,
} from './rule';
import {
	PermittedContent,
	Ruleset,
} from './ruleset';

export async function verify (html: string, ruleset: Ruleset, rules: (Rule | CustomRule)[], locale: string) {
	if (!locale) {
		locale = '';
	}
	const nodeTree = parser(html);
	const reports: VerifiedResult[] = [];
	for (const rule of rules) {
		if (ruleset.rules && ruleset.rules[rule.name]) {
			const config = rule.optimizeOption(ruleset.rules[rule.name]);
			let results: VerifiedResult[];
			if (rule instanceof CustomRule) {
				results = await rule.verify(nodeTree, config, ruleset, locale);
			} else {
				const verifyReturns = await rule.verify(nodeTree, config, ruleset, locale);
				results = verifyReturns.map((v) => Object.assign(v, { ruleId: rule.name }));
			}
			reports.push(...results);
		}
	}
	return reports;
}
