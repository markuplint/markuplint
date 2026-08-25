import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

function wrap(content: string): string {
	return `<!doctype html><html><head><title>t</title>${content}</head><body></body></html>`;
}

test('[valid-importmap-valid-001] script without type attribute is ignored', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script>console.log("ok");</script>'));
	expect(violations.length).toBe(0);
});

test('[valid-importmap-valid-002] script type=module is ignored', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="module">import "./a.js";</script>'));
	expect(violations.length).toBe(0);
});

test('[valid-importmap-valid-003] minimal valid importmap', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"app":"/path/to/app.js"}}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[valid-importmap-valid-004] full valid importmap with scopes', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="importmap">{"imports":{"app":"/a.js","dir/":"/d/"},"scopes":{"/path/":{"x":"./y.js"}}}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[valid-importmap-valid-005] integrity is an allowed top-level key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"/a.mjs":"sha384-abc"}}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[valid-importmap-valid-006] importmap with absolute URL specifier address', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"lib":"https://cdn.example.com/lib.js"}}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[valid-importmap-valid-007] type attribute matching is case-insensitive', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="ImportMap">{"imports":{"a":"/a.js"}}</script>'));
	expect(violations.length).toBe(0);
});

test('[valid-importmap-invalid-001] empty content', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap"></script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Import map must contain a JSON object');
});

test('[valid-importmap-invalid-002] whitespace-only content', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">   \n   </script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Import map must contain a JSON object');
});

test('[valid-importmap-invalid-003] content is not JSON', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">alert("not json")</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Import map must be valid JSON');
});

test('[valid-importmap-invalid-004] top-level value is an array', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">["imports"]</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Import map must be a JSON object');
});

test('[valid-importmap-invalid-005] top-level value is a string', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">"hello"</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Import map must be a JSON object');
});

test('[valid-importmap-invalid-006] forbidden top-level property', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"forbidden":{}}</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The import map top-level key "forbidden" is not allowed (use "imports", "scopes", or "integrity")',
	);
});

test('[valid-importmap-invalid-007] imports value is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":"not an object"}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "imports" top-level key of an import map must be a JSON object');
});

test('[valid-importmap-invalid-008] imports has an empty specifier key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"":"/path/app.js"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The specifier key in "imports" must not be empty');
});

test('[valid-importmap-invalid-009] imports value is not a string', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"imports":{"app":123}}</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The value of "app" in "imports" must be a string');
});

test('[valid-importmap-invalid-010] imports slash-mismatch', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"dir/":"/path/to/dir"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The specifier key "dir/" in "imports" ends with "/" so the address "/path/to/dir" must end with "/" as well',
	);
});

test('[valid-importmap-invalid-011] imports address is not a URL-like specifier', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"lib":"bare-specifier"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The address "bare-specifier" of "lib" in "imports" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
	);
});

test('[valid-importmap-invalid-012] scopes value is not an object', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"scopes":"not an object"}</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "scopes" top-level key of an import map must be a JSON object');
});

test('[valid-importmap-invalid-013] scopes inner value is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/path/":"not an object"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The value of the scope "/path/" must be a JSON object');
});

test('[valid-importmap-invalid-014] scopes inner specifier address is not URL-like', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/path/":{"x":"..."}}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The address "..." of "x" in "scopes["/path/"]" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
	);
});

test('[valid-importmap-invalid-015] integrity is not an object', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"integrity":"not object"}</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "integrity" top-level key of an import map must be a JSON object');
});

test('[valid-importmap-invalid-016] integrity key is a bare specifier (not URL-like)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"bare":"sha384-abc"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The integrity key "bare" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
	);
});

test('[valid-importmap-invalid-017] integrity value is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"/a.mjs":123}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The value of "/a.mjs" in "integrity" must be a string');
});

test('[valid-importmap-invalid-018] integrity key is empty string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"":"sha384-abc"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The integrity key "" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
	);
});

test('[valid-importmap-invalid-019] scopes inner specifier with empty key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/p/":{"":"/a.js"}}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The specifier key in "scopes["/p/"]" must not be empty');
});

test('[valid-importmap-invalid-020] scopes inner specifier value not a string', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"scopes":{"/p/":{"k":1}}}</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The value of "k" in "scopes["/p/"]" must be a string');
});

test('[valid-importmap-invalid-021] scopes inner specifier slash mismatch', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/p/":{"dir/":"/x"}}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The specifier key "dir/" in "scopes["/p/"]" ends with "/" so the address "/x" must end with "/" as well',
	);
});

test('[valid-importmap-invalid-022] multiple violations are all reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"forbidden":1,"imports":{"":"/a.js","b":42}}</script>'),
	);
	expect(violations.length).toBe(3);
});
