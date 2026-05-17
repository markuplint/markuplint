import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

function wrap(content: string): string {
	return `<!doctype html><html><head><title>t</title>${content}</head><body></body></html>`;
}

test('[script-content-valid-001] script without type attribute is ignored', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script>console.log("ok");</script>'));
	expect(violations.length).toBe(0);
});

test('[script-content-valid-002] script type=module is ignored', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="module">import "./a.js";</script>'));
	expect(violations.length).toBe(0);
});

test('[script-content-valid-003] minimal valid importmap', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"app":"/path/to/app.js"}}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-004] full valid importmap with scopes', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="importmap">{"imports":{"app":"/a.js","dir/":"/d/"},"scopes":{"/path/":{"x":"./y.js"}}}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-005] integrity is an allowed top-level key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"/a.mjs":"sha384-abc"}}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-006] importmap with absolute URL specifier address', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"lib":"https://cdn.example.com/lib.js"}}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-007] type attribute matching is case-insensitive', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="ImportMap">{"imports":{"a":"/a.js"}}</script>'));
	expect(violations.length).toBe(0);
});

test('[script-content-invalid-001] empty content', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap"></script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Import map must contain a JSON object');
});

test('[script-content-invalid-002] whitespace-only content', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">   \n   </script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Import map must contain a JSON object');
});

test('[script-content-invalid-003] content is not JSON', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">alert("not json")</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Import map must be valid JSON');
});

test('[script-content-invalid-004] top-level value is an array', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">["imports"]</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Import map must be a JSON object');
});

test('[script-content-invalid-005] top-level value is a string', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">"hello"</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Import map must be a JSON object');
});

test('[script-content-invalid-006] forbidden top-level property', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"forbidden":{}}</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The import map top-level key "forbidden" is not allowed (use "imports", "scopes", or "integrity")',
	);
});

test('[script-content-invalid-007] imports value is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":"not an object"}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "imports" top-level key of an import map must be a JSON object');
});

test('[script-content-invalid-008] imports has an empty specifier key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"":"/path/app.js"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The specifier key in "imports" must not be empty');
});

test('[script-content-invalid-009] imports value is not a string', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"imports":{"app":123}}</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The value of "app" in "imports" must be a string');
});

test('[script-content-invalid-010] imports slash-mismatch', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"dir/":"/path/to/dir"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The specifier key "dir/" in "imports" ends with "/" so the address "/path/to/dir" must end with "/" as well',
	);
});

test('[script-content-invalid-011] imports address is not a URL-like specifier', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"lib":"bare-specifier"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The address "bare-specifier" of "lib" in "imports" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
	);
});

test('[script-content-invalid-012] scopes value is not an object', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"scopes":"not an object"}</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "scopes" top-level key of an import map must be a JSON object');
});

test('[script-content-invalid-013] scopes inner value is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/path/":"not an object"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The value of the scope "/path/" must be a JSON object');
});

test('[script-content-invalid-014] scopes inner specifier address is not URL-like', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/path/":{"x":"..."}}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The address "..." of "x" in "scopes["/path/"]" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
	);
});

test('[script-content-invalid-015] multiple violations are all reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"forbidden":1,"imports":{"":"/a.js","b":42}}</script>'),
	);
	expect(violations.length).toBe(3);
});
