import * as parser from '@markuplint/html-parser';
import { LocaleSet, Messenger } from '@markuplint/i18n';
import { convertRuleset, MLCore } from './';

describe('standard verify', () => {
	it('<!doctype>', async () => {
		const sourceCode = `<div>text</div>`;
		const ruleset = convertRuleset({});
		const messenger = await Messenger.create({
			locale: 'en',
			keywords: {},
		});
		const core = new MLCore(parser, sourceCode, ruleset, [], messenger);
	});
});
