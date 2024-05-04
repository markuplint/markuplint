import { describe, test, expect } from 'vitest';

import { ignoreFrontMatter } from './ignore-front-matter.js';

describe('ignoreFrontMatter', () => {
	test('basic', () => {
		expect(ignoreFrontMatter('---').code).toBe('---');
		expect(ignoreFrontMatter('---\np: v').code).toBe('---\np: v');
		expect(ignoreFrontMatter('---\np: v\n---').code).toBe('---\np: v\n---');
		expect(ignoreFrontMatter('---\np: v\n---\n').code).toBe('   \n    \n   \n');
	});

	test('basic', () => {
		expect(
			ignoreFrontMatter(`
---
prop: value
---
<html></html>`).code,
		).toBe('\n   \n           \n   \n<html></html>');
	});

	test('CRLF', () => {
		expect(
			ignoreFrontMatter(
				`
---
prop: value
---
<html></html>`.replaceAll('\n', '\r\n'),
			).code,
		).toBe('\r\n   \r\n           \r\n   \r\n<html></html>');
	});
});
