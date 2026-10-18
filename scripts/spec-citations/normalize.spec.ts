import { describe, expect, test } from 'vitest';

import { containsQuote, containsText, hashText, normalizeSpecText, quoteParts } from './normalize.ts';

describe('normalizeSpecText', () => {
	test('[normalize-001] collapses whitespace and non-breaking spaces', () => {
		expect(normalizeSpecText('a \n\t b  c')).toBe('a b c');
	});

	test('[normalize-002] drops whitespace next to Japanese characters', () => {
		expect(normalizeSpecText('属性 は\n名前 および value を\n持つ')).toBe('属性は名前およびvalueを持つ');
	});

	test('[normalize-003] keeps the single space between Latin words', () => {
		expect(normalizeSpecText('the  select   element')).toBe('the select element');
	});
});

describe('quoteParts', () => {
	test('[normalize-004] strips Markdown decoration and folds curly quotes', () => {
		expect(
			quoteParts('The `value` attribute, **if** specified, “must” be [empty](https://example.com).'),
		).toStrictEqual(['The value attribute, if specified, "must" be empty.']);
	});

	test('[normalize-005] splits on an ellipsis', () => {
		expect(quoteParts('the value of the first option … is the empty string')).toStrictEqual([
			'the value of the first option',
			'is the empty string',
		]);
		expect(quoteParts('a ... b')).toStrictEqual(['a', 'b']);
	});
});

describe('rendering differences', () => {
	test('[normalize-012] treats [...] like an ellipsis', () => {
		expect(quoteParts('Initialize node to be the current node […]. If node is not')).toStrictEqual([
			'Initialize node to be the current node',
			'. If node is not',
		]);
		expect(quoteParts('a [...] b')).toStrictEqual(['a', 'b']);
	});

	test('[normalize-013] ignores a colon that the spec stylesheet adds after a list term', () => {
		const dom = normalizeSpecText('An end-of-file token Stop parsing. Anything else Parse error.');
		expect(containsQuote(dom, 'An end-of-file token: Stop parsing. Anything else: Parse error.')).toBe(true);
		const withColon = normalizeSpecText('Elements that can fire an event, including: Elements that are focused.');
		expect(containsQuote(withColon, 'can fire an event, including Elements that are focused')).toBe(true);
		expect(containsText('token Stop parsing', 'token: Stop')).toBe(true);
	});

	test('[normalize-014] ignores a colon that ends a quote or one of its parts', () => {
		const dom = normalizeSpecText('The user agent must run the following steps: Let x be 0.');
		expect(containsQuote(dom, 'The user agent must run the following steps:')).toBe(true);
		expect(containsQuote(dom, 'must run the following steps: … Let x be 0.')).toBe(true);
	});
});

describe('containsQuote', () => {
	const scope = normalizeSpecText(
		'If a select element has a required attribute specified, and has a display size of 1; then it is the placeholder.',
	);

	test('[normalize-006] matches a verbatim sentence regardless of decoration and case', () => {
		expect(containsQuote(scope, 'If a `select` element has a **required** attribute specified')).toBe(true);
		expect(containsQuote(scope, 'if a select element has a required attribute specified')).toBe(true);
	});

	test('[normalize-007] requires the parts of an elided quote to appear in order', () => {
		expect(containsQuote(scope, 'If a select element … then it is the placeholder.')).toBe(true);
		expect(containsQuote(scope, 'then it is the placeholder. … If a select element')).toBe(false);
	});

	test('[normalize-008] rejects a sentence whose middle was reworded', () => {
		expect(
			containsQuote(
				scope,
				'If a select element has a required attribute specified, does not have a multiple attribute',
			),
		).toBe(false);
	});

	test('[normalize-009] never matches an empty quote', () => {
		expect(containsQuote(scope, '')).toBe(false);
		expect(containsQuote(scope, '…')).toBe(false);
	});
});

describe('containsText', () => {
	test('[normalize-010] compares case-insensitively like a text fragment', () => {
		expect(containsText('Attributes have a name and a value', 'ATTRIBUTES have a')).toBe(true);
		expect(containsText('Attributes have a name', 'upper alphas')).toBe(false);
	});
});

describe('hashText', () => {
	test('[normalize-011] is a stable sha256 hex digest', () => {
		expect(hashText('a')).toBe('ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
	});
});
