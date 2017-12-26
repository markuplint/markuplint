import {
	Document,
} from '../../parser';
import Rule, {
	RuleConfig,
	VerifiedResult,
} from '../../rule';
import Ruleset from '../../ruleset';

export type DefaultValue = string;
export interface Options {}

export default class extends Rule<DefaultValue, Options> {
	public name = 'attr-spasing';

	public async verify (document: Document, config: RuleConfig<DefaultValue, Options>, ruleset: Ruleset) {
		const reports: VerifiedResult[] = [];
		// document.walk((node) => {});
		return reports;
	}
}
