import test from 'ava';
import parser from '../lib/parser';

test('foo', t => {
	const r = parser(``);
	r.walk((n) => {
		console.log(n.nodeName);
	});
	t.pass();
});
