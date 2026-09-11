import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-disallowed-attr-invalid-001] noUse flag', async () => {
	const { violations } = await mlRuleTest(rule, '<dialog tabindex="-1"></dialog>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The "tabindex" attribute is disallowed',
			raw: 'tabindex="-1"',
		},
	]);
});

test('[no-disallowed-attr-valid-001] noUse flag with allowAttrs (allowAttrs overrides noUse)', async () => {
	const { violations } = await mlRuleTest(rule, '<dialog tabindex="0"></dialog>', {
		rule: {
			options: {
				allowAttrs: [{ name: 'tabindex', value: { enum: ['-1', '0'] } }],
			},
		},
	});
	// allowAttrs intentionally overrides spec-level noUse — users can opt in.
	// Presets should use nodeRules to scope allowAttrs and avoid this.
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-2455] #2455', async () => {
	const sourceCode = `<picture>
  <source src="path/to" media="(query: value)">
  <source srcset="path/to" media="(query: value)">
  <source media="(query: value)">
  <img src="fallback" alt="text">
</picture>
<video>
  <source src="path/to">
  <source srcset="path/to">
  <source>
</video>
<audio>
  <source src="path/to">
  <source srcset="path/to">
  <source>
</audio>`;
	expect((await mlRuleTest(rule, sourceCode)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 11,
			message: 'The "src" attribute is disallowed',
			raw: 'src',
		},
		{
			severity: 'error',
			line: 9,
			col: 11,
			message: 'The "srcset" attribute is disallowed',
			raw: 'srcset',
		},
		{
			severity: 'error',
			line: 14,
			col: 11,
			message: 'The "srcset" attribute is disallowed',
			raw: 'srcset',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-001] importmap must not have src', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="importmap" src="map.json"></script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "src" attribute is disallowed',
			raw: 'src',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-002] speculationrules must not have src', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="speculationrules" src="rules.json"></script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "src" attribute is disallowed',
			raw: 'src',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-003] importmap must not have async', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="importmap" async></script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "async" attribute is disallowed',
			raw: 'async',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-004] importmap must not have defer', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="importmap" defer></script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "defer" attribute is disallowed',
			raw: 'defer',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-005] importmap must not have nomodule', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="importmap" nomodule></script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "nomodule" attribute is disallowed',
			raw: 'nomodule',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-006] module with defer is disallowed', async () => {
	// HTML LS §4.12.1: "Module scripts may specify the async attribute, but must not
	// specify the defer attribute." Applies whether or not src is present.
	expect((await mlRuleTest(rule, '<script type="module" src="m.js" defer></script>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 34,
			message: 'The "defer" attribute is disallowed',
			raw: 'defer',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-007] charset requires src', async () => {
	const { violations } = await mlRuleTest(rule, '<script charset="utf-8">x</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The "charset" attribute is disallowed',
			raw: 'charset',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-008] valid: module with async', async () => {
	expect((await mlRuleTest(rule, '<script type="module" async>x</script>')).violations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3631-009] valid: classic with src and defer', async () => {
	expect((await mlRuleTest(rule, '<script src="app.js" defer></script>')).violations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3631-010] valid: classic with src and async', async () => {
	expect((await mlRuleTest(rule, '<script src="app.js" async></script>')).violations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3631-011] module without src + defer is disallowed', async () => {
	// HTML LS §4.12.1: module + defer is disallowed regardless of src
	const { violations } = await mlRuleTest(rule, '<script type="module" defer>x</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			message: 'The "defer" attribute is disallowed',
			raw: 'defer',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-012] classic without src + blocking is disallowed', async () => {
	// HTML LS §6.7.3: blocking must be omitted unless src is present
	const { violations } = await mlRuleTest(rule, '<script blocking="render">x</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The "blocking" attribute is disallowed',
			raw: 'blocking',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-013] module without src + blocking is disallowed', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="module" blocking="render">x</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			message: 'The "blocking" attribute is disallowed',
			raw: 'blocking',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-014] data block (application/json) without src + blocking is disallowed', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="application/json" blocking="render">{"k":1}</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "blocking" attribute is disallowed',
			raw: 'blocking',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-015] valid: classic with src + blocking', async () => {
	expect((await mlRuleTest(rule, '<script src="app.js" blocking="render"></script>')).violations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3631-016] valid: module with src + blocking', async () => {
	expect(
		(await mlRuleTest(rule, '<script type="module" src="m.js" blocking="render"></script>')).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3631-017] importmap must not have crossorigin', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="importmap" crossorigin="anonymous">{}</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "crossorigin" attribute is disallowed',
			raw: 'crossorigin',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-018] speculationrules must not have crossorigin', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<script type="speculationrules" crossorigin="anonymous">{}</script>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "crossorigin" attribute is disallowed',
			raw: 'crossorigin',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-019] data block must not have crossorigin', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<script type="application/json" crossorigin="anonymous">{"k":1}</script>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "crossorigin" attribute is disallowed',
			raw: 'crossorigin',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-020] importmap must not have fetchpriority', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="importmap" fetchpriority="high">{}</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "fetchpriority" attribute is disallowed',
			raw: 'fetchpriority',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-021] speculationrules must not have fetchpriority', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="speculationrules" fetchpriority="high">{}</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "fetchpriority" attribute is disallowed',
			raw: 'fetchpriority',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-022] data block must not have fetchpriority', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<script type="application/json" fetchpriority="high">{"k":1}</script>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "fetchpriority" attribute is disallowed',
			raw: 'fetchpriority',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-023] inline classic script must not have fetchpriority', async () => {
	// HTML LS §4.12.1 table: fetchpriority is "Yes" only for external classic
	// and external module scripts; inline scripts are "·" (not applicable).
	const { violations } = await mlRuleTest(rule, '<script fetchpriority="high">x</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The "fetchpriority" attribute is disallowed',
			raw: 'fetchpriority',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-024] inline module script must not have fetchpriority', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="module" fetchpriority="high">x</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			message: 'The "fetchpriority" attribute is disallowed',
			raw: 'fetchpriority',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-025] data block must not have src', async () => {
	// HTML LS: "It must only be specified for classic scripts and JavaScript
	// module scripts."
	const { violations } = await mlRuleTest(rule, '<script type="application/json" src="data.json">{"k":1}</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "src" attribute is disallowed',
			raw: 'src',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-026] data block must not have nomodule', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="application/json" nomodule>{"k":1}</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "nomodule" attribute is disallowed',
			raw: 'nomodule',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-027] importmap must not have referrerpolicy', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="importmap" referrerpolicy="no-referrer">{}</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "referrerpolicy" attribute is disallowed',
			raw: 'referrerpolicy',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-028] valid: inline classic script with crossorigin', async () => {
	// HTML LS §4.12.1 table footnote: "Although inline scripts have no initial
	// fetches, the crossorigin and referrerpolicy attribute on inline scripts
	// affects the credentials mode and referrer policy used by module imports,
	// including dynamic import()."
	expect((await mlRuleTest(rule, '<script crossorigin="anonymous">x</script>')).violations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3631-029] valid: inline module script with crossorigin and referrerpolicy', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<script type="module" crossorigin="use-credentials" referrerpolicy="no-referrer">x</script>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3631-030] valid: external classic script with crossorigin, referrerpolicy, and fetchpriority', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<script src="app.js" crossorigin="anonymous" referrerpolicy="no-referrer" fetchpriority="high"></script>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3631-031] valid: external module script with fetchpriority', async () => {
	expect(
		(await mlRuleTest(rule, '<script type="module" src="m.js" fetchpriority="low"></script>')).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3631-032] valid: explicit JavaScript MIME type is a classic script', async () => {
	// mimesniff: "A string is a JavaScript MIME type essence match if it is an
	// ASCII case-insensitive match for one of the JavaScript MIME type essence
	// strings."
	expect(
		(await mlRuleTest(rule, '<script type="text/javascript" src="app.js" defer></script>')).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3631-033] data block with src and async reports both', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="application/json" src="data.json" async></script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "src" attribute is disallowed',
			raw: 'src',
		},
		{
			severity: 'error',
			line: 1,
			col: 49,
			message: 'The "async" attribute is disallowed',
			raw: 'async',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-034] valid: type value is matched ASCII case-insensitively', async () => {
	// HTML LS: 'Setting the attribute to an ASCII case-insensitive match for
	// "module"...' — the conditions rely on the attribute selector i flag.
	expect(
		(await mlRuleTest(rule, '<script type="MODULE" src="m.js" fetchpriority="high"></script>')).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3631-035] data block must not have referrerpolicy', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<script type="application/json" referrerpolicy="no-referrer">{"k":1}</script>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "referrerpolicy" attribute is disallowed',
			raw: 'referrerpolicy',
		},
	]);
});

test('[no-disallowed-attr-issue-3631-036] valid: every JavaScript MIME type essence denotes a classic script', async () => {
	// Spot-check a second essence string besides text/javascript so a typo in
	// the enumerated alternatives cannot survive unnoticed.
	expect(
		(await mlRuleTest(rule, '<script type="application/javascript" src="app.js" defer></script>')).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-parser-001] JSX: dynamic type leaves the script kind indeterminate, defer is not flagged', async () => {
	// The applicability conditions are positive lists keyed on the type
	// attribute. A dynamic type value cannot be resolved statically, so the
	// condition check must be skipped instead of reporting "disallowed".
	// async exercises the array-form condition path of the guard.
	const { violations } = await mlRuleTest(rule, '<script type={scriptType} src="app.js" defer async />', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		specs: {
			'.*': '@markuplint/react-spec',
		},
	});
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-parser-002] JSX: static importmap type still flags src', async () => {
	// The dynamic-value skip must not suppress detection when every
	// attribute the condition references has a static value.
	const { violations } = await mlRuleTest(rule, '<script type="importmap" src="map.json" />', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		specs: {
			'.*': '@markuplint/react-spec',
		},
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "src" attribute is disallowed',
			raw: 'src',
		},
	]);
});

test('[no-disallowed-attr-parser-003] Vue: dynamic :type leaves the script kind indeterminate, defer is not flagged', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<template><script :type="scriptType" src="app.js" defer></script></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3639-001] is attribute on autonomous custom element is disallowed', async () => {
	const { violations } = await mlRuleTest(rule, '<my-element is="my-other"></my-element>');
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: 'is',
			message: 'The "is" attribute must not be specified on an autonomous custom element',
		}),
	]);
});

test('[no-disallowed-attr-issue-3639-002] is attribute on built-in element is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<button is="fancy-button">Click</button>');
	const isViolations = violations.filter(v => v.message?.includes('"is"'));
	expect(isViolations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3639-003] autonomous custom element without is attribute is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<my-element data-foo="bar"></my-element>');
	const isViolations = violations.filter(v => v.message?.includes('"is"'));
	expect(isViolations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3733-001] itemscope alone is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<div itemscope></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3733-002] itemscope + itemtype is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<div itemscope itemtype="https://schema.org/Thing"></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3733-003] itemscope + itemtype + itemid is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div itemscope itemtype="https://schema.org/Thing" itemid="https://example.com/r"></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-issue-3733-004] itemid without itemscope/itemtype is disallowed', async () => {
	const { violations } = await mlRuleTest(rule, '<div itemid="https://example.com/r"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "itemid" attribute is disallowed',
			raw: 'itemid',
		},
	]);
});

test('[no-disallowed-attr-issue-3733-005] itemid with itemscope but without itemtype is disallowed', async () => {
	const { violations } = await mlRuleTest(rule, '<div itemscope itemid="https://example.com/r"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 16,
			message: 'The "itemid" attribute is disallowed',
			raw: 'itemid',
		},
	]);
});

test('[no-disallowed-attr-issue-3733-006] itemid with itemtype but without itemscope is disallowed (both itemid and itemtype reported)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div itemtype="https://schema.org/Thing" itemid="https://example.com/r"></div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "itemtype" attribute is disallowed',
			raw: 'itemtype',
		},
		{
			severity: 'error',
			line: 1,
			col: 42,
			message: 'The "itemid" attribute is disallowed',
			raw: 'itemid',
		},
	]);
});

test('[no-disallowed-attr-issue-3733-007] itemtype without itemscope is disallowed', async () => {
	const { violations } = await mlRuleTest(rule, '<div itemtype="https://schema.org/Thing"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "itemtype" attribute is disallowed',
			raw: 'itemtype',
		},
	]);
});

test('[no-disallowed-attr-issue-3733-008] itemtype without itemscope is disallowed regardless of its own value', async () => {
	// Pre-split, `invalid-attr`'s single value-then-condition pipeline
	// skipped the condition check once attrCheck already reported an
	// invalid-value for the same attribute (helpers.ts isValidAttr: the
	// condition branch required `invalid === false`), so a non-AbsoluteURL
	// itemtype reported only the value error. After the split,
	// `no-disallowed-attr` no longer has any notion of "value already
	// failed elsewhere" — it independently reports the unmet
	// itemscope condition, while `no-invalid-attr-value` correctly stays
	// silent (resolveAttrEligibility never reaches 'ok' for this attribute,
	// so no value is ever checked). See `no-invalid-attr-value`'s sibling
	// test for that half.
	const { violations } = await mlRuleTest(rule, '<div itemtype="not-absolute"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "itemtype" attribute is disallowed',
			raw: 'itemtype',
		},
	]);
});

test('[no-disallowed-attr-valid-002] link rel="stylesheet" with disabled is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="stylesheet" href="style.css" disabled>');
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-invalid-002] link[disabled] without rel="stylesheet" is rejected', async () => {
	// Mirrors html/elements/link/disabled-without-stylesheet-novalid.html.
	// Spec: "The content attribute, if present, must only be specified on
	// link elements that have a rel attribute that contains the stylesheet
	// keyword."
	const { violations } = await mlRuleTest(rule, '<link rel="icon" href="favicon.ico" disabled>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-disallowed-attr-valid-003] case-insensitive rel still accepts disabled', async () => {
	// `~=` selector uses ASCII case-insensitive matching with the ` i` flag,
	// so `StyleSheet` is treated the same as `stylesheet`.
	const { violations } = await mlRuleTest(rule, '<link rel="StyleSheet" href="style.css" disabled>');
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-valid-004] reversed rel token order still accepts disabled', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<link rel="alternate stylesheet" href="style.css" title="Print" disabled>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-invalid-003] link[disabled] with no rel attribute is rejected', async () => {
	// rel is itself required (or itemprop fallback), but the relevant rule
	// pin here is the disabled-on-non-stylesheet branch — `disabled` itself
	// should not be accepted when no stylesheet rel is asserted.
	const { violations } = await mlRuleTest(rule, '<link href="style.css" disabled>');
	expect(violations.some(v => typeof v.message === 'string' && v.message.includes('disabled'))).toBe(true);
});

test('[no-disallowed-attr-invalid-004] referrerpolicy without href is disallowed', async () => {
	// Split off invalid-attr's original combined test — the unknown-name half
	// (the literal "invalid-attr" attribute) lives in no-unknown-attr's
	// sibling test. Pre-split, this fixture's referrerpolicy value ("invalid-value")
	// also failed the value check, but the old single rule's value-then-condition
	// pipeline reported only the value error (see the no-invalid-attr-value /
	// issue-3733-008 note on that ordering). Post-split, no-disallowed-attr
	// independently reports the unmet condition regardless of the value.
	const { violations } = await mlRuleTest(
		rule,
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 17,
			message: 'The "referrerpolicy" attribute is disallowed',
			raw: 'referrerpolicy',
		},
	]);
});

test('[no-disallowed-attr-parser-004] Vue iterator: key is disallowed without v-for', async () => {
	const { violations: violations1 } = await mlRuleTest(
		rule,
		'<template><ul ref="ul"><li key="key"></li></ul></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);
	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<template><ul><li v-for="item of list" :key="key"></li></ul></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);

	expect(violations1.length).toBe(1);
	expect(violations2.length).toBe(0);
});

test('[no-disallowed-attr-parser-005] React with spread attribute: condition half', async () => {
	// Split off invalid-attr's original combined test — the unknown-name half
	// lives in no-unknown-attr's sibling test.
	expect(
		(
			await mlRuleTest(rule, '<a target="_blank" />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 4,
			message: 'The "target" attribute is disallowed',
			raw: 'target',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<a {...props} target="_blank" />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-parser-006] React spec: noUse half of the controlled-component check', async () => {
	// Split off invalid-attr's original combined test — the unknown-name half
	// (the div value/defaultValue pair, in every combination) lives in
	// no-unknown-attr's sibling test.
	const { violations } = await mlRuleTest(rule, '<input defaultChecked />', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		specs: {
			'.*': '@markuplint/react-spec',
		},
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 8,
			message: 'The "defaultChecked" attribute is disallowed',
			raw: 'defaultChecked',
		},
	]);
});

test('[no-disallowed-attr-issue-3189] no rel: as attribute is disallowed (condition check)', async () => {
	const { violations } = await mlRuleTest(rule, '<link href="/a.css" as="style">');
	// `as` has condition=["[rel~='preload' i]","[rel~='modulepreload' i]"],
	// so without rel=preload/modulepreload, the attribute itself is disallowed.
	expect(violations.some(v => v.message.includes('"as"'))).toBe(true);
});

test('[no-disallowed-attr-invalid-005] usemap without a valid hash-name reference is disallowed', async () => {
	// Moved from no-invalid-attr-value: "#" alone fails the HashName type in
	// the pre-split rule, but `usemap`'s own condition (a matching `<map>` by
	// name) is what actually fails here — resolveAttrEligibility never
	// reaches 'ok', so no value is ever checked.
	const { violations } = await mlRuleTest(rule, '<img src="x.png" usemap="#" alt="">');
	expect(violations.some(v => v.raw === 'usemap')).toBe(true);
});

test('[no-disallowed-attr-invalid-006] img[sizes] without srcset is disallowed', async () => {
	// Moved from no-invalid-attr-value: `sizes` on img/source requires
	// `srcset` (HTML LS §4.8.4.4.4) — a condition, not a value constraint.
	const { violations } = await mlRuleTest(rule, '<img src="image.jpg" sizes="100vw" alt="Image">');
	expect(violations.some(v => typeof v.message === 'string' && v.message.includes('sizes'))).toBe(true);
});

test('[no-disallowed-attr-invalid-007] picture > source[sizes] without srcset is disallowed', async () => {
	const { violations } = await mlRuleTest(rule, '<picture><source sizes="100vw"><img src="x.jpg" alt="x"></picture>');
	expect(violations.some(v => typeof v.message === 'string' && v.message.includes('sizes'))).toBe(true);
});
