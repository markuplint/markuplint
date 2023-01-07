import { mlRuleTest } from 'markuplint';

import rule from './';

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
});

test('Invalid: has multiple', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<select required multiple>
					<option value="">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			raw: 'required',
			message: 'Need the placeholder label option if it has the "required" attribute',
		},
	]);
});

test('Invalid: has size other than 1', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<select required size="2">
					<option value="">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			raw: 'required',
			message: 'Need the placeholder label option if it has the "required" attribute',
		},
	]);
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
			col: 9,
			raw: 'required',
			message: 'Need the placeholder label option if it has the "required" attribute',
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
			col: 9,
			raw: 'required',
			message: 'Need the placeholder label option if it has the "required" attribute',
		},
	]);
});
