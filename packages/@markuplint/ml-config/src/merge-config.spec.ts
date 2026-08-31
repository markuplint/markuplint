import { describe, test, expect } from 'vitest';

import { mergeConfig, mergeRule } from './merge-config.js';

describe('mergeConfig', () => {
	test('empty + empty', () => {
		expect(mergeConfig({}, {})).toStrictEqual({});
	});

	test('extends is preserved when b is not provided', () => {
		const result = mergeConfig({ extends: 'base.json' });
		expect(result).toHaveProperty('extends');
	});

	test('extends is deleted when b is provided', () => {
		const result = mergeConfig({ extends: 'a.json' }, { extends: 'b.json' });
		expect(result).not.toHaveProperty('extends');
	});

	test('ruleCommonSettings shallow merge', () => {
		expect(
			mergeConfig(
				{ ruleCommonSettings: { ariaVersion: '1.2' } },
				// @ts-ignore -- test with partial config
				{ ruleCommonSettings: { ariaVersion: '1.3' } },
			),
		).toStrictEqual({
			// @ts-ignore
			ruleCommonSettings: { ariaVersion: '1.3' },
		});
	});

	test('excludeFiles concatenation with deduplication', () => {
		expect(mergeConfig({ excludeFiles: ['a.css'] }, { excludeFiles: ['a.css', 'b.js'] })).toStrictEqual({
			excludeFiles: ['a.css', 'b.js'],
		});
	});

	test('nodeRules concatenation', () => {
		expect(
			mergeConfig(
				{ nodeRules: [{ selector: '.a', rules: { rule1: true } }] },
				{ nodeRules: [{ selector: '.b', rules: { rule2: true } }] },
			),
		).toStrictEqual({
			nodeRules: [
				{ selector: '.a', rules: { rule1: true } },
				{ selector: '.b', rules: { rule2: true } },
			],
		});
	});

	test('childNodeRules concatenation', () => {
		expect(
			mergeConfig(
				{ childNodeRules: [{ selector: '.a', rules: { rule1: true } }] },
				{ childNodeRules: [{ selector: '.b', rules: { rule2: true } }] },
			),
		).toStrictEqual({
			childNodeRules: [
				{ selector: '.a', rules: { rule1: true } },
				{ selector: '.b', rules: { rule2: true } },
			],
		});
	});

	test('overrideMode right-side wins', () => {
		expect(mergeConfig({ overrideMode: 'merge' }, { overrideMode: 'reset' })).toStrictEqual({
			overrideMode: 'reset',
		});
	});

	test('overrideMode falls back to a', () => {
		expect(mergeConfig({ overrideMode: 'merge' }, {})).toStrictEqual({
			overrideMode: 'merge',
		});
	});

	test('overrides with disjoint keys', () => {
		expect(
			mergeConfig(
				{ overrides: { a: { rules: { rule1: true } } } },
				{ overrides: { b: { rules: { rule2: true } } } },
			),
		).toStrictEqual({
			overrides: {
				a: { rules: { rule1: true } },
				b: { rules: { rule2: true } },
			},
		});
	});

	test('rules preserved when only a has rules', () => {
		expect(mergeConfig({ rules: { rule1: true } }, {})).toStrictEqual({
			rules: { rule1: true },
		});
	});

	test('rules preserved when only b has rules', () => {
		expect(mergeConfig({}, { rules: { rule1: true } })).toStrictEqual({
			rules: { rule1: true },
		});
	});

	test('severity shallow merge', () => {
		expect(
			mergeConfig(
				// @ts-ignore -- test with partial config
				{ severity: { parseError: 'error' } },
				// @ts-ignore
				{ severity: { parseError: 'warning' } },
			),
		).toStrictEqual({
			// @ts-ignore
			severity: { parseError: 'warning' },
		});
	});

	test('severity shallow merge: deprecation independent of parseError', () => {
		expect(
			mergeConfig(
				{ severity: { parseError: 'error' } },
				// @ts-ignore -- test with partial config
				{ severity: { deprecation: 'off' } },
			),
		).toStrictEqual({
			severity: { parseError: 'error', deprecation: 'off' },
		});
	});

	test('parserOptions merge', () => {
		expect(
			mergeConfig(
				{ parserOptions: { ignoreFrontMatter: true } },
				// @ts-ignore -- test with partial config
				{ parserOptions: { authoredElementContent: 'flow' } },
			),
		).toStrictEqual({
			// @ts-ignore
			parserOptions: { ignoreFrontMatter: true, authoredElementContent: 'flow' },
		});
	});

	test('plugins + plugins', () => {
		expect(
			mergeConfig(
				{
					plugins: ['a', 'b', 'c'],
				},
				{
					plugins: ['c', 'b', 'd'],
				},
			),
		).toStrictEqual({
			plugins: [
				{
					name: 'a',
				},
				{
					name: 'b',
				},
				{
					name: 'c',
				},
				{
					name: 'd',
				},
			],
		});
	});

	test('plugins + plugins (with options)', () => {
		expect(
			mergeConfig(
				{
					plugins: ['a', 'b', { name: 'c', settings: { foo: 'foo', bar: 'bar' } }],
				},
				{
					plugins: ['c', 'b', 'd', { name: 'c', settings: { foo2: 'foo2', bar: 'bar2' } }],
				},
			),
		).toStrictEqual({
			plugins: [
				{
					name: 'a',
				},
				{
					name: 'b',
				},
				{
					name: 'c',
					settings: {
						bar: 'bar2',
						foo2: 'foo2',
					},
				},
				{
					name: 'd',
				},
			],
		});
	});

	test('parser + parser', () => {
		expect(
			mergeConfig(
				{
					parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
				},
				{
					parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
				},
			),
		).toStrictEqual({
			parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
		});
	});

	test('parser + parser (2)', () => {
		expect(
			mergeConfig(
				{
					parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
				},
				{
					parser: { '/\\.[jt]sx?$/i': '@markuplint/jsx-parser' },
				},
			),
		).toStrictEqual({
			parser: {
				'/\\.vue$/i': '@markuplint/vue-parser',
				'/\\.[jt]sx?$/i': '@markuplint/jsx-parser',
			},
		});
	});

	test('overrides + overrides', () => {
		expect(
			mergeConfig(
				{
					overrides: {
						a: {
							rules: {
								rule1: true,
							},
						},
					},
				},
				{
					overrides: {
						a: {
							rules: {
								rule1: false,
							},
						},
						b: {
							rules: {
								rule1: true,
							},
						},
					},
				},
			),
		).toStrictEqual({
			overrides: {
				a: {
					rules: {
						rule1: false,
					},
				},
				b: {
					rules: {
						rule1: true,
					},
				},
			},
		});
	});

	test('rules + rules', () => {
		expect(
			mergeConfig(
				{
					rules: {
						a: {
							options: {
								ruleA: true,
							},
						},
					},
				},
				{
					rules: {
						b: {
							options: {
								ruleB: true,
							},
						},
					},
				},
			),
		).toStrictEqual({
			rules: {
				a: {
					options: {
						ruleA: true,
					},
				},
				b: {
					options: {
						ruleB: true,
					},
				},
			},
		});
	});

	test('rules[rule].value + rules[rule].value', () => {
		expect(
			mergeConfig(
				{
					rules: {
						ruleA: true,
						ruleB: [],
					},
				},
				{
					rules: {
						ruleA: {
							options: {
								optionName: true,
							},
						},
						ruleB: {
							options: {
								optionName: true,
							},
						},
					},
				},
			),
		).toStrictEqual({
			rules: {
				ruleA: {
					value: true,
					options: {
						optionName: true,
					},
				},
				ruleB: {
					value: [],
					options: {
						optionName: true,
					},
				},
			},
		});
	});
});

describe('mergeRule', () => {
	test('a is undefined returns b (shorthand)', () => {
		expect(mergeRule(undefined, 'always')).toBe('always');
	});

	test('a is undefined returns b (config object)', () => {
		expect(mergeRule(undefined, { value: true, severity: 'error' })).toStrictEqual({
			value: true,
			severity: 'error',
		});
	});

	test('a is null returns b', () => {
		expect(mergeRule(null, true)).toBe(true);
	});

	test('{value: false} disables rule absolutely', () => {
		expect(mergeRule({ value: true, severity: 'error' }, { value: false })).toBe(false);
	});

	test('reason is overridden by b', () => {
		expect(mergeRule({ value: true, reason: 'old' }, { value: true, reason: 'new' })).toStrictEqual({
			value: true,
			reason: 'new',
		});
	});

	test('reason is preserved from a when b has no reason', () => {
		expect(mergeRule({ value: true, reason: 'base' }, { severity: 'warning' })).toStrictEqual({
			value: true,
			severity: 'warning',
			reason: 'base',
		});
	});

	test('full config merge with all fields', () => {
		expect(
			mergeRule(
				{
					severity: 'warning',
					value: 'always',
					options: { a: 1, b: 2 },
					reason: 'base reason',
				},
				{
					severity: 'error',
					value: 'never',
					options: { b: 3, c: 4 },
					reason: 'override reason',
				},
			),
		).toStrictEqual({
			severity: 'error',
			value: 'never',
			options: { a: 1, b: 3, c: 4 },
			reason: 'override reason',
		});
	});

	test('reasonOnly is overridden by b', () => {
		expect(
			mergeRule(
				{ value: true, reason: 'old', reasonOnly: false },
				{ value: true, reason: 'new', reasonOnly: true },
			),
		).toStrictEqual({
			value: true,
			reason: 'new',
			reasonOnly: true,
		});
	});

	test('reasonOnly is preserved from a when b has no reasonOnly', () => {
		expect(mergeRule({ value: true, reason: 'base', reasonOnly: true }, { severity: 'warning' })).toStrictEqual({
			value: true,
			severity: 'warning',
			reason: 'base',
			reasonOnly: true,
		});
	});

	test('reasonOnly: false in b overrides reasonOnly: true in a', () => {
		expect(
			mergeRule(
				{ value: true, reason: 'old', reasonOnly: true },
				{ value: true, reason: 'new', reasonOnly: false },
			),
		).toStrictEqual({
			value: true,
			reason: 'new',
			reasonOnly: false,
		});
	});

	test('{value} + shorthand', () => {
		expect(
			mergeRule(
				{
					value: true,
				},
				{},
			),
		).toStrictEqual({
			value: true,
		});
	});

	test('{value} + shorthand (2)', () => {
		expect(
			mergeRule(
				{
					value: true,
				},
				false,
			),
		).toStrictEqual(false);
	});

	test('{value} + shorthand (3)', () => {
		expect(
			mergeRule(
				{
					value: false,
				},
				true,
			),
		).toStrictEqual({
			value: true,
		});
	});

	test('{options} + {options}', () => {
		expect(
			mergeRule(
				{
					options: {
						optional: 'OPTIONAL_VALUE',
					},
				},
				{
					options: {
						optional: 'CHANGED_OPTIONAL_VALUE',
					},
				},
			),
		).toStrictEqual({
			options: {
				optional: 'CHANGED_OPTIONAL_VALUE',
			},
		});
	});

	test('{value} + empty', () => {
		expect(
			mergeRule(
				{
					value: [],
				},
				{},
			),
		).toStrictEqual({
			value: [],
		});
	});

	test('{value} + {options}', () => {
		expect(
			mergeRule(
				{
					value: [],
				},
				{
					options: {},
				},
			),
		).toStrictEqual({
			value: [],
			options: {},
		});
	});

	test('array value overrides instead of concatenating', () => {
		expect(mergeRule(['a', 'b'], ['c', 'd'])).toStrictEqual(['c', 'd']);
	});

	test('array value overrides when base is config object', () => {
		expect(
			mergeRule(
				{
					value: ['a', 'b'],
					severity: 'warning',
				},
				['c', 'd'],
			),
		).toStrictEqual({
			value: ['c', 'd'],
			severity: 'warning',
		});
	});

	test('shorthand value overrides config object value', () => {
		expect(
			mergeRule(
				{
					value: 'always',
					severity: 'error',
				},
				'never',
			),
		).toStrictEqual({
			value: 'never',
			severity: 'error',
		});
	});

	test('{options} shallow merged', () => {
		expect(
			mergeRule(
				{
					options: {
						a: 1,
						b: 2,
					},
				},
				{
					options: {
						b: 3,
						c: 4,
					},
				},
			),
		).toStrictEqual({
			options: {
				a: 1,
				b: 3,
				c: 4,
			},
		});
	});
});

describe('Pretenders', () => {
	test('both undefined returns no pretenders', () => {
		const result = mergeConfig({}, {});
		expect(result).not.toHaveProperty('pretenders');
	});

	test('imports is overridden by b', () => {
		expect(
			mergeConfig(
				{
					pretenders: {
						imports: ['a'],
					},
				},
				{
					pretenders: {
						imports: ['b'],
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				imports: ['b'],
			},
		});
	});

	test('data from one side only', () => {
		expect(
			mergeConfig(
				{
					pretenders: {
						files: ['x'],
					},
				},
				{
					pretenders: {
						data: [
							{
								selector: 'Comp',
								as: 'div',
							},
						],
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				files: ['x'],
				data: [
					{
						selector: 'Comp',
						as: 'div',
					},
				],
			},
		});
	});

	test('array pretenders merged with files config', () => {
		expect(
			mergeConfig(
				{
					pretenders: [
						{
							selector: 'MyComponent',
							as: 'div',
						},
					],
				},
				{
					pretenders: {
						files: ['./pretenders.json'],
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				files: ['./pretenders.json'],
				data: [
					{
						selector: 'MyComponent',
						as: 'div',
					},
				],
			},
		});
	});

	test('array pretenders preserved when b has undefined pretenders', () => {
		expect(
			mergeConfig(
				{
					pretenders: [
						{
							selector: 'MyComponent',
							as: 'div',
						},
					],
				},
				{
					pretenders: undefined,
				},
			),
		).toStrictEqual({
			pretenders: {
				data: [
					{
						selector: 'MyComponent',
						as: 'div',
					},
				],
			},
		});
	});

	test('data is appended, files is overridden', () => {
		expect(
			mergeConfig(
				{
					pretenders: [
						{
							selector: 'MyComponent',
							as: 'div',
						},
					],
				},
				{
					pretenders: {
						files: ['../pretenders.json'],
						data: [
							{
								selector: 'MyComponent2',
								as: 'section',
							},
						],
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				files: ['../pretenders.json'],
				data: [
					{
						selector: 'MyComponent',
						as: 'div',
					},
					{
						selector: 'MyComponent2',
						as: 'section',
					},
				],
			},
		});
	});

	test('files override', () => {
		expect(
			mergeConfig(
				{
					pretenders: {
						files: ['./base-pretenders.json'],
						data: [
							{
								selector: 'BaseComponent',
								as: 'span',
							},
						],
					},
				},
				{
					pretenders: {
						files: ['./override-pretenders.json'],
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				files: ['./override-pretenders.json'],
				data: [
					{
						selector: 'BaseComponent',
						as: 'span',
					},
				],
			},
		});
	});

	test('scan configs are concatenated', () => {
		expect(
			mergeConfig(
				{
					pretenders: {
						scan: [{ files: './src/**/*.vue' }],
					},
				},
				{
					pretenders: {
						scan: [{ files: './src/**/*.tsx', ignoreComponentNames: ['Internal'] }],
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				scan: [{ files: './src/**/*.vue' }, { files: './src/**/*.tsx', ignoreComponentNames: ['Internal'] }],
			},
		});
	});

	test('scan from one side only', () => {
		expect(
			mergeConfig(
				{
					pretenders: {
						data: [{ selector: 'Comp', as: 'div' }],
					},
				},
				{
					pretenders: {
						scan: [{ files: './src/**/*.vue' }],
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				data: [{ selector: 'Comp', as: 'div' }],
				scan: [{ files: './src/**/*.vue' }],
			},
		});
	});

	test('scan preserved when b has no scan', () => {
		expect(
			mergeConfig(
				{
					pretenders: {
						scan: [{ files: './src/**/*.vue' }],
					},
				},
				{
					pretenders: {
						data: [{ selector: 'Comp', as: 'div' }],
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				data: [{ selector: 'Comp', as: 'div' }],
				scan: [{ files: './src/**/*.vue' }],
			},
		});
	});

	test('auto: right side wins', () => {
		expect(
			mergeConfig(
				{
					pretenders: {
						auto: true,
					},
				},
				{
					pretenders: {
						auto: false,
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				auto: false,
			},
		});
	});

	test("auto: an omitted right side leaves the left side's value untouched", () => {
		expect(
			mergeConfig(
				{
					pretenders: {
						auto: true,
					},
				},
				{
					pretenders: {
						data: [{ selector: 'Comp', as: 'div' }],
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				auto: true,
				data: [{ selector: 'Comp', as: 'div' }],
			},
		});
	});

	test('auto is preserved when merging with array-form pretenders', () => {
		expect(
			mergeConfig(
				{
					pretenders: [{ selector: 'Comp', as: 'div' }],
				},
				{
					pretenders: {
						auto: true,
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				data: [{ selector: 'Comp', as: 'div' }],
				auto: true,
			},
		});
	});
});

describe('Named rule group merging', () => {
	test('named rule group preserved when only a has it', () => {
		const result = mergeConfig(
			{
				rules: {
					'a11y/id-duplication': {
						specConformance: 'normative',
						rules: { 'id-duplication': true },
					},
				},
			},
			{},
		);
		expect(result.rules).toStrictEqual({
			'a11y/id-duplication': {
				specConformance: 'normative',
				rules: { 'id-duplication': true },
			},
		});
	});

	test('same-name named rule group: right side wins', () => {
		const result = mergeConfig(
			{
				rules: {
					'a11y/id-duplication': {
						specConformance: 'normative',
						rules: { 'id-duplication': true },
					},
				},
			},
			{
				rules: {
					'a11y/id-duplication': {
						specConformance: 'non-normative',
						rules: { 'id-duplication': { severity: 'warning' } },
					},
				},
			},
		);
		expect(result.rules?.['a11y/id-duplication']).toStrictEqual({
			specConformance: 'non-normative',
			rules: { 'id-duplication': { severity: 'warning' } },
		});
	});

	test('named rule group disabled by false', () => {
		const result = mergeConfig(
			{
				rules: {
					'a11y/id-duplication': {
						specConformance: 'normative',
						rules: { 'id-duplication': true },
					},
				},
			},
			{
				rules: {
					'a11y/id-duplication': false,
				},
			},
		);
		expect(result.rules?.['a11y/id-duplication']).toBe(false);
	});

	describe('knownNamedRuleGroupKeys (issue #4023)', () => {
		test('records a key that was a genuine NamedRuleGroup before being disabled by false', () => {
			const result = mergeConfig(
				{
					rules: {
						'html-standard/no-unclosed-element-at-eof': {
							specConformance: 'normative',
							rules: { 'no-unclosed-element-at-eof': true },
						},
					},
				},
				{
					rules: {
						'html-standard/no-unclosed-element-at-eof': false,
					},
				},
			);
			expect(result.knownNamedRuleGroupKeys).toStrictEqual(['html-standard/no-unclosed-element-at-eof']);
		});

		test('does not record a key that was never a NamedRuleGroup, even when disabled by false', () => {
			const result = mergeConfig(
				{},
				{
					rules: {
						'totally/nonexistent': false,
					},
				},
			);
			expect(result.knownNamedRuleGroupKeys).toBeUndefined();
		});

		test('is absent from configs that never touch a named rule group', () => {
			const result = mergeConfig({ rules: { 'no-duplicate-id': true } }, { rules: { 'require-attr': false } });
			expect(result.knownNamedRuleGroupKeys).toBeUndefined();
		});

		test('carries over across an unrelated later merge step', () => {
			const disabledStep = mergeConfig(
				{
					rules: {
						'html-standard/no-unclosed-element-at-eof': {
							rules: { 'no-unclosed-element-at-eof': true },
						},
					},
				},
				{
					rules: {
						'html-standard/no-unclosed-element-at-eof': false,
					},
				},
			);
			// A further merge step (e.g. user overrides) that never touches the
			// already-collapsed `false` key must still carry the known-group record.
			const final = mergeConfig(disabledStep, {
				rules: { 'no-duplicate-id': true },
			});
			expect(final.rules?.['html-standard/no-unclosed-element-at-eof']).toBe(false);
			expect(final.knownNamedRuleGroupKeys).toStrictEqual(['html-standard/no-unclosed-element-at-eof']);
		});
	});

	test('named rule group severity overridden by object', () => {
		const result = mergeConfig(
			{
				rules: {
					'a11y/no-accesskey': {
						specConformance: 'non-normative',
						rules: { 'invalid-attr': { options: { disallowAttrs: ['accesskey'] } } },
					},
				},
			},
			{
				rules: {
					'a11y/no-accesskey': { severity: 'warning' },
				},
			},
		);
		// Partial override object merges into the existing NamedRuleGroup
		expect(result.rules?.['a11y/no-accesskey']).toStrictEqual({
			specConformance: 'non-normative',
			severity: 'warning',
			rules: { 'invalid-attr': { options: { disallowAttrs: ['accesskey'] } } },
		});
	});

	test('different-name named rule groups coexist', () => {
		const result = mergeConfig(
			{
				rules: {
					'a11y/id-duplication': {
						specConformance: 'normative',
						rules: { 'id-duplication': true },
					},
				},
			},
			{
				rules: {
					'html-standard/id-duplication': {
						specConformance: 'normative',
						rules: { 'id-duplication': true },
					},
				},
			},
		);
		expect(result.rules?.['a11y/id-duplication']).toStrictEqual({
			specConformance: 'normative',
			rules: { 'id-duplication': true },
		});
		expect(result.rules?.['html-standard/id-duplication']).toStrictEqual({
			specConformance: 'normative',
			rules: { 'id-duplication': true },
		});
	});

	test('regular rule and named rule group coexist', () => {
		const result = mergeConfig(
			{
				rules: {
					'wai-aria': true,
				},
			},
			{
				rules: {
					'a11y/wai-aria': {
						specConformance: 'normative',
						rules: { 'wai-aria': true },
					},
				},
			},
		);
		expect(result.rules?.['wai-aria']).toBe(true);
		expect(result.rules?.['a11y/wai-aria']).toStrictEqual({
			specConformance: 'normative',
			rules: { 'wai-aria': true },
		});
	});

	test('named rule group re-enabled after false', () => {
		const result = mergeConfig(
			{
				rules: {
					'a11y/id-duplication': false,
				},
			},
			{
				rules: {
					'a11y/id-duplication': {
						specConformance: 'normative',
						rules: { 'id-duplication': true },
					},
				},
			},
		);
		expect(result.rules?.['a11y/id-duplication']).toStrictEqual({
			specConformance: 'normative',
			rules: { 'id-duplication': true },
		});
	});

	test('named rule group first definition (undefined base)', () => {
		const result = mergeConfig(
			{},
			{
				rules: {
					'a11y/id-duplication': {
						specConformance: 'normative',
						rules: { 'id-duplication': true },
					},
				},
			},
		);
		expect(result.rules?.['a11y/id-duplication']).toStrictEqual({
			specConformance: 'normative',
			rules: { 'id-duplication': true },
		});
	});

	test('partial override only merges valid NamedRuleGroup keys', () => {
		const result = mergeConfig(
			{
				rules: {
					'a11y/no-accesskey': {
						specConformance: 'non-normative',
						rules: { 'invalid-attr': { options: { disallowAttrs: ['accesskey'] } } },
					},
				},
			},
			{
				rules: {
					'a11y/no-accesskey': { severity: 'warning', value: 'should-be-ignored' } as any,
				},
			},
		);
		const merged = result.rules?.['a11y/no-accesskey'];
		expect(merged).toStrictEqual({
			specConformance: 'non-normative',
			severity: 'warning',
			rules: { 'invalid-attr': { options: { disallowAttrs: ['accesskey'] } } },
		});
		// value should NOT be in the merged result
		expect(merged).not.toHaveProperty('value');
	});

	test('namespaced key with non-NamedRuleGroup value is optimized normally', () => {
		const result = mergeConfig(
			{},
			{
				rules: {
					'a11y/html-lang': 'warning',
				},
			},
		);
		expect(result.rules?.['a11y/html-lang']).toBe('warning');
	});
});
