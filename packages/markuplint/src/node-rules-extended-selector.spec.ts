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
	test.each([
		'div || span',
		'div:hover',
		'div:lang(en)',
		'div:nth-child(2)',
		'div:nth-last-child(2)',
		':not(div:hover)',
		':display-size(> a)',
		':aria(foo)',
		':role(button|9.9)',
		':model(foo)',
	])('%s is reported as the parse-error of the configuration', async selector => {
		const result = await execWithSelector(selector);
		expect(result?.violations.map(v => [v.ruleId, v.severity])).toStrictEqual([['parse-error', 'error']]);
		expect(result?.violations[0]?.message).toContain('in the configuration');
	});

	test('a selector the engine does not support is reported for a document that has no element it would meet', async () => {
		const engine = await MLEngine.fromCode('<span></span>', {
			name: 'a.html',
			noSearchConfig: true,
			config: { nodeRules: [{ selector: 'td:hover', rules: { 'require-attr': 'title' } }] },
		});
		const result = await engine.exec();
		expect(result?.violations.map(v => v.ruleId)).toStrictEqual(['parse-error']);
	});

	test('an unparsable selector of a pretender is reported as the parse-error of the configuration when it meets an element', async () => {
		const engine = await MLEngine.fromCode('<x-foo></x-foo>', {
			name: 'a.html',
			noSearchConfig: true,
			config: { pretenders: [{ selector: 'div[', as: { element: 'div' } }] },
		});
		const result = await engine.exec();
		expect(result?.violations.map(v => [v.ruleId, v.severity])).toStrictEqual([['parse-error', 'error']]);
		expect(result?.violations[0]?.message).toContain('in the configuration');
	});

	test('an unparsable selector of a pretender that has a file names that file', async () => {
		const engine = await MLEngine.fromCode('<x-foo></x-foo>', {
			name: 'a.html',
			noSearchConfig: true,
			config: { pretenders: [{ selector: 'div[', as: { element: 'div' }, filePath: 'src/Foo.tsx:3:1' }] },
		});
		const result = await engine.exec();
		expect(result?.violations.map(v => v.ruleId)).toStrictEqual(['parse-error']);
		// The merge of the configuration resolves a relative `filePath` against the working directory
		expect(result?.violations[0]?.message).toMatch(/ in \S*src[/\\]Foo\.tsx:3:1$/);
	});

	test('an unparsable selector of a pretender is reported by the check of the configuration when no element meets it', async () => {
		const engine = await MLEngine.fromCode('<div></div>', {
			name: 'a.html',
			noSearchConfig: true,
			config: { pretenders: [{ selector: 'div[', as: { element: 'div' } }] },
		});
		const result = await engine.exec();
		expect(result?.violations.map(v => v.ruleId)).toStrictEqual(['config-error']);
		expect(result?.violations[0]?.message).toContain('Invalid selector: "div["');
	});

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
