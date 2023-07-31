import { test, expect } from 'vitest';

import { regexSelectorMatches } from './regex-selector-matches.js';

test('regexSelectorMatches', () => {
	expect(regexSelectorMatches('/^data-([a-z]+)/', 'data-hoge', true)).toStrictEqual({
		$0: 'data-hoge',
		$1: 'hoge',
	});

	expect(regexSelectorMatches('/^data-(?<dataName>[a-z]+)/', 'data-hoge', true)).toStrictEqual({
		$0: 'data-hoge',
		$1: 'hoge',
		dataName: 'hoge',
	});

	expect(regexSelectorMatches('/^data-(?<dataName>[a-z]+)/', 'noop', true)).toBeNull();
});
