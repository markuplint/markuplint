import type { Pattern } from './types.js';

import { test, expect } from 'vitest';

import { check } from './check.js';

test('Any', () => {
	expect(check('', 'Any').matched).toBe(true);
	expect(check(' ', 'Any').matched).toBe(true);
	expect(check('a', 'Any').matched).toBe(true);
});

test('NoEmptyAny', () => {
	expect(check('', 'NoEmptyAny').matched).toBe(false);
	expect(check(' ', 'NoEmptyAny').matched).toBe(true);
	expect(check('a', 'NoEmptyAny').matched).toBe(true);
});

test('OneLineAny', () => {
	expect(check('', 'OneLineAny').matched).toBe(true);
	expect(check(' ', 'OneLineAny').matched).toBe(true);
	expect(check('a', 'OneLineAny').matched).toBe(true);
	expect(check('a ', 'OneLineAny').matched).toBe(true);
	expect(check('a b', 'OneLineAny').matched).toBe(true);
	expect(check('a\n', 'OneLineAny').matched).toBe(false);
	expect(check('a\nb', 'OneLineAny').matched).toBe(false);
	expect(check('a\r\nb', 'OneLineAny').matched).toBe(false);
	expect(check('a\rb', 'OneLineAny').matched).toBe(false);
});

test('Pattern (keyword)', () => {
	expect(check('.*', 'Pattern').matched).toBe(true);
	expect(check('[a-z]+', 'Pattern').matched).toBe(true);
	expect(check(']//[()?!+*', 'Pattern').matched).toBe(false);
});

test('Pattern (object)', () => {
	expect(check('hello', { pattern: '/^he/' }).matched).toBe(true);
	expect(check('hello', { pattern: '/^xyz/' }).matched).toBe(false);
	expect(check('foo', { pattern: 'foo' }).matched).toBe(true);
	expect(check('foo', { pattern: 'bar' }).matched).toBe(false);
	expect(check('Hello', { pattern: '/hello/i' }).matched).toBe(true);
});

/**
 * Regression sentinel for schema drift.
 *
 * If `gen/specific-schema.json` ever loses its `pattern` definition, the next
 * `yarn workspace @markuplint/types run schema` drops the `Pattern` interface
 * from `src/types.schema.ts`, and this test fails at compile time because the
 * `Pattern` import and the annotated variable can no longer be resolved.
 */
test('Pattern type is exported from types.schema.ts (drift sentinel)', () => {
	const type: Pattern = { pattern: '/^foo$/' };
	expect(check('foo', type).matched).toBe(true);
	expect(check('bar', type).matched).toBe(false);
});

test('BCP47', () => {
	expect(check('en', 'BCP47').matched).toBe(true);
	expect(check('en-US', 'BCP47').matched).toBe(true);
	expect(check('ja', 'BCP47').matched).toBe(true);
	expect(check(' ja ', 'BCP47').matched).toBe(false);
	// Empty string is valid per HTML LS (language set to unknown)
	expect(check('', 'BCP47').matched).toBe(true);
	expect(check('zh/cn', 'BCP47').matched).toBe(false);
});

test('SRIHash', () => {
	expect(check('sha256-abc123', 'SRIHash').matched).toBe(true);
	expect(check('sha384-abc123==', 'SRIHash').matched).toBe(true);
	expect(check('sha512-abc+def/ghi=', 'SRIHash').matched).toBe(true);
	expect(check('sha256-abc123 sha384-def456', 'SRIHash').matched).toBe(true);
	expect(check('md5-abc123', 'SRIHash').matched).toBe(false);
	expect(check('sha1-abc123', 'SRIHash').matched).toBe(false);
	expect(check('', 'SRIHash').matched).toBe(false);
});

test('Srcset', () => {
	expect(check('a/bb/ccc/dddd', 'Srcset').matched).toBe(true);
	expect(check('a/bb/ccc/dddd 200w', 'Srcset').matched).toBe(true);
	// Bug fix: width + density descriptor mixing must be invalid
	expect(check('a/bb/ccc/dddd 200w, b/cc/ddd/eeee  1.5x ', 'Srcset').matched).toBe(false);
	expect(check('a/bb/ccc/dddd 200w, b/cc/ddd/eeee  1.5a', 'Srcset').matched).toBe(false);
	expect(check('a/bb/ccc/dddd 200w, b/cc/ddd/eeee  1.5x  unexpected-string', 'Srcset').matched).toBe(false);
	// Issue #1171
	expect(check('/path/to/file 1x, /path/to/file@2x 2x', 'Srcset').matched).toBe(true);

	// Descriptor consistency
	expect(check('a.jpg 480w, b.jpg 1024w', 'Srcset').matched).toBe(true);
	expect(check('a.jpg 1x, b.jpg 2x', 'Srcset').matched).toBe(true);
	expect(check('a.jpg, b.jpg', 'Srcset').matched).toBe(true);
	expect(check('a.jpg, b.jpg 2x', 'Srcset').matched).toBe(true);
	expect(check('a.jpg 480w, b.jpg', 'Srcset').matched).toBe(false);
	expect(check('a.jpg 480w, b.jpg 2x', 'Srcset').matched).toBe(false);
	expect(check('a.jpg 480w, b.jpg 2x, c.jpg', 'Srcset').matched).toBe(false);

	// Width descriptor must be > 0
	expect(check('a.jpg 0w', 'Srcset').matched).toBe(false);

	// Pixel density descriptor must be > 0
	expect(check('a.jpg 0x', 'Srcset').matched).toBe(false);
	expect(check('a.jpg 0.0x', 'Srcset').matched).toBe(false);
	expect(check('a.jpg -1x', 'Srcset').matched).toBe(false);
});

test('IconSize', () => {
	expect(check('any', 'IconSize').matched).toBe(true);
	expect(check('Any', 'IconSize').matched).toBe(true);
	expect(check('10x10', 'IconSize').matched).toBe(true);
	expect(check('1x1', 'IconSize').matched).toBe(true);
	expect(check('1x0', 'IconSize').matched).toBe(false);
	expect(check('0x1', 'IconSize').matched).toBe(false);
	expect(check('0x0', 'IconSize').matched).toBe(false);
	expect(check('', 'IconSize').matched).toBe(false);
	expect(check(' ', 'IconSize').matched).toBe(false);
	expect(check('1', 'IconSize').matched).toBe(false);
	expect(check('1x', 'IconSize').matched).toBe(false);
	expect(check('x1', 'IconSize').matched).toBe(false);
});

test('Number', () => {
	expect(check('10', { type: 'integer', gt: 0 }).matched).toBe(true);
	expect(check('0', { type: 'integer', gt: 0 }).matched).toBe(false);
	expect(check('0', { type: 'integer', gte: 0 }).matched).toBe(true);
	expect(check('9', { type: 'integer', lt: 10 }).matched).toBe(true);
	expect(check('10', { type: 'integer', lt: 10 }).matched).toBe(false);
});

test('Non-exist types', () => {
	// @ts-ignore
	expect(check('abc', 'String').matched).toBe(true);
	// @ts-ignore
	expect(check('abc', 'FooBar').matched).toBe(true);
	// @ts-ignore
	expect(check('abc', ' ').matched).toBe(true);
	// @ts-ignore
	expect(check('abc', '\n').matched).toBe(true);
	// @ts-ignore
	expect(check('abc', '').matched).toBe(true);
});

test('ItemProp', () => {
	expect(check('itemListElement', 'ItemProp').matched).toBe(true);
	expect(check('item', 'ItemProp').matched).toBe(true);
	expect(check('position', 'ItemProp').matched).toBe(true);
});

test('legacy-transform', () => {
	expect(check('translate(300)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300px)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300 300)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300px 300px)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300 , 300)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300px , 300px)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300,300)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300px,300px)', "<'transform'>").matched).toBeTruthy();
});

test('directive', () => {
	const directive = {
		directive: ['/^closest\\s+(?<token>.+)$/', '/^previous\\s+(?<token>.+)$/', 'next '],
		token: '<complex-selector-list>',
	} as const;

	expect(check('closest #id', directive)).toBeTruthy();
	expect(check('closest .class', directive).matched).toBeTruthy();
	expect(check('closest type', directive).matched).toBeTruthy();
	expect(check('closes type', directive).matched).toBeFalsy();
	expect(check('previous #id', directive).matched).toBeTruthy();
	expect(check('previous .class', directive).matched).toBeTruthy();
	expect(check('previous type', directive).matched).toBeTruthy();
	expect(check('prev #id', directive).matched).toBeFalsy();
	expect(check('next #id', directive).matched).toBeTruthy();
	expect(check('nex #id', directive).matched).toBeFalsy();
	expect(check(' next #id', directive).matched).toBeFalsy();
});

test('JSON', () => {
	expect(check('{"a": 1}', 'JSON').matched).toBeTruthy();
	expect(check('{"a": 1', 'JSON').matched).toBeFalsy();
	expect(check('{"a": 1,}', 'JSON').matched).toBeFalsy();
	expect(check('{"a": 1, "b": 2}', 'JSON').matched).toBeTruthy();
	expect(check('{"a": 1, "b": 2', 'JSON').matched).toBeFalsy();
	expect(check('{"a": 1, "b": 2,}', 'JSON').matched).toBeFalsy();
});

// URL Living Standard family — verifies the `defs.ts` wrapper logic on top of
// the shared `checkURLOnce` closure. The full URL LS validation surface is
// covered in `whatwg/check-url.spec.ts`; these tests pin the per-attribute
// composition layer (empty-rejection / scheme prohibition / absolute check).

test('URL', () => {
	expect(check('', 'URL').matched).toBe(true);
	expect(check('https://example.com', 'URL').matched).toBe(true);
	expect(check('/relative/path', 'URL').matched).toBe(true);
	// URL LS validation errors must propagate (covered exhaustively in
	// check-url.spec.ts; one representative each).
	expect(check('http://user:pass@example.com', 'URL').matched).toBe(false);
	expect(check('http:foo', 'URL').matched).toBe(false);
});

test('NonEmptyURL', () => {
	// Empty / whitespace-only is rejected (HTML LS "valid non-empty URL").
	expect(check('', 'NonEmptyURL').matched).toBe(false);
	expect(check('   ', 'NonEmptyURL').matched).toBe(false);
	expect(check('\t\n', 'NonEmptyURL').matched).toBe(false);
	// Non-empty values delegate to `checkURL`.
	expect(check('https://example.com', 'NonEmptyURL').matched).toBe(true);
	expect(check('/relative/path', 'NonEmptyURL').matched).toBe(true);
	// URL LS errors still fire through the delegation.
	expect(check('http://user:pass@host', 'NonEmptyURL').matched).toBe(false);
});

test('BaseURL', () => {
	// `<base href>`-specific scheme prohibition.
	expect(check('data:text/plain,foo', 'BaseURL').matched).toBe(false);
	expect(check('javascript:alert(1)', 'BaseURL').matched).toBe(false);
	// Otherwise delegates to `checkURL` — URL LS errors are now reported
	// (regression guard for the Phase 2 fix; previously BaseURL only
	// filtered data:/javascript: and silently accepted everything else).
	expect(check('http://user:pass@example.com/', 'BaseURL').matched).toBe(false);
	expect(check('http:foo', 'BaseURL').matched).toBe(false);
	// Valid URLs pass.
	expect(check('https://example.com/', 'BaseURL').matched).toBe(true);
	expect(check('/relative/path', 'BaseURL').matched).toBe(true);
});

test('AbsoluteURL', () => {
	// Must be absolute.
	expect(check('/relative', 'AbsoluteURL').matched).toBe(false);
	expect(check('', 'AbsoluteURL').matched).toBe(false);
	// Absolute URLs delegate to `checkURL` — URL LS errors are now reported.
	expect(check('https://example.com/', 'AbsoluteURL').matched).toBe(true);
	expect(check('http://example.com/#a#b', 'AbsoluteURL').matched).toBe(false);
	expect(check('http://user@example.com/', 'AbsoluteURL').matched).toBe(false);
});

test('AbsoluteURLOrEmpty', () => {
	// HTML LS §4.10.5.1.7 — empty is accepted (no default URL).
	expect(check('', 'AbsoluteURLOrEmpty').matched).toBe(true);
	expect(check('   ', 'AbsoluteURLOrEmpty').matched).toBe(true);
	// Relative URLs are rejected (must be absolute).
	expect(check('/relative', 'AbsoluteURLOrEmpty').matched).toBe(false);
	expect(check('foo/bar', 'AbsoluteURLOrEmpty').matched).toBe(false);
	// Absolute URLs pass; URL LS errors propagate.
	expect(check('https://example.com/', 'AbsoluteURLOrEmpty').matched).toBe(true);
	expect(check('http://user@example.com/', 'AbsoluteURLOrEmpty').matched).toBe(false);
});

test('HashName', () => {
	// Valid: `#` followed by a non-empty name (existence is not the type's concern).
	expect(check('#my-map', 'HashName').matched).toBe(true);
	expect(check('#a', 'HashName').matched).toBe(true);
	// Invalid per HTML LS valid-hash-name-reference: must have a non-empty name part.
	expect(check('#', 'HashName').matched).toBe(false);
	expect(check('', 'HashName').matched).toBe(false);
	// Invalid: missing the leading hash sign.
	expect(check('my-map', 'HashName').matched).toBe(false);
	// The type only enforces "# + at least one char". Per HTML LS, the name part
	// must match an actual `name` attribute value somewhere in the document; the
	// content syntax (whitespace, unicode, etc.) is delegated to the matching
	// step. Pin the permissive behaviour explicitly so a future tightening of
	// the syntax surfaces here rather than silently rejecting valid uses.
	expect(check('#日本語', 'HashName').matched).toBe(true);
	expect(check('#with space', 'HashName').matched).toBe(true);
	expect(check('#name#extra', 'HashName').matched).toBe(true);
});
