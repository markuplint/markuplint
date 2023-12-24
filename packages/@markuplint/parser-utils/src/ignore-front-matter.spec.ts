import { describe, test, expect } from 'vitest';

import { ignoreFrontMatter } from './ignore-front-matter.js';

describe('ignoreFrontMatter', () => {
	test('basic', () => {
		expect(ignoreFrontMatter('---')).toStrictEqual('---');
		expect(ignoreFrontMatter('---\np: v')).toStrictEqual('---\np: v');
		expect(ignoreFrontMatter('---\np: v\n---')).toStrictEqual('---\np: v\n---');
		expect(ignoreFrontMatter('---\np: v\n---\n')).toStrictEqual('   \n    \n   \n');
	});

	test('basic', () => {
		expect(
			ignoreFrontMatter(`
---
prop: value
---
<html></html>`),
		).toStrictEqual('\n   \n           \n   \n<html></html>');
	});

	test('CRLF', () => {
		expect(
			ignoreFrontMatter(
				`
---
prop: value
---
<html></html>`.replaceAll('\n', '\r\n'),
			),
		).toStrictEqual('\r\n   \r\n           \r\n   \r\n<html></html>');
	});
});
