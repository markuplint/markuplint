import { test, expect } from 'vitest';
import { mlRuleTest } from 'markuplint';
import rule from './index.js';

test('detects label and aria-labelledby conflict', async () => {
	const { violations } = await mlRuleTest(rule, `
		<label for="input1">Label text</label>
		<span id="label-text">Reference text</span>
		<input type="text" id="input1" aria-labelledby="label-text" />
	`);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 4,
			col: 3,
			message: 'Multiple accessible name sources detected: <label> element and aria-labelledby attribute',
			raw: '<input type="text" id="input1" aria-labelledby="label-text" />',
		},
	]);
});

test('detects label and aria-label conflict', async () => {
	const { violations } = await mlRuleTest(rule, `
		<label for="input1">Label text</label>
		<input type="text" id="input1" aria-label="ARIA label text" />
	`);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 3,
			message: 'Multiple accessible name sources detected: <label> element and aria-label attribute',
			raw: '<input type="text" id="input1" aria-label="ARIA label text" />',
		},
	]);
});

test('detects parent label and aria-labelledby conflict', async () => {
	const { violations } = await mlRuleTest(rule, `
		<span id="label-text">Reference text</span>
		<label>
			Label text
			<input type="text" aria-labelledby="label-text" />
		</label>
	`);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 5,
			col: 4,
			message: 'Multiple accessible name sources detected: <label> element and aria-labelledby attribute',
			raw: '<input type="text" aria-labelledby="label-text" />',
		},
	]);
});

test('detects multiple label elements', async () => {
	const { violations } = await mlRuleTest(rule, `
		<label for="input1">External label</label>
		<label>
			Parent label
			<input type="text" id="input1" />
		</label>
	`);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 5,
			col: 4,
			message: 'Multiple accessible name sources detected: multiple <label> elements (both associated and parent)',
			raw: '<input type="text" id="input1" />',
		},
	]);
});

test('no violations for single label', async () => {
	const { violations } = await mlRuleTest(rule, `
		<label for="input1">Label text</label>
		<input type="text" id="input1" />
	`);

	expect(violations).toStrictEqual([]);
});

test('no violations for only aria-label', async () => {
	const { violations } = await mlRuleTest(rule, `
		<input type="text" aria-label="ARIA label" />
	`);

	expect(violations).toStrictEqual([]);
});

test('no violations for only aria-labelledby', async () => {
	const { violations } = await mlRuleTest(rule, `
		<span id="label-text">Reference text</span>
		<input type="text" aria-labelledby="label-text" />
	`);

	expect(violations).toStrictEqual([]);
});

test('no violations for non-form elements', async () => {
	const { violations } = await mlRuleTest(rule, `
		<label for="div1">Label text</label>
		<div id="div1" aria-label="ARIA label">Content</div>
	`);

	expect(violations).toStrictEqual([]);
});

test('detects multiple conflicts on same element', async () => {
	const { violations } = await mlRuleTest(rule, `
		<label for="input1">External label</label>
		<label>
			Parent label
			<input type="text" id="input1" aria-label="ARIA label" aria-labelledby="ref" />
		</label>
		<span id="ref">Reference</span>
	`);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 5,
			col: 4,
			message: 'Multiple accessible name sources detected: <label> element and aria-labelledby attribute and <label> element and aria-label attribute and multiple <label> elements (both associated and parent)',
			raw: '<input type="text" id="input1" aria-label="ARIA label" aria-labelledby="ref" />',
		},
	]);
});

test('works with textarea elements', async () => {
	const { violations } = await mlRuleTest(rule, `
		<label for="textarea1">Label text</label>
		<textarea id="textarea1" aria-label="ARIA label"></textarea>
	`);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 3,
			message: 'Multiple accessible name sources detected: <label> element and aria-label attribute',
			raw: '<textarea id="textarea1" aria-label="ARIA label">',
		},
	]);
});

test('works with select elements', async () => {
	const { violations } = await mlRuleTest(rule, `
		<label for="select1">Label text</label>
		<select id="select1" aria-labelledby="ref">
			<option>Option</option>
		</select>
		<span id="ref">Reference</span>
	`);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 3,
			message: 'Multiple accessible name sources detected: <label> element and aria-labelledby attribute',
			raw: '<select id="select1" aria-labelledby="ref">',
		},
	]);
});

test('works with button elements', async () => {
	const { violations } = await mlRuleTest(rule, `
		<label for="button1">Label text</label>
		<button id="button1" aria-label="ARIA label">Button text</button>
	`);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 3,
			message: 'Multiple accessible name sources detected: <label> element and aria-label attribute',
			raw: '<button id="button1" aria-label="ARIA label">',
		},
	]);
});

test('no violations for button with content and aria-label only', async () => {
	const { violations } = await mlRuleTest(rule, `
		<button aria-label="ARIA label">Button text</button>
	`);

	expect(violations).toStrictEqual([]);
});