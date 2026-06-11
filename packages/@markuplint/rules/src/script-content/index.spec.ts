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

test('[script-content-invalid-019] integrity is not an object', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"integrity":"not object"}</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "integrity" top-level key of an import map must be a JSON object');
});

test('[script-content-invalid-020] integrity key is a bare specifier (not URL-like)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"bare":"sha384-abc"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The integrity key "bare" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
	);
});

test('[script-content-invalid-021] integrity value is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"/a.mjs":123}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The value of "/a.mjs" in "integrity" must be a string');
});

test('[script-content-invalid-022] integrity key is empty string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"integrity":{"":"sha384-abc"}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The integrity key "" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
	);
});

test('[script-content-invalid-016] scopes inner specifier with empty key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/p/":{"":"/a.js"}}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The specifier key in "scopes["/p/"]" must not be empty');
});

test('[script-content-invalid-017] scopes inner specifier value not a string', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="importmap">{"scopes":{"/p/":{"k":1}}}</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The value of "k" in "scopes["/p/"]" must be a string');
});

test('[script-content-invalid-018] scopes inner specifier slash mismatch', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"scopes":{"/p/":{"dir/":"/x"}}}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The specifier key "dir/" in "scopes["/p/"]" ends with "/" so the address "/x" must end with "/" as well',
	);
});

test('[script-content-invalid-015] multiple violations are all reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="importmap">{"forbidden":1,"imports":{"":"/a.js","b":42}}</script>'),
	);
	expect(violations.length).toBe(3);
});

// `type="speculationrules"` — WICG Speculation Rules
// @see https://wicg.github.io/nav-speculation/speculation-rules.html

test('[script-content-valid-008] minimal valid list rule', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["https://example.com"]}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-009] minimal valid document rule', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"/*"}}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-010] both prefetch and prerender rule sets', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"]}],"prerender":[{"source":"document","where":{"href_matches":"/*"}}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-011] source inferred as list from urls', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"urls":["/page1.html"]}]}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-012] source inferred as document from where', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"eagerness":"moderate","where":{"href_matches":"/*"}}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-013] href_matches accepts an array of strings', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":["/blog/*","/news/*"]}}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-014] nested and / or / not predicates', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":[{"or":[{"href_matches":"/articles/*"},{"href_matches":"/blog/*"}]},{"not":{"selector_matches":[".no-prefetch","a[rel~=nofollow]"]}}]},"eagerness":"conservative"}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-015] type matching is case-insensitive', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="SpeculationRules">{"prefetch":[{"source":"list","urls":["/a"]}]}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-016] empty rule set array is allowed', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="speculationrules">{"prefetch":[]}</script>'));
	expect(violations.length).toBe(0);
});

test('[script-content-valid-017] eagerness "immediate" is allowed (HTML LS §7.6)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":"immediate"}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-018] additional spec rule keys are allowed (HTML LS §7.6.1.2)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"relative_to":"document","referrer_policy":"no-referrer","requires":["anonymous-client-ip-when-cross-origin"],"expects_no_vary_search":"params=(\\"a\\")","target_hint":"_blank","tag":"my-tag"}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-valid-019] top-level "tag" is allowed alongside a rule set', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"tag":"my-tag","prefetch":[{"source":"list","urls":["/a"]}]}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[script-content-invalid-023] empty content', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="speculationrules"></script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Speculation rules must contain a JSON object');
});

test('[script-content-invalid-024] content is not JSON', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="speculationrules">{ invalid json</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Speculation rules must be valid JSON');
});

test('[script-content-invalid-025] top-level value is an array', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="speculationrules">["a","b"]</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Speculation rules must be a JSON object');
});

test('[script-content-invalid-026] missing both prefetch and prerender', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="speculationrules">{}</script>'));
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'Speculation rules must be an object with a "prefetch" or "prerender" property',
	);
});

test('[script-content-invalid-027] forbidden top-level key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[],"unknownProp":true}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The speculation rules top-level key "unknownProp" is not allowed (use "tag", "prefetch", or "prerender")',
	);
});

test('[script-content-invalid-028] rule set is not an array', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":"not-array"}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "prefetch" property of speculation rules must be a JSON array');
});

test('[script-content-invalid-029] rule is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":["not-an-object"]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The speculation rule prefetch[0] must be a JSON object');
});

test('[script-content-invalid-030] forbidden rule key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"unknownProp":true}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The speculation rule key "unknownProp" is not allowed (use "source", "urls", "where", "relative_to", "eagerness", "referrer_policy", "tag", "requires", "expects_no_vary_search", or "target_hint")',
	);
});

test('[script-content-invalid-031] source is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":123}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "source" of prefetch[0] must be a string');
});

test('[script-content-invalid-032] source has an invalid value', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"invalid"}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "source" value "invalid" is not allowed (use "list" or "document")');
});

test('[script-content-invalid-033] list rule is missing urls', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list"}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The list rule prefetch[0] must have a "urls" property');
});

test('[script-content-invalid-034] list rule has a where', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"where":{"href_matches":"*"}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The list rule prefetch[0] must not have a "where" property');
});

test('[script-content-invalid-035] document rule is missing where', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document"}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The document rule prefetch[0] must have a "where" property');
});

test('[script-content-invalid-036] document rule has urls', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"*"},"urls":["/a"]}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The document rule prefetch[0] must not have a "urls" property');
});

test('[script-content-invalid-037] rule has neither source, urls, nor where', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"eagerness":"moderate"}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The speculation rule prefetch[0] must have a "source", or exactly one of "urls" or "where"',
	);
});

test('[script-content-invalid-055] rule has both urls and where without source', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"urls":["/a"],"where":{"href_matches":"/*"}}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The speculation rule prefetch[0] must have a "source", or exactly one of "urls" or "where"',
	);
});

test('[script-content-invalid-038] urls is not an array', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list","urls":"not-array"}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "urls" of prefetch[0] must be a JSON array');
});

test('[script-content-invalid-039] urls is empty', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list","urls":[]}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "urls" of prefetch[0] must not be empty');
});

test('[script-content-invalid-040] a url item is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list","urls":[123]}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The URL at index 0 in "urls" must be a string');
});

test('[script-content-invalid-041] a url item is an empty string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list","urls":[""]}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The URL at index 0 in "urls" must not be empty');
});

test('[script-content-invalid-042] eagerness is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":123}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "eagerness" of prefetch[0] must be a string');
});

test('[script-content-invalid-043] eagerness has an invalid value', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":"invalid"}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The "eagerness" value "invalid" is not allowed (use "immediate", "eager", "moderate", or "conservative")',
	);
});

test('[script-content-invalid-044] where is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":"not-object"}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "where" condition of prefetch[0] must be a JSON object');
});

test('[script-content-invalid-045] where has no predicate', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":{}}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The "where" condition of prefetch[0] must have exactly one predicate ("and", "or", "not", "href_matches", or "selector_matches")',
	);
});

test('[script-content-invalid-046] where has multiple predicates', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"*","selector_matches":"a"}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The "where" condition of prefetch[0] must have exactly one predicate, but has multiple',
	);
});

test('[script-content-invalid-047] and predicate is empty', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":[]}}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "and" predicate must not be empty');
});

test('[script-content-invalid-048] and predicate is not an array', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":"not-array"}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "and" predicate must be a JSON array');
});

test('[script-content-invalid-049] href_matches is an empty string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":""}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "href_matches" pattern must not be empty');
});

test('[script-content-invalid-050] href_matches is an empty array', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":[]}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "href_matches" pattern must not be empty');
});

test('[script-content-invalid-051] href_matches is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":123}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "href_matches" pattern must be a string or an array of strings');
});

test('[script-content-invalid-052] selector_matches is an empty string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":""}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "selector_matches" pattern must not be empty');
});

test('[script-content-invalid-053] selector_matches is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":123}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "selector_matches" pattern must be a string or an array of strings');
});

test('[script-content-invalid-054] unknown predicate key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":{"unknown":"x"}}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The predicate key "unknown" is not allowed (use "and", "or", "not", "href_matches", or "selector_matches")',
	);
});

test('[script-content-invalid-056] a pattern array item is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":["/ok/*",123]}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Item [1] of the "href_matches" pattern must be a string');
});

test('[script-content-invalid-057] a pattern array item is an empty string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":["a",""]}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('Item [1] of the "selector_matches" pattern must not be empty');
});

test('[script-content-invalid-058] a not predicate value is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":{"not":"x"}}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "not" predicate must be a JSON object');
});

test('[script-content-invalid-059] prerender rule set is validated like prefetch', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prerender":[{"source":"list"}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The list rule prerender[0] must have a "urls" property');
});

test('[script-content-invalid-060] or predicate is not an array', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"or":"not-array"}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "or" predicate must be a JSON array');
});

test('[script-content-invalid-061] or predicate is empty', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":{"or":[]}}]}</script>'),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe('The "or" predicate must not be empty');
});

test('[script-content-invalid-062] a nested predicate inside and is invalid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":[{"href_matches":"/ok/*"},{"unknown":"x"}]}}]}</script>',
		),
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The predicate key "unknown" is not allowed (use "and", "or", "not", "href_matches", or "selector_matches")',
	);
});
