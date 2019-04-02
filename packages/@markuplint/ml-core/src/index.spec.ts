import * as parser from '@markuplint/html-parser';
import { MLCore, convertRuleset } from './';
import { Messenger } from '@markuplint/i18n';

describe('standard verify', () => {
	it('<!doctype>', async () => {
		const sourceCode = '<div>text</div>';
		const ruleset = convertRuleset({});
		const messenger = await Messenger.create({
			locale: 'en',
			keywords: {},
		});
		const core = new MLCore(parser, sourceCode, { specs: [] }, ruleset, [], messenger);
		core;
	});
});
