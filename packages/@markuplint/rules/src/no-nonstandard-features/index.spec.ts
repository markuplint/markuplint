import { fileURLToPath } from 'node:url';

import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('non-standard elements/attributes', () => {
	test('[no-nonstandard-features-001] warns about non-standard attributes', async () => {
		// "moz-opaque" on canvas is nonStandard in spec data
		const { violations } = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: true,
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('"moz-opaque"');
		expect(violations[0]?.message).toContain('non-standard');
	});
});

describe('ignoreFeatures', () => {
	test('[no-nonstandard-features-002] ignore attribute by pattern', async () => {
		const { violations } = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: {
				options: {
					ignoreFeatures: ['canvas[moz-opaque]'],
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('default severity', () => {
	test('[no-nonstandard-features-003] severity is warning by default', async () => {
		const { violations } = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: true,
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.severity).toBe('warning');
	});
});

describe('attribute name case', () => {
	const message = 'The "MOZ-OPAQUE" attribute is non-standard';

	test('[no-nonstandard-features-004] HTML: an attribute written in upper case is the non-standard one', async () => {
		const { violations } = await mlRuleTest(rule, '<canvas MOZ-OPAQUE></canvas>', { rule: true });
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'MOZ-OPAQUE',
				message,
			},
		]);
	});

	test('[no-nonstandard-features-005] HTML: ignoreFeatures keys match in any spelling', async () => {
		const attrUpper = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: { options: { ignoreFeatures: ['canvas[MOZ-OPAQUE]'] } },
		});
		expect(attrUpper.violations).toStrictEqual([]);
		const elementUpper = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: { options: { ignoreFeatures: ['CANVAS[moz-opaque]'] } },
		});
		expect(elementUpper.violations).toStrictEqual([]);
		const sourceUpper = await mlRuleTest(rule, '<CANVAS MOZ-OPAQUE></CANVAS>', {
			rule: { options: { ignoreFeatures: ['canvas[moz-opaque]'] } },
		});
		expect(sourceUpper.violations).toStrictEqual([]);
		const control = await mlRuleTest(rule, '<canvas MOZ-OPAQUE></canvas>', {
			rule: { options: { ignoreFeatures: ['canvas[other]'] } },
		});
		expect(control.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'MOZ-OPAQUE',
				message,
			},
		]);
	});

	test('[no-nonstandard-features-006] HTML: the ignoreFeatures of an element replaces that of the rule, each element keeping its own', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<canvas class="a" MOZ-OPAQUE></canvas><canvas class="b" MOZ-OPAQUE></canvas><canvas class="c" MOZ-OPAQUE></canvas>',
			{
				rule: { options: { ignoreFeatures: ['canvas[moz-opaque]'] } },
				nodeRule: [
					{
						selector: '.b',
						rule: { options: { ignoreFeatures: [] } },
					},
					{
						selector: '.c',
						rule: { options: { ignoreFeatures: ['CANVAS[Moz-Opaque]'] } },
					},
				],
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 57,
				raw: 'MOZ-OPAQUE',
				message,
			},
		]);
	});

	test('[no-nonstandard-features-007] Svelte: the element part is exact and the attribute part folds', async () => {
		const parser = { '.*': '@markuplint/svelte-parser' };
		const elementUpper = await mlRuleTest(rule, '<canvas MOZ-OPAQUE></canvas>', {
			parser,
			rule: { options: { ignoreFeatures: ['CANVAS[moz-opaque]'] } },
		});
		expect(elementUpper.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'MOZ-OPAQUE',
				message,
			},
		]);
		const attrUpper = await mlRuleTest(rule, '<canvas MOZ-OPAQUE></canvas>', {
			parser,
			rule: { options: { ignoreFeatures: ['canvas[Moz-Opaque]'] } },
		});
		expect(attrUpper.violations).toStrictEqual([]);
	});

	test('[no-nonstandard-features-008] JSX: an HTML element folds the attribute names', async () => {
		const parser = { '.*': '@markuplint/jsx-parser' };
		const reported = await mlRuleTest(rule, '<canvas MOZ-OPAQUE />', { parser, rule: true });
		expect(reported.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'MOZ-OPAQUE',
				message,
			},
		]);
		const ignored = await mlRuleTest(rule, '<canvas MOZ-OPAQUE />', {
			parser,
			rule: { options: { ignoreFeatures: ['canvas[moz-opaque]'] } },
		});
		expect(ignored.violations).toStrictEqual([]);
	});
});

describe('SVG and MathML', () => {
	const svgImage = '<svg><image href="a.png" fetchpriority="high"></image></svg>';
	const mathTable = '<math><mtable columnalign="left"><mtr><mtd></mtd></mtr></mtable></math>';

	test('[no-nonstandard-features-009] SVG: an attribute that the data flags non-standard is reported', async () => {
		const { violations } = await mlRuleTest(rule, svgImage, { rule: true });
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 26,
				raw: 'fetchpriority',
				message: 'The "fetchpriority" attribute is non-standard',
			},
		]);
	});

	test('[no-nonstandard-features-010] MathML: an attribute that the data flags non-standard is reported', async () => {
		const { violations } = await mlRuleTest(rule, mathTable, { rule: true });
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 15,
				raw: 'columnalign',
				message: 'The "columnalign" attribute is non-standard',
			},
		]);
	});

	test('[no-nonstandard-features-011] MathML: an element that the data flags non-standard is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<math><mfenced></mfenced></math>', { rule: true });
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 7,
				raw: '<mfenced>',
				message: 'The "mfenced" element is non-standard',
			},
		]);
	});

	test('[no-nonstandard-features-012] a standard feature of SVG and MathML is not reported', async () => {
		const svg = await mlRuleTest(rule, '<svg><image href="a.png" width="10"></image></svg>', { rule: true });
		expect(svg.violations).toStrictEqual([]);
		const math = await mlRuleTest(rule, '<math><mi mathvariant="normal">x</mi></math>', { rule: true });
		expect(math.violations).toStrictEqual([]);
	});

	test('[no-nonstandard-features-013] SVG: ignoreFeatures names the attribute by the local name of the element', async () => {
		const ignored = await mlRuleTest(rule, svgImage, {
			rule: { options: { ignoreFeatures: ['image[fetchpriority]'] } },
		});
		expect(ignored.violations).toStrictEqual([]);
		const other = await mlRuleTest(rule, svgImage, {
			rule: { options: { ignoreFeatures: ['image[decoding]'] } },
		});
		expect(other.violations.map(v => v.raw)).toStrictEqual(['fetchpriority']);
	});

	test('[no-nonstandard-features-014] MathML: ignoreFeatures names the element by its local name', async () => {
		const ignored = await mlRuleTest(rule, '<math><mfenced></mfenced></math>', {
			rule: { options: { ignoreFeatures: ['mfenced'] } },
		});
		expect(ignored.violations).toStrictEqual([]);
	});

	test('[no-nonstandard-features-015] MathML: ignoreFeatures names the attribute by the local name of the element', async () => {
		const ignored = await mlRuleTest(rule, mathTable, {
			rule: { options: { ignoreFeatures: ['mtable[columnalign]'] } },
		});
		expect(ignored.violations).toStrictEqual([]);
		const other = await mlRuleTest(rule, mathTable, {
			rule: { options: { ignoreFeatures: ['mtable[rowalign]'] } },
		});
		expect(other.violations.map(v => v.raw)).toStrictEqual(['columnalign']);
	});

	test('[no-nonstandard-features-016] a name of ignoreFeatures covers the element of that name in every namespace', async () => {
		// `interestfor` is non-standard on both the HTML `a` and the SVG `a`.
		const html = '<a href="#x" interestfor="y"></a><svg><a href="#x" interestfor="y"></a></svg>';
		const reported = await mlRuleTest(rule, html, { rule: true });
		expect(reported.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 14,
				raw: 'interestfor',
				message: 'The "interestfor" attribute is non-standard',
			},
			{
				severity: 'warning',
				line: 1,
				col: 52,
				raw: 'interestfor',
				message: 'The "interestfor" attribute is non-standard',
			},
		]);
		const ignored = await mlRuleTest(rule, html, {
			rule: { options: { ignoreFeatures: ['a[interestfor]'] } },
		});
		expect(ignored.violations).toStrictEqual([]);
	});

	test('[no-nonstandard-features-017] ignoreFeatures of a nodeRule applies to an SVG or MathML element it selects', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<math><mfenced class="a"></mfenced><mfenced class="b"></mfenced></math>',
			{
				rule: true,
				nodeRule: [{ selector: '.b', rule: { options: { ignoreFeatures: ['mfenced'] } } }],
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 7,
				raw: '<mfenced class="a">',
				message: 'The "mfenced" element is non-standard',
			},
		]);
	});

	test('[no-nonstandard-features-018] an authored element in MathML is reported when a pretender makes it stand for a flagged element, and not otherwise', async () => {
		const parser = { '.*': '@markuplint/jsx-parser' };
		const pretended = await mlRuleTest(rule, '<math><Formula /></math>', {
			parser,
			pretenders: [{ selector: 'Formula', as: 'mfenced' }],
			rule: true,
		});
		expect(pretended.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 7,
				raw: '<Formula />',
				message: 'The "mfenced" element is non-standard',
			},
		]);
		const plain = await mlRuleTest(rule, '<math><Formula /></math>', { parser, rule: true });
		expect(plain.violations).toStrictEqual([]);
	});
});

// The bundled spec data has no element or attribute with the flag that the tests below need,
// so they pass a spec of their own.
const specs = { '.*': fileURLToPath(new URL('flagged-fixture.mjs', import.meta.url)) };

test('[no-nonstandard-features-019] an SVG element that the spec flags non-standard is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<svg><circle></circle></svg>', { rule: true, specs });
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: '<circle>',
			message: 'The "circle" element is non-standard',
		},
	]);
});

test('[no-nonstandard-features-020] an attribute that BCD has and no specification defines (BCD-derived: bumping BCD can change this)', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="/" hreftranslate="true">A</a>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 13,
			raw: 'hreftranslate',
			message: 'The "hreftranslate" attribute is non-standard',
		},
	]);
});

test('[no-nonstandard-features-021] the attributes that BCD has on SVG elements and no specification defines for them', async () => {
	// BCD-derived: SVG 2 gives `defs` and `pattern` no conditional processing attributes
	const svg =
		'<svg xmlns="http://www.w3.org/2000/svg"><defs systemLanguage="ja"></defs><pattern systemLanguage="ja"></pattern></svg>';
	const { violations } = await mlRuleTest(rule, svg);
	expect(violations.map(v => v.raw)).toStrictEqual(['systemLanguage', 'systemLanguage']);
});

test('[no-nonstandard-features-022] SVG: `async` and `defer` of `script` that no specification defines for it (SVG 2 lists `type`, `href` and `crossorigin`; BCD cites the HTML definition)', async () => {
	const { violations } = await mlRuleTest(rule, '<svg><script async defer href="a.js"></script></svg>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 14,
			raw: 'async',
			message: 'The "async" attribute is non-standard',
		},
		{
			severity: 'warning',
			line: 1,
			col: 20,
			raw: 'defer',
			message: 'The "defer" attribute is non-standard',
		},
	]);
});

test('[no-nonstandard-features-023] HTML: `async` and `defer` of `script` are standard', async () => {
	const { violations } = await mlRuleTest(rule, '<script async defer src="a.js"></script>');
	expect(violations).toStrictEqual([]);
});

test('[no-nonstandard-features-024] HTML: `switch` of `input` and `for` of `template` are standard', async () => {
	// https://html.spec.whatwg.org/multipage/input.html#attr-input-switch
	// https://html.spec.whatwg.org/multipage/scripting.html#attr-template-for
	const html = '<input type="checkbox" switch><template for="a"></template>';
	const { violations } = await mlRuleTest(rule, html);
	expect(violations).toStrictEqual([]);
});

test('[no-nonstandard-features-025] customelementregistry is not non-standard', async () => {
	// The HTML Standard defines the attribute and BCD has no entry for it, so it takes no flag.
	// @see https://html.spec.whatwg.org/multipage/custom-elements.html#the-customelementregistry-attribute
	const { violations } = await mlRuleTest(rule, '<div customelementregistry></div>');
	expect(violations).toStrictEqual([]);
});
