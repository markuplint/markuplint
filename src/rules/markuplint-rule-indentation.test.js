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
				"indentation": "tab",
			},
		},
		[rule]
	);
	t.deepEqual(r, []);
});

test('noop', t => t.pass());
