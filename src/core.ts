import Document from './dom/document';
import parser from './dom/parser';
import Messenger from './locale/messenger';
import { VerifiedResult } from './rule';
import Ruleset from './ruleset';

export default class Markuplint {
	public readonly rawHTML: string;
	public document: Document<null, {}>;
	public ruleset: Ruleset;
	public messenger: Messenger;

	constructor (html: string, ruleset: Ruleset, messenger: Messenger) {
		this.rawHTML = html;
		this.document = parser(html, ruleset);
		this.ruleset = ruleset;
		this.messenger = messenger;
	}

	public async verify  () {
		const reports = this.ruleset.verify(this.document, this.messenger);
		return reports;
	}

	public async fix  () {
		return this.ruleset.fix(this.document);
	}
}

