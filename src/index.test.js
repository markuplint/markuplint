import test from 'ava';
import * as markuplint from '../lib/';

test('foo', async t => {
	const r = await markuplint.verifyFile('./src/test/001.html');
	t.deepEqual(r, []);
});
