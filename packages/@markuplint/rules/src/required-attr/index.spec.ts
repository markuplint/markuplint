import { mlRuleTest } from 'markuplint';
import { test, expect, describe } from 'vitest';

import rule from './index.js';

test('warns if specified attribute is not appeared', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="/path/to/image.png">', {
		nodeRule: [
			{
				selector: 'img',
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
			message: 'The "img" element expects the "alt" attribute',
			raw: '<img src="/path/to/image.png">',
			severity: 'error',
		},
	]);
});

test('multiple required attributes', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="/path/to/image.png">', {
		nodeRule: [
			{
				selector: 'img',
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
			message: 'The "img" element expects the "width" attribute',
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
		},
		{
			severity: 'error',
			message: 'The "img" element expects the "height" attribute',
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
		},
		{
			severity: 'error',
			message: 'The "img" element expects the "alt" attribute',
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
		},
	]);
});

test('"alt" attribute on "<area>" is required only if the href attribute is used', async () => {
	expect((await mlRuleTest(rule, '<area href="path/to">')).violations.length).toBe(1);

	expect((await mlRuleTest(rule, '<area href="path/to" alt="alternate text">')).violations.length).toBe(0);
});

test('At least one of data and type must be defined to <object>.', async () => {
	expect((await mlRuleTest(rule, '<object data="https://example.com/data">')).violations.length).toBe(0);

	expect((await mlRuleTest(rule, '<object type="XXXX_YYYY_ZZZZ">')).violations.length).toBe(0);

	expect((await mlRuleTest(rule, '<object>')).violations.length).toBe(2);
});

test('The ancestors of the <source> element.', async () => {
	expect((await mlRuleTest(rule, '<audio><source></audio>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 8,
			message: 'The "source" element expects the "src" attribute',
			raw: '<source>',
		},
	]);

	expect((await mlRuleTest(rule, '<video><source></video>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 8,
			message: 'The "source" element expects the "src" attribute',
			raw: '<source>',
		},
	]);

	expect((await mlRuleTest(rule, '<picture><source></picture>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 10,
			message: 'The "source" element expects the "srcset" attribute',
			raw: '<source>',
		},
	]);
});

test('with value requirement', async () => {
	expect(
		(
			await mlRuleTest(rule, '<img />', {
				rule: [
					{
						name: 'decoding',
						value: 'async',
					},
				],
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "img" element expects the "src" attribute',
			raw: '<img />',
		},
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "img" element expects the "decoding" attribute',
			raw: '<img />',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<img decoding="sync" />', {
				rule: [
					{
						name: 'decoding',
						value: 'async',
					},
				],
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "img" element expects the "src" attribute',
			raw: '<img decoding="sync" />',
		},
		{
			severity: 'error',
			line: 1,
			col: 16,
			message: 'The "decoding" attribute expects "async"',
			raw: 'sync',
		},
	]);
});

test('with value requirement (regex)', async () => {
	expect(
		(
			await mlRuleTest(rule, '<img src="./path/to" /><img src="/path/to" />', {
				rule: [
					{
						name: 'src',
						value: '/^\\/|^https:\\/\\//i',
					},
				],
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 11,
			message: 'The "src" attribute expects "/^\\/|^https:\\/\\//i"',
			raw: './path/to',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<a rel="noreferrer noopener">link</a><a rel="noreferrernoopener">link2</a>', {
				rule: [
					{
						name: 'rel',
						value: '/(?<![^\\s]+)noreferrer(?![^\\s]+)/',
					},
				],
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 46,
			message: 'The "rel" attribute expects "/(?<![^\\s]+)noreferrer(?![^\\s]+)/"',
			raw: 'noreferrernoopener',
		},
	]);
});

test('nodeRules', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="path/to.svg" alt="text" />', {
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
			message: 'The "img" element expects the "role" attribute',
			raw: '<img src="path/to.svg" alt="text" />',
		},
	]);
});

test('Foreign element', async () => {
	expect(
		(
			await mlRuleTest(rule, '<svg></svg>', {
				nodeRule: [
					{
						selector: 'svg',
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
			message: 'The "svg" element expects the "viewBox" attribute',
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
			message: 'The "circle" element expects the "cx" attribute',
			raw: '<circle />',
		},
		{
			severity: 'error',
			line: 5,
			col: 6,
			message: 'The "circle" element expects the "cy" attribute',
			raw: '<circle />',
		},
		{
			severity: 'error',
			line: 5,
			col: 6,
			message: 'The "circle" element expects the "r" attribute',
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
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "img" element expects the "src" attribute',
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
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "img" element expects the "src" attribute',
			raw: '<img alt={alt} />',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<img {...props} />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('custom element', async () => {
	expect(
		(
			await mlRuleTest(rule, '<Link href="path/to"></Link>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations.length,
	).toBe(0);

	expect(
		(
			await mlRuleTest(rule, '<Link></Link>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				nodeRule: [
					{
						selector: 'Link',
						rule: ['href'],
					},
				],
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "Link" element expects the "href" attribute',
			raw: '<Link>',
		},
	]);

	expect((await mlRuleTest(rule, '<Link href="path/to"></Link>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "link" element expects the "itemprop" attribute',
			raw: '<Link href="path/to">',
		},
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "link" element expects the "rel" attribute',
			raw: '<Link href="path/to">',
		},
	]);
});

test('The `as` attribute', async () => {
	expect(
		(
			await mlRuleTest(rule, '<x-img as="img" src="/path/to/image.png"></x-img>', {
				nodeRule: [
					{
						selector: 'img',
						rule: {
							severity: 'error',
							value: 'alt',
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
			message: 'The "img" element expects the "alt" attribute',
			raw: '<x-img as="img" src="/path/to/image.png">',
		},
	]);

	expect((await mlRuleTest(rule, '<x-img as="img" src="/path/to/image.png"></x-img>')).violations).toStrictEqual([]);
});

describe('Issues', () => {
	test('#2223', async () => {
		const { violations } = await mlRuleTest(rule, '<meta httpEquiv="x-ua-compatible" content="ie=edge" />', {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('#2455', async () => {
		const sourceCode = `<picture>
  <source src="path/to" media="(query: value)">
  <source srcset="path/to" media="(query: value)">
  <source media="(query: value)">
  <img src="fallback" alt="text">
</picture>
<video>
  <source src="path/to">
  <source srcset="path/to">
  <source>
</video>
<audio>
  <source src="path/to">
  <source srcset="path/to">
  <source>
</audio>`;
		expect((await mlRuleTest(rule, sourceCode)).violations).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 3,
				message: 'The "source" element expects the "srcset" attribute',
				raw: '<source src="path/to" media="(query: value)">',
			},
			{
				severity: 'error',
				line: 4,
				col: 3,
				message: 'The "source" element expects the "srcset" attribute',
				raw: '<source media="(query: value)">',
			},
			{
				severity: 'error',
				line: 9,
				col: 3,
				message: 'The "source" element expects the "src" attribute',
				raw: '<source srcset="path/to">',
			},
			{
				severity: 'error',
				line: 10,
				col: 3,
				message: 'The "source" element expects the "src" attribute',
				raw: '<source>',
			},
			{
				severity: 'error',
				line: 14,
				col: 3,
				message: 'The "source" element expects the "src" attribute',
				raw: '<source srcset="path/to">',
			},
			{
				severity: 'error',
				line: 15,
				col: 3,
				message: 'The "source" element expects the "src" attribute',
				raw: '<source>',
			},
		]);
	});
});
