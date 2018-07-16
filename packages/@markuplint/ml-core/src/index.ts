import { MLMarkupLanguageParser } from '@markuplint/ml-ast';

import Messenger from './locale/messenger';
import MLDOMDocument from './ml-dom/document';
import Ruleset from './ruleset/core';

export default class Markuplint {
	public document: MLDOMDocument;
	public ruleset: Ruleset;
	public messenger: Messenger;

	constructor(parser: MLMarkupLanguageParser, sourceCode: string, ruleset: Ruleset, messenger: Messenger) {
		const ast = parser(sourceCode);
		this.document = new MLDOMDocument(ast, ruleset);
		this.ruleset = ruleset;
		this.messenger = messenger;
	}

	public async verify() {
		const reports = this.ruleset.verify(this.document, this.messenger);
		return reports;
	}

	public async fix() {
		return this.ruleset.fix(this.document);
	}
}
