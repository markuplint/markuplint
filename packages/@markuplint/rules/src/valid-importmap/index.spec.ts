import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

function wrap(content: string): string {
	return `<!doctype html><html><head><title>t</title>${content}</head><body></body></html>`;
}

test('[valid-importmap-001] script without type attribute is ignored', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script>console.log("ok");</script>'));
	expect(violations.length).toBe(0);
});

test('[valid-importmap-002] script type=module is ignored', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="module">import "./a.js";</script>'));
	expect(violations.length).toBe(0);
});

test('[valid-importmap-003] minimal valid importmap', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"app":"/path/to/app.js"}}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[valid-importmap-004] full valid importmap with scopes', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="importmap">{"imports":{"app":"/a.js","dir/":"/d/"},"scopes":{"/path/":{"x":"./y.js"}}}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[valid-importmap-005] integrity is an allowed top-level key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"/a.mjs":"sha384-abc"}}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[valid-importmap-006] importmap with absolute URL specifier address', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"lib":"https://cdn.example.com/lib.js"}}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[valid-importmap-007] type attribute matching is case-insensitive', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="ImportMap">{"imports":{"a":"/a.js"}}</script>'));
	expect(violations.length).toBe(0);
});

test('[valid-importmap-008] empty content', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap"></script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'Import map must contain a JSON object',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-009] whitespace-only content', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">   \n   </script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'Import map must contain a JSON object',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-010] content is not JSON', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">alert("not json")</script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'Import map must be valid JSON',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-011] top-level value is an array', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">["imports"]</script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'Import map must be a JSON object',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-012] top-level value is a string', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">"hello"</script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'Import map must be a JSON object',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-013] forbidden top-level property', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"forbidden":{}}</script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The import map top-level key "forbidden" is not allowed (use "imports", "scopes", or "integrity")',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-014] imports value is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":"not an object"}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "imports" top-level key of an import map must be a JSON object',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-015] imports has an empty specifier key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"":"/path/app.js"}}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The specifier key in "imports" must not be empty',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-016] imports value is not a string', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"imports":{"app":123}}</script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The value of "app" in "imports" must be a string',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-017] imports slash-mismatch', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"dir/":"/path/to/dir"}}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The specifier key "dir/" in "imports" ends with "/" so the address "/path/to/dir" must end with "/" as well',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-018] imports address is not a URL-like specifier', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"imports":{"lib":"bare-specifier"}}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The address "bare-specifier" of "lib" in "imports" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-019] scopes value is not an object', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"scopes":"not an object"}</script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "scopes" top-level key of an import map must be a JSON object',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-020] scopes inner value is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/path/":"not an object"}}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The value of the scope "/path/" must be a JSON object',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-021] scopes inner specifier address is not URL-like', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/path/":{"x":"..."}}}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The address "..." of "x" in "scopes["/path/"]" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-022] integrity is not an object', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"integrity":"not object"}</script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "integrity" top-level key of an import map must be a JSON object',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-023] integrity key is a bare specifier (not URL-like)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"bare":"sha384-abc"}}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The integrity key "bare" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-024] integrity value is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"/a.mjs":123}}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The value of "/a.mjs" in "integrity" must be a string',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-025] integrity key is empty string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"":"sha384-abc"}}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The integrity key "" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-026] scopes inner specifier with empty key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/p/":{"":"/a.js"}}}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The specifier key in "scopes["/p/"]" must not be empty',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-027] scopes inner specifier value not a string', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"scopes":{"/p/":{"k":1}}}</script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The value of "k" in "scopes["/p/"]" must be a string',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-028] scopes inner specifier slash mismatch', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/p/":{"dir/":"/x"}}}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The specifier key "dir/" in "scopes["/p/"]" ends with "/" so the address "/x" must end with "/" as well',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-029] multiple violations are all reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"forbidden":1,"imports":{"":"/a.js","b":42}}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The import map top-level key "forbidden" is not allowed (use "imports", "scopes", or "integrity")',
			raw: '<script type="importmap">',
		},
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The specifier key in "imports" must not be empty',
			raw: '<script type="importmap">',
		},
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The value of "b" in "imports" must be a string',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-030] an empty import map is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="importmap"></script>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'インポートマップにはJSONオブジェクトを含めるべきです',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-031] a top-level key that is not allowed is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<script type="importmap">{"foo":{}}</script>',
		undefined,
		false,
		'ja',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message:
				'インポートマップのトップレベルキー「foo」は許可されていません(「imports」「scopes」「integrity」のいずれかを使用してください)',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-032] the trailing slash of the specifier is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<script type="importmap">{"imports":{"a/":"/b"}}</script>',
		undefined,
		false,
		'ja',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message:
				'「imports」内のスペシファイアキー「a/」は「/」で終わっているため、アドレス「/b」も「/」で終わるべきです',
			raw: '<script type="importmap">',
		},
	]);
});

test('[valid-importmap-033] the integrity key is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<script type="importmap">{"integrity":{"x":"y"}}</script>',
		undefined,
		false,
		'ja',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'integrityのキー「x」はURL風のスペシファイア(「/」「./」「../」で始まるか、絶対URL)にするべきです',
			raw: '<script type="importmap">',
		},
	]);
});

test.each([
	[' \n\t\r ', 'Import map must contain a JSON object'],
	['\f', 'Import map must be valid JSON'],
	['\u00A0', 'Import map must be valid JSON'],
])(
	'[valid-importmap-034] the white space of JSON is ASCII white space without form feed: %j',
	async (content, message) => {
		const { violations } = await mlRuleTest(rule, `<script type="importmap">${content}</script>`);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 1, message, raw: '<script type="importmap">' },
		]);
	},
);
