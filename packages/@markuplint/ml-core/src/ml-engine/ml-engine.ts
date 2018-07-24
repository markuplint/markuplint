import { MLMarkupLanguageParser } from '@markuplint/ml-ast/';
import { Config } from '@markuplint/ml-config/';

import Messenger from '../locale/messenger';
import Document from '../ml-dom/document';
import Ruleset from '../ruleset/core';

export default class MLEngine {
	private _config: Config;

	constructor(config: Config) {
		this._config = config;
	}
}
