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
