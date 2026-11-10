import { describe, test, expect } from 'vitest';

import { MLEngine } from './api/index.js';
import { setGlobal } from './global-settings.js';
import { mlTest } from './testing-tool/index.js';

setGlobal({
	locale: 'en',
});

async function execWithSelector(selector: string) {
	const engine = await MLEngine.fromCode('<div></div><span></span>', {
		name: 'a.html',
		noSearchConfig: true,
		config: {
			nodeRules: [
				{ selector, rules: { 'require-attr': 'title' } },
				{ selector: 'span', rules: { 'require-attr': 'title' } },
			],
		},
	});
	return engine.exec();
}

describe('nodeRules selector with an extended pseudo-class', () => {
	test('applies the rule to the elements :model() matches, after the config validation has parsed the selector', async () => {
		const { violations } = await mlTest('<a href="/">link</a><a>placeholder</a>', {
			nodeRules: [
				{
					selector: ':model(interactive)',
					rules: {
						'require-attr': 'title',
					},
				},
			],
		});
		expect(violations.map(v => [v.ruleId, v.line, v.col, v.raw])).toStrictEqual([
			['require-attr', 1, 1, '<a href="/">'],
		]);
	});
});

describe('nodeRules selector that the selector engine does not support', () => {
	test.each(['& div', ':is(&)'])(
		'%s is reported as the parse-error of the configuration, as an unparsable selector is',
		async selector => {
			const result = await execWithSelector(selector);
			expect(result?.violations.map(v => [v.ruleId, v.severity])).toStrictEqual([['parse-error', 'error']]);
			expect(result?.violations[0]?.message).toContain('in the configuration');
		},
	);

	test('an unparsable selector is reported the same way, so the file is not linted with the rest of nodeRules', async () => {
		const result = await execWithSelector('div[');
		expect(result?.violations.map(v => [v.ruleId, v.severity])).toStrictEqual([['parse-error', 'error']]);
		expect(result?.violations[0]?.message).toContain('in the configuration');
	});
});
