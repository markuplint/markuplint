import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-case-sensitive-tag-name';

const rule = new CustomRule();

test('lower case', async t => {
	const r = await markuplint.verify(
		`
		<div>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"case-sensitive-tag-name": true,
			},
		},
		[rule]
	);
	t.deepEqual(r, []);
});

test('upper case', async t => {
	const r = await markuplint.verify(
		`
		<DIV>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"case-sensitive-tag-name": true,
			},
		},
		[rule]
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'HTMLElement name must be lowercase',
			line: 2,
			col: 3,
			raw: '<DIV>',
		}
	]);
});

test('svg', async t => {
	const r = await markuplint.verify(
		`
		<svg>
			<textPath>ipsam</textPath>
		</svg>
		`,
		{
			rules: {
				"case-sensitive-tag-name": true,
			},
		},
		[rule]
	);
	t.deepEqual(r, []);
});

test('custom element', async t => {
	const r = await markuplint.verify(
		`
		<x-customElement></x-customElement>
		`,
		{
			rules: {
				"case-sensitive-tag-name": true,
			},
		},
		[rule]
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'HTMLElement name must be lowercase',
			line: 2,
			col: 3,
			raw: '<x-customElement>',
		}
	]);
});

test('noop', t => t.pass());
