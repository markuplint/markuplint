import test from 'ava';
import * as markuplint from '../../lib/';
import rule from '../../lib/rules/markuplint-rule-indentation';

test('tab', async t => {
	const r = await markuplint.verify(
		`
		<div>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"indentation": "tab",
			},
		},
		[rule]
	);
	t.deepEqual(r, []);
});

test('tab', async t => {
	const r = await markuplint.verify(
		`
    <div>
        lorem
        <p>ipsam</p>
    </div>
		`,
		{
			rules: {
				indentation: 'tab',
			},
		},
		[rule]
	);
	t.deepEqual(r, [
		{
			message: 'Expected spaces. Indentaion is required tabs.',
			line: 2,
			col: 1,
			raw: `
    <div>`,
		},
		{
			message: 'Expected spaces. Indentaion is required tabs.',
			line: 4,
			col: 1,
			raw: `
        lorem
        <p>`,
		},
		{
			message: 'Expected spaces. Indentaion is required tabs.',
			line: 5,
			col: 1,
			raw: `
    </div>`,
		},
	]);
});

test('tab', async t => {
	const r = await markuplint.verify(
		`
    <div>
        lorem
        <p>ipsam</p>
    </div>
		`,
		{
			rules: {
				indentation: 4,
			},
		},
		[rule]
	);
	t.deepEqual(r, []);
});

test('tab', async t => {
	const r = await markuplint.verify(
		`
    <div>
        lorem
        <p>ipsam</p>
    </div>
		`,
		{
			rules: {
				indentation: 2,
			},
		},
		[rule]
	);
	t.deepEqual(r, []);
});

test('tab', async t => {
	const r = await markuplint.verify(
		`
	<div>
		lorem
		<p>ipsam</p>
	</div>
		`,
		{
			rules: {
				"indentation": 4,
			},
		},
		[rule]
	);
	t.deepEqual(r, [
		{
			message: 'Expected spaces. Indentaion is required spaces.',
			line: 2,
			col: 1,
			raw: `
	<div>`,
		},
		{
			message: 'Expected spaces. Indentaion is required spaces.',
			line: 4,
			col: 1,
			raw: `
		lorem
		<p>`,
		},
		{
			message: 'Expected spaces. Indentaion is required spaces.',
			line: 5,
			col: 1,
			raw: `
	</div>`,
		},
	]);
});

test('tab', async t => {
	const r = await markuplint.verify(
		`
   <div>
      lorem
      <p>ipsam</p>
   </div>
		`,
		{
			rules: {
				"indentation": 2,
			},
		},
		[rule]
	);
	t.deepEqual(r, [
		{
			message: 'Expected spaces. Indentaion is required 2 width spaces.',
			line: 2,
			col: 1,
			raw: `
   <div>`,
		},
		{
			message: 'Expected spaces. Indentaion is required 2 width spaces.',
			line: 5,
			col: 1,
			raw: `
   </div>`,
		},
	]);
});

test('noop', t => t.pass());
