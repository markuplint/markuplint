import * as parser from '@markuplint/html-parser';
import { convertRuleset, getMessenger, MLCore } from './';

describe('standard verify', () => {
	it('<!doctype>', async () => {
		const sourceCode = `<div>text</div>`;
		const ruleset = convertRuleset({});
		const messenger = await getMessenger();
		const core = new MLCore(parser, sourceCode, ruleset, [], messenger);
	});
});
