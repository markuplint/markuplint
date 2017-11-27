import test from 'ava';
import * as markuplint from '../../lib/';
import rule from '../../lib/rules/markuplint-rule-attr-value-double-quotes';

// test('lower case', async t => {
// 	const r = await markuplint.verify(
// 		`
// 		<div data-attr="value" data-Attr='db' data-attR=tr>
// 			lorem
// 			<p>ipsam</p>
// 		</div>
// 		`,
// 		{
// 			rules: {
// 				"attr-value-double-quotes": true,
// 			},
// 		},
// 		[rule]
// 	);
// 	t.deepEqual(r, [
// 		{
// 			message: 'Duplication of attribute.',
// 			line: 4,
// 			col: 3,
// 			raw: 'data-Attr=\'db\'',
// 		},
// 		{
// 			message: 'Duplication of attribute.',
// 			line: 4,
// 			col: 3,
// 			raw: 'data-attR=tr',
// 		}
// 	]);
// });

test('noop', t => t.pass());
