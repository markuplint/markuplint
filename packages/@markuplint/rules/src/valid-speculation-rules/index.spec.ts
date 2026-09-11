import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

function wrap(content: string): string {
	return `<!doctype html><html><head><title>t</title>${content}</head><body></body></html>`;
}

test('[valid-speculation-rules-valid-001] script without type attribute is ignored', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script>console.log("ok");</script>'));
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-002] script type=module is ignored', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="module">import "./a.js";</script>'));
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-003] minimal valid list rule', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["https://example.com"]}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-004] minimal valid document rule', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"/*"}}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-005] both prefetch and prerender rule sets', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"]}],"prerender":[{"source":"document","where":{"href_matches":"/*"}}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-006] source inferred as list from urls', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"urls":["/page1.html"]}]}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-007] source inferred as document from where', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"eagerness":"moderate","where":{"href_matches":"/*"}}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-008] href_matches accepts an array of strings', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":["/blog/*","/news/*"]}}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-009] nested and / or / not predicates', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":[{"or":[{"href_matches":"/articles/*"},{"href_matches":"/blog/*"}]},{"not":{"selector_matches":[".no-prefetch","a[rel~=nofollow]"]}}]},"eagerness":"conservative"}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-010] type matching is case-insensitive', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="SpeculationRules">{"prefetch":[{"source":"list","urls":["/a"]}]}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-011] empty rule set array is allowed', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="speculationrules">{"prefetch":[]}</script>'));
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-012] eagerness "immediate" is allowed (HTML LS §7.6)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":"immediate"}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-013] additional spec rule keys are allowed (HTML LS §7.6.1.2)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"relative_to":"document","referrer_policy":"no-referrer","requires":["anonymous-client-ip-when-cross-origin"],"expects_no_vary_search":"params=(\\"a\\")","target_hint":"_blank","tag":"my-tag"}]}</script>',
		),
	);
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-valid-014] top-level "tag" is allowed alongside a rule set', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"tag":"my-tag","prefetch":[{"source":"list","urls":["/a"]}]}</script>'),
	);
	expect(violations.length).toBe(0);
});

test('[valid-speculation-rules-invalid-001] empty content', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="speculationrules"></script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'Speculation rules must contain a JSON object',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-002] content is not JSON', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="speculationrules">{ invalid json</script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'Speculation rules must be valid JSON',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-003] top-level value is an array', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="speculationrules">["a","b"]</script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'Speculation rules must be a JSON object',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-004] missing both prefetch and prerender', async () => {
	const { violations } = await mlRuleTest(rule, wrap('<script type="speculationrules">{}</script>'));
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'Speculation rules must be an object with a "prefetch" or "prerender" property',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-005] forbidden top-level key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[],"unknownProp":true}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The speculation rules top-level key "unknownProp" is not allowed (use "tag", "prefetch", or "prerender")',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-006] rule set is not an array', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":"not-array"}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "prefetch" property of speculation rules must be a JSON array',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-007] rule is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":["not-an-object"]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The speculation rule prefetch[0] must be a JSON object',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-008] forbidden rule key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"unknownProp":true}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The speculation rule key "unknownProp" is not allowed (use "source", "urls", "where", "relative_to", "eagerness", "referrer_policy", "tag", "requires", "expects_no_vary_search", or "target_hint")',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-009] source is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":123}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "source" of prefetch[0] must be a string',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-010] source has an invalid value', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"invalid"}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "source" value "invalid" is not allowed (use "list" or "document")',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-011] list rule is missing urls', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list"}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The list rule prefetch[0] must have a "urls" property',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-012] list rule has a where', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"where":{"href_matches":"*"}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The list rule prefetch[0] must not have a "where" property',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-013] document rule is missing where', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document"}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The document rule prefetch[0] must have a "where" property',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-014] document rule has urls', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"*"},"urls":["/a"]}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The document rule prefetch[0] must not have a "urls" property',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-015] rule has neither source, urls, nor where', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"eagerness":"moderate"}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The speculation rule prefetch[0] must have a "source", or exactly one of "urls" or "where"',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-016] rule has both urls and where without source', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"urls":["/a"],"where":{"href_matches":"/*"}}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The speculation rule prefetch[0] must have a "source", or exactly one of "urls" or "where"',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-017] urls is not an array', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list","urls":"not-array"}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "urls" of prefetch[0] must be a JSON array',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-018] urls is empty', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list","urls":[]}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "urls" of prefetch[0] must not be empty',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-019] a url item is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list","urls":[123]}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The URL at index 0 in "urls" must be a string',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-020] a url item is an empty string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list","urls":[""]}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The URL at index 0 in "urls" must not be empty',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-021] eagerness is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":123}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "eagerness" of prefetch[0] must be a string',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-022] eagerness has an invalid value', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":"invalid"}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The "eagerness" value "invalid" is not allowed (use "immediate", "eager", "moderate", or "conservative")',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-023] where is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":"not-object"}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "where" condition of prefetch[0] must be a JSON object',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-024] where has no predicate', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":{}}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The "where" condition of prefetch[0] must have exactly one predicate ("and", "or", "not", "href_matches", or "selector_matches")',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-025] where has multiple predicates', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"*","selector_matches":"a"}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "where" condition of prefetch[0] must have exactly one predicate, but has multiple',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-026] and predicate is empty', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":[]}}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "and" predicate must not be empty',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-027] and predicate is not an array', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":"not-array"}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "and" predicate must be a JSON array',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-028] href_matches is an empty string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":""}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "href_matches" pattern must not be empty',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-029] href_matches is an empty array', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":[]}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "href_matches" pattern must not be empty',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-030] href_matches is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":123}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "href_matches" pattern must be a string or an array of strings',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-031] selector_matches is an empty string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":""}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "selector_matches" pattern must not be empty',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-032] selector_matches is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":123}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "selector_matches" pattern must be a string or an array of strings',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-033] unknown predicate key', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":{"unknown":"x"}}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The predicate key "unknown" is not allowed (use "and", "or", "not", "href_matches", or "selector_matches")',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-034] a pattern array item is not a string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":["/ok/*",123]}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'Item [1] of the "href_matches" pattern must be a string',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-035] a pattern array item is an empty string', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":["a",""]}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'Item [1] of the "selector_matches" pattern must not be empty',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-036] a not predicate value is not an object', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":{"not":"x"}}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "not" predicate must be a JSON object',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-037] prerender rule set is validated like prefetch', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prerender":[{"source":"list"}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The list rule prerender[0] must have a "urls" property',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-038] or predicate is not an array', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"or":"not-array"}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "or" predicate must be a JSON array',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-039] or predicate is empty', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap('<script type="speculationrules">{"prefetch":[{"source":"document","where":{"or":[]}}]}</script>'),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "or" predicate must not be empty',
			raw: '<script type="speculationrules">',
		},
	]);
});

test('[valid-speculation-rules-invalid-040] a nested predicate inside and is invalid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		wrap(
			'<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":[{"href_matches":"/ok/*"},{"unknown":"x"}]}}]}</script>',
		),
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message:
				'The predicate key "unknown" is not allowed (use "and", "or", "not", "href_matches", or "selector_matches")',
			raw: '<script type="speculationrules">',
		},
	]);
});
