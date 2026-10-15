import { test, expect } from 'vitest';

import * as entry from './index.js';

test('the package entry point exposes the programmatic API documented in the README', () => {
	expect(Object.keys(entry).toSorted()).toStrictEqual(['CreateRuleHelperError', 'createRuleHelper']);
	expect(entry.createRuleHelper).toBeTypeOf('function');
	expect(new entry.CreateRuleHelperError('x')).toBeInstanceOf(Error);
});
