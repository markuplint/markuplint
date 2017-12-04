import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-attr-no-duplication';

const rule = new CustomRule();

test('lower case', async t => {
	const r = await markuplint.verify(
		`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"attr-no-duplication": true,
			},
		},
		[rule]
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'Duplication of attribute.',
			line: 2,
			col: 25,
			raw: 'data-Attr=\'db\'',
		},
		{
			level: 'error',
			message: 'Duplication of attribute.',
			line: 2,
			col: 40,
			raw: 'data-attR=tr',
		}
	]);
});

test('lower case', async t => {
	const r = await markuplint.verify(
		`
		<div
			data-attr="value"
			data-Attr='db'
			data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"attr-no-duplication": true,
			},
		},
		[rule]
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'Duplication of attribute.',
			line: 4,
			col: 3,
			raw: 'data-Attr=\'db\'',
		},
		{
			level: 'error',
			message: 'Duplication of attribute.',
			line: 5,
			col: 3,
			raw: 'data-attR=tr',
		}
	]);
});

test('noop', t => t.pass());
