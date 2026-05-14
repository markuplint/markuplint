import { mlRuleTest } from 'markuplint';
import { test, expect, describe } from 'vitest';

import rule from './index.js';

test('[required-attr-invalid-001] warns if specified attribute is not appeared', async () => {
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

test('[required-attr-invalid-002] multiple required attributes', async () => {
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

test('[required-attr-invalid-003] "alt" attribute on "<area>" is required only if the href attribute is used', async () => {
	expect((await mlRuleTest(rule, '<area href="path/to">')).violations.length).toBe(1);

	expect((await mlRuleTest(rule, '<area href="path/to" alt="alternate text">')).violations.length).toBe(0);
});

test('[required-attr-invalid-004] At least one of data and type must be defined to <object>.', async () => {
	expect((await mlRuleTest(rule, '<object data="https://example.com/data">')).violations.length).toBe(0);

	expect((await mlRuleTest(rule, '<object type="XXXX_YYYY_ZZZZ">')).violations.length).toBe(0);

	expect((await mlRuleTest(rule, '<object>')).violations.length).toBe(1);
});

test('[required-attr-invalid-005] The ancestors of the <source> element.', async () => {
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

test('[required-attr-valid-001] "srcset" attribute is required if "src" attribute is not used', async () => {
	expect((await mlRuleTest(rule, '<img srcset="path/to" />')).violations).toStrictEqual([]);
});

test('[required-attr-valid-002] "src" attribute is required if "srcset" attribute is not used', async () => {
	expect((await mlRuleTest(rule, '<img src="path/to" />')).violations).toStrictEqual([]);
});

test('[required-attr-invalid-006] with value requirement', async () => {
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
			message: 'The "img" element expects the "src" or the "srcset" attribute',
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
			message: 'The "img" element expects the "src" or the "srcset" attribute',
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

test('[required-attr-invalid-007] with value requirement (regex)', async () => {
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

test('[required-attr-invalid-008] nodeRules', async () => {
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

test('[required-attr-invalid-009] Foreign element', async () => {
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

test('[required-attr-invalid-010] svg', async () => {
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

test('[required-attr-parser-001] Pug', async () => {
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
			message: 'The "img" element expects the "src" or the "srcset" attribute',
			raw: 'img',
		},
	]);
});

test('[required-attr-parser-002] Vue', async () => {
	expect(
		(
			await mlRuleTest(rule, '<template><img :src="src"></template>', {
				parser: {
					'.*': '@markuplint/vue-parser',
				},
				specs: {
					'.*': '@markuplint/vue-spec',
				},
			})
		).violations.length,
	).toBe(0);
});

test('[required-attr-parser-003] React', async () => {
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
			message: 'The "img" element expects the "src" or the "srcset" attribute',
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

test('[required-attr-invalid-011] custom element', async () => {
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
			message: 'The "link" element expects the "itemprop" or the "rel" attribute',
			raw: '<Link href="path/to">',
		},
	]);
});

test('[required-attr-valid-003] The `as` attribute', async () => {
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
	test('[required-attr-issue-2223] #2223', async () => {
		const { violations } = await mlRuleTest(rule, '<meta httpEquiv="x-ua-compatible" content="ie=edge" />', {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			specs: {
				'.*': '@markuplint/react-spec',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[required-attr-issue-2455] #2455', async () => {
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

// https://html.spec.whatwg.org/multipage/semantics.html#the-link-element
// > One or both of the href or imagesrcset attributes must be present.
describe('link element requires href or imagesrcset (#717)', () => {
	test('[required-attr-issue-717-001] violation: link without href or imagesrcset', async () => {
		expect((await mlRuleTest(rule, '<link rel="stylesheet">')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "link" element expects the "href" or the "imagesrcset" attribute',
				raw: '<link rel="stylesheet">',
			},
		]);
	});

	test('[required-attr-issue-717-002] violation: bare link reports both href/imagesrcset and rel/itemprop violations', async () => {
		const { violations } = await mlRuleTest(rule, '<link>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "link" element expects the "href" or the "imagesrcset" attribute',
				raw: '<link>',
			},
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "link" element expects the "itemprop" or the "rel" attribute',
				raw: '<link>',
			},
		]);
	});

	test('[required-attr-issue-717-003] violation: itemprop path also requires href or imagesrcset', async () => {
		expect((await mlRuleTest(rule, '<link itemprop="url">')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "link" element expects the "href" or the "imagesrcset" attribute',
				raw: '<link itemprop="url">',
			},
		]);
	});

	test('[required-attr-issue-717-004] no violation: link with href', async () => {
		expect((await mlRuleTest(rule, '<link rel="stylesheet" href="./style.css">')).violations).toStrictEqual([]);
	});

	test('[required-attr-issue-717-005] no violation: link with imagesrcset satisfies "href or imagesrcset" requirement', async () => {
		expect(
			(await mlRuleTest(rule, '<link rel="preload" as="image" imagesrcset="/img.png 1x" imagesizes="100vw">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[required-attr-issue-717-006] no violation: link with both href and imagesrcset', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<link rel="preload" as="image" href="/img.png" imagesrcset="/img.png 1x" imagesizes="100vw">',
				)
			).violations,
		).toStrictEqual([]);
	});
});

describe('MDX parser', () => {
	test('[required-attr-parser-004] MDX img element requires alt attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="photo.png" />\n', {
			parser: {
				'.*': '@markuplint/mdx-parser',
			},
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
		expect(violations.length).toBe(1);
		expect(violations[0].message).toContain('alt');
	});

	test('[required-attr-parser-005] MDX img with alt passes required-attr', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="photo.png" alt="A photo" />\n', {
			parser: {
				'.*': '@markuplint/mdx-parser',
			},
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
		expect(violations.length).toBe(0);
	});
});

describe('Markdown parser', () => {
	test('[required-attr-parser-006] Markdown image with alt text passes required-attr for alt', async () => {
		const { violations } = await mlRuleTest(rule, '![alt text](img.png)\n', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
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
		expect(violations.length).toBe(0);
	});

	test('[required-attr-parser-007] Markdown image with empty alt passes required-attr (attribute exists)', async () => {
		const { violations } = await mlRuleTest(rule, '![](img.png)\n', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
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
		expect(violations.length).toBe(0);
	});

	test('[required-attr-parser-008] Markdown image missing required src reports correct position', async () => {
		const { violations } = await mlRuleTest(rule, 'Text\n\n![alt](img.png)\n', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
			nodeRule: [
				{
					selector: 'img',
					rule: {
						severity: 'error',
						value: ['src', 'alt', 'width'],
					},
				},
			],
		});
		expect(violations.length).toBe(1);
		expect(violations[0].line).toBe(3);
		expect(violations[0].col).toBe(1);
		expect(violations[0].raw).toBe('![alt](img.png)');
	});
});

describe('ignoreAttrs option (#690)', () => {
	test('[required-attr-issue-690-001] ignores spec-required attribute when listed in ignoreAttrs', async () => {
		// <area href="..."> requires "alt" per spec; ignoring it should suppress the violation
		const { violations } = await mlRuleTest(rule, '<area href="path/to">', {
			rule: {
				options: {
					ignoreAttrs: ['alt'],
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[required-attr-issue-690-002] still reports non-ignored spec-required attributes', async () => {
		const { violations } = await mlRuleTest(rule, '<img>', {
			nodeRule: [
				{
					selector: 'img',
					rule: {
						value: 'alt',
						options: {
							ignoreAttrs: ['src', 'srcset'],
						},
					},
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "img" element expects the "alt" attribute',
				raw: '<img>',
			},
		]);
	});

	test('[required-attr-issue-690-003] no option behaves the same as before (backward compatibility)', async () => {
		const { violations } = await mlRuleTest(rule, '<img>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "img" element expects the "src" or the "srcset" attribute',
				raw: '<img>',
			},
		]);
	});

	test('[required-attr-issue-690-004] empty ignoreAttrs behaves the same as no option', async () => {
		const { violations } = await mlRuleTest(rule, '<img>', {
			rule: {
				options: {
					ignoreAttrs: [],
				},
			},
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "img" element expects the "src" or the "srcset" attribute',
				raw: '<img>',
			},
		]);
	});

	test('[required-attr-issue-690-005] requiredEither: ignoring one candidate keeps the other required', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="stylesheet">', {
			rule: {
				options: {
					ignoreAttrs: ['href'],
				},
			},
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "link" element expects the "imagesrcset" attribute',
				raw: '<link rel="stylesheet">',
			},
		]);
	});

	test('[required-attr-issue-690-006] requiredEither: ignoring all candidates suppresses the violation', async () => {
		const { violations } = await mlRuleTest(rule, '<img>', {
			rule: {
				options: {
					ignoreAttrs: ['src', 'srcset'],
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[required-attr-issue-690-007] ignores custom required attribute specified via value', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/path/to/image.png">', {
			nodeRule: [
				{
					selector: 'img',
					rule: {
						value: ['alt', 'width'],
						options: {
							ignoreAttrs: ['width'],
						},
					},
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "img" element expects the "alt" attribute',
				raw: '<img src="/path/to/image.png">',
			},
		]);
	});

	test('[required-attr-issue-690-008] ignores value-constrained required attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/path/to/image.png">', {
			nodeRule: [
				{
					selector: 'img',
					rule: {
						value: [{ name: 'decoding', value: 'async' }, 'alt'],
						options: {
							ignoreAttrs: ['decoding'],
						},
					},
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "img" element expects the "alt" attribute',
				raw: '<img src="/path/to/image.png">',
			},
		]);
	});
});

test('[required-attr-valid-004] bdo requires dir attribute', async () => {
	expect((await mlRuleTest(rule, '<bdo>text</bdo>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "bdo" element expects the "dir" attribute',
			raw: '<bdo>',
		},
	]);
	expect((await mlRuleTest(rule, '<bdo dir="ltr">text</bdo>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<bdo dir="rtl">text</bdo>')).violations).toStrictEqual([]);
});

test('[required-attr-invalid-012] link rel=preload requires as attribute', async () => {
	// HTML LS link-type-preload: "The as attribute must be specified."
	// modulepreload makes `as` optional; the conditional `required` selector limits to preload.
	// Mirrors tests/external/validator/tests/html/assertions/link-preload-missing-as-novalid.html
	// — spec.link.jsonc edit must keep this fixture flipped to match-error.
	const { violations } = await mlRuleTest(rule, '<link rel="preload" href="style.css">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "link" element expects the "as" attribute',
			raw: '<link rel="preload" href="style.css">',
		},
	]);
});

test('[required-attr-valid-005] link rel=preload with as; modulepreload/unrelated rel without as', async () => {
	expect((await mlRuleTest(rule, '<link rel="preload" href="style.css" as="style">')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<link rel="modulepreload" href="m.js">')).violations).toStrictEqual([]);
	// guard: the conditional `required` must NOT bleed onto unrelated rel values
	expect((await mlRuleTest(rule, '<link rel="stylesheet" href="x.css">')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<link rel="icon" href="x.ico">')).violations).toStrictEqual([]);
});

test('[required-attr-invalid-013] link with multi-keyword rel containing preload still requires as', async () => {
	// HTML LS allows `rel` to be a token list. The `[rel~="preload" i]` selector matches when
	// preload appears anywhere in the list, so multi-keyword rel must still trigger required-as.
	const cases = [
		'<link rel="preload alternate" href="x.css">',
		'<link rel="alternate preload" href="x.css">',
		'<link rel="preload modulepreload" href="x">',
	];
	for (const src of cases) {
		const { violations } = await mlRuleTest(rule, src);
		expect(violations.some(v => v.message.includes('the "as" attribute'))).toBe(true);
	}
});

test('[required-attr-invalid-014] link rel preload match is case-insensitive', async () => {
	// The `i` flag on the attribute selector makes the keyword match case-insensitive.
	expect((await mlRuleTest(rule, '<link rel="PRELOAD" href="x.css">')).violations.length).toBeGreaterThan(0);
	expect((await mlRuleTest(rule, '<link rel="Preload" href="x.css">')).violations.length).toBeGreaterThan(0);
});

test('[required-attr-invalid-015] base must have href, target, or both (HTML LS §4.2.3)', async () => {
	// Mirrors html/elements/base/href-and-target-missing-novalid.html.
	// A bare `<base>` with neither href nor target violates the spec.
	const { violations } = await mlRuleTest(rule, '<base>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[required-attr-valid-006] base with only href is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<base href="/">');
	expect(violations).toStrictEqual([]);
});

test('[required-attr-valid-007] base with only target is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<base target="_blank">');
	expect(violations).toStrictEqual([]);
});

test('[required-attr-invalid-016] input[type=image] requires alt (HTML LS §4.10.5.1.18)', async () => {
	// Mirrors html/elements/input/image-without-alt-novalid.html.
	const { violations } = await mlRuleTest(rule, '<input type="image" src="button.png">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[required-attr-valid-008] input[type=image] with alt is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="image" src="button.png" alt="submit">');
	expect(violations).toStrictEqual([]);
});
