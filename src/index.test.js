import test from 'ava';
import * as markuplint from '../lib/';

test('foo', t => {
	markuplint.verify(`
	<div>Hello world</div>
	`);
	t.pass();
});
