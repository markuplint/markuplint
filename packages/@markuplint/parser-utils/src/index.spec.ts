import { ignoreFrontMatter } from './';

describe('ignoreFrontMatter', () => {
	it('basic', () => {
		expect(ignoreFrontMatter('---')).toStrictEqual('---');
		expect(ignoreFrontMatter('---\np: v')).toStrictEqual('---\np: v');
		expect(ignoreFrontMatter('---\np: v\n---')).toStrictEqual('---\np: v\n---');
		expect(ignoreFrontMatter('---\np: v\n---\n')).toStrictEqual('   \n    \n   \n');
	});

	it('basic', () => {
		expect(
			ignoreFrontMatter(`
---
prop: value
---
<html></html>`),
		).toStrictEqual('\n   \n           \n   \n<html></html>');
	});
});
