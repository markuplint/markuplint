import parser from './parser';
import { VerifiedResult } from './rule';
import Ruleset from './ruleset';

export async function verify (html: string, ruleset: Ruleset, locale: string) {
	if (!locale) {
		locale = '';
	}
	const nodeTree = parser(html);
	const reports = ruleset.verify(nodeTree, locale);
	return reports;
}
