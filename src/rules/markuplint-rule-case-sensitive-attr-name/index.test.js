import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-case-sensitive-attr-name';

const rule = new CustomRule();

test('lower case', async t => {
	const r = await markuplint.verify(
		`
		<div data-lowercase>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"case-sensitive-attr-name": true,
			},
		},
		[rule]
	);
	t.deepEqual(r, []);
});

test('upper case', async t => {
	const r = await markuplint.verify(
		`
		<div data-UPPERCASE="value">
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"case-sensitive-attr-name": true,
			},
		},
		[rule]
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'HTMLElement attribute name must be lowercase',
			line: 2,
			col: 8,
			raw: 'data-UPPERCASE="value"',
		}
	]);
});

test('upper case', async t => {
	const r = await markuplint.verify(
		`
		<div data-UPPERCASE>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"case-sensitive-attr-name": true,
			},
		},
		[rule]
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'HTMLElement attribute name must be lowercase',
			line: 2,
			col: 8,
			raw: 'data-UPPERCASE',
		}
	]);
});

test('upper case', async t => {
	const r = await markuplint.verify(
		`
		<div  data-UPPERCASE>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"case-sensitive-attr-name": true,
			},
		},
		[rule]
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'HTMLElement attribute name must be lowercase',
			line: 2,
			col: 9,
			raw: 'data-UPPERCASE',
		}
	]);
});

test('upper case', async t => {
	const r = await markuplint.verify(
		`
		<div

		data-UPPERCASE>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"case-sensitive-attr-name": true,
			},
		},
		[rule]
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'HTMLElement attribute name must be lowercase',
			line: 4,
			col: 3,
			raw: 'data-UPPERCASE',
		}
	]);
});

test('noop', t => t.pass());
