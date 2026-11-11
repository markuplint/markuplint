import { describe, expect, test } from 'vitest';

import { isBracedExpression } from './is-braced-expression.js';

describe('isBracedExpression', () => {
	test.each([
		['{false}'],
		['{true}'],
		['{"x"}'],
		['{ x }'],
		['{a + b}'],
		['{a ? b : c}'],
		['{{ a: 1 }}'],
		['{ {a: 1} }'],
		['{fn({ a: 1 })}'],
		['{"}"}'],
		["{'{'}"],
		['{`${a}}`}'],
		['{[1, 2]}'],
	])('%s is one expression in braces', raw => {
		expect(isBracedExpression(raw)).toBe(true);
	});

	test.each([
		[''],
		['false'],
		['{}'],
		['{ }'],
		['{a}b'],
		['a{b}'],
		['page/{p}'],
		['{a}{b}'],
		['{a} {b}'],
		['{a}text{b}'],
		['{a} text'],
		['{"}"}{b}'],
		['{'],
		['}'],
		['{a'],
		['a}'],
		['{"unterminated}'],
	])('%j is not', raw => {
		expect(isBracedExpression(raw)).toBe(false);
	});
});
