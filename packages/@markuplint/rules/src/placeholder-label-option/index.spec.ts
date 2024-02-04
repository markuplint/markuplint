import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('Valid placeholder', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<select required>
					<option value="">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(
				rule,
				`<select required multiple>
					<option value="placeholder">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(
				rule,
				`<select required size="2">
					<option value="placeholder">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([]);
});

test("Invalid: first option element's value is not empty", async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<select required>
					<option value="placeholder">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<select required>',
			message: 'Need the placeholder label option',
		},
	]);

	expect(
		(
			await mlRuleTest(
				rule,
				`<select required size="1">
					<option value="placeholder">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<select required size="1">',
			message: 'Need the placeholder label option',
		},
	]);
});

test("Invalid: Invalid: first option element's parent is optgroup", async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<select required>
					<optgroup label="Group">
						<option value="">Placeholder</option>
					</optgroup>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<select required>',
			message: 'Need the placeholder label option',
		},
	]);
});

test('The `as` attribute', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<x-select as="select" required>
					<optgroup label="Group">
						<option value="">Placeholder</option>
					</optgroup>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</x-select>`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<x-select as="select" required>',
			message: 'Need the placeholder label option',
		},
	]);
});
