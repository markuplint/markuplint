import * as parser from '@markuplint/html-parser';
import { MLCore, convertRuleset } from './';
import { I18n } from '@markuplint/i18n';

describe('standard verify', () => {
	it('<!doctype>', async () => {
		const sourceCode = '<div>text</div>';
		const ruleset = convertRuleset({});
		const i18n = await I18n.create({
			locale: 'en',
			keywords: {},
		});
		const core = new MLCore(parser, sourceCode, ruleset, [], i18n);
		core;
	});
});
