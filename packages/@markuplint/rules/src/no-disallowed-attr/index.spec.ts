import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

test('[no-disallowed-attr-001] noUse flag', async () => {
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

test('[no-disallowed-attr-002] noUse flag with allowAttrs (allowAttrs overrides noUse)', async () => {
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

test('[no-disallowed-attr-003] src is disallowed on a source in a picture, and srcset on a source in a video or an audio', async () => {
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

test('[no-disallowed-attr-004] importmap must not have src', async () => {
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

test('[no-disallowed-attr-005] speculationrules must not have src', async () => {
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

test('[no-disallowed-attr-006] importmap must not have async', async () => {
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

test('[no-disallowed-attr-007] importmap must not have defer', async () => {
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

test('[no-disallowed-attr-008] importmap must not have nomodule', async () => {
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

test('[no-disallowed-attr-009] module with defer is disallowed', async () => {
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

test('[no-disallowed-attr-010] charset requires src', async () => {
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

test('[no-disallowed-attr-011] valid: module with async', async () => {
	expect((await mlRuleTest(rule, '<script type="module" async>x</script>')).violations).toStrictEqual([]);
});

test('[no-disallowed-attr-012] valid: classic with src and defer', async () => {
	expect((await mlRuleTest(rule, '<script src="app.js" defer></script>')).violations).toStrictEqual([]);
});

test('[no-disallowed-attr-013] valid: classic with src and async', async () => {
	expect((await mlRuleTest(rule, '<script src="app.js" async></script>')).violations).toStrictEqual([]);
});

test('[no-disallowed-attr-014] module without src + defer is disallowed', async () => {
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

test('[no-disallowed-attr-015] classic without src + blocking is disallowed', async () => {
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

test('[no-disallowed-attr-016] module without src + blocking is disallowed', async () => {
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

test('[no-disallowed-attr-017] data block (application/json) without src + blocking is disallowed', async () => {
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

test('[no-disallowed-attr-018] valid: classic with src + blocking', async () => {
	expect((await mlRuleTest(rule, '<script src="app.js" blocking="render"></script>')).violations).toStrictEqual([]);
});

test('[no-disallowed-attr-019] valid: module with src + blocking', async () => {
	expect(
		(await mlRuleTest(rule, '<script type="module" src="m.js" blocking="render"></script>')).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-020] importmap must not have crossorigin', async () => {
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

test('[no-disallowed-attr-021] speculationrules must not have crossorigin', async () => {
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

test('[no-disallowed-attr-022] data block must not have crossorigin', async () => {
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

test('[no-disallowed-attr-023] importmap must not have fetchpriority', async () => {
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

test('[no-disallowed-attr-024] speculationrules must not have fetchpriority', async () => {
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

test('[no-disallowed-attr-025] data block must not have fetchpriority', async () => {
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

test('[no-disallowed-attr-026] inline classic script must not have fetchpriority', async () => {
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

test('[no-disallowed-attr-027] inline module script must not have fetchpriority', async () => {
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

test('[no-disallowed-attr-028] data block must not have src', async () => {
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

test('[no-disallowed-attr-029] data block must not have nomodule', async () => {
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

test('[no-disallowed-attr-030] importmap must not have referrerpolicy', async () => {
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

test('[no-disallowed-attr-031] valid: inline classic script with crossorigin', async () => {
	// HTML LS §4.12.1 table footnote: "Although inline scripts have no initial
	// fetches, the crossorigin and referrerpolicy attribute on inline scripts
	// affects the credentials mode and referrer policy used by module imports,
	// including dynamic import()."
	expect((await mlRuleTest(rule, '<script crossorigin="anonymous">x</script>')).violations).toStrictEqual([]);
});

test('[no-disallowed-attr-032] valid: inline module script with crossorigin and referrerpolicy', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<script type="module" crossorigin="use-credentials" referrerpolicy="no-referrer">x</script>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-033] valid: external classic script with crossorigin, referrerpolicy, and fetchpriority', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<script src="app.js" crossorigin="anonymous" referrerpolicy="no-referrer" fetchpriority="high"></script>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-034] valid: external module script with fetchpriority', async () => {
	expect(
		(await mlRuleTest(rule, '<script type="module" src="m.js" fetchpriority="low"></script>')).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-035] valid: explicit JavaScript MIME type is a classic script', async () => {
	// mimesniff: "A string is a JavaScript MIME type essence match if it is an
	// ASCII case-insensitive match for one of the JavaScript MIME type essence
	// strings."
	expect(
		(await mlRuleTest(rule, '<script type="text/javascript" src="app.js" defer></script>')).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-036] data block with src and async reports both', async () => {
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

test('[no-disallowed-attr-037] valid: type value is matched ASCII case-insensitively', async () => {
	// HTML LS: 'Setting the attribute to an ASCII case-insensitive match for
	// "module"...' — the conditions rely on the attribute selector i flag.
	expect(
		(await mlRuleTest(rule, '<script type="MODULE" src="m.js" fetchpriority="high"></script>')).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-038] data block must not have referrerpolicy', async () => {
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

test('[no-disallowed-attr-039] valid: every JavaScript MIME type essence denotes a classic script', async () => {
	// Spot-check a second essence string besides text/javascript so a typo in
	// the enumerated alternatives cannot survive unnoticed.
	expect(
		(await mlRuleTest(rule, '<script type="application/javascript" src="app.js" defer></script>')).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-040] JSX: dynamic type leaves the script kind indeterminate, defer is not flagged', async () => {
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

test('[no-disallowed-attr-041] JSX: static importmap type still flags src', async () => {
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

test('[no-disallowed-attr-042] Vue: dynamic :type leaves the script kind indeterminate, defer is not flagged', async () => {
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

test('[no-disallowed-attr-043] is attribute on autonomous custom element is disallowed', async () => {
	const { violations } = await mlRuleTest(rule, '<my-element is="my-other"></my-element>');
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: 'is',
			message: 'The "is" attribute must not be specified on an autonomous custom element',
		}),
	]);
});

test('[no-disallowed-attr-044] is attribute on built-in element is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<button is="fancy-button">Click</button>');
	const isViolations = violations.filter(v => v.message?.includes('"is"'));
	expect(isViolations).toStrictEqual([]);
});

test('[no-disallowed-attr-045] autonomous custom element without is attribute is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<my-element data-foo="bar"></my-element>');
	const isViolations = violations.filter(v => v.message?.includes('"is"'));
	expect(isViolations).toStrictEqual([]);
});

test('[no-disallowed-attr-046] itemscope alone is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<div itemscope></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-047] itemscope + itemtype is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<div itemscope itemtype="https://schema.org/Thing"></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-048] itemscope + itemtype + itemid is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div itemscope itemtype="https://schema.org/Thing" itemid="https://example.com/r"></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-049] itemid without itemscope/itemtype is disallowed', async () => {
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

test('[no-disallowed-attr-050] itemid with itemscope but without itemtype is disallowed', async () => {
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

test('[no-disallowed-attr-051] itemid with itemtype but without itemscope is disallowed (both itemid and itemtype reported)', async () => {
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

test('[no-disallowed-attr-052] itemtype without itemscope is disallowed', async () => {
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

test('[no-disallowed-attr-053] itemtype without itemscope is disallowed regardless of its own value', async () => {
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

test('[no-disallowed-attr-054] link rel="stylesheet" with disabled is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="stylesheet" href="style.css" disabled>');
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-055] link[disabled] without rel="stylesheet" is rejected', async () => {
	// Mirrors html/elements/link/disabled-without-stylesheet-novalid.html.
	// Spec: "The content attribute, if present, must only be specified on
	// link elements that have a rel attribute that contains the stylesheet
	// keyword."
	const { violations } = await mlRuleTest(rule, '<link rel="icon" href="favicon.ico" disabled>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-disallowed-attr-056] case-insensitive rel still accepts disabled', async () => {
	// `~=` selector uses ASCII case-insensitive matching with the ` i` flag,
	// so `StyleSheet` is treated the same as `stylesheet`.
	const { violations } = await mlRuleTest(rule, '<link rel="StyleSheet" href="style.css" disabled>');
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-057] reversed rel token order still accepts disabled', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<link rel="alternate stylesheet" href="style.css" title="Print" disabled>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-058] link[disabled] with no rel attribute is rejected', async () => {
	// rel is itself required (or itemprop fallback), but the relevant rule
	// pin here is the disabled-on-non-stylesheet branch — `disabled` itself
	// should not be accepted when no stylesheet rel is asserted.
	const { violations } = await mlRuleTest(rule, '<link href="style.css" disabled>');
	expect(violations.some(v => typeof v.message === 'string' && v.message.includes('disabled'))).toBe(true);
});

test('[no-disallowed-attr-059] referrerpolicy without href is disallowed', async () => {
	// Split off invalid-attr's original combined test — the unknown-name half
	// (the literal "invalid-attr" attribute) lives in no-unknown-attr's
	// sibling test. Pre-split, this fixture's referrerpolicy value ("invalid-value")
	// also failed the value check, but the old single rule's value-then-condition
	// pipeline reported only the value error (see the note on that ordering in
	// [no-invalid-attr-value-219]). Post-split, no-disallowed-attr
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

test('[no-disallowed-attr-060] Vue iterator: key is disallowed without v-for', async () => {
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

test('[no-disallowed-attr-061] React with spread attribute: condition half', async () => {
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

test('[no-disallowed-attr-062] React spec: noUse half of the controlled-component check', async () => {
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

test('[no-disallowed-attr-063] no rel: as attribute is disallowed (condition check)', async () => {
	const { violations } = await mlRuleTest(rule, '<link href="/a.css" as="style">');
	// `as` has condition=["[rel~='preload' i]","[rel~='modulepreload' i]"],
	// so without rel=preload/modulepreload, the attribute itself is disallowed.
	expect(violations.some(v => v.message.includes('"as"'))).toBe(true);
});

test('[no-disallowed-attr-064] usemap without a valid hash-name reference is disallowed', async () => {
	// Moved from no-invalid-attr-value: "#" alone fails the HashName type in
	// the pre-split rule, but `usemap`'s own condition (a matching `<map>` by
	// name) is what actually fails here — resolveAttrEligibility never
	// reaches 'ok', so no value is ever checked.
	const { violations } = await mlRuleTest(rule, '<img src="x.png" usemap="#" alt="">');
	expect(violations.some(v => v.raw === 'usemap')).toBe(true);
});

test('[no-disallowed-attr-065] img[sizes] without srcset is disallowed', async () => {
	// Moved from no-invalid-attr-value: `sizes` on img/source requires
	// `srcset` (HTML LS §4.8.4.4.4) — a condition, not a value constraint.
	const { violations } = await mlRuleTest(rule, '<img src="image.jpg" sizes="100vw" alt="Image">');
	expect(violations.some(v => typeof v.message === 'string' && v.message.includes('sizes'))).toBe(true);
});

test('[no-disallowed-attr-066] picture > source[sizes] without srcset is disallowed', async () => {
	const { violations } = await mlRuleTest(rule, '<picture><source sizes="100vw"><img src="x.jpg" alt="x"></picture>');
	expect(violations.some(v => typeof v.message === 'string' && v.message.includes('sizes'))).toBe(true);
});

// https://html.spec.whatwg.org/multipage/input.html#file-upload-state-(type=file)
// > The element's value attribute must be omitted.
test('[no-disallowed-attr-067] input[type=file] must omit the value attribute, even an empty one', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="file" value="">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: 'The "value" attribute is disallowed',
			raw: 'value',
		},
	]);
});

// https://html.spec.whatwg.org/multipage/input.html#image-button-state-(type=image)
// > The element's value attribute must be omitted.
test('[no-disallowed-attr-068] input[type=image] must omit the value attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="image" value="go">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "value" attribute is disallowed',
			raw: 'value',
		},
	]);
});

// https://html.spec.whatwg.org/multipage/input.html#hidden-state-(type=hidden)
// > If the name attribute is present and has a value that is an ASCII case-insensitive match for "_charset_",
// > then the element's value attribute must be omitted.
test('[no-disallowed-attr-069] input[type=hidden][name=_charset_] must omit the value attribute, whatever the case', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="hidden" name="_charset_" value="x">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 39,
			message: 'The "value" attribute is disallowed',
			raw: 'value',
		},
	]);
	const upper = await mlRuleTest(rule, '<input TYPE="HIDDEN" NAME="_CHARSET_" VALUE="x">');
	expect(upper.violations.map(v => v.raw)).toStrictEqual(['VALUE']);
});

test('[no-disallowed-attr-070] input accepts value everywhere else, and a file input without it', async () => {
	for (const html of [
		'<input type="file">',
		'<input type="text" value="x">',
		'<input value="x">',
		'<input type="submit" value="Go">',
		'<input type="checkbox" value="1">',
		'<input type="hidden" name="token" value="x">',
		'<input type="hidden" name="_charset_">',
	]) {
		const { violations } = await mlRuleTest(rule, html);
		expect(violations, html).toStrictEqual([]);
	}
});

test('[no-disallowed-attr-071] the type of an input is matched without regard to case', async () => {
	for (const type of ['IMAGE', 'File']) {
		const { violations } = await mlRuleTest(rule, `<input type="${type}" value="x">`);
		expect(
			violations.map(v => v.raw),
			type,
		).toStrictEqual(['value']);
	}
});

test('[no-disallowed-attr-072] Vue: a type that is an expression does not decide whether value is allowed', async () => {
	const { violations } = await mlRuleTest(rule, '<template><input :type="t" value="x"></template>', {
		parser: {
			'.*': '@markuplint/vue-parser',
		},
		specs: {
			'.*': '@markuplint/vue-spec',
		},
	});
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-073] JSX: a type that is an expression does not decide whether value is allowed', async () => {
	const { violations } = await mlRuleTest(rule, '<input type={t} value="x" />', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	});
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-attr-074] HTML: an upper-case data-*, aria-*, role and viewBox are not reported', async () => {
	expect(
		(await mlRuleTest(rule, '<div DATA-VALUE="1" ARIA-LABEL="label" ROLE="button"></div>')).violations,
	).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<svg VIEWBOX="0 0 1 1" viewbox="0 0 1 1"></svg>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<dialog TABINDEX="-1"></dialog>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The "TABINDEX" attribute is disallowed',
			raw: 'TABINDEX="-1"',
		},
	]);
});

test('[no-disallowed-attr-075] JSX: an HTML element folds the name, so TABINDEX is tabindex', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<div DATA-VALUE="1" />', { parser })).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<dialog TABINDEX="-1" />', { parser })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The "TABINDEX" attribute is disallowed',
			raw: 'TABINDEX="-1"',
		},
	]);
});

test('[no-disallowed-attr-076] HTML: the is attribute on an autonomous custom element in any spelling', async () => {
	expect((await mlRuleTest(rule, '<x-el is="x-el2"></x-el>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 7,
			message: 'The "is" attribute must not be specified on an autonomous custom element',
			raw: 'is',
		},
	]);
	expect((await mlRuleTest(rule, '<x-el IS="x-el2"></x-el>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 7,
			message: 'The "is" attribute must not be specified on an autonomous custom element',
			raw: 'IS',
		},
	]);
});

test('[no-disallowed-attr-077] HTML: allowAttrs matches the name in any spelling the DOM makes the same', async () => {
	expect(
		(await mlRuleTest(rule, '<dialog TABINDEX="0"></dialog>', { rule: { options: { allowAttrs: ['tabindex'] } } }))
			.violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<dialog tabindex="0"></dialog>', { rule: { options: { allowAttrs: ['TABINDEX'] } } }))
			.violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<dialog TABINDEX="0"></dialog>', {
				rule: { options: { allowAttrs: { tabindex: 'Int' } } },
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<dialog TABINDEX="0"></dialog>', {
				rule: { options: { allowAttrs: [{ name: 'tabindex', value: 'Int' }] } },
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<dialog TABINDEX="0"></dialog>', { rule: { options: { allowAttrs: ['title'] } } }))
			.violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The "TABINDEX" attribute is disallowed',
			raw: 'TABINDEX="0"',
		},
	]);
});

test('[no-disallowed-attr-078] HTML: ignoreAttrNamePrefix matches the name in any spelling the DOM makes the same', async () => {
	expect(
		(
			await mlRuleTest(rule, '<dialog TABINDEX="0"></dialog>', {
				rule: { options: { ignoreAttrNamePrefix: 'tab' } },
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<dialog tabindex="0"></dialog>', {
				rule: { options: { ignoreAttrNamePrefix: ['TAB'] } },
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<dialog TABINDEX="0"></dialog>', {
				rule: { options: { ignoreAttrNamePrefix: 'x-' } },
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The "TABINDEX" attribute is disallowed',
			raw: 'TABINDEX="0"',
		},
	]);
});

test('[no-disallowed-attr-079] JSX: allowAttrs folds the name on an HTML element', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(
			await mlRuleTest(rule, '<dialog TABINDEX="0" />', {
				parser,
				rule: { options: { allowAttrs: ['tabindex'] } },
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<dialog TABINDEX="0" />', {
				parser,
				rule: { options: { allowAttrs: ['title'] } },
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The "TABINDEX" attribute is disallowed',
			raw: 'TABINDEX="0"',
		},
	]);
});

// https://html.spec.whatwg.org/multipage/embedded-content.html#attr-img-sizes
// > If the srcset attribute is not specified, and the loading attribute is in the Lazy state, the
// > sizes attribute may be specified with the value "auto" (ASCII case-insensitive).
test('[no-disallowed-attr-080] img: sizes="auto" without srcset is allowed on a lazily loaded image', async () => {
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" loading="lazy" sizes="auto">')).violations).toStrictEqual(
		[],
	);
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" loading="LAZY" sizes="AUTO">')).violations).toStrictEqual(
		[],
	);
});

test('[no-disallowed-attr-081] img: sizes="auto" without srcset is disallowed unless the image is lazily loaded', async () => {
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" sizes="auto">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 25,
			message: 'The "sizes" attribute is disallowed',
			raw: 'sizes',
		},
	]);
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" loading="eager" sizes="auto">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 41,
			message: 'The "sizes" attribute is disallowed',
			raw: 'sizes',
		},
	]);
	// An invalid value of loading is in the Eager state
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" loading="foo" sizes="auto">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 39,
			message: 'The "sizes" attribute is disallowed',
			raw: 'sizes',
		},
	]);
});

test('[no-disallowed-attr-082] JSX: a dynamic sizes without srcset is disallowed unless the image is lazily loaded', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" sizes={sizes} />', { parser })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 25,
			message: 'The "sizes" attribute is disallowed',
			raw: 'sizes',
		},
	]);
});

test('[no-disallowed-attr-083] JSX: sizes="auto" without srcset is not reported when loading is dynamic', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(await mlRuleTest(rule, '<img src="a.png" alt="" loading={loading} sizes="auto" />', { parser })).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-084] img: a sizes value other than "auto" on a lazily loaded image without srcset is left to no-invalid-attr-value', async () => {
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" loading="lazy" sizes="100vw">')).violations).toStrictEqual(
		[],
	);
});

test('[no-disallowed-attr-085] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<my-element is="my-other"></my-element>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			message: '「is」属性は自律カスタム要素に指定するべきではありません',
			raw: 'is',
		},
	]);
});

test('[no-disallowed-attr-086] input: capture and webkitdirectory apply to type=file only', async () => {
	// https://www.w3.org/TR/html-media-capture/#the-capture-attribute
	// https://wicg.github.io/entries-api/#dom-htmlinputelement-webkitdirectory
	const { violations } = await mlRuleTest(rule, '<input type="text" capture webkitdirectory>');
	expect(violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 20, message: 'The "capture" attribute is disallowed', raw: 'capture' },
		{
			severity: 'error',
			line: 1,
			col: 28,
			message: 'The "webkitdirectory" attribute is disallowed',
			raw: 'webkitdirectory',
		},
	]);
});

test('[no-disallowed-attr-087] input: capture and webkitdirectory are allowed on type=file', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="file" accept="image/*" capture webkitdirectory>')).violations,
	).toStrictEqual([]);
});

test('[no-disallowed-attr-088] img: controls must not be specified on an image without alt or with an empty alt', async () => {
	// https://html.spec.whatwg.org/multipage/embedded-content.html#attr-img-controls
	for (const html of ['<img src="a.png" alt="" controls>', '<img src="a.png" controls>']) {
		const { violations } = await mlRuleTest(rule, html);
		expect(
			violations.map(v => v.raw),
			html,
		).toStrictEqual(['controls']);
	}
});

test('[no-disallowed-attr-089] img: controls is allowed on an image with a non-empty alt', async () => {
	expect((await mlRuleTest(rule, '<img src="a.png" alt="photo" controls>')).violations).toStrictEqual([]);
});

test('[no-disallowed-attr-090] input: capture applies to type=file with an accept attribute', async () => {
	// https://www.w3.org/TR/html-media-capture/#the-capture-attribute
	const { violations } = await mlRuleTest(rule, '<input type="file" capture="user">');
	expect(violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 20, message: 'The "capture" attribute is disallowed', raw: 'capture' },
	]);
});

test('[no-disallowed-attr-091] input: capture is allowed on type=file with an accept attribute', async () => {
	expect((await mlRuleTest(rule, '<input type="file" accept="image/*" capture="user">')).violations).toStrictEqual(
		[],
	);
});

test('[no-disallowed-attr-092] xml:lang is allowed only where lang is specified', async () => {
	// https://html.spec.whatwg.org/multipage/dom.html#the-lang-and-xml:lang-attributes
	const { violations } = await mlRuleTest(rule, '<div xml:lang="en"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "xml:lang" attribute is disallowed',
			raw: 'xml:lang',
		},
	]);
});

describe('an attribute that the framework outputs or does not output', () => {
	const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };

	const disallowed = {
		severity: 'error',
		line: 1,
		col: 9,
		message: 'The "async" attribute is disallowed',
		raw: 'async',
	};

	test('[no-disallowed-attr-093] an attribute that the framework renders is judged as before', async () => {
		const { violations } = await mlRuleTest(rule, '<script async={true}></script>', jsx);
		expect(violations).toStrictEqual([disallowed]);
	});

	test('[no-disallowed-attr-094] code that is not a literal may be rendered, and is judged as before', async () => {
		const { violations } = await mlRuleTest(rule, '<script async={cond}></script>', jsx);
		expect(violations).toStrictEqual([disallowed]);
	});

	test('[no-disallowed-attr-095] an attribute that the framework does not output is not an attribute of the element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<><script async={false}></script><script async={null}></script></>',
			jsx,
		);
		expect(violations).toStrictEqual([]);
	});
});
