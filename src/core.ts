import parser, { Document } from './parser';
import { VerifiedResult } from './rule';
import Ruleset from './ruleset';

export default class Markuplint {
	public document: Document;
	public ruleset: Ruleset;
	public locale: string;

	constructor (html: string, ruleset: Ruleset, locale: string) {
		this.document = parser(html, ruleset.nodeRules);
		this.ruleset = ruleset;
		this.locale = locale;
	}

	public async verify  () {
		const reports = this.ruleset.verify(this.document, this.locale);
		return reports;
	}
}

