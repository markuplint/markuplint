import { MLMarkupLanguageParser } from '@markuplint/ml-ast';

import Messenger from './locale/messenger';
import MLDOM from './ml-dom';
import Ruleset from './ruleset/core';

export default class Markuplint {
	public document: MLDOM.Document;
	public ruleset: Ruleset;
	public messenger: Messenger;

	constructor(parser: MLMarkupLanguageParser, sourceCode: string, ruleset: Ruleset, messenger: Messenger) {
		const ast = parser(sourceCode);
		this.document = MLDOM.generate(ast, ruleset);
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
