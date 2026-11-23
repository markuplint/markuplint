import type { Pretender, PretenderAttr } from '@markuplint/ml-config';

import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

describe('the name is looked for in the tree of the element', () => {
	test('[require-accessible-name-issue-4489-001] a label of another tree does not name the control', async () => {
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

	test('[require-accessible-name-issue-4489-002] a label of the same template names the control', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><label for="x">L</label><input id="x" type="text"></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4489-003] a label names the control when the references are the same after the character references are resolved', async () => {
		const { violations } = await mlRuleTest(rule, '<label for="&#120;">L</label><input id="x" type="text">');
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4506-001] a label that wraps a template does not name the control in its content', async () => {
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

	test('[require-accessible-name-issue-4506-002] a label in the content of a template names the control in the content', async () => {
		const { violations } = await mlRuleTest(rule, '<template><label>L<input type="text"></label></template>');
		expect(violations).toStrictEqual([]);
	});
});

describe('the element is hidden by the ancestors in the tree of the element', () => {
	test('[require-accessible-name-issue-4506-003] aria-hidden outside of the content of a template does not hide it', async () => {
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

	test('[require-accessible-name-issue-4506-004] aria-hidden of the host hides the content of a declarative shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div aria-hidden="true"><template shadowrootmode="open"><button></button></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4506-005] aria-hidden in the content of a template hides the element in it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div aria-hidden="true"><button></button></div></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4506-006] hidden outside of the content of a template does not hide it', async () => {
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

	test('[require-accessible-name-issue-4506-007] hidden of the host hides the content of a declarative shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div hidden><template shadowrootmode="open"><button></button></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4506-008] an ancestor with presentational children outside of the content of a template does not exclude it', async () => {
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

	test('[require-accessible-name-issue-4506-009] an ancestor with presentational children excludes the content of a declarative shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="img" aria-label="x"><template shadowrootmode="open"><a href="#"></a></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('the content of a template is not the name of the element that holds it', () => {
	test('[require-accessible-name-issue-4524-001] an ordinary template contributes nothing, and a declarative shadow root keeps the name of the control in it', async () => {
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

	test('[require-accessible-name-issue-4524-002] the content of a declarative shadow root names the host', async () => {
		expect(
			(await mlRuleTest(rule, '<div role="button"><template shadowrootmode="open">Save</template></div>'))
				.violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<div role="button"><template shadowrootmode="closed">Save</template></div>'))
				.violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4524-003] an ordinary template does not name the host', async () => {
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

	test('[require-accessible-name-issue-4524-004] unknown content inside an ordinary template is not the name', async () => {
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

	test('[require-accessible-name-issue-4524-005] unknown content of a declarative shadow root may be the name of the host', async () => {
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

	test('[require-accessible-name-issue-4524-006] a component whose shadow root is not known to be attached is not reported', async () => {
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

	test('[require-accessible-name-issue-4524-007] a template that cannot attach a shadow root does not name the button', async () => {
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

	test('[require-accessible-name-issue-4524-008] an empty declarative shadow root hides the light DOM', async () => {
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

	test('[require-accessible-name-issue-4524-009] unknown content in the light DOM of a shadow host is not its name', async () => {
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

	test('[require-accessible-name-issue-4524-010] the content of a template does not name the control of its label', async () => {
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

test('[require-accessible-name-issue-4408-001] an image whose alt a presentational role drops does not name the button', async () => {
	const { violations } = await mlRuleTest(rule, '<button><img src="s.svg" alt="Save" role="none"></button>');
	expect(violations).toStrictEqual([
		{ severity: 'error', col: 1, line: 1, message: 'Require accessible name', raw: '<button>' },
	]);
	// Control: the same image without the role names it
	expect((await mlRuleTest(rule, '<button><img src="s.svg" alt="Save"></button>')).violations).toStrictEqual([]);
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

test('[require-accessible-name-invalid-014] input[type=button] with an explicit empty value has no accessible name', async () => {
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

test('[require-accessible-name-invalid-015] input[type=button] with the value attribute omitted has no accessible name (type=button has no default label)', async () => {
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

test('[require-accessible-name-valid-010] input[type=button] with an empty value falls back to aria-label', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="button" value="" aria-label="Go">');
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-valid-011] input[type=button] with a non-empty value has an accessible name from it', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="button" value="OK">');
	expect(violations).toStrictEqual([]);
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

// https://github.com/markuplint/markuplint/issues/536
test('[require-accessible-name-issue-536] #536', async () => {
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
	expect((await mlRuleTest(rule, '<label>label <span>label</span> <input /></label>')).violations).toStrictEqual([]);
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

	test('[require-accessible-name-issue-4783-001] an aria-labelledby whose value is not known may refer to the name', async () => {
		expect(
			(await mlRuleTest(rule, '<button aria-labelledby={id} type="button"></button>', { parser })).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4783-002] a reference may be to an element whose id is not known', async () => {
		const source = lines('<h2 id={x}>Q</h2>', '<button aria-labelledby="t" type="button"></button>');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4783-003] a landmark whose reference may be to an element whose id is not known has the role and is not reported', async () => {
		const source = lines('<h2 id={x}>Q</h2>', '<div role="region" aria-labelledby="t">a</div>');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4783-004] a reference in a tree whose ids are all known is reported', async () => {
		// A landmark that refers to nothing falls back to `generic`, which needs no name, so the control is not a landmark
		const source = lines('<h2 id="h">Q</h2>', '<button aria-labelledby="t" type="button"></button>');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<button aria-labelledby="t" type="button">', 3),
		]);
	});

	test('[require-accessible-name-issue-4783-005] a reference to an element that is known and has no name is reported next to an id that is not known', async () => {
		const source = lines(
			'<h2 id={x}>Q</h2>',
			'<span id="s"></span>',
			'<button aria-labelledby="s" type="button"></button>',
		);
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<button aria-labelledby="s" type="button">', 4),
		]);
	});

	test('[require-accessible-name-issue-4783-006] a list in which a token is known and another refers to nothing may refer to an id that is not known', async () => {
		const source = lines(
			'<h2 id={x}>Q</h2>',
			'<span id="s"></span>',
			'<button aria-labelledby="s t" type="button"></button>',
		);
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4783-007] an empty aria-labelledby is not a reference that an id that is not known may satisfy', async () => {
		const source = lines('<h2 id={x}>Q</h2>', '<button aria-labelledby="" type="button"></button>');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<button aria-labelledby="" type="button">', 3),
		]);
	});

	test('[require-accessible-name-issue-4783-008] an id that is not output is not an element that a reference may be to', async () => {
		const source = lines('<h2 id={undefined}>Q</h2>', '<button aria-labelledby="t" type="button"></button>');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<button aria-labelledby="t" type="button">', 3),
		]);
	});

	test('[require-accessible-name-issue-4783-009] a reference in the content of a template element reaches an id that is not known in the same content', async () => {
		const source = lines(
			'<div><template>',
			'<h2 id={x}>Q</h2>',
			'<button aria-labelledby="t" type="button"></button>',
			'</template></div>',
		);
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4783-010] an id that is not known in the content of a template element is not in the tree of the reference', async () => {
		const source = lines(
			'<div><template><h2 id={x}>Q</h2></template></div>',
			'<button aria-labelledby="t" type="button"></button>',
		);
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([
			requireName('<button aria-labelledby="t" type="button">', 3),
		]);
	});

	test('[require-accessible-name-issue-4783-011] Vue: a reference may be to an element whose id is not known', async () => {
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

	test('[require-accessible-name-issue-4783-012] Svelte: a reference may be to an element whose id is not known', async () => {
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

		test('[require-accessible-name-issue-4783-013] a component whose id is the prop that is forwarded may be what a reference is to', async () => {
			const pretenders = headingMadeBy({ name: 'id', value: { fromAttr: 'id' } });
			expect((await mlRuleTest(rule, headingSource, { parser, pretenders })).violations).toStrictEqual([]);
		});

		test('[require-accessible-name-issue-4783-014] a component whose id is not known may be what a reference is to', async () => {
			const pretenders = headingMadeBy({ name: 'id', value: { dynamic: true } });
			expect((await mlRuleTest(rule, headingSource, { parser, pretenders })).violations).toStrictEqual([]);
		});

		test('[require-accessible-name-issue-4783-015] a component whose aria-labelledby is a known reference may refer to an id that is not known', async () => {
			const pretenders = buttonMadeBy({ fromAttr: 'labelledBy' });
			const source = lines('<h2 id={x}>Q</h2>', '<Btn labelledBy="t" />');
			expect((await mlRuleTest(rule, source, { parser, pretenders })).violations).toStrictEqual([]);
		});

		test('[require-accessible-name-issue-4783-016] a component whose aria-labelledby is a known reference is reported when all the ids are known', async () => {
			const pretenders = buttonMadeBy({ fromAttr: 'labelledBy' });
			const source = lines('<h2 id="h">Q</h2>', '<Btn labelledBy="t" />');
			expect((await mlRuleTest(rule, source, { parser, pretenders })).violations).toStrictEqual([
				requireName('<Btn labelledBy="t" />', 3),
			]);
		});

		test('[require-accessible-name-issue-4783-017] a component whose aria-labelledby is not known may refer to the name', async () => {
			const pretenders = buttonMadeBy({ dynamic: true });
			expect((await mlRuleTest(rule, '<Btn />', { parser, pretenders })).violations).toStrictEqual([]);
		});
	});
});

describe('#4069', () => {
	const jsx = { '.*': '@markuplint/jsx-parser' };

	test('[require-accessible-name-issue-4069-001] the unknown content of the component may be its name', async () => {
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

	test('[require-accessible-name-issue-4069-002] a static content is still reported', async () => {
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

	test('[require-accessible-name-issue-4069-003] a static name beside the unknown content is still used', async () => {
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

	test('[require-accessible-name-issue-4069-004] the unknown content of a single slot wrapper may be the name', async () => {
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

	test('[require-accessible-name-issue-4069-005] the unknown content of a pretended child may be the name', async () => {
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

	test('[require-accessible-name-issue-4069-006] the unknown content of a pretended child placed in the contents may be the name', async () => {
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

	test('[require-accessible-name-issue-4069-007] the unknown content of a pretended child of the owned label may be the name', async () => {
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

	test('[require-accessible-name-issue-4069-008] the unknown content of one of several slot wrappers may be the name', async () => {
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

	test('[require-accessible-name-issue-4069-009] a hidden pretended child is not read by the name computation and is still reported', async () => {
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

	test('[require-accessible-name-issue-4069-010] the unknown content of the element aria-labelledby refers to may be the name', async () => {
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

	test('[require-accessible-name-issue-4069-011] a pretended child with a static content is still reported', async () => {
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

	test('[require-accessible-name-issue-4069-012] a pretended child with the hidden attribute is not read by the name computation and is still reported', async () => {
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

	test('[require-accessible-name-issue-4069-013] aria-labelledby with a missing id and a reference to unknown content is not reported', async () => {
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

	test('[require-accessible-name-issue-4069-014] aria-labelledby referring only to static content is still reported', async () => {
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

	test('[require-accessible-name-issue-4069-015] the unknown content of a pretended child of the label referred to by for may be the name', async () => {
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

test('[require-accessible-name-issue-4435-001] a boolean attribute that the framework does not output does not make the element mutable', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled={false}></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 1, message: 'Require accessible name', raw: '<button disabled={false}>' },
	]);
});

test('[require-accessible-name-issue-4435-002] code that is not a literal may change the element', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled={cond}></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4435-003] a component that no pretender resolved renders what is not known', async () => {
	const { violations } = await mlRuleTest(rule, '<button><Icon /></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4435-004] a component with a literal prop is the same', async () => {
	const { violations } = await mlRuleTest(rule, '<button><Icon size={16} /></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4435-005] an element without a name is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<button></button>', { parser: { '.*': '@markuplint/jsx-parser' } });
	expect(violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 1, message: 'Require accessible name', raw: '<button>' },
	]);
});

describe('issue-4527', () => {
	const pretendedHost = { pretenders: [{ selector: 'x-btn', as: { element: 'div', inheritAttrs: true } }] };

	test('[require-accessible-name-issue-4527-001] a pretended host takes its name from its declarative shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<x-btn role="button"><template shadowrootmode="open">Save</template></x-btn>',
			pretendedHost,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4527-002] a pretended host whose shadow root has no text has no name', async () => {
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

	test('[require-accessible-name-issue-4527-003] what the component renders of its own is not rendered under a shadow root, unknown or not', async () => {
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

	test('[require-accessible-name-issue-4527-004] a template given to a component that drops its children is not rendered', async () => {
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

	test('[require-accessible-name-issue-4527-005] a template given to a component that renders its children in itself names it', async () => {
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

describe('issue-4538', () => {
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

	test('[require-accessible-name-issue-4538-001] the nodes assigned to a slot are the name of the host', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template>Save</div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4538-002] a slot that takes no node uses its fallback children', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot>Fallback</slot></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4538-003] a slot that takes no node and has no fallback leaves the host without a name', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template></div>',
		);
		expect(violations).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-issue-4538-004] a light child that no slot takes is not rendered, so it is not the name', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot name="a"></slot></template>Save</div>',
		);
		expect(violations).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-issue-4538-005] a named slot takes the elements that name it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot name="a"></slot></template><span slot="a">Save</span></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4538-006] manual slot assignment is not known, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open" shadowrootslotassignment="manual"><slot></slot></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4538-007] a slot of a framework is not the HTML slot, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template></div>',
			svelte,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4538-008] an output of a template language among the light children may be what the slot takes', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template>{{ label }}</div>',
			nunjucks,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4538-009] a slot that is not in a shadow root may render anything, so the element is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="button"><slot></slot></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4538-010] the content of an x-if template of Alpine.js is a light child that the slot takes', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template><template x-if="a">Save</template></div>',
			alpine,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4538-011] a hidden node that a slot takes is not the name', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template><span hidden>Save</span></div>',
		);
		expect(violations).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-issue-4538-012] a light child that no slot takes is not rendered, so it is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"></template><button></button></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4538-013] a light child that no slot takes is not exposed whatever hides its host', async () => {
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

	test('[require-accessible-name-issue-4538-014] a light child that a slot takes is reported as any other', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><slot></slot></template><button></button></div>',
		);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 62, message: 'Require accessible name', raw: '<button>' },
		]);
	});

	test('[require-accessible-name-issue-4538-015] a slot of Vue is not the HTML slot, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div role="button"><template shadowrootmode="open"><slot></slot></template></div></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4538-016] a slot of Astro is not the HTML slot, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="button"><template shadowrootmode="open"><slot></slot></template></div>',
			astro,
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('issue-4580', () => {
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
	])(
		'[require-accessible-name-issue-4580-001] a branch of a conditional block gives the name: %s (Svelte)',
		async (_, code) => {
			const { violations } = await mlRuleTest(rule, code, svelte);
			expect(violations).toStrictEqual([]);
		},
	);

	test('[require-accessible-name-issue-4580-002] unknown content in a branch may be the name (Svelte)', async () => {
		expect(
			(await mlRuleTest(rule, '<div role="button">{#if a}{label}{/if}</div>', svelte)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<div role="button">{#if a}<Comp />{/if}</div>', svelte)).violations,
		).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4580-003] no branch gives a name, so the element is reported (Svelte)', async () => {
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

	test('[require-accessible-name-issue-4580-004] a branch that is hidden does not give the name (Svelte)', async () => {
		expect(
			(await mlRuleTest(rule, '<div role="button">{#if a}<span hidden>Save</span>{/if}</div>', svelte))
				.violations,
		).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-issue-4580-005] an x-if template of Alpine.js is a branch that gives the name', async () => {
		expect(
			(await mlRuleTest(rule, '<div role="button"><template x-if="a">Save</template></div>', alpine)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<div role="button"><template x-if="a"><span></span></template></div>', alpine))
				.violations,
		).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-issue-4580-006] a filter of Astro is a branch that gives the name', async () => {
		expect(
			(await mlRuleTest(rule, '<div role="button">{xs.filter(x => <span>Save</span>)}</div>', astro)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<div role="button">{xs.filter(x => <span></span>)}</div>', astro)).violations,
		).toStrictEqual([REQUIRE_NAME]);
	});

	test('[require-accessible-name-issue-4580-007] the first of the candidates is not the only one that gives the name (Svelte)', async () => {
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

	test('[require-accessible-name-issue-4580-008] the name from a legend or a caption that is in no branch is not given (Svelte)', async () => {
		expect(
			(await mlRuleTest(rule, '<fieldset role="img">{#if a}<legend></legend>{/if}</fieldset>', svelte))
				.violations,
		).toStrictEqual([
			{ severity: 'error', line: 1, col: 1, message: 'Require accessible name', raw: '<fieldset role="img">' },
		]);
	});

	test('[require-accessible-name-issue-4580-009] the content of a template of Vue is rendered where it is written, with or without the spec', async () => {
		const code = '<template><div role="button"><template v-if="a">Save</template></div></template>';
		expect((await mlRuleTest(rule, code, vue)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, code, vueWithSpec)).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4580-010] the content of a template of JSX is rendered where it is written, with the spec of React', async () => {
		const code = '<div role="button"><template>Save</template></div>';
		expect((await mlRuleTest(rule, code, reactWithSpec)).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4580-011] the content of an HTML template is not rendered where it is written', async () => {
		expect((await mlRuleTest(rule, '<div role="button"><template>Save</template></div>')).violations).toStrictEqual(
			[REQUIRE_NAME],
		);
	});

	test('[require-accessible-name-issue-4580-012] a later legend is not taken when an earlier legend is always rendered (Svelte)', async () => {
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

	test('[require-accessible-name-issue-4580-013] a legend after one that a branch may leave out may be the one that names the element (Svelte)', async () => {
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

	test('[require-accessible-name-issue-4580-014] the content of a bare template of Vue is rendered where it is written, without the spec', async () => {
		const code = '<template><div role="button"><template>Save</template></div></template>';
		expect((await mlRuleTest(rule, code, vue)).violations).toStrictEqual([]);
	});

	test('[require-accessible-name-issue-4580-015] a legend of a v-else branch may be the one that names the element (Vue)', async () => {
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

	test('[require-accessible-name-issue-4580-016] a legend of the empty clause of a loop may be the one that names the element (Svelte)', async () => {
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

	test('[require-accessible-name-issue-4580-017] a legend that a loop may leave out is not the only candidate (Svelte)', async () => {
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

	test('[require-accessible-name-issue-4580-018] a legend or a caption in a template that has a directive of Vue is read as a child of the element', async () => {
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

	test('[require-accessible-name-issue-4580-019] the title of an SVG that a v-if may leave out is not the only candidate (Vue)', async () => {
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
