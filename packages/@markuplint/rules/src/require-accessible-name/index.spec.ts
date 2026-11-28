import type { Pretender, PretenderAttr } from '@markuplint/ml-config';

import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

describe('the name is looked for in the tree of the element', () => {
	test('[require-accessible-name-001] a label of another tree does not name the control', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<label for="x">L</label><template><input id="x" type="text"></template>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 35,
				message: 'Require accessible name',
				raw: '<input id="x" type="text">',
			},
		]);
	});

	test('[require-accessible-name-002] a label of the same template names the control', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><label for="x">L</label><input id="x" type="text"></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-003] a label names the control when the references are the same after the character references are resolved', async () => {
		const { violations } = await mlRuleTest(rule, '<label for="&#120;">L</label><input id="x" type="text">');
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-004] a label that wraps a template does not name the control in its content', async () => {
		const { violations } = await mlRuleTest(rule, '<label>L<template><input type="text"></template></label>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 19,
				message: 'Require accessible name',
				raw: '<input type="text">',
			},
		]);
	});

	test('[require-accessible-name-005] a label in the content of a template names the control in the content', async () => {
		const { violations } = await mlRuleTest(rule, '<template><label>L<input type="text"></label></template>');
		expect(violations).toStrictEqual([]);
	});
});

describe('the element is hidden by the ancestors in the tree of the element', () => {
	test('[require-accessible-name-006] aria-hidden outside of the content of a template does not hide it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div aria-hidden="true"><template><button></button></template></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 35,
				message: 'Require accessible name',
				raw: '<button>',
			},
		]);
	});

	test('[require-accessible-name-007] aria-hidden of the host hides the content of a declarative shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div aria-hidden="true"><template shadowrootmode="open"><button></button></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-008] aria-hidden in the content of a template hides the element in it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div aria-hidden="true"><button></button></div></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-009] hidden outside of the content of a template does not hide it', async () => {
		const { violations } = await mlRuleTest(rule, '<div hidden><template><button></button></template></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 23,
				message: 'Require accessible name',
				raw: '<button>',
			},
		]);
	});

	test('[require-accessible-name-010] hidden of the host hides the content of a declarative shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div hidden><template shadowrootmode="open"><button></button></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-011] an ancestor with presentational children outside of the content of a template does not exclude it', async () => {
		const { violations } = await mlRuleTest(rule, '<button>x<template><a href="#"></a></template></button>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 20,
				message: 'Require accessible name',
				raw: '<a href="#">',
			},
		]);
	});

	test('[require-accessible-name-012] an ancestor with presentational children excludes the content of a declarative shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="img" aria-label="x"><template shadowrootmode="open"><a href="#"></a></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('the content of a template is not the name of the element that holds it', () => {
	test('[require-accessible-name-013] an ordinary template contributes nothing, and a declarative shadow root keeps the name of the control in it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			[
				'<button><template>Save</template></button>',
				'<button><template><span>Save</span></template></button>',
				'<div><template shadowrootmode="open"><button>Save</button></template></div>',
				'<button>Save</button>',
				'<button></button>',
			].join('\n'),
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<button>',
			},
			{
				severity: 'error',
				line: 2,
				col: 1,
				message: 'Require accessible name',
				raw: '<button>',
			},
			{
				severity: 'error',
				line: 5,
				col: 1,
				message: 'Require accessible name',
				raw: '<button>',
			},
		]);
	});

	test('[require-accessible-name-014] the content of a declarative shadow root names the host', async () => {
		expect(
			(await mlRuleTest(rule, '<div role="button"><template shadowrootmode="open">Save</template></div>'))
				.violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<div role="button"><template shadowrootmode="closed">Save</template></div>'))
				.violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-015] an ordinary template does not name the host', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="button"><template>Save</template></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<div role="button">',
			},
		]);
	});

	test('[require-accessible-name-016] unknown content inside an ordinary template is not the name', async () => {
		const { violations } = await mlRuleTest(rule, '<button><template><Icon /></template></button>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			pretenders: [
				{
					selector: 'Icon',
					as: { element: 'span', contents: [{ dynamic: true }] },
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<button>',
			},
		]);
	});

	test('[require-accessible-name-017] unknown content of a declarative shadow root may be the name of the host', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><Icon /></template></div>',
			{
				parser: { '.*': '@markuplint/jsx-parser' },
				pretenders: [
					{
						selector: 'Icon',
						as: { element: 'span', contents: [{ dynamic: true }] },
					},
				],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-018] a component whose shadow root is not known to be attached is not reported', async () => {
		const parser = { '.*': '@markuplint/jsx-parser' };
		const bare = await mlRuleTest(rule, '<Foo role="button"></Foo>', { parser });
		expect(bare.violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<Foo role="button">',
			},
		]);
		const unknown = await mlRuleTest(rule, '<Foo role="button"><template shadowrootmode="open"></template></Foo>', {
			parser,
		});
		expect(unknown.violations).toStrictEqual([]);
	});

	test('[require-accessible-name-019] a template that cannot attach a shadow root does not name the button', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button><template shadowrootmode="open">Save</template></button>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<button>',
			},
		]);
	});

	test('[require-accessible-name-020] an empty declarative shadow root hides the light DOM', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"></template>Save</div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<div role="button">',
			},
		]);
	});

	test('[require-accessible-name-021] unknown content in the light DOM of a shadow host is not its name', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"></template><Icon /></div>',
			{
				parser: { '.*': '@markuplint/jsx-parser' },
				pretenders: [
					{
						selector: 'Icon',
						as: { element: 'span', contents: [{ dynamic: true }] },
					},
				],
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<div role="button">',
			},
		]);
	});

	test('[require-accessible-name-022] the content of a template does not name the control of its label', async () => {
		const { violations } = await mlRuleTest(rule, '<label><template>Save</template><input type="text"></label>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 33,
				message: 'Require accessible name',
				raw: '<input type="text">',
			},
		]);
	});
});

test('[require-accessible-name-023] has accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<button>Label</button>');
	expect(violations.length).toBe(0);
});

test('[require-accessible-name-024] has accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<button aria-label="Label"></button>');
	expect(violations.length).toBe(0);
});

test("[require-accessible-name-025] does'nt have accessible name", async () => {
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

test("[require-accessible-name-026] does'nt have accessible name", async () => {
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

test('[require-accessible-name-027] has accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" aria-label="Label">');
	expect(violations.length).toBe(0);
});

test('[require-accessible-name-028] has accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" id="foo"><label for="foo">Label</label>');
	expect(violations.length).toBe(0);
});

test("[require-accessible-name-029] does'nt have accessible name", async () => {
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

test('[require-accessible-name-030] has accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<label><input type="text">Label</label>');
	expect(violations.length).toBe(0);
});

test("[require-accessible-name-031] does'nt have accessible name", async () => {
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

test('[require-accessible-name-032] has accessible name', async () => {
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

test('[require-accessible-name-033] needs no accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="stylesheet" href="path/to" />');
	expect(violations.length).toBe(0);
});

test("[require-accessible-name-034] does'nt have accessible name", async () => {
	const { violations: v1 } = await mlRuleTest(rule, '<form>text</form>', {
		rule: { options: { ariaVersion: '1.1' } },
	});
	expect(v1.length).toBe(0);
	const { violations: v2 } = await mlRuleTest(rule, '<form>text</form>', {
		rule: { options: { ariaVersion: '1.2' } },
	});
	expect(v2.length).toBe(0);
});

test('[require-accessible-name-035] The accessible name may be mutable', async () => {
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

test('[require-accessible-name-036] The accessible name may be mutable', async () => {
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

test('[require-accessible-name-037] The accessible name may be mutable', async () => {
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

test('[require-accessible-name-038] The accessible name may be mutable', async () => {
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

test('[require-accessible-name-039] has comment', async () => {
	expect((await mlRuleTest(rule, '<button>label<!-- comment --></button>')).violations).toStrictEqual([]);
});

test('[require-accessible-name-040] The accessible name may be mutable (Svelte)', async () => {
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

test('[require-accessible-name-041] The accessible name may be mutable', async () => {
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

test('[require-accessible-name-042] The accessible name may be mutable', async () => {
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

test('[require-accessible-name-043] The accessible name may be mutable', async () => {
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

test('[require-accessible-name-044] an image whose alt a presentational role drops does not name the button', async () => {
	const { violations } = await mlRuleTest(rule, '<button><img src="s.svg" alt="Save" role="none"></button>');
	expect(violations).toStrictEqual([
		{ severity: 'error', col: 1, line: 1, message: 'Require accessible name', raw: '<button>' },
	]);
	// Control: the same image without the role names it
	expect((await mlRuleTest(rule, '<button><img src="s.svg" alt="Save"></button>')).violations).toStrictEqual([]);
});

test('[require-accessible-name-045] Pretenders Option', async () => {
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

test('[require-accessible-name-046] The `as` attribute', async () => {
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

test('[require-accessible-name-047] input[type=button] with an explicit empty value has no accessible name', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="button" value="">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'Require accessible name',
			raw: '<input type="button" value="">',
		},
	]);
});

test('[require-accessible-name-048] input[type=button] with the value attribute omitted has no accessible name (type=button has no default label)', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="button">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'Require accessible name',
			raw: '<input type="button">',
		},
	]);
});

test('[require-accessible-name-049] input[type=button] with an empty value falls back to aria-label', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="button" value="" aria-label="Go">');
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-050] input[type=button] with a non-empty value has an accessible name from it', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="button" value="OK">');
	expect(violations).toStrictEqual([]);
});

describe('Markdown parser', () => {
	test('[require-accessible-name-051] email autolink in markdown should have accessible name from text content', async () => {
		const { violations } = await mlRuleTest(rule, 'user@example.com', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-052] email autolink in list item should have accessible name', async () => {
		const { violations } = await mlRuleTest(rule, '- user@example.com or admin@example.org', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-053] markdown link should have accessible name from text content', async () => {
		const { violations } = await mlRuleTest(rule, '[example](https://example.com)', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-054] empty markdown link should NOT have accessible name', async () => {
		const { violations } = await mlRuleTest(rule, '[](https://example.com)', {
			parser: {
				'.*': '@markuplint/markdown-parser',
			},
		});
		expect(violations.length).toBe(1);
	});
});

test('[require-accessible-name-055] a region named by aria-labelledby is accepted, hidden or not', async () => {
	expect(
		(await mlRuleTest(rule, '<h2 id="h">Heading</h2><div role="region" aria-labelledby="h">...</div>')).violations,
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

test('[require-accessible-name-056] an svg that has aria-label is accepted, whether or not the elements in it have a name', async () => {
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

test('[require-accessible-name-057] a dialog does not require an accessible name', async () => {
	// ARIA 1.3: dialog does not require an accessible name
	expect((await mlRuleTest(rule, '<dialog></dialog>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div role="dialog"></div>')).violations.length).toBe(0);
});

test('[require-accessible-name-058] a button with a slot of Svelte has a name, and an empty one has none', async () => {
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

test('[require-accessible-name-059] a label and its input before an ERB block are associated', async () => {
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

test('[require-accessible-name-060] a label whose text is only in its child elements gives the name', async () => {
	// Implicit label with text only inside child elements
	expect((await mlRuleTest(rule, '<label><span>label</span> <input /></label>')).violations).toStrictEqual([]);

	// Explicit label with text only inside child elements
	expect(
		(await mlRuleTest(rule, '<label for="label"><span>label</span></label> <input id="label" />')).violations,
	).toStrictEqual([]);

	// These should still work (direct text nodes)
	expect((await mlRuleTest(rule, '<label>label <input /></label>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<label>label <span>label</span> <input /></label>')).violations).toStrictEqual([]);
});

test('[require-accessible-name-061] a component pretended as a link that inherits its attributes is checked for its accessible name', async () => {
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

describe('an id that is not known until it is rendered', () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const lines = (...l: readonly string[]) => ['<>', ...l, '</>'].join('\n');
	const requireName = (raw: string, line: number) => ({
		severity: 'error',
		line,
		col: 1,
		message: 'Require accessible name',
		raw,
	});

	test('[require-accessible-name-062] an aria-labelledby whose value is not known may refer to the name', async () => {
		expect(
			(await mlRuleTest(rule, '<button aria-labelledby={id} type="button"></button>', { parser })).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-063] a reference may be to an element whose id is not known', async () => {
		const source = lines('<h2 id={x}>Q</h2>', '<button aria-labelledby="t" type="button"></button>');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-064] a landmark whose reference may be to an element whose id is not known has the role and is not reported', async () => {
		const source = lines('<h2 id={x}>Q</h2>', '<div role="region" aria-labelledby="t">a</div>');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-065] a reference in a tree whose ids are all known is reported', async () => {
		// A landmark that refers to nothing falls back to `generic`, which needs no name, so the control is not a landmark
		const source = lines('<h2 id="h">Q</h2>', '<button aria-labelledby="t" type="button"></button>');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<button aria-labelledby="t" type="button">', 3),
		]);
	});

	test('[require-accessible-name-150] an img or an input whose aria-labelledby is not known may refer to the name', async () => {
		const source = lines(
			'<img src="a.svg" aria-labelledby={id} />',
			'<input type="text" aria-labelledby={id} />',
			'<p id={id}>Label</p>',
		);
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-151] an img whose aria-labelledby refers to no element while every id is known is reported', async () => {
		const source = lines('<img src="a.svg" aria-labelledby="t" />', '<p id="a">Label</p>');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<img src="a.svg" aria-labelledby="t" />', 2),
		]);
	});

	test('[require-accessible-name-066] a reference to an element that is known and has no name is reported next to an id that is not known', async () => {
		const source = lines(
			'<h2 id={x}>Q</h2>',
			'<span id="s"></span>',
			'<button aria-labelledby="s" type="button"></button>',
		);
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<button aria-labelledby="s" type="button">', 4),
		]);
	});

	test('[require-accessible-name-067] a list in which a token is known and another refers to nothing may refer to an id that is not known', async () => {
		const source = lines(
			'<h2 id={x}>Q</h2>',
			'<span id="s"></span>',
			'<button aria-labelledby="s t" type="button"></button>',
		);
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-068] an empty aria-labelledby is not a reference that an id that is not known may satisfy', async () => {
		const source = lines('<h2 id={x}>Q</h2>', '<button aria-labelledby="" type="button"></button>');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<button aria-labelledby="" type="button">', 3),
		]);
	});

	test.each([' ', '\t', ' \t '])(
		'[require-accessible-name-142] a white-space-only aria-labelledby (%j) is not a reference that an id that is not known may satisfy',
		async value => {
			const tag = `<button aria-labelledby="${value}" type="button">`;
			const source = lines('<h2 id={x}>Q</h2>', `${tag}</button>`);
			expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([requireName(tag, 3)]);
		},
	);

	test('[require-accessible-name-143] white space around a known reference is not a token that an id that is not known may satisfy', async () => {
		const source = lines(
			'<h2 id={x}>Q</h2>',
			'<span id="s"></span>',
			'<button aria-labelledby="  s  " type="button"></button>',
		);
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<button aria-labelledby="  s  " type="button">', 4),
		]);
	});

	test('[require-accessible-name-069] an id that is not output is not an element that a reference may be to', async () => {
		const source = lines('<h2 id={undefined}>Q</h2>', '<button aria-labelledby="t" type="button"></button>');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<button aria-labelledby="t" type="button">', 3),
		]);
	});

	test('[require-accessible-name-070] a reference in the content of a template element reaches an id that is not known in the same content', async () => {
		const source = lines(
			'<div><template>',
			'<h2 id={x}>Q</h2>',
			'<button aria-labelledby="t" type="button"></button>',
			'</template></div>',
		);
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-071] an id that is not known in the content of a template element is not in the tree of the reference', async () => {
		const source = lines(
			'<div><template><h2 id={x}>Q</h2></template></div>',
			'<button aria-labelledby="t" type="button"></button>',
		);
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<button aria-labelledby="t" type="button">', 3),
		]);
	});

	test('[require-accessible-name-072] Vue: a reference may be to an element whose id is not known', async () => {
		const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
		const template = (id: string) =>
			[
				'<template>',
				'<div>',
				`<h2 ${id}>Q</h2>`,
				'<button aria-labelledby="t" type="button"></button>',
				'</div>',
				'</template>',
			].join('\n');
		expect((await mlRuleTest(rule, template(':id="x"'), vue)).violations).toStrictEqual([]);

		// Control: all the ids are known
		expect((await mlRuleTest(rule, template('id="h"'), vue)).violations).toStrictEqual([
			requireName('<button aria-labelledby="t" type="button">', 4),
		]);
	});

	test('[require-accessible-name-073] Svelte: a reference may be to an element whose id is not known', async () => {
		const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };
		const source = (id: string) =>
			[`<h2 ${id}>Q</h2>`, '<button aria-labelledby="t" type="button"></button>'].join('\n');
		expect((await mlRuleTest(rule, source('id={x}'), svelte)).violations).toStrictEqual([]);

		// Control: all the ids are known
		expect((await mlRuleTest(rule, source('id="h"'), svelte)).violations).toStrictEqual([
			requireName('<button aria-labelledby="t" type="button">', 2),
		]);
	});

	describe('pretenders', () => {
		const buttonMadeBy = (value: PretenderAttr['value']): readonly Pretender[] => [
			{
				selector: 'Btn',
				as: { element: 'button', attrs: [{ name: 'aria-labelledby', value }] },
			},
		];
		const headingMadeBy = (attr: PretenderAttr): readonly Pretender[] => [
			{ selector: 'Heading', as: { element: 'h2', attrs: [attr] } },
		];
		const headingSource = lines('<Heading id={x}>Q</Heading>', '<div role="region" aria-labelledby="t">a</div>');

		test('[require-accessible-name-074] a component whose id is the prop that is forwarded may be what a reference is to', async () => {
			const pretenders = headingMadeBy({ name: 'id', value: { fromAttr: 'id' } });
			expect((await mlRuleTest(rule, headingSource, { parser, pretenders })).violations).toStrictEqual([]);
		});

		test('[require-accessible-name-075] a component whose id is not known may be what a reference is to', async () => {
			const pretenders = headingMadeBy({ name: 'id', value: { dynamic: true } });
			expect((await mlRuleTest(rule, headingSource, { parser, pretenders })).violations).toStrictEqual([]);
		});

		test('[require-accessible-name-076] a component whose aria-labelledby is a known reference may refer to an id that is not known', async () => {
			const pretenders = buttonMadeBy({ fromAttr: 'labelledBy' });
			const source = lines('<h2 id={x}>Q</h2>', '<Btn labelledBy="t" />');
			expect((await mlRuleTest(rule, source, { parser, pretenders })).violations).toStrictEqual([]);
		});

		test('[require-accessible-name-077] a component whose aria-labelledby is a known reference is reported when all the ids are known', async () => {
			const pretenders = buttonMadeBy({ fromAttr: 'labelledBy' });
			const source = lines('<h2 id="h">Q</h2>', '<Btn labelledBy="t" />');
			expect((await mlRuleTest(rule, source, { parser, pretenders })).violations).toStrictEqual([
				requireName('<Btn labelledBy="t" />', 3),
			]);
		});

		test('[require-accessible-name-078] a component whose aria-labelledby is not known may refer to the name', async () => {
			const pretenders = buttonMadeBy({ dynamic: true });
			expect((await mlRuleTest(rule, '<Btn />', { parser, pretenders })).violations).toStrictEqual([]);
		});
	});
});

describe('a pretended component whose contents may be the name', () => {
	const jsx = { '.*': '@markuplint/jsx-parser' };

	test('[require-accessible-name-079] the unknown content of the component may be its name', async () => {
		expect(
			(
				await mlRuleTest(rule, '<MyButton label="Save" />', {
					parser: jsx,
					pretenders: [
						{
							selector: 'MyButton',
							as: {
								element: 'button',
								contents: [{ dynamic: true }],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-080] a static content is still reported', async () => {
		expect(
			(
				await mlRuleTest(rule, '<MyButton />', {
					parser: jsx,
					pretenders: [
						{
							selector: 'MyButton',
							as: {
								element: 'button',
								contents: [{ element: 'span' }],
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
				raw: '<MyButton />',
			},
		]);
	});

	test('[require-accessible-name-081] a static name beside the unknown content is still used', async () => {
		expect(
			(
				await mlRuleTest(rule, '<MyButton />', {
					parser: jsx,
					pretenders: [
						{
							selector: 'MyButton',
							as: {
								element: 'button',
								contents: [{ element: 'span' }, { dynamic: true }],
								attrs: [{ name: 'aria-label', value: 'Save' }],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-082] the unknown content of a single slot wrapper may be the name', async () => {
		expect(
			(
				await mlRuleTest(rule, '<MyButton />', {
					parser: jsx,
					pretenders: [
						{
							selector: 'MyButton',
							as: {
								element: 'button',
								slots: [{ element: 'span', contents: [{ dynamic: true }] }],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-083] the unknown content of a pretended child may be the name', async () => {
		expect(
			(
				await mlRuleTest(rule, '<button><Label text="Save" /></button>', {
					parser: jsx,
					pretenders: [
						{
							selector: 'Label',
							as: {
								element: 'span',
								contents: [{ dynamic: true }],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-084] the unknown content of a pretended child placed in the contents may be the name', async () => {
		expect(
			(
				await mlRuleTest(rule, '<MyButton><Label text="Save" /></MyButton>', {
					parser: jsx,
					pretenders: [
						{
							selector: 'MyButton',
							as: {
								element: 'button',
								contents: [{ element: 'span' }, { slot: true }],
							},
						},
						{
							selector: 'Label',
							as: {
								element: 'span',
								contents: [{ dynamic: true }],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-085] the unknown content of a pretended child of the owned label may be the name', async () => {
		expect(
			(
				await mlRuleTest(rule, '<label><Label text="Name" /><input /></label>', {
					parser: jsx,
					pretenders: [
						{
							selector: 'Label',
							as: {
								element: 'span',
								contents: [{ dynamic: true }],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-086] the unknown content of one of several slot wrappers may be the name', async () => {
		expect(
			(
				await mlRuleTest(rule, '<MyButton />', {
					parser: jsx,
					pretenders: [
						{
							selector: 'MyButton',
							as: {
								element: 'button',
								slots: [
									{ element: 'span', contents: [{ slot: true }] },
									{ element: 'span', contents: [{ dynamic: true }] },
								],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-087] a hidden pretended child is not read by the name computation and is still reported', async () => {
		expect(
			(
				await mlRuleTest(rule, '<button><Icon aria-hidden="true" /></button>', {
					parser: jsx,
					pretenders: [
						{
							selector: 'Icon',
							as: {
								element: 'span',
								inheritAttrs: true,
								contents: [{ dynamic: true }],
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

	test('[require-accessible-name-088] the unknown content of the element aria-labelledby refers to may be the name', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><button aria-labelledby="label1"></button><Label id="label1" text="Save" /></div>',
					{
						parser: jsx,
						pretenders: [
							{
								selector: 'Label',
								as: {
									element: 'span',
									inheritAttrs: true,
									contents: [{ dynamic: true }],
								},
							},
						],
					},
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-089] a pretended child with a static content is still reported', async () => {
		expect(
			(
				await mlRuleTest(rule, '<button><Icon /></button>', {
					parser: jsx,
					pretenders: [
						{
							selector: 'Icon',
							as: {
								element: 'span',
								contents: [{ element: 'svg' }],
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

	test('[require-accessible-name-090] a pretended child with the hidden attribute is not read by the name computation and is still reported', async () => {
		expect(
			(
				await mlRuleTest(rule, '<button><Icon hidden /></button>', {
					parser: jsx,
					pretenders: [
						{
							selector: 'Icon',
							as: {
								element: 'span',
								inheritAttrs: true,
								contents: [{ dynamic: true }],
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

	test('[require-accessible-name-091] aria-labelledby with a missing id and a reference to unknown content is not reported', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><button aria-labelledby="  missing   label1 "></button><Label id="label1" text="Save" /></div>',
					{
						parser: jsx,
						pretenders: [
							{
								selector: 'Label',
								as: {
									element: 'span',
									inheritAttrs: true,
									contents: [{ dynamic: true }],
								},
							},
						],
					},
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-092] aria-labelledby referring only to static content is still reported', async () => {
		expect(
			(
				await mlRuleTest(rule, '<div><button aria-labelledby="label1"></button><Label id="label1" /></div>', {
					parser: jsx,
					pretenders: [
						{
							selector: 'Label',
							as: {
								element: 'span',
								inheritAttrs: true,
								contents: [{ element: 'svg' }],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message: 'Require accessible name',
				raw: '<button aria-labelledby="label1">',
			},
		]);
	});

	test('[require-accessible-name-093] the unknown content of a pretended child of the label referred to by for may be the name', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<div><label for="input1"><Label text="Name" /></label><input id="input1" /></div>',
					{
						parser: jsx,
						pretenders: [
							{
								selector: 'Label',
								as: {
									element: 'span',
									contents: [{ dynamic: true }],
								},
							},
						],
					},
				)
			).violations,
		).toStrictEqual([]);
	});
});

test('[require-accessible-name-094] a boolean attribute that the framework does not output does not make the element mutable', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled={false}></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 1, message: 'Require accessible name', raw: '<button disabled={false}>' },
	]);
});

test('[require-accessible-name-095] code that is not a literal may change the element', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled={cond}></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-096] a component that no pretender resolved renders what is not known', async () => {
	const { violations } = await mlRuleTest(rule, '<button><Icon /></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-097] a component with a literal prop is the same', async () => {
	const { violations } = await mlRuleTest(rule, '<button><Icon size={16} /></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-098] an element without a name is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<button></button>', { parser: { '.*': '@markuplint/jsx-parser' } });
	expect(violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 1, message: 'Require accessible name', raw: '<button>' },
	]);
});

describe('the declarative shadow root of a pretended host', () => {
	const pretendedHost = { pretenders: [{ selector: 'x-btn', as: { element: 'div', inheritAttrs: true } }] };

	test('[require-accessible-name-099] a pretended host takes its name from its declarative shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<x-btn role="button"><template shadowrootmode="open">Save</template></x-btn>',
			pretendedHost,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-100] a pretended host whose shadow root has no text has no name', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<x-btn role="button"><template shadowrootmode="open"></template>Save</x-btn>',
			pretendedHost,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<x-btn role="button">',
			},
		]);
	});

	test('[require-accessible-name-101] what the component renders of its own is not rendered under a shadow root, unknown or not', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<x-btn role="button"><template shadowrootmode="open"></template></x-btn>',
			{
				pretenders: [
					{ selector: 'x-btn', as: { element: 'div', inheritAttrs: true, contents: [{ dynamic: true }] } },
				],
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<x-btn role="button">',
			},
		]);
	});

	test('[require-accessible-name-102] a template given to a component that drops its children is not rendered', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<Btn role="button"><template shadowrootmode="open">Save</template></Btn>',
			{
				parser: { '.*': '@markuplint/svelte-parser' },
				pretenders: [{ selector: 'Btn', as: { element: 'div', inheritAttrs: true, slots: null } }],
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<Btn role="button">',
			},
		]);
	});

	test('[require-accessible-name-103] a template given to a component that renders its children in itself names it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<Btn role="button"><template shadowrootmode="open">Save</template></Btn>',
			{
				parser: { '.*': '@markuplint/svelte-parser' },
				pretenders: [{ selector: 'Btn', as: { element: 'div', inheritAttrs: true } }],
			},
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('the nodes assigned to a slot', () => {
	const nunjucks = { parser: { '.*': '@markuplint/nunjucks-parser' } };
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };
	const alpine = { parser: { '.*': '@markuplint/alpine-parser' } };
	const vue = { parser: { '.*': '@markuplint/vue-parser' } };
	const astro = { parser: { '.*': '@markuplint/astro-parser' } };

	const REQUIRE_NAME = {
		severity: 'error',
		line: 1,
		col: 1,
		message: 'Require accessible name',
		raw: '<div role="button">',
	};

	test('[require-accessible-name-104] the nodes assigned to a slot are the name of the host', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template>Save</div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-105] a slot that takes no node uses its fallback children', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot>Fallback</slot></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-106] a slot that takes no node and has no fallback leaves the host without a name', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template></div>',
		);
		expect(violations).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-107] a light child that no slot takes is not rendered, so it is not the name', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot name="a"></slot></template>Save</div>',
		);
		expect(violations).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-108] a named slot takes the elements that name it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot name="a"></slot></template><span slot="a">Save</span></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-109] manual slot assignment is not known, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open" shadowrootslotassignment="manual"><slot></slot></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-110] a slot of a framework is not the HTML slot, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template></div>',
			svelte,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-111] an output of a template language among the light children may be what the slot takes', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template>{{ label }}</div>',
			nunjucks,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-112] a slot that is not in a shadow root may render anything, so the element is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="button"><slot></slot></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-113] the content of an x-if template of Alpine.js is a light child that the slot takes', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template><template x-if="a">Save</template></div>',
			alpine,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-114] a hidden node that a slot takes is not the name', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template><span hidden>Save</span></div>',
		);
		expect(violations).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-115] a light child that no slot takes is not rendered, so it is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"></template><button></button></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-116] a light child that no slot takes is not exposed whatever hides its host', async () => {
		const hidden = await mlRuleTest(
			rule,
			'<div hidden><template shadowrootmode="open"></template><button></button></div>',
		);
		expect(hidden.violations).toStrictEqual([]);
		const ariaHidden = await mlRuleTest(
			rule,
			'<div aria-hidden="true"><template shadowrootmode="open"></template><button></button></div>',
		);
		expect(ariaHidden.violations).toStrictEqual([]);
	});

	test('[require-accessible-name-117] a light child that a slot takes is reported as any other', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><slot></slot></template><button></button></div>',
		);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 62, message: 'Require accessible name', raw: '<button>' },
		]);
	});

	test('[require-accessible-name-118] a slot of Vue is not the HTML slot, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div role="button"><template shadowrootmode="open"><slot></slot></template></div></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-119] a slot of Astro is not the HTML slot, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template></div>',
			astro,
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('a branch of a conditional block', () => {
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };
	const alpine = { parser: { '.*': '@markuplint/alpine-parser' } };
	const astro = { parser: { '.*': '@markuplint/astro-parser' } };
	const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };
	const vue = { parser: { '.*': '@markuplint/vue-parser' } };
	const vueWithSpec = { ...vue, specs: { '.*': '@markuplint/vue-spec' } };
	const reactWithSpec = { ...jsx, specs: { '.*': '@markuplint/react-spec' } };

	const REQUIRE_NAME = {
		severity: 'error',
		line: 1,
		col: 1,
		message: 'Require accessible name',
		raw: '<div role="button">',
	};

	test.each([
		['if', '<div role="button">{#if a}Save{/if}</div>'],
		['if and else', '<div role="button">{#if a}Save{:else}Cancel{/if}</div>'],
		['if and else, the name in the else only', '<div role="button">{#if a}<span></span>{:else}Cancel{/if}</div>'],
		['await', '<div role="button">{#await p}Loading{:then v}Done{/await}</div>'],
		['each and its empty branch', '<div role="button">{#each xs as x}{:else}Empty{/each}</div>'],
		['a child element', '<div role="button"><span>{#if a}Save{/if}</span></div>'],
		['a nested block', '<div role="button">{#if a}{#if b}Save{/if}{/if}</div>'],
		[
			'an element that aria-labelledby refers to',
			'<div role="button" aria-labelledby="l"></div><span id="l">{#if a}Save{/if}</span>',
		],
		['a name of an image', '<div role="button">{#if a}<img src="a.png" alt="Save">{/if}</div>'],
	])('[require-accessible-name-120] a branch of a conditional block gives the name: %s (Svelte)', async (_, code) => {
		const { violations } = await mlRuleTest(rule, code, svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-121] unknown content in a branch may be the name (Svelte)', async () => {
		expect(
			(await mlRuleTest(rule, '<div role="button">{#if a}{label}{/if}</div>', svelte)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<div role="button">{#if a}<Comp />{/if}</div>', svelte)).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-122] no branch gives a name, so the element is reported (Svelte)', async () => {
		expect(
			(await mlRuleTest(rule, '<div role="button">{#if a}<span></span>{/if}</div>', svelte)).violations,
		).toStrictEqual([REQUIRE_NAME]);
		expect(
			(await mlRuleTest(rule, '<div role="button">{#if a}<span></span>{:else}<b></b>{/if}</div>', svelte))
				.violations,
		).toStrictEqual([REQUIRE_NAME]);
		expect((await mlRuleTest(rule, '<div role="button">{#if a}{/if}</div>', svelte)).violations).toStrictEqual([
			REQUIRE_NAME,
		]);
	});

	test('[require-accessible-name-123] a branch that is hidden does not give the name (Svelte)', async () => {
		expect(
			(await mlRuleTest(rule, '<div role="button">{#if a}<span hidden>Save</span>{/if}</div>', svelte))
				.violations,
		).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-124] an x-if template of Alpine.js is a branch that gives the name', async () => {
		expect(
			(await mlRuleTest(rule, '<div role="button"><template x-if="a">Save</template></div>', alpine)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<div role="button"><template x-if="a"><span></span></template></div>', alpine))
				.violations,
		).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-125] a filter of Astro is a branch that gives the name', async () => {
		expect(
			(await mlRuleTest(rule, '<div role="button">{xs.filter(x => <span>Save</span>)}</div>', astro)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<div role="button">{xs.filter(x => <span></span>)}</div>', astro)).violations,
		).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-126] the first of the candidates is not the only one that gives the name (Svelte)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<fieldset role="img">{#if a}<legend></legend>{:else}<legend>Name</legend>{/if}</fieldset>',
					svelte,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					'<table role="treegrid">{#if a}<caption></caption>{:else}<caption>Name</caption>{/if}</table>',
					svelte,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-127] the name from a legend or a caption that is in no branch is not given (Svelte)', async () => {
		expect(
			(await mlRuleTest(rule, '<fieldset role="img">{#if a}<legend></legend>{/if}</fieldset>', svelte))
				.violations,
		).toStrictEqual([
			{ severity: 'error', line: 1, col: 1, message: 'Require accessible name', raw: '<fieldset role="img">' },
		]);
	});

	test('[require-accessible-name-128] the content of a template of Vue is rendered where it is written, with or without the spec', async () => {
		const code = '<template><div role="button"><template v-if="a">Save</template></div></template>';
		expect((await mlRuleTest(rule, code, vue)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, code, vueWithSpec)).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-129] the content of a template of JSX is rendered where it is written, with the spec of React', async () => {
		const code = '<div role="button"><template>Save</template></div>';
		expect((await mlRuleTest(rule, code, reactWithSpec)).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-130] the content of an HTML template is not rendered where it is written', async () => {
		expect((await mlRuleTest(rule, '<div role="button"><template>Save</template></div>')).violations).toStrictEqual(
			[REQUIRE_NAME],
		);
	});

	test('[require-accessible-name-131] a later legend is not taken when an earlier legend is always rendered (Svelte)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<fieldset role="img">{#if a}x{/if}<legend></legend><legend>Name</legend></fieldset>',
					svelte,
				)
			).violations,
		).toStrictEqual([
			{ severity: 'error', line: 1, col: 1, message: 'Require accessible name', raw: '<fieldset role="img">' },
		]);
	});

	test('[require-accessible-name-132] a legend after one that a branch may leave out may be the one that names the element (Svelte)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<fieldset role="img">{#if a}<legend></legend>{/if}<legend>Name</legend></fieldset>',
					svelte,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-133] the content of a bare template of Vue is rendered where it is written, without the spec', async () => {
		const code = '<template><div role="button"><template>Save</template></div></template>';
		expect((await mlRuleTest(rule, code, vue)).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-134] a legend of a v-else branch may be the one that names the element (Vue)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><fieldset role="img"><legend v-if="a"></legend><legend v-else>Name</legend></fieldset></template>',
					vue,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><fieldset role="img"><legend v-if="a"></legend><legend v-else></legend></fieldset></template>',
					vue,
				)
			).violations,
		).toStrictEqual([
			{ severity: 'error', line: 1, col: 11, message: 'Require accessible name', raw: '<fieldset role="img">' },
		]);
	});

	test('[require-accessible-name-135] a legend of the empty clause of a loop may be the one that names the element (Svelte)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<fieldset role="img">{#each xs as x}<legend></legend>{:else}<legend>Name</legend>{/each}</fieldset>',
					svelte,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-136] a legend that a loop may leave out is not the only candidate (Svelte)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<fieldset role="img">{#each xs as x}<legend></legend>{/each}<legend>Name</legend></fieldset>',
					svelte,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-137] a legend or a caption in a template that has a directive of Vue is read as a child of the element', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><fieldset role="img"><template v-if="a"><legend>Name</legend></template></fieldset></template>',
					vue,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><fieldset role="img"><template v-for="x in xs"><legend>Name</legend></template></fieldset></template>',
					vue,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><table role="treegrid"><template v-if="a"><caption>Name</caption></template></table></template>',
					vue,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><fieldset role="img"><template v-if="a"><legend></legend></template></fieldset></template>',
					vue,
				)
			).violations,
		).toStrictEqual([
			{ severity: 'error', line: 1, col: 11, message: 'Require accessible name', raw: '<fieldset role="img">' },
		]);
	});

	test('[require-accessible-name-138] the title of an SVG that a v-if may leave out is not the only candidate (Vue)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><svg role="img"><title v-if="a"></title><title v-else>Name</title></svg></template>',
					vue,
				)
			).violations,
		).toStrictEqual([]);
	});
});

/**
 * A reference to an id that nothing in the file has may be one to an element that a spread attribute, a
 * component that no pretender resolved or content that is not known brings.
 */
describe('an id that the markup does not tell', () => {
	const parser = { '.*': '@markuplint/jsx-parser' };

	test.each([
		['a spread', '<><h2 {...props}>t</h2><button aria-labelledby="t" type="button" /></>'],
		['a spread after the id', '<><h2 id="a" {...props}>t</h2><button aria-labelledby="t" type="button" /></>'],
		['a component', '<><Header /><button aria-labelledby="t" type="button" /></>'],
		['a block of children', '<><div>{children}</div><button aria-labelledby="t" type="button" /></>'],
	])('[require-accessible-name-139] %s may be the element that the reference refers to', async (_, source) => {
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-140] a pretender with unknown contents may be, and one with declared contents is not', async () => {
		const unknownContents = await mlRuleTest(rule, '<><Dyn /><button aria-labelledby="t" type="button" /></>', {
			parser,
			pretenders: [{ selector: 'Dyn', as: { element: 'div', contents: [{ dynamic: true }] } }],
		});
		expect(unknownContents.violations).toStrictEqual([]);

		const knownContents = await mlRuleTest(rule, '<><Known /><button aria-labelledby="t" type="button" /></>', {
			parser,
			pretenders: [{ selector: 'Known', as: { element: 'div', contents: [{ element: 'span' }] } }],
		});
		expect(knownContents.violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				message: 'Require accessible name',
				raw: '<button aria-labelledby="t" type="button" />',
			},
		]);
	});

	test('[require-accessible-name-141] a spread before the id is overridden by it, so the reference is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<><h2 {...props} id="a">t</h2><button aria-labelledby="t" type="button" /></>',
			{ parser },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 31,
				message: 'Require accessible name',
				raw: '<button aria-labelledby="t" type="button" />',
			},
		]);
	});

	test('[require-accessible-name-144] a list of a reference to what a component declares and one to a written element is not known either', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<><Heading>Q</Heading><span id="u"></span><button aria-labelledby="t u" type="button" /></>',
			{
				parser,
				pretenders: [
					{
						selector: 'Heading',
						as: {
							element: 'div',
							contents: [{ element: 'h2', attrs: [{ name: 'id', value: 't' }] }, { slot: true }],
						},
					},
				],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-145] a reference to an element that a pretender declares gives a name that is not known', async () => {
		const heading: Pretender = {
			selector: 'Heading',
			as: { element: 'div', contents: [{ element: 'h2', attrs: [{ name: 'id', value: 't' }] }, { slot: true }] },
		};
		expect(
			(
				await mlRuleTest(rule, '<><Heading>Q</Heading><button aria-labelledby="t" type="button" /></>', {
					parser,
					pretenders: [heading],
				})
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(rule, '<><Heading>Q</Heading><button aria-labelledby="u" type="button" /></>', {
					parser,
					pretenders: [heading],
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 23,
				message: 'Require accessible name',
				raw: '<button aria-labelledby="u" type="button" />',
			},
		]);
	});
});

describe('an ID reference list is split on ASCII white space only', () => {
	test('[require-accessible-name-146] an id that holds U+00A0 is one token', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<span id="a\u00A0b">Name</span> <button aria-labelledby="a\u00A0b" type="button"></button>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-147] a token separated by ASCII white space names the control', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<span id="a">Name</span> <button aria-labelledby="x\ta" type="button"></button>',
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('a text that holds non-ASCII white space only is a name', () => {
	test('[require-accessible-name-148] a reference to a text of U+00A0 only names the control', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<span id="t">\u00A0</span> <button aria-labelledby="t" type="button"></button>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-149] a content of U+00A0 only names the control', async () => {
		const { violations } = await mlRuleTest(rule, '<button type="button">\u00A0</button>');
		expect(violations).toStrictEqual([]);
	});
});

describe('a character reference of the content is the character that it names', () => {
	test('[require-accessible-name-152] a content of a reference to U+0020 only is no name', async () => {
		const { violations } = await mlRuleTest(rule, '<button type="button">&#32;</button>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<button type="button">',
			},
		]);
	});

	test.each(['&nbsp;', '&#xA0;', '&lt;', '&amp;'])(
		'[require-accessible-name-153] a content of the reference %j names the control',
		async content => {
			const { violations } = await mlRuleTest(rule, `<button type="button">${content}</button>`);
			expect(violations).toStrictEqual([]);
		},
	);
});

describe('of two attributes of one name on an Astro component, the later one is the prop it gets', () => {
	const config = {
		parser: { '.*': '@markuplint/astro-parser' },
		pretenders: [{ selector: 'MyButton', as: { element: 'button', aria: { name: { fromAttr: 'label' } } } }],
	};

	test('[require-accessible-name-154] the name of the component is the later `label`', async () => {
		expect((await mlRuleTest(rule, '<MyButton label="" label="b" />', config)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<MyButton label="a" label="" />', config)).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require accessible name',
				raw: '<MyButton label="a" label="" />',
			},
		]);
	});
});
