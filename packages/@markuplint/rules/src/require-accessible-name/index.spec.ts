import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[require-accessible-name-valid-001] has accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<button>Label</button>');
	expect(violations.length).toBe(0);
});

test('[require-accessible-name-valid-002] has accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<button aria-label="Label"></button>');
	expect(violations.length).toBe(0);
});

test("[require-accessible-name-invalid-001] does'nt have accessible name", async () => {
	const { violations } = await mlRuleTest(rule, '<button></button>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			col: 1,
			line: 1,
			message: 'Require accessible name',
			raw: '<button>',
		},
	]);
});

test("[require-accessible-name-invalid-002] does'nt have accessible name", async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			col: 1,
			line: 1,
			message: 'Require accessible name',
			raw: '<input type="text">',
		},
	]);
});

test('[require-accessible-name-valid-003] has accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" aria-label="Label">');
	expect(violations.length).toBe(0);
});

test('[require-accessible-name-valid-004] has accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" id="foo"><label for="foo">Label</label>');
	expect(violations.length).toBe(0);
});

test("[require-accessible-name-invalid-003] does'nt have accessible name", async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" id="foo"><label for="foo2">Label</label>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			col: 1,
			line: 1,
			message: 'Require accessible name',
			raw: '<input type="text" id="foo">',
		},
	]);
});

test('[require-accessible-name-valid-005] has accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<label><input type="text">Label</label>');
	expect(violations.length).toBe(0);
});

test("[require-accessible-name-invalid-004] does'nt have accessible name", async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<button>
  <span></span>
  <span></span>
  <span></span>
</button>`,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			col: 1,
			line: 2,
			message: 'Require accessible name',
			raw: '<button>',
		},
	]);
});

test('[require-accessible-name-valid-006] has accessible name', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<button>
  <span class="visually-hidden">Menu</span>
  <span></span>
  <span></span>
  <span></span>
</button>`,
	);
	expect(violations.length).toBe(0);
});

test('[require-accessible-name-valid-007] needs no accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="stylesheet" href="path/to" />');
	expect(violations.length).toBe(0);
});

test("[require-accessible-name-invalid-005] does'nt have accessible name", async () => {
	const { violations: v1 } = await mlRuleTest(rule, '<form>text</form>', {
		rule: { options: { ariaVersion: '1.1' } },
	});
	expect(v1.length).toBe(0);
	const { violations: v2 } = await mlRuleTest(rule, '<form>text</form>', {
		rule: { options: { ariaVersion: '1.2' } },
	});
	expect(v2.length).toBe(0);
});

test('[require-accessible-name-invalid-006] The accessible name may be mutable', async () => {
	expect(
		(
			await mlRuleTest(rule, '<input type="text" aria-label={label} />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-invalid-007] The accessible name may be mutable', async () => {
	expect(
		(
			await mlRuleTest(rule, '<button>{label}</button>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-invalid-008] The accessible name may be mutable', async () => {
	expect(
		(
			await mlRuleTest(rule, '<button><span>{label}</span></button>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-invalid-009] The accessible name may be mutable', async () => {
	expect(
		(
			await mlRuleTest(rule, '<template><button>{{label}}</button></template>', {
				parser: {
					'.*': '@markuplint/vue-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-valid-008] has comment', async () => {
	expect((await mlRuleTest(rule, '<button>label<!-- comment --></button>')).violations).toStrictEqual([]);
});

test('[require-accessible-name-parser-001] The accessible name may be mutable (Svelte)', async () => {
	expect(
		(
			await mlRuleTest(rule, '<button>{label}</button>', {
				parser: {
					'.*': '@markuplint/svelte-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-invalid-010] The accessible name may be mutable', async () => {
	expect(
		(
			await mlRuleTest(rule, '<button><img alt={alt} /></button>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-invalid-011] The accessible name may be mutable', async () => {
	expect(
		(
			await mlRuleTest(rule, '<label><input type="text" /><span>{label}</span></label>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-invalid-012] The accessible name may be mutable', async () => {
	expect(
		(
			await mlRuleTest(rule, '<><label for="foo">{label}</label><input type="text" id="foo" /></>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-invalid-013] Pretenders Option', async () => {
	expect(
		(
			await mlRuleTest(rule, '<button><MyComponent/></button>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				pretenders: [
					{
						selector: 'MyComponent',
						as: {
							element: 'img',
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
			message: 'Require accessible name',
			raw: '<button>',
		},
	]);
	expect(
		(
			await mlRuleTest(rule, '<button><MyComponent/></button>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				pretenders: [
					{
						selector: 'MyComponent',
						as: {
							element: 'img',
							attrs: [
								{
									name: 'alt',
									value: 'some text',
								},
							],
						},
					},
				],
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<button><MyComponent/></button>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				pretenders: [
					{
						selector: 'MyComponent',
						as: {
							element: 'img',
							attrs: [
								{
									name: 'alt',
									value: '',
								},
							],
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
			message: 'Require accessible name',
			raw: '<button>',
		},
	]);
	expect(
		(
			await mlRuleTest(rule, '<button><MyComponent/></button>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				pretenders: [
					{
						selector: 'MyComponent',
						as: {
							element: 'img',
							aria: {
								name: true,
							},
						},
					},
				],
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<button><MyComponent label="accname"/></button>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				pretenders: [
					{
						selector: 'MyComponent',
						as: {
							element: 'img',
							aria: {
								name: {
									fromAttr: 'label',
								},
							},
						},
					},
				],
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<button><MyComponent label=""/></button>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				pretenders: [
					{
						selector: 'MyComponent',
						as: {
							element: 'img',
							aria: {
								name: {
									fromAttr: 'label',
								},
							},
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
			message: 'Require accessible name',
			raw: '<button>',
		},
	]);
});

test('[require-accessible-name-valid-009] The `as` attribute', async () => {
	expect((await mlRuleTest(rule, '<x-button as="button"></x-button>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'Require accessible name',
			raw: '<x-button as="button">',
		},
	]);
	expect((await mlRuleTest(rule, '<x-button as="button">Name</x-button>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<x-image as="img"></x-image>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'Require accessible name',
			raw: '<x-image as="img">',
		},
	]);
	expect((await mlRuleTest(rule, '<x-image as="img" alt=""></x-image>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<x-image as="img" alt="Name"></x-image>')).violations).toStrictEqual([]);
});

describe('Markdown parser', () => {
	test('[require-accessible-name-parser-002] email autolink in markdown should have accessible name from text content', async () => {
		const { violations } = await mlRuleTest(rule, 'user@example.com', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-parser-003] email autolink in list item should have accessible name', async () => {
		const { violations } = await mlRuleTest(rule, '- user@example.com or admin@example.org', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-parser-004] markdown link should have accessible name from text content', async () => {
		const { violations } = await mlRuleTest(rule, '[example](https://example.com)', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-parser-005] empty markdown link should NOT have accessible name', async () => {
		const { violations } = await mlRuleTest(rule, '[](https://example.com)', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations.length).toBe(1);
	});
});

describe('Issues', () => {
	// https://github.com/markuplint/markuplint/issues/536
	test('[require-accessible-name-issue-536] #536', async () => {
		expect(
			(await mlRuleTest(rule, '<h2 id="h">Heading</h2><div role="region" aria-labelledby="h">...</div>'))
				.violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					'<h2 id="h">Heading</h2><div role="region" aria-labelledby="h" aria-hidden="true">...</div>',
				)
			).violations,
		).toStrictEqual([]);
	});

	// https://github.com/markuplint/markuplint/issues/592
	test('[require-accessible-name-issue-592] #592', async () => {
		expect(
			(await mlRuleTest(rule, '<svg aria-label="i-have-name"><path /><rect><path /></rect></svg>')).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<svg role="img" aria-label="i-have-name"><path /><rect><path /></rect></svg>'))
				.violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					'<svg aria-label="i-have-name"><path aria-label="i-have-name" /><rect><path /></rect></svg>',
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					'<svg aria-label="i-have-name"><path aria-label="i-have-name" /><rect aria-label="i-have-name"><path /></rect></svg>',
				)
			).violations,
		).toStrictEqual([]);
	});

	// https://github.com/markuplint/markuplint/issues/658
	test('[require-accessible-name-issue-658] #658', async () => {
		// ARIA 1.3: dialog no longer requires an accessible name
		expect((await mlRuleTest(rule, '<dialog></dialog>')).violations.length).toBe(0);
		expect((await mlRuleTest(rule, '<div role="dialog"></div>')).violations.length).toBe(0);
	});

	test('[require-accessible-name-issue-1018] #1018', async () => {
		expect(
			(
				await mlRuleTest(rule, '<button><slot /></button>', {
					parser: {
						'.*': '@markuplint/svelte-parser',
					},
				})
			).violations.length,
		).toBe(0);
		expect(
			(
				await mlRuleTest(rule, '<button></button>', {
					parser: {
						'.*': '@markuplint/svelte-parser',
					},
				})
			).violations.length,
		).toBe(1);
	});

	test('[require-accessible-name-issue-1147] #1147', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
					<body>
						<label for="cheese">Do you like cheese?</label>
						<input type="checkbox" id="cheese">
						<% pp "anything" %>
					</body>
				`,
					{
						parser: {
							'.*': '@markuplint/erb-parser',
						},
					},
				)
			).violations,
		).toStrictEqual([]);
	});

	// https://github.com/markuplint/markuplint/issues/3283
	test('[require-accessible-name-issue-3283] #3283', async () => {
		// Implicit label with text only inside child elements
		expect((await mlRuleTest(rule, '<label><span>label</span> <input /></label>')).violations).toStrictEqual([]);

		// Explicit label with text only inside child elements
		expect(
			(await mlRuleTest(rule, '<label for="label"><span>label</span></label> <input id="label" />')).violations,
		).toStrictEqual([]);

		// These should still work (direct text nodes)
		expect((await mlRuleTest(rule, '<label>label <input /></label>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<label>label <span>label</span> <input /></label>')).violations).toStrictEqual(
			[],
		);
	});

	test('[require-accessible-name-issue-2394] #2394', async () => {
		expect(
			(
				await mlRuleTest(rule, '<MyComponent href="https://markuplint.dev/" />', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'MyComponent',
							as: {
								element: 'a',
								inheritAttrs: true,
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
				message: 'Require accessible name',
				raw: '<MyComponent href="https://markuplint.dev/" />',
			},
		]);

		expect(
			(
				await mlRuleTest(rule, '<MyComponent href="https://markuplint.dev/" />', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'MyComponent',
							as: {
								element: 'a',
								inheritAttrs: true,
							},
						},
					],
					nodeRule: [
						{
							selector: 'a',
							rule: false,
						},
					],
				})
			).violations,
		).toStrictEqual([]);

		expect(
			(
				await mlRuleTest(rule, '<MyComponent href="https://markuplint.dev/" />', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'MyComponent',
							as: {
								element: 'a',
								inheritAttrs: true,
							},
						},
					],
					nodeRule: [
						{
							selector: 'MyComponent',
							rule: true,
						},
					],
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<MyComponent href="https://markuplint.dev/" />',
			},
		]);

		expect(
			(
				await mlRuleTest(rule, '<MyComponent href="https://markuplint.dev/" />', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'MyComponent',
							as: {
								element: 'a',
								inheritAttrs: true,
							},
						},
					],
					nodeRule: [
						{
							selector: 'MyComponent',
							rule: false,
						},
					],
				})
			).violations,
		).toStrictEqual([]);
	});
});
