import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[label-no-multiple-controls-valid-001] empty label', async () => {
	const { violations } = await mlRuleTest(rule, '<label>Name</label>');
	expect(violations.length).toBe(0);
});

test('[label-no-multiple-controls-valid-002] one input', async () => {
	const { violations } = await mlRuleTest(rule, '<label>Name <input type="text"></label>');
	expect(violations.length).toBe(0);
});

test('[label-no-multiple-controls-valid-003] meter alone', async () => {
	const { violations } = await mlRuleTest(rule, '<label>Score <meter value="3" max="10">3</meter></label>');
	expect(violations.length).toBe(0);
});

test('[label-no-multiple-controls-invalid-001] two inputs', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<label>Name: <input type="text" name="first"> <input type="text" name="last"></label>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 47,
			message:
				'The "label" element may contain at most one form-control descendant (button, input, meter, output, progress, select, or textarea)',
			raw: '<input type="text" name="last">',
		},
	]);
});

test('[label-no-multiple-controls-invalid-002] mixed control types', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<label>Score <progress value="50" max="100">50</progress> <input type="number"></label>',
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.line).toBe(1);
	// `<input type="number">` follows the closing </progress>; pin position so a future
	// scope/serialisation change is caught here rather than only on the bench.
	expect(violations[0]?.col).toBe(59);
});

test('[label-no-multiple-controls-invalid-003] three controls reports two excess', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<label><input> <select><option>x</option></select> <textarea></textarea></label>',
	);
	expect(violations.length).toBe(2);
	expect(violations.map(v => v.col)).toStrictEqual([16, 52]);
});

test('[label-no-multiple-controls-valid-004] for references external labelable, no descendant control', async () => {
	const { violations } = await mlRuleTest(rule, '<input id="x"><label for="x">Name</label>');
	expect(violations.length).toBe(0);
});

test('[label-no-multiple-controls-invalid-004] for external labelable with descendant control', async () => {
	const { violations } = await mlRuleTest(rule, '<input id="x"><label for="x"><input></label>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 30,
			message:
				'The "label" element must not contain a form-control descendant when the "for" attribute references an external labelable element',
			raw: '<input>',
		},
	]);
});

test('[label-no-multiple-controls-invalid-005] for external labelable with multiple descendant controls reports all', async () => {
	const { violations } = await mlRuleTest(rule, '<input id="x"><label for="x"><input><textarea></textarea></label>');
	expect(violations.length).toBe(2);
	expect(violations.map(v => v.raw)).toStrictEqual(['<input>', '<textarea>']);
});

test('[label-no-multiple-controls-valid-005] for target is non-labelable falls back to internal rule', async () => {
	// `for` points at a non-labelable element (`<div>`), so the label is not bound to an
	// external labeled control. The single descendant is permitted; `label-for-references-labelable`
	// separately reports the non-labelable target.
	const { violations } = await mlRuleTest(rule, '<div id="x"></div><label for="x"><input></label>');
	expect(violations.length).toBe(0);
});

test('[label-no-multiple-controls-valid-006] for target is missing falls back to internal rule', async () => {
	// Missing target is reported by `no-refer-to-non-existent-id`; the single descendant
	// remains valid under this rule.
	const { violations } = await mlRuleTest(rule, '<label for="missing"><input></label>');
	expect(violations.length).toBe(0);
});

test('[label-no-multiple-controls-valid-007] for target is a descendant with matching id', async () => {
	// Same-tree lookup finds the descendant itself as the labeled control, so no violation.
	const { violations } = await mlRuleTest(rule, '<label for="x"><input id="x"></label>');
	expect(violations.length).toBe(0);
});

test('[label-no-multiple-controls-parser-001] Vue dynamic :for binding is skipped for the external-target branch', async () => {
	// A dynamic `:for` cannot be resolved statically; the rule must not decide "external
	// labeled control" on a template expression. The label is treated as if `for` were
	// absent, and the single descendant is permitted.
	const { violations } = await mlRuleTest(rule, '<input id="x"><label :for="labelId"><input></label>', {
		parser: { '.*': '@markuplint/vue-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[label-no-multiple-controls-parser-002] unresolved JSX pretender label is skipped', async () => {
	// A JSX component named like an HTML tag but without an `as` prop is an unresolved pretender —
	// its localName does not become `label`, so the rule's localName check short-circuits. Mirrors
	// the sibling `label-for-references-labelable-parser-002` fixture.
	const { violations } = await mlRuleTest(rule, '<div><input id="x"/><Label htmlFor="x"><input/></Label></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});
