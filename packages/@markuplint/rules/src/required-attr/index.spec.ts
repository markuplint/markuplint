import { mlRuleTest } from 'markuplint';

import rule from './';

test('warns if specified attribute is not appeared', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="/path/to/image.png">', {
		rule: true,

		nodeRule: [
			{
				tagName: 'img',
				rule: {
					severity: 'error',
					value: 'alt',
				},
			},
		],
	});

	expect(violations).toStrictEqual([
		{
			col: 1,
			line: 1,
			message: 'The "alt" attribute expects the "img" element',
			raw: '<img src="/path/to/image.png">',
			severity: 'error',
		},
	]);
});

test('multiple required attributes', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="/path/to/image.png">', {
		rule: true,

		nodeRule: [
			{
				tagName: 'img',
				rule: {
					severity: 'error',
					value: ['width', 'height', 'alt'],
				},
			},
		],
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "alt" attribute expects the "img" element',
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
		},
		{
			severity: 'error',
			message: 'The "height" attribute expects the "img" element',
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
		},
		{
			severity: 'error',
			message: 'The "width" attribute expects the "img" element',
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
		},
	]);
});

test('"alt" attribute on "<area>" is required only if the href attribute is used', async () => {
	expect(
		(
			await mlRuleTest(rule, '<area href="path/to">', {
				rule: true,

				nodeRule: [],
			})
		).violations.length,
	).toBe(1);

	expect(
		(
			await mlRuleTest(rule, '<area href="path/to" alt="alternate text">', {
				rule: true,

				nodeRule: [],
			})
		).violations.length,
	).toBe(0);
});

test('At least one of data and type must be defined to <object>.', async () => {
	expect(
		(
			await mlRuleTest(rule, '<object data="https://example.com/data">', {
				rule: true,

				nodeRule: [],
			})
		).violations.length,
	).toBe(0);

	expect(
		(
			await mlRuleTest(rule, '<object type="XXXX_YYYY_ZZZZ">', {
				rule: true,

				nodeRule: [],
			})
		).violations.length,
	).toBe(0);

	expect(
		(
			await mlRuleTest(rule, '<object>', {
				rule: true,

				nodeRule: [],
			})
		).violations.length,
	).toBe(2);
});

test('The ancestors of the <source> element.', async () => {
	expect(
		(
			await mlRuleTest(rule, '<audio><source></audio>', {
				rule: true,

				nodeRule: [],
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 8,
			message: 'The "src" attribute expects the "source" element',
			raw: '<source>',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<video><source></video>', {
				rule: true,

				nodeRule: [],
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 8,
			message: 'The "src" attribute expects the "source" element',
			raw: '<source>',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<picture><source></picture>', {
				rule: true,

				nodeRule: [],
			})
		).violations,
	).toStrictEqual([]);
});

test('nodeRules', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="path/to.svg" alt="text" />', {
		rule: true,

		nodeRule: [
			{
				selector: 'img[src$=.svg]',
				rule: 'role',
			},
		],
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "role" attribute expects the "img" element',
			raw: '<img src="path/to.svg" alt="text" />',
		},
	]);
});

test('Foreign element', async () => {
	expect(
		(
			await mlRuleTest(rule, '<svg></svg>', {
				rule: true,

				nodeRule: [
					{
						tagName: 'svg',
						rule: {
							severity: 'error',
							value: 'viewBox',
						},
					},
				],
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "viewBox" attribute expects the "svg" element',
			raw: '<svg>',
		},
	]);
});

test('svg', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<svg>
					<circle cx="50" cy="50" r="40" />
					<circle cx="150" cy="50" r="4" />
					<circle cx="5" cy="5" r="4" />
					<circle />
				</svg>
				`,
				{
					rule: true,

					nodeRule: [
						{
							selector: 'circle',
							rule: ['cx', 'cy', 'r'],
						},
					],
				},
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 5,
			col: 6,
			message: 'The "cx" attribute expects the "circle" element',
			raw: '<circle />',
		},
		{
			severity: 'error',
			line: 5,
			col: 6,
			message: 'The "cy" attribute expects the "circle" element',
			raw: '<circle />',
		},
		{
			severity: 'error',
			line: 5,
			col: 6,
			message: 'The "r" attribute expects the "circle" element',
			raw: '<circle />',
		},
	]);
});

test('Pug', async () => {
	expect(
		(
			await mlRuleTest(rule, 'img', {
				parser: {
					'.*': '@markuplint/pug-parser',
				},
				rule: true,
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "src" attribute expects the "img" element',
			raw: 'img',
		},
	]);
});

test('Vue', async () => {
	expect(
		(
			await mlRuleTest(rule, '<template><img :src="src"></template>', {
				parser: {
					'.*': '@markuplint/vue-parser',
				},
				rule: true,
			})
		).violations.length,
	).toBe(0);
});

test('React', async () => {
	expect(
		(
			await mlRuleTest(rule, '<img alt={alt} />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rule: true,
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "src" attribute expects the "img" element',
			raw: '<img alt={alt} />',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<img {...props} />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rule: true,
			})
		).violations,
	).toStrictEqual([]);
});
