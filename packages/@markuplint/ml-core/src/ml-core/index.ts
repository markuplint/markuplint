import { MLMarkupLanguageParser } from '@markuplint/ml-ast/';
import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config/';

import Messenger from '../locale/messenger';
import Document from '../ml-dom/document';
import Ruleset from '../ruleset/core';

export default class MLCore {
	public document: Document<RuleConfigValue, RuleConfigOptions>;
	public ruleset: Ruleset;
	public messenger: Messenger;

	constructor(parser: MLMarkupLanguageParser, sourceCode: string, ruleset: Ruleset, messenger: Messenger) {
		const ast = parser(sourceCode);
		this.document = new Document(ast, ruleset);
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
