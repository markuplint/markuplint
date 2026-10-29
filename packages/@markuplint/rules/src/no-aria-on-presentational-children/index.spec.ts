import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const ineffective = (role: string) =>
	`It may be ineffective because it has the "${role}" role as an ancestor that doesn't expose its descendants to the accessibility tree`;

test('[no-aria-on-presentational-children-valid-001] no presentational role ancestor', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="group"><span aria-label="text"></span></div>')).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-valid-003] aria-label on a child of a role named from content is not reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button"><span aria-label="text"></span></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-invalid-001] aria attr on child of presentational children role', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><span aria-describedby="d"></span></div><p id="d">d</p>',
	);
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('warning');
});

test('[no-aria-on-presentational-children-valid-002] no aria on children', async () => {
	expect((await mlRuleTest(rule, '<div role="img"><span>text</span></div>')).violations).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4309-001] an upper-case aria-label on a child of a button is not reported, like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button"><span ARIA-LABEL="text"></span></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4309-002] an upper-case role on a child is reported like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button"><span ROLE="img"></span></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 26,
			message:
				'It may be ineffective because it has the "button" role as an ancestor that doesn\'t expose its descendants to the accessibility tree',
			raw: 'ROLE="img"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4309-003] JSX: an upper-case aria-label on an HTML child of a button is not reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button"><span ARIA-LABEL="text" /></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4309-004] JSX: an upper-case aria-* on an svg child is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(await mlRuleTest(rule, '<div role="button"><svg ARIA-LABEL="text" /></div>', { parser })).violations,
	).toStrictEqual([]);

	// Control: the lower-case name, an aria-label that takes effect on the button's name, is not reported either
	const { violations } = await mlRuleTest(rule, '<div role="button"><svg aria-label="text" /></div>', { parser });
	expect(violations).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4309-005] an upper-case aria-describedby on a child is reported like the lower-case one', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><span ARIA-DESCRIBEDBY="d"></span></div><p id="d">d</p>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 26,
			message:
				'It may be ineffective because it has the "button" role as an ancestor that doesn\'t expose its descendants to the accessibility tree',
			raw: 'ARIA-DESCRIBEDBY="d"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4309-006] JSX: an upper-case aria-describedby on an HTML child is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<><div role="button"><span ARIA-DESCRIBEDBY="d" /></div><p id="d">d</p></>',
		{
			parser: { '.*': '@markuplint/jsx-parser' },
		},
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 28,
			message:
				'It may be ineffective because it has the "button" role as an ancestor that doesn\'t expose its descendants to the accessibility tree',
			raw: 'ARIA-DESCRIBEDBY="d"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4309-007] JSX: an upper-case aria-describedby on an svg child is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(await mlRuleTest(rule, '<div role="button"><svg ARIA-DESCRIBEDBY="d" /></div>', { parser })).violations,
	).toStrictEqual([]);

	// Control: the lower-case name is reported on the same child
	const { violations } = await mlRuleTest(rule, '<div role="button"><svg aria-describedby="d" /></div>', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 25,
			message:
				'It may be ineffective because it has the "button" role as an ancestor that doesn\'t expose its descendants to the accessibility tree',
			raw: 'aria-describedby="d"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-001] aria-hidden="true" on a decorative svg in a button is not reported', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<button type="button"><svg aria-hidden="true" focusable="false" viewBox="0 0 1 1"><path d="M0 0" /></svg>Click</button>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-002] JSX: aria-hidden="true" on a decorative svg in a button is not reported', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<button type="button"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 1 1"><path d="M0 0" /></svg>Click</button>',
				{ parser: { '.*': '@markuplint/jsx-parser' } },
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-003] aria-label and aria-labelledby on a child of a button are not reported', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<button type="button"><span aria-label="Save">x</span><span aria-labelledby="file">y</span></button><span id="file">report.pdf</span>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-004] aria-hidden="true" on a child of a role whose name comes from content only is not reported', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="tab"><span aria-hidden="true">★</span>Settings</div>')).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-005] aria-hidden="true" on a child of a role that is not named from content is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="img"><span aria-hidden="true">deco</span></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 23,
			message: ineffective('img'),
			raw: 'aria-hidden="true"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-006] aria-hidden="true" in a button named by aria-label is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<button type="button" aria-label="Save"><svg aria-hidden="true"></svg></button>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 46,
			message: ineffective('button'),
			raw: 'aria-hidden="true"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-007] aria-hidden="true" under a child named by aria-label is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<button type="button"><span aria-label="Save"><svg aria-hidden="true"></svg></span></button>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 52,
			message: ineffective('button'),
			raw: 'aria-hidden="true"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-008] aria-label under a hidden child is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<button type="button"><span aria-hidden="true"><span aria-label="Save">x</span></span>Click</button>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 54,
			message: ineffective('button'),
			raw: 'aria-label="Save"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-009] aria-label on an element that is itself hidden is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<button type="button"><span aria-hidden="true" aria-label="Save">x</span>Click</button>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 48,
			message: ineffective('button'),
			raw: 'aria-label="Save"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-010] attributes that do not reach the name of a button are still reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<button type="button"><span aria-hidden="false">a</span><span aria-label="">b</span><span aria-describedby="d">c</span><span role="img">d</span></button><span id="d">desc</span>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 29,
			message: ineffective('button'),
			raw: 'aria-hidden="false"',
		},
		{
			severity: 'warning',
			line: 1,
			col: 63,
			message: ineffective('button'),
			raw: 'aria-label=""',
		},
		{
			severity: 'warning',
			line: 1,
			col: 91,
			message: ineffective('button'),
			raw: 'aria-describedby="d"',
		},
		{
			severity: 'warning',
			line: 1,
			col: 126,
			message: ineffective('button'),
			raw: 'role="img"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-011] role="none" that drops the title of an svg from the name of a button is not reported', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<button type="button"><svg role="none"><title>Save</title></svg><svg role="presentation"><title>Open</title></svg>Click</button>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-012] role="none" that does not change the name of a button is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><img src="s.svg" alt="" role="none"><span role="none">Save</span><img src="o.svg" alt="Open" role="none" tabindex="0"></div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 44,
			message: ineffective('button'),
			raw: 'role="none"',
		},
		{
			severity: 'warning',
			line: 1,
			col: 62,
			message: ineffective('button'),
			raw: 'role="none"',
		},
		{
			severity: 'warning',
			line: 1,
			col: 113,
			message: ineffective('button'),
			raw: 'role="none"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-013] role="none" that drops the alt of an image from the name of a button is not reported, though ARIA in HTML does not permit it', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<button type="button"><img src="s.svg" alt="Save" role="none"><img src="o.svg" alt="Open" role="presentation"></button>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-014] a component pretending a decorative svg in a button is not reported', async () => {
	const pretend = (name: string, value: string) => ({
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [{ selector: 'Icon', as: { element: 'svg', attrs: [{ name, value }] } }],
	});
	expect(
		(await mlRuleTest(rule, '<button type="button"><Icon />Click</button>', pretend('aria-hidden', 'true')))
			.violations,
	).toStrictEqual([]);

	// Control: a pretended attribute that does not reach the name is reported on the same component
	const { violations } = await mlRuleTest(
		rule,
		'<button type="button"><Icon />Click</button>',
		pretend('aria-describedby', 'd'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 23,
			message: ineffective('button'),
			raw: '<Icon />',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-015] aria-label under an element named by its own host language label is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><fieldset title="t"><span aria-label="x">y</span></fieldset></div>',
	);
	expect(violations).toStrictEqual([
		{ severity: 'warning', line: 1, col: 46, message: ineffective('button'), raw: 'aria-label="x"' },
	]);
});

test('[no-aria-on-presentational-children-issue-4408-016] aria-label in a hidden button is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button" aria-hidden="true"><span aria-label="x"></span></div>',
	);
	expect(violations).toStrictEqual([
		{ severity: 'warning', line: 1, col: 45, message: ineffective('button'), raw: 'aria-label="x"' },
	]);
});

test('[no-aria-on-presentational-children-issue-4408-017] aria-label on an embedded control is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="checkbox" aria-checked="false"><input type="text" aria-label="x" value="v"></div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 62,
			message: ineffective('checkbox'),
			raw: 'aria-label="x"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-018] aria-labelledby that refers to no element is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><span aria-labelledby="missing">Save</span></div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 26,
			message: ineffective('button'),
			raw: 'aria-labelledby="missing"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-019] aria-hidden="true" on an element hidden by the hidden attribute is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><span hidden aria-hidden="true">x</span>Save</div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 33,
			message: ineffective('button'),
			raw: 'aria-hidden="true"',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4408-020] aria-label inside a component that does not render it into the name is reported', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const named = await mlRuleTest(rule, '<button type="button"><Wrap><span aria-label="x">y</span></Wrap></button>', {
		parser,
		pretenders: [{ selector: 'Wrap', as: { element: 'span', aria: { name: true } } }],
	});
	const childless = await mlRuleTest(
		rule,
		'<button type="button"><Wrap><span aria-label="x">y</span></Wrap></button>',
		{
			parser,
			pretenders: [{ selector: 'Wrap', as: { element: 'span', slots: null } }],
		},
	);
	const violation = {
		severity: 'warning',
		line: 1,
		col: 35,
		message: ineffective('button'),
		raw: 'aria-label="x"',
	};
	expect([named.violations, childless.violations]).toStrictEqual([[violation], [violation]]);
});

test('[no-aria-on-presentational-children-issue-4408-021] aria-hidden="true" in a role named from author that aria-labelledby refers to is not reported', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div role="img" id="pic"><span aria-hidden="true">decor</span>Chart</div><figure aria-labelledby="pic"></figure>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-022] aria-label under a hidden element of a node aria-labelledby refers to is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="img" id="pic"><span aria-hidden="true"><span aria-label="x">y</span></span>Chart</div><figure aria-labelledby="pic"></figure>',
	);
	expect(violations).toStrictEqual([
		{ severity: 'warning', line: 1, col: 57, message: ineffective('img'), raw: 'aria-label="x"' },
	]);
});

test('[no-aria-on-presentational-children-issue-4408-023] aria-labelledby on an embedded control is not reported', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div role="checkbox" aria-checked="false">Flash <input type="text" value="5" aria-labelledby="n"> times</div><span id="n">five</span>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-024] aria-hidden="true" that an outer button reads through an inner img is not reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><div role="img"><span aria-hidden="true">x</span>Y</div></div>',
	);
	// Only the role of the inner element, which the button does not expose, is reported
	expect(violations).toStrictEqual([
		{ severity: 'warning', line: 1, col: 25, message: ineffective('button'), raw: 'role="img"' },
	]);
});

test('[no-aria-on-presentational-children-issue-4408-025] aria-hidden="true" that the name of a labeled control reads is not reported', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<input id="i" type="text"><label for="i"><span role="img"><span aria-hidden="true">x</span>Y</span></label>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-026] aria-label that an aria-labelledby of the same element overrides is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><span aria-labelledby="x" aria-label="y">z</span></div><p id="x">x</p>',
	);
	expect(violations).toStrictEqual([
		{ severity: 'warning', line: 1, col: 46, message: ineffective('button'), raw: 'aria-label="y"' },
	]);
});

test('[no-aria-on-presentational-children-issue-4408-027] aria-labelledby that refers only to elements without text is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><span aria-labelledby="e">Save</span></div><span id="e"></span>',
	);
	expect(violations).toStrictEqual([
		{ severity: 'warning', line: 1, col: 26, message: ineffective('button'), raw: 'aria-labelledby="e"' },
	]);
});

test('[no-aria-on-presentational-children-issue-4408-028] only the attribute that takes no effect is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><span aria-hidden="true" aria-describedby="d">x</span>Save</div><p id="d">d</p>',
	);
	expect(violations).toStrictEqual([
		{ severity: 'warning', line: 1, col: 45, message: ineffective('button'), raw: 'aria-describedby="d"' },
	]);
});

test('[no-aria-on-presentational-children-issue-4408-029] aria-hidden="true" in a hidden node that aria-labelledby refers to is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="img" id="pic" hidden><span aria-hidden="true">x</span>Chart</div><figure aria-labelledby="pic"></figure>',
	);
	expect(violations).toStrictEqual([
		{ severity: 'warning', line: 1, col: 39, message: ineffective('img'), raw: 'aria-hidden="true"' },
	]);
});

test('[no-aria-on-presentational-children-issue-4408-030] aria-hidden="true" on an embedded control is not reported', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div role="checkbox" aria-checked="false"><input type="text" aria-hidden="true" value="v">Flash</div>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-031] aria-hidden="true" in a role named from author that aria-describedby refers to is not reported', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div role="img" id="pic"><span aria-hidden="true">decor</span>Chart</div><figure aria-describedby="pic"></figure>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-032] aria-label that a link outside the img reads is not reported', async () => {
	expect(
		(await mlRuleTest(rule, '<a href="#"><span role="img"><span aria-label="Home"></span></span></a>')).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-033] a role that makes a child of a button a range control, and its value, are not reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<button><span role="slider" aria-valuenow="5" aria-valuemin="0" aria-valuemax="10">volume</span></button>',
	);
	// aria-valuemin and aria-valuemax do not reach the name
	expect(violations).toStrictEqual([
		{ severity: 'warning', line: 1, col: 47, message: ineffective('button'), raw: 'aria-valuemin="0"' },
		{ severity: 'warning', line: 1, col: 65, message: ineffective('button'), raw: 'aria-valuemax="10"' },
	]);
});

test('[no-aria-on-presentational-children-issue-4408-034] aria-label that an aria-labelledby referring to its own element reads is not reported', async () => {
	expect(
		(await mlRuleTest(rule, '<button><span id="s" aria-labelledby="s" aria-label="Close"></span></button>'))
			.violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4408-035] aria-hidden="true" that a control nested in the label reads is not reported', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<label for="x"><input id="a" type="checkbox"><span role="img"><svg aria-hidden="true"></svg>Text</span></label><input id="x">',
			)
		).violations,
	).toStrictEqual([]);
});
