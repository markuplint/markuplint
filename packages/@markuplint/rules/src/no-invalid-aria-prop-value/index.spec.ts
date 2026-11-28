import { mlRuleTest } from 'markuplint';
import { expect, test } from 'vitest';

import rule from './index.js';

test('[no-invalid-aria-prop-value-001] valid aria value', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-002] invalid aria value', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" aria-pressed="hoge"></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('error');
});

test('[no-invalid-aria-prop-value-003] the lower-case spelling is reported (baseline of the upper-case one)', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" aria-pressed="hoge"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: 'The "hoge" is disallowed on the "aria-pressed" ARIA state',
			raw: 'aria-pressed="hoge"',
		},
	]);
});

test('[no-invalid-aria-prop-value-004] an upper-case aria-* is reported like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" ARIA-PRESSED="hoge"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: 'The "hoge" is disallowed on the "ARIA-PRESSED" ARIA state',
			raw: 'ARIA-PRESSED="hoge"',
		},
	]);
});

test('[no-invalid-aria-prop-value-005] JSX: an upper-case aria-* on an HTML element is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" ARIA-PRESSED="hoge" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: 'The "hoge" is disallowed on the "ARIA-PRESSED" ARIA state',
			raw: 'ARIA-PRESSED="hoge"',
		},
	]);
});

test('[no-invalid-aria-prop-value-006] JSX: an upper-case aria-* on an svg element is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg role="button" ARIA-PRESSED="hoge" />', { parser })).violations).toStrictEqual(
		[],
	);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg role="button" aria-pressed="hoge" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: 'The "hoge" is disallowed on the "aria-pressed" ARIA state',
			raw: 'aria-pressed="hoge"',
		},
	]);
});

test('[no-invalid-aria-prop-value-007] the allowed values are shown as written (`list` is also a keyword) with locale ja', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<input type="text" role="combobox" aria-autocomplete="foo">',
		undefined,
		false,
		'ja',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 36,
			message:
				'ARIAプロパティ「aria-autocomplete」では、「foo」は許可されていません。許可されている値は次のとおりです 「inline」「list」「both」「none」',
			raw: 'aria-autocomplete="foo"',
		},
	]);
});

test('[no-invalid-aria-prop-value-008] JSX: a value that only some roles allow is not judged where the role is not known until it is rendered', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const source = [
		'<>',
		'<div role={props.role} aria-checked="mixed" />',
		'<div {...props} aria-checked="mixed" />',
		'</>',
	].join('\n');
	expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);

	// Control: the role that the markup tells is judged
	const { violations } = await mlRuleTest(rule, '<div role="radio" aria-checked="mixed" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 19,
			message: 'The "mixed" is disallowed on the "aria-checked" ARIA state',
			raw: 'aria-checked="mixed"',
		},
	]);
});

test('[no-invalid-aria-prop-value-009] JSX: a value that no role allows is reported where the role is not known until it is rendered', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const { violations } = await mlRuleTest(rule, '<div role={props.role} aria-hidden="foo" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'The "foo" is disallowed on the "aria-hidden" ARIA state',
			raw: 'aria-hidden="foo"',
		},
	]);
});

test('[no-invalid-aria-prop-value-010] JSX: where the role is not known, a value is valid if the base type or any role-specific type allows it', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const allowed = [
		'<>',
		'<div role={props.role} aria-checked="true" />',
		'<div role={props.role} aria-checked="mixed" />',
		'</>',
	];
	for (const version of ['1.1', '1.2', '1.3'] as const) {
		const options = { parser, rule: { options: { version } } };
		expect((await mlRuleTest(rule, allowed.join('\n'), options)).violations).toStrictEqual([]);

		// No type allows it
		const { violations } = await mlRuleTest(rule, '<div role={props.role} aria-checked="foo" />', options);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 24,
				message: 'The "foo" is disallowed on the "aria-checked" ARIA state',
				raw: 'aria-checked="foo"',
			},
		]);
	}
});

test('[no-invalid-aria-prop-value-011] JSX: a spread attribute after the role attribute may override it; one before it may not', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(await mlRuleTest(rule, '<div role="radio" {...props} aria-checked="mixed" />', { parser })).violations,
	).toStrictEqual([]);

	// Control: the role is the one written, and a radio does not allow `mixed`
	const { violations } = await mlRuleTest(rule, '<div {...props} role="radio" aria-checked="mixed" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 30,
			message: 'The "mixed" is disallowed on the "aria-checked" ARIA state',
			raw: 'aria-checked="mixed"',
		},
	]);
});

test('[no-invalid-aria-prop-value-012] a literal in {…} that is not a value of the state is reported as the string is', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-busy={"not-a-value"}></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "not-a-value" is disallowed on the "aria-busy" ARIA state',
			raw: 'aria-busy={"not-a-value"}',
		},
	]);
});

test('[no-invalid-aria-prop-value-013] the same value written as a string is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-busy="not-a-value"></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "not-a-value" is disallowed on the "aria-busy" ARIA state',
			raw: 'aria-busy="not-a-value"',
		},
	]);
});

test('[no-invalid-aria-prop-value-014] a literal that is a value of the state is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<><div aria-busy={true}></div><div aria-busy={"true"}></div><div aria-busy={false}></div></>',
		{ parser: { '.*': '@markuplint/jsx-parser' } },
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-015] the shorthand of JSX is `true`', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-hidden></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-016] the empty string that is written is not the shorthand, and is the absent attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-hidden=""></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-017] a literal of the empty string is the absent attribute, which is not reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-hidden={""}></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-018] null and code that is not a literal are not judged', async () => {
	const { violations } = await mlRuleTest(rule, '<><div aria-busy={null}></div><div aria-busy={cond}></div></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-019] a number is judged as the string of it is', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const { violations } = await mlRuleTest(rule, '<div aria-busy={5}></div>', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "5" is disallowed on the "aria-busy" ARIA state',
			raw: 'aria-busy={5}',
		},
	]);

	// Control: a number that the property accepts is not reported
	expect(
		(await mlRuleTest(rule, '<div role="slider" aria-valuenow={5}></div>', { parser })).violations,
	).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-020] a prop of a component is not rendered here', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<Btn aria-busy={"x"} />', { parser })).violations).toStrictEqual([]);

	// Control: the same attribute on an element is reported
	const { violations } = await mlRuleTest(rule, '<div aria-busy={"x"}></div>', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "x" is disallowed on the "aria-busy" ARIA state',
			raw: 'aria-busy={"x"}',
		},
	]);
});

test.each([
	'<div role="slider" aria-valuenow="5"></div>',
	'<div role="slider" aria-valuenow="5.0"></div>',
	'<div role="slider" aria-valuenow="05"></div>',
	'<div role="slider" aria-valuenow=".5"></div>',
	'<div role="slider" aria-valuenow="-1"></div>',
	'<div role="slider" aria-valuenow="1e2"></div>',
	'<h2 aria-level="05">a</h2>',
])(
	'[no-invalid-aria-prop-value-021] a number or an integer that is valid as a whole is not reported: %j',
	async code => {
		expect((await mlRuleTest(rule, code)).violations).toStrictEqual([]);
	},
);

test.each([
	['<div role="slider" aria-valuenow="5."></div>', 20, 'aria-valuenow', '5.'],
	['<div role="slider" aria-valuenow="+5"></div>', 20, 'aria-valuenow', '+5'],
	['<div role="slider" aria-valuenow="5abc"></div>', 20, 'aria-valuenow', '5abc'],
	['<div role="slider" aria-valuenow="\u00A05"></div>', 20, 'aria-valuenow', '\u00A05'],
	['<div role="slider" aria-valuenow="5\u00A0"></div>', 20, 'aria-valuenow', '5\u00A0'],
	['<h2 aria-level="2.5">a</h2>', 5, 'aria-level', '2.5'],
])(
	'[no-invalid-aria-prop-value-022] a number or an integer that is not valid as a whole is reported: %j',
	async (code, col, name, value) => {
		expect((await mlRuleTest(rule, code)).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col,
				message: `The "${value}" is disallowed on the "${name}" ARIA property`,
				raw: `${name}="${value}"`,
			},
		]);
	},
);

/**
 * The table of `is-valid-aria-value.spec.ts` of `@markuplint/ml-spec`, which the computed ARIA props run too: the
 * value is reported exactly when it is not valid.
 */
const v = (col: number, message: string, raw: string) => [{ severity: 'error', line: 1, col, message, raw }];

test.each([
	['checkbox', 'aria-checked', 'true', []],
	[
		'checkbox',
		'aria-checked',
		' TRUE ',
		v(37, 'The " TRUE " is disallowed on the "aria-checked" ARIA state', 'aria-checked=" TRUE "'),
	],
	['checkbox', 'aria-checked', 'TRUE', []],
	[
		'checkbox',
		'aria-checked',
		' true ',
		v(37, 'The " true " is disallowed on the "aria-checked" ARIA state', 'aria-checked=" true "'),
	],
	[
		'checkbox',
		'aria-checked',
		' true',
		v(37, 'The " true" is disallowed on the "aria-checked" ARIA state', 'aria-checked=" true"'),
	],
	['checkbox', 'aria-checked', 'mixed', []],
	['slider', 'aria-valuenow', ' 5 ', []],
	['heading', 'aria-level', ' 3 ', []],
	['button', 'aria-pressed', 'undefined', []],
	['button', 'aria-pressed', 'mixed', []],
	[
		'button',
		'aria-expanded',
		'mixed',
		v(35, 'The "mixed" is disallowed on the "aria-expanded" ARIA state', 'aria-expanded="mixed"'),
	],
	[
		'textbox',
		'aria-required',
		'undefined',
		v(36, 'The "undefined" is disallowed on the "aria-required" ARIA property', 'aria-required="undefined"'),
	],
	[
		'gridcell',
		'aria-rowindex',
		'2.5',
		v(37, 'The "2.5" is disallowed on the "aria-rowindex" ARIA property', 'aria-rowindex="2.5"'),
	],
	['spinbutton', 'aria-valuemin', '1.0', []],
	['region', 'aria-live', 'POLITE', []],
	[
		'region',
		'aria-live',
		'nope',
		v(
			35,
			'The "nope" is disallowed on the "aria-live" ARIA property. Allowed values are: "assertive", "off", "polite"',
			'aria-live="nope"',
		),
	],
	['region', 'aria-relevant', 'ADDITIONS text', []],
	[
		'region',
		'aria-relevant',
		'additions nope',
		v(
			35,
			'The "additions nope" is disallowed on the "aria-relevant" ARIA property. Allowed values are: "additions", "additions text", "all", "removals", "text"',
			'aria-relevant="additions nope"',
		),
	],
	['textbox', 'aria-activedescendant', 'a', []],
	[
		'textbox',
		'aria-activedescendant',
		'a b',
		v(36, 'The "a b" is disallowed on the "aria-activedescendant" ARIA property', 'aria-activedescendant="a b"'),
	],
] as const)(
	'[no-invalid-aria-prop-value-023] the value of %s %s=%j is read as the computed ARIA props read it',
	async (role, attr, value, violations) => {
		const result = await mlRuleTest(rule, `<div role="${role}" aria-label="x" ${attr}="${value}"></div>`);
		expect(result.violations).toStrictEqual(violations);
	},
);

test.each([
	['<div role="button" aria-pressed="">x</div>', []],
	['<div role="textbox" aria-describedby=""></div>', []],
	// The implicit role of an element is satisfied by the element
	['<input type="checkbox" aria-checked="">', []],
	['<h2 aria-level="">x</h2>', []],
	// A native attribute gives the required state in its place
	['<input type="checkbox" role="switch" checked aria-checked="">', []],
	// A separator requires a value only when it is focusable
	['<div role="separator" aria-valuenow=""></div>', []],
	[
		'<div role="separator" tabindex="0" aria-valuenow=""></div>',
		v(36, 'The "" is disallowed on the "aria-valuenow" ARIA property', 'aria-valuenow=""'),
	],
	[
		'<div role="checkbox" aria-label="x" aria-checked=""></div>',
		v(37, 'The "" is disallowed on the "aria-checked" ARIA state', 'aria-checked=""'),
	],
	[
		'<div role="checkbox" aria-label="x" aria-checked=" "></div>',
		v(37, 'The " " is disallowed on the "aria-checked" ARIA state', 'aria-checked=" "'),
	],
] as const)(
	'[no-invalid-aria-prop-value-024] an empty value is the absent attribute, and an author error for a required one: %j',
	async (code, violations) => {
		expect((await mlRuleTest(rule, code)).violations).toStrictEqual(violations);
	},
);

test('[no-invalid-aria-prop-value-025] JSX: an empty value of an element whose role is not known is not reported', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<div role={r} aria-checked="" />', { parser })).violations).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-026] a value is read with its character references decoded', async () => {
	expect((await mlRuleTest(rule, '<div aria-hidden="&#116;rue"></div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="&#x20;"></div>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: 'The " " is disallowed on the "aria-pressed" ARIA state',
			raw: 'aria-pressed="&#x20;"',
		},
	]);
	expect((await mlRuleTest(rule, '<div aria-hidden="&#116;ru"></div>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "tru" is disallowed on the "aria-hidden" ARIA state',
			raw: 'aria-hidden="&#116;ru"',
		},
	]);
});

test('[no-invalid-aria-prop-value-027] an empty value of a property that a subclass role inherits as required', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="menuitemradio" aria-checked="" tabindex="0">a</div>', {
		rule: { value: true, options: { version: '1.2' } },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message: 'The "" is disallowed on the "aria-checked" ARIA state',
			raw: 'aria-checked=""',
		},
	]);
});

test.each([
	['<div role="separator" tabindex="0" aria-valuenow="5" aria-valuemin=""></div>', []],
	['<div role="separator" tabindex="0" aria-valuenow="5" aria-valuemax=""></div>', []],
	[
		'<div role="separator" tabindex="0" aria-valuenow=""></div>',
		v(36, 'The "" is disallowed on the "aria-valuenow" ARIA property', 'aria-valuenow=""'),
	],
] as const)(
	'[no-invalid-aria-prop-value-028] in ARIA 1.1, an empty value of a focusable separator is an author error only for aria-valuenow: %j',
	async (code, violations) => {
		expect((await mlRuleTest(rule, code, { rule: { options: { version: '1.1' } } })).violations).toStrictEqual(
			violations,
		);
	},
);

test('[no-invalid-aria-prop-value-029] an empty value of a property that the implicit role satisfies is the absent attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<hr tabindex="0" aria-valuenow="">');
	expect(violations).toStrictEqual([]);
});
