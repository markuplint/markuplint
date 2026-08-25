import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-invalid-attr-value-invalid-001] Type check', async () => {
	const { violations } = await mlRuleTest(rule, '<form name=""></form>');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			message: 'The "name" attribute must not be empty',
			raw: '',
		},
	]);
});

test('[no-invalid-attr-value-invalid-002] Updated the hidden attribute type to Enum form Boolean', async () => {
	expect((await mlRuleTest(rule, '<div hidden></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden=""></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="hidden"></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="until-found"></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="invalid"></div>')).violations.length).toBe(1);
});

test('[no-invalid-attr-value-invalid-003] complex type', async () => {
	const { violations } = await mlRuleTest(rule, '<input autocomplete="section-a section-b"/>');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message:
				'It includes unexpected characters. the "autocomplete" attribute expects autofill field name (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field)',
			raw: 'section-b',
		},
	]);
});

test('[no-invalid-attr-value-valid-001] disable', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{ rule: false },
	);

	expect(violations.length).toBe(0);
});

test('[no-invalid-attr-value-valid-002] the input element type case-insensitive', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked>');

	expect(violations.length).toBe(0);

	const { violations: violations2 } = await mlRuleTest(rule, '<input type="checkBox" checked>');

	expect(violations2.length).toBe(0);
});

test('[no-invalid-attr-value-invalid-004] custom rule', async () => {
	const { violations } = await mlRuleTest(rule, '<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>', {
		rule: {
			options: {
				allowAttrs: {
					'x-attr': {
						pattern: '/[a-z]+/',
					},
				},
			},
		},
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message: 'The "x-attr" attribute expects regular expression (/[a-z]+/)',
			raw: '123',
		},
	]);
});

test('[no-invalid-attr-value-invalid-005] custom rule', async () => {
	const { violations } = await mlRuleTest(rule, '<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>', {
		rule: {
			options: {
				allowAttrs: [
					{
						name: 'x-attr',
						value: {
							pattern: '/[a-z]+/',
						},
					},
				],
			},
		},
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message: 'The "x-attr" attribute expects regular expression (/[a-z]+/)',
			raw: '123',
		},
	]);
});

test('[no-invalid-attr-value-invalid-006] custom rule: type', async () => {
	const { violations } = await mlRuleTest(rule, '<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>', {
		rule: {
			options: {
				allowAttrs: {
					'x-attr': 'Int',
				},
			},
		},
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 41,
			message: 'It includes unexpected characters. the "x-attr" attribute expects integer',
			raw: 'abc',
		},
	]);
});

test('[no-invalid-attr-value-invalid-007] custom element and custom rule', async () => {
	const { violations } = await mlRuleTest(rule, '<custom-element any-attr="any-string"></custom-element>', {
		nodeRule: [
			{
				selector: 'custom-element',
				rule: {
					options: {
						allowAttrs: {
							'any-attr': 'Int',
						},
					},
				},
			},
		],
	});

	expect(violations.length).toBe(1);
});

test('[no-invalid-attr-value-invalid-008] custom element and custom rule', async () => {
	const { violations } = await mlRuleTest(rule, '<custom-element any-attr="any-string"></custom-element>', {
		nodeRule: [
			{
				selector: 'custom-element',
				rule: {
					options: {
						allowAttrs: [
							{
								name: 'any-attr',
								value: 'Int',
							},
						],
					},
				},
			},
		],
	});

	expect(violations.length).toBe(1);
});

test('[no-invalid-attr-value-valid-003] URL attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="https://sample.com/path/to">');
	expect(violations.length).toBe(0);

	const { violations: violations2 } = await mlRuleTest(rule, '<img src="//sample.com/path/to">');
	expect(violations2.length).toBe(0);

	// BREAKING CHANGE (URL LS invalid-credentials, #3848 / PR #3867):
	// `//user:pass@sample.com/path/to` now produces a violation. The original
	// 0-violations assertion is preserved as a comment so this breaking change
	// is visible in the test source itself, not only in git history.
	// Positive coverage of the new behaviour lives in [invalid-attr-invalid-044].
	// https://url.spec.whatwg.org/#invalid-credentials
	const { violations: violations3 } = await mlRuleTest(rule, '<img src="//user:pass@sample.com/path/to">');
	// expect(violations3.length).toBe(0); // pre-URL-LS-strict baseline
	expect(violations3.length).toBe(1);

	const { violations: violations4 } = await mlRuleTest(rule, '<img src="/path/to">');
	expect(violations4.length).toBe(0);

	const { violations: violations5 } = await mlRuleTest(rule, '<img src="/path/to?param=value">');
	expect(violations5.length).toBe(0);

	const { violations: violations6 } = await mlRuleTest(rule, '<img src="/?param=value">');
	expect(violations6.length).toBe(0);

	const { violations: violations7 } = await mlRuleTest(rule, '<img src="?param=value">');
	expect(violations7.length).toBe(0);

	const { violations: violations8 } = await mlRuleTest(rule, '<img src="path/to">');
	expect(violations8.length).toBe(0);

	const { violations: violations9 } = await mlRuleTest(rule, '<img src="./path/to">');
	expect(violations9.length).toBe(0);

	const { violations: violations10 } = await mlRuleTest(rule, '<img src="../path/to">');
	expect(violations10.length).toBe(0);

	const { violations: violations11 } = await mlRuleTest(rule, '<img src="/path/to#hash">');
	expect(violations11.length).toBe(0);

	const { violations: violations12 } = await mlRuleTest(rule, '<img src="#hash">');
	expect(violations12.length).toBe(0);
});

test('[no-invalid-attr-value-invalid-009] URL Living Standard validation errors', async () => {
	// invalid-credentials with non-empty userinfo (`http://user:pass@host`) is
	// already asserted in [invalid-attr-valid-007] violations3 — we do not
	// duplicate it here. The empty-userinfo variant below exercises a separate
	// regex branch (`SPECIAL_SCHEME_AUTHORITY_HAS_AT_SIGN` matching `@` without
	// any chars before it), so it is covered here.
	// https://url.spec.whatwg.org/#invalid-credentials
	const { violations: emptyUserinfo } = await mlRuleTest(rule, '<a href="http://@example.com"></a>');
	expect(emptyUserinfo.length).toBe(1);

	// special-scheme-missing-following-solidus — `http:foo` (no `//`).
	// https://url.spec.whatwg.org/#special-scheme-missing-following-solidus
	const { violations: missingSolidus } = await mlRuleTest(rule, '<a href="http:foo"></a>');
	expect(missingSolidus.length).toBe(1);

	// special-scheme single-slash variant — `http:/foo` (only one `/`).
	const { violations: singleSlash } = await mlRuleTest(rule, '<a href="http:/foo"></a>');
	expect(singleSlash.length).toBe(1);

	// file-scheme-missing-following-solidus — `file:foo`.
	// https://url.spec.whatwg.org/#file-scheme-missing-following-solidus
	const { violations: fileNoSolidus } = await mlRuleTest(rule, '<a href="file:foo"></a>');
	expect(fileNoSolidus.length).toBe(1);

	// invalid-reverse-solidus — `\` in special-scheme URL.
	// https://url.spec.whatwg.org/#invalid-reverse-solidus
	const { violations: reverseSolidus } = await mlRuleTest(rule, '<a href="http://example.com\\foo"></a>');
	expect(reverseSolidus.length).toBe(1);

	// file-invalid-Windows-drive-letter — `C|` instead of `C:`.
	// https://url.spec.whatwg.org/#file-invalid-windows-drive-letter
	const { violations: windowsDrive } = await mlRuleTest(rule, '<a href="file:///C|/foo"></a>');
	expect(windowsDrive.length).toBe(1);

	// multiple `#` — second `#` is invalid-URL-unit in fragment grammar.
	// https://url.spec.whatwg.org/#invalid-url-unit
	const { violations: multipleHash } = await mlRuleTest(rule, '<a href="http://example.com/#a#b"></a>');
	expect(multipleHash.length).toBe(1);
});

test('[no-invalid-attr-value-invalid-010] URL Living Standard Phase 2 categories', async () => {
	// `BaseURL` now delegates to `checkURL` after the existing data:/javascript:
	// scheme filter; previously it accepted everything else without further
	// validation. Regression guard for #3868.
	// https://html.spec.whatwg.org/multipage/semantics.html#set-the-frozen-base-url
	const { violations: baseHrefCredentials } = await mlRuleTest(rule, '<base href="http://user:pass@example.com/">');
	expect(baseHrefCredentials.length).toBe(1);

	// `NonEmptyURL` rejects empty / whitespace-only `src` on media elements.
	// https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-non-empty-url-potentially-surrounded-by-spaces
	const { violations: imgSrcEmpty } = await mlRuleTest(rule, '<img src="" alt>');
	expect(imgSrcEmpty.length).toBe(1);
	const { violations: imgSrcWhitespace } = await mlRuleTest(rule, '<img src="   " alt>');
	expect(imgSrcWhitespace.length).toBe(1);
	const { violations: scriptSrcEmpty } = await mlRuleTest(rule, '<script src=""></script>');
	expect(scriptSrcEmpty.length).toBe(1);

	// `AbsoluteURLOrEmpty` — `<input type=url value>` accepts empty but
	// rejects relative URLs (HTML LS §4.10.5.1.7).
	const { violations: inputUrlEmpty } = await mlRuleTest(rule, '<input type="url" value="">');
	expect(inputUrlEmpty.length).toBe(0);
	const { violations: inputUrlRelative } = await mlRuleTest(rule, '<input type="url" value="/relative">');
	expect(inputUrlRelative.length).toBe(1);

	// `[` / `]` outside the IPv6 host position — invalid-URL-unit.
	// https://url.spec.whatwg.org/#invalid-url-unit
	const { violations: brackets } = await mlRuleTest(rule, '<a href="[61:24:74]:98"></a>');
	expect(brackets.length).toBe(1);

	// `data:` URL without `,` — RFC 2397 grammar violation.
	// https://datatracker.ietf.org/doc/html/rfc2397
	const { violations: dataNoComma } = await mlRuleTest(rule, '<a href="data:/example.com/"></a>');
	expect(dataNoComma.length).toBe(1);

	// `AbsoluteURL` now delegates to `checkURL` — itemtype tokens get the
	// URL LS validation surface (multi-hash etc.).
	const { violations: itemtypeMultiHash } = await mlRuleTest(
		rule,
		'<div itemscope itemtype="http://example.com/#a#b"></div>',
	);
	expect(itemtypeMultiHash.length).toBe(1);
});

test('[no-invalid-attr-value-invalid-011] Overwrite type', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>',
		{
			rule: {
				options: {
					allowAttrs: {
						datetime: {
							enum: ['overwrite-type'],
						},
					},
				},
			},
		},
	);
	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 56,
			message: 'The "datetime" attribute expects overwrite-type',
			raw: '2000-01-01',
		},
	]);
	expect(violations2).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 17,
			message:
				'The year part includes unexpected characters (https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)',
			raw: 'overwrite',
		},
	]);
});

test('[no-invalid-attr-value-invalid-012] Overwrite type', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>',
		{
			rule: {
				options: {
					allowAttrs: [
						{
							name: 'datetime',
							value: {
								enum: ['overwrite-type'],
							},
						},
					],
				},
			},
		},
	);
	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 56,
			message: 'The "datetime" attribute expects overwrite-type',
			raw: '2000-01-01',
		},
	]);
	expect(violations2).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 17,
			message:
				'The year part includes unexpected characters (https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)',
			raw: 'overwrite',
		},
	]);
});

test('[no-invalid-attr-value-invalid-013] svg', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<svg>
					<rect mask="20px
					hogehoge" />
				</svg>
				`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 6,
			message:
				'The value part of the "mask" attribute expects the CSS Syntax "<\'mask\'>" (https://csstree.github.io/docs/syntax/#Property:mask)',
			raw: 'hogehoge',
		},
	]);
});

test('[no-invalid-attr-value-invalid-014] svg', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<svg>
					<rect transform="translate(300px, 300px)" />
				</svg>
				`,
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-015] regexSelector', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<picture>
	<source srcset="logo-3x.png 3x">
	<source srcset="logo@3x.png 3x">
	<source srcset="logo-2x.png 2x">
	<source srcset="logo@2x.png 2x">
	<img src="logo.png" alt="logo">
</picture>
`,
		{
			nodeRule: [
				{
					regexSelector: {
						nodeName: 'img',
						attrName: 'src',
						attrValue: '/^(?<FileName>.+)\\.(?<Exp>png|jpg|webp|gif)$/',
						combination: {
							combinator: ':has(~)',
							nodeName: 'source',
						},
					},
					rule: {
						options: {
							allowAttrs: {
								srcset: {
									enum: ['{{FileName}}@2x.{{Exp}} 2x', '{{FileName}}@3x.{{Exp}} 3x'],
								},
							},
						},
					},
				},
			],
		},
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 18,
			message: 'The "srcset" attribute expects either "logo@2x.png 2x", "logo@3x.png 3x"',
			raw: 'logo-3x.png 3x',
		},
		{
			severity: 'error',
			line: 4,
			col: 18,
			message: 'The "srcset" attribute expects either "logo@2x.png 2x", "logo@3x.png 3x"',
			raw: 'logo-2x.png 2x',
		},
	]);
});

test('[no-invalid-attr-value-invalid-016] regexSelector', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<picture>
	<source srcset="logo-3x.png 3x">
	<source srcset="logo@3x.png 3x">
	<source srcset="logo-2x.png 2x">
	<source srcset="logo@2x.png 2x">
	<img src="logo.png" alt="logo">
</picture>
`,
		{
			nodeRule: [
				{
					regexSelector: {
						nodeName: 'img',
						attrName: 'src',
						attrValue: '/^(?<FileName>.+)\\.(?<Exp>png|jpg|webp|gif)$/',
						combination: {
							combinator: ':has(~)',
							nodeName: 'source',
						},
					},
					rule: {
						options: {
							allowAttrs: [
								{
									name: 'srcset',
									value: {
										enum: ['{{FileName}}@2x.{{Exp}} 2x', '{{FileName}}@3x.{{Exp}} 3x'],
									},
								},
							],
						},
					},
				},
			],
		},
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 18,
			message: 'The "srcset" attribute expects either "logo@2x.png 2x", "logo@3x.png 3x"',
			raw: 'logo-3x.png 3x',
		},
		{
			severity: 'error',
			line: 4,
			col: 18,
			message: 'The "srcset" attribute expects either "logo@2x.png 2x", "logo@3x.png 3x"',
			raw: 'logo-2x.png 2x',
		},
	]);
});

test('[no-invalid-attr-value-valid-004] Booleanish', async () => {
	expect((await mlRuleTest(rule, '<div contenteditable></div>')).violations).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<div contentEditable></div>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);

	// No warning because checking by the wai-aria rule
	expect(
		(
			await mlRuleTest(rule, '<div aria-hidden></div>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-017] HTML: contenteditable="inherit" is invalid (no spec override)', async () => {
	const { violations } = await mlRuleTest(rule, '<div contenteditable="inherit"></div>');
	expect(violations.length).toBe(1);
	expect(violations[0].raw).toBe('inherit');
	expect(violations[0].message).toMatch(/contenteditable/);
});

test('[no-invalid-attr-value-parser-001] React: contentEditable="inherit" is valid via react-spec override', async () => {
	const { violations } = await mlRuleTest(rule, '<div contentEditable="inherit"></div>', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		specs: {
			'.*': '@markuplint/react-spec',
		},
	});
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-parser-002] React: contentEditable="banana" is still invalid', async () => {
	const { violations } = await mlRuleTest(rule, '<div contentEditable="banana"></div>', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		specs: {
			'.*': '@markuplint/react-spec',
		},
	});
	expect(violations.length).toBe(1);
	expect(violations[0].raw).toBe('banana');
	expect(violations[0].message).toMatch(/contenteditable/);
});

test('[no-invalid-attr-value-parser-003] Svelte: contentEditable="inherit" is valid via svelte-spec override', async () => {
	const { violations } = await mlRuleTest(rule, '<div contentEditable="inherit"></div>', {
		parser: {
			'.*': '@markuplint/svelte-parser',
		},
		specs: {
			'.*': '@markuplint/svelte-spec',
		},
	});
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-parser-004] Svelte: contenteditable="inherit" is valid (lowercase content attribute name)', async () => {
	const { violations } = await mlRuleTest(rule, '<div contenteditable="inherit"></div>', {
		parser: {
			'.*': '@markuplint/svelte-parser',
		},
		specs: {
			'.*': '@markuplint/svelte-spec',
		},
	});
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-005] Multiple Type', async () => {
	expect((await mlRuleTest(rule, '<button command="toggle-popover"></button>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<button command="--custom"></button>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<button command="invalid"></button>')).violations).toStrictEqual([
		{
			severity: 'error',
			col: 18,
			line: 1,
			message:
				'The "command" attribute expects either "toggle-popover", "show-popover", "hide-popover", "close", "request-close", "show-modal". Or, the "command" attribute expects the custom command format. Did you mean "--invalid"? (https://html.spec.whatwg.org/multipage/form-elements.html#valid-custom-command)',
			raw: 'invalid',
		},
	]);
});

test('[no-invalid-attr-value-valid-006] CSS Functions', async () => {
	expect((await mlRuleTest(rule, '<div style="prop: var(--x)"></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-1987] #1987', async () => {
	// Valid preload destinations
	expect((await mlRuleTest(rule, '<link rel="preload" as="fetch" href="/api" />')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<link rel="preload" as="font" href="/font.woff2" />')).violations).toStrictEqual(
		[],
	);
	expect((await mlRuleTest(rule, '<link rel="preload" as="script" href="/app.js" />')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<link rel="preload" as="style" href="/app.css" />')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<link rel="preload" as="track" href="/sub.vtt" />')).violations).toStrictEqual([]);

	// Valid module preload destinations
	expect(
		(await mlRuleTest(rule, '<link rel="modulepreload" as="script" href="/mod.js" />')).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<link rel="modulepreload" as="worker" href="/worker.js" />')).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<link rel="modulepreload" as="json" href="/data.json" />')).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<link rel="modulepreload" as="style" href="/mod.css" />')).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<link rel="modulepreload" as="audioworklet" href="/audio.js" />')).violations,
	).toStrictEqual([]);

	// Invalid: values not valid for preload (condition-specific enum after #3189)
	expect((await mlRuleTest(rule, '<link rel="preload" as="audio" href="/audio.mp3" />')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 25,
			message: 'The "as" attribute expects either "fetch", "font", "image", "script", "style", "track"',
			raw: 'audio',
		},
	]);
	expect((await mlRuleTest(rule, '<link rel="preload" as="video" href="/video.mp4" />')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 25,
			message: 'The "as" attribute expects either "fetch", "font", "image", "script", "style", "track"',
			raw: 'video',
		},
	]);
	expect((await mlRuleTest(rule, '<link rel="preload" as="document" href="/page" />')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 25,
			message: 'The "as" attribute expects either "fetch", "font", "image", "script", "style", "track"',
			raw: 'document',
		},
	]);
});

test('[no-invalid-attr-value-issue-1078] #1078', async () => {
	expect(
		(await mlRuleTest(rule, '<script src="foo.js" referrerpolicy="no-referrer"></script>')).violations,
	).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<img src="foo.png" referrerpolicy="no-referrer"></img>')).violations).toStrictEqual(
		[],
	);
});

test('[no-invalid-attr-value-issue-1357] #1357', async () => {
	expect(
		(await mlRuleTest(rule, '<svg><rect transform="translate(300 300) rotate(180)" /></svg>')).violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-007] command="request-close" is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<dialog id="d"><button command="request-close" commandfor="d">Close</button></dialog>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-008] command="close" is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<dialog id="d"><button command="close" commandfor="d">Close</button></dialog>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-018] command="invalid-value" is invalid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<dialog id="d"><button command="invalid-value" commandfor="d">Close</button></dialog>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message:
				'The "command" attribute expects either "toggle-popover", "show-popover", "hide-popover", "close", "request-close", "show-modal". Or, the "command" attribute expects the custom command format. Did you mean "--invalid-value"? (https://html.spec.whatwg.org/multipage/form-elements.html#valid-custom-command)',
			raw: 'invalid-value',
		},
	]);
});

test('[no-invalid-attr-value-valid-009] headingoffset with valid value is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<section headingoffset="1"><h2>Title</h2></section>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-010] headingoffset="0" is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<div headingoffset="0"><h1>Title</h1></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-011] headingoffset="8" is valid (max)', async () => {
	const { violations } = await mlRuleTest(rule, '<div headingoffset="8"><h1>Title</h1></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-019] headingoffset with non-integer value is invalid', async () => {
	const { violations } = await mlRuleTest(rule, '<div headingoffset="abc"><h1>Title</h1></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message:
				'It includes unexpected characters. the "headingoffset" attribute expects integer greater than or equal to 0 less than or equal to 8',
			raw: 'abc',
		},
	]);
});

test('[no-invalid-attr-value-valid-012] headingreset is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<div headingreset><h1>Title</h1></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3384-001] focusgroup with valid behavior keyword', async () => {
	expect((await mlRuleTest(rule, '<div focusgroup="toolbar"></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3384-002] focusgroup with multiple valid tokens', async () => {
	expect((await mlRuleTest(rule, '<div focusgroup="tablist inline wrap"></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3384-003] focusgroup with all valid tokens', async () => {
	expect((await mlRuleTest(rule, '<ul focusgroup="menu block nowrap nomemory"></ul>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3384-004] focusgroup with invalid token', async () => {
	const { violations } = await mlRuleTest(rule, '<div focusgroup="invalid"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 18,
			message: expect.stringContaining('"focusgroup"'),
			raw: 'invalid',
		},
	]);
});

test('[no-invalid-attr-value-issue-3384-005] focusgroup with valid and invalid tokens mixed', async () => {
	const { violations } = await mlRuleTest(rule, '<div focusgroup="toolbar invalidmod"></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.raw).toBe('invalidmod');
});

test('[no-invalid-attr-value-issue-3384-006] focusgroup="none" is valid', async () => {
	expect((await mlRuleTest(rule, '<li focusgroup="none"></li>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3384-007] focusgroup is case-insensitive', async () => {
	expect((await mlRuleTest(rule, '<div focusgroup="TOOLBAR"></div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div focusgroup="Menu Inline Wrap"></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3384-008] focusgroup rejects duplicate tokens', async () => {
	const { violations } = await mlRuleTest(rule, '<div focusgroup="toolbar toolbar"></div>');
	expect(violations.length).toBeGreaterThanOrEqual(1);
});

test('[no-invalid-attr-value-issue-3384-009] focusgroup with empty value is valid (zero tokens allowed)', async () => {
	expect((await mlRuleTest(rule, '<div focusgroup=""></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3384-010] focusgroupstart boolean attribute is valid', async () => {
	expect((await mlRuleTest(rule, '<button focusgroupstart></button>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3384-011] focusgroup on any element (global attribute)', async () => {
	expect((await mlRuleTest(rule, '<nav focusgroup="menubar"></nav>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<span focusgroupstart></span>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-013] empty lang attribute is valid (language set to unknown)', async () => {
	expect((await mlRuleTest(rule, '<html lang=""></html>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<html lang></html>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div lang=""></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-020] script type="speculationrules" is valid', async () => {
	expect(
		(await mlRuleTest(rule, '<script type="speculationrules">{"prerender":[{"urls":["/page"]}]}</script>'))
			.violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3631-001] crossorigin enum value is still validated (regression pin for #3648)', async () => {
	// Overriding a global category attribute with a condition must not drop
	// the enum type definition.
	const { violations } = await mlRuleTest(rule, '<script src="app.js" crossorigin="unknown"></script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 35,
			message: 'The "crossorigin" attribute expects either "", "anonymous", "use-credentials"',
			raw: 'unknown',
		},
	]);
});

test('[no-invalid-attr-value-issue-3631-002] fetchpriority enum value is still validated (regression pin for #3648)', async () => {
	const { violations } = await mlRuleTest(rule, '<script src="app.js" fetchpriority="urgent"></script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 37,
			message: 'The "fetchpriority" attribute expects either "high", "low", "auto"',
			raw: 'urgent',
		},
	]);
});

test('[no-invalid-attr-value-issue-3631-003] empty type is a classic script: defer is allowed', async () => {
	// HTML LS: "Omitting the attribute, setting it to the empty string, or
	// setting it to a JavaScript MIME type essence match means that the script
	// is a classic script" — so defer must NOT be flagged here. The single
	// violation below is the pre-existing value validation of the type
	// attribute itself (MIMEType | enum does not model the empty string),
	// which is a separate concern from the applicability conditions.
	const { violations } = await mlRuleTest(rule, '<script type="" src="app.js" defer></script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message:
				'The "type" attribute must not be empty. It expects the MIME Type format (https://mimesniff.spec.whatwg.org/#valid-mime-type). Or, the "type" attribute expects either "module", "importmap", "speculationrules"',
			raw: '',
		},
	]);
});

test('[no-invalid-attr-value-issue-3599-001] srcset rejects zero width descriptor', async () => {
	const { violations } = await mlRuleTest(rule, '<img srcset="x 0w" sizes="100vw" src=x alt=x>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-issue-3599-002] srcset rejects zero density descriptor', async () => {
	const { violations } = await mlRuleTest(rule, '<img srcset="x 0x" src=x alt=x>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-issue-3599-003] srcset accepts valid width descriptor', async () => {
	expect((await mlRuleTest(rule, '<img srcset="x 100w" sizes="100vw" src=x alt=x>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3626-001] integrity rejects md5 hash', async () => {
	const { violations } = await mlRuleTest(rule, '<script src="x" integrity="md5-abc123"></script>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-issue-3626-002] integrity accepts sha256 hash', async () => {
	expect((await mlRuleTest(rule, '<script src="x" integrity="sha256-abc123"></script>')).violations).toStrictEqual(
		[],
	);
});

test('[no-invalid-attr-value-issue-3598-001] input[type=color] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="color" value="red">');
	const valueViolation = violations.find(v => v.raw === 'red');
	expect(valueViolation).toBeDefined();
	expect(valueViolation!.message).toContain('simple color');
});

test('[no-invalid-attr-value-issue-3598-002] input[type=color] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="color" value="#ff0000">');
	expect(violations.some(v => v.raw === '#ff0000')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-003] input[type=url] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="url" value="http://example.com/path with space">');
	expect(violations.some(v => v.raw === 'http://example.com/path with space')).toBe(true);
});

test('[no-invalid-attr-value-issue-3598-004] input[type=url] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="url" value="https://example.com">');
	expect(violations.some(v => v.raw === 'https://example.com')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-005] input[type=number] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="number" value="abc">');
	expect(violations.some(v => v.raw === 'abc')).toBe(true);
});

test('[no-invalid-attr-value-issue-3598-006] input[type=number] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="number" value="42">');
	expect(violations.some(v => v.raw === '42')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-007] input[type=text] value is not validated (Any fallback)', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" value="anything goes">');
	expect(violations.some(v => v.raw === 'anything goes')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-008] input without type: value is not validated (Any fallback)', async () => {
	const { violations } = await mlRuleTest(rule, '<input value="anything">');
	expect(violations.some(v => v.raw === 'anything')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-009] input[type=email] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="email" value="not-an-email">');
	expect(violations.some(v => v.raw === 'not-an-email')).toBe(true);
});

test('[no-invalid-attr-value-issue-3598-010] input[type=email] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="email" value="user@example.com">');
	expect(violations.some(v => v.raw === 'user@example.com')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-011] input[type=date] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="date" value="2024/01/15">');
	expect(violations.some(v => v.raw === '2024/01/15')).toBe(true);
});

test('[no-invalid-attr-value-issue-3598-012] input[type=date] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="date" value="2024-01-15">');
	expect(violations.some(v => v.raw === '2024-01-15')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-013] input[type=range] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="range" value="50">');
	expect(violations.some(v => v.raw === '50')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-014] input[type=range] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="range" value="abc">');
	expect(violations.some(v => v.raw === 'abc')).toBe(true);
});

test('[no-invalid-attr-value-issue-3598-015] input[type=time] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="time" value="12:30">');
	expect(violations.some(v => v.raw === '12:30')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-016] input[type=time] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="time" value="25:99">');
	// Token-based checker reports the first invalid part ("25"), not the whole value.
	expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
});

test('[no-invalid-attr-value-issue-3598-017] input[type=month] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="month" value="2024-01">');
	expect(violations.some(v => v.raw === '2024-01')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-018] input[type=month] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="month" value="2024-13">');
	expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
});

test('[no-invalid-attr-value-issue-3598-019] input[type=week] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="week" value="2024-W03">');
	expect(violations.some(v => v.raw === '2024-W03')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-020] input[type=week] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="week" value="2024-03">');
	expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
});

test('[no-invalid-attr-value-issue-3598-021] input[type=datetime-local] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="datetime-local" value="2024-01-15T12:30">');
	expect(violations.some(v => v.raw === '2024-01-15T12:30')).toBe(false);
});

test('[no-invalid-attr-value-issue-3598-022] input[type=datetime-local] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="datetime-local" value="2024-01-15">');
	expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
});

test('[no-invalid-attr-value-issue-3189-001] rel=preload with valid as value', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="preload" href="/a.js" as="script">');
	expect(violations.some(v => v.raw === 'script')).toBe(false);
});

test('[no-invalid-attr-value-issue-3189-002] rel=preload with invalid as value (json is modulepreload-only)', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="preload" href="/a.json" as="json">');
	expect(violations.some(v => v.raw === 'json')).toBe(true);
});

test('[no-invalid-attr-value-issue-3189-003] rel=modulepreload with valid as value', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="modulepreload" href="/a.js" as="script">');
	expect(violations.some(v => v.raw === 'script')).toBe(false);
});

test('[no-invalid-attr-value-issue-3189-004] rel=modulepreload with valid as=json', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="modulepreload" href="/a.json" as="json">');
	expect(violations.some(v => v.raw === 'json')).toBe(false);
});

test('[no-invalid-attr-value-issue-3189-005] rel=modulepreload with invalid as value (track is preload-only)', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="modulepreload" href="/a.vtt" as="track">');
	expect(violations.some(v => v.raw === 'track')).toBe(true);
});

test('[no-invalid-attr-value-issue-3189-006] rel=preload with all valid preload destinations', async () => {
	for (const dest of ['fetch', 'font', 'image', 'script', 'style', 'track']) {
		const { violations } = await mlRuleTest(rule, `<link rel="preload" href="/a" as="${dest}">`);
		expect(violations.some(v => v.raw === dest)).toBe(false);
	}
});

test('[no-invalid-attr-value-issue-3189-007] rel=modulepreload with all valid module destinations', async () => {
	for (const dest of [
		'json',
		'style',
		'audioworklet',
		'paintworklet',
		'script',
		'serviceworker',
		'sharedworker',
		'worker',
	]) {
		const { violations } = await mlRuleTest(rule, `<link rel="modulepreload" href="/a" as="${dest}">`);
		expect(violations.some(v => v.raw === dest)).toBe(false);
	}
});

test('[no-invalid-attr-value-issue-3189-008] rel=preload with completely bogus as value', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="preload" href="/a" as="bogus">');
	expect(violations.some(v => v.raw === 'bogus')).toBe(true);
});

test('[no-invalid-attr-value-issue-3189-010] rel with multiple tokens: preload + stylesheet', async () => {
	// condition uses ~= (space-separated token match), so "preload stylesheet" must match
	const { violations } = await mlRuleTest(rule, '<link rel="preload stylesheet" href="/a.css" as="style">');
	expect(violations.some(v => v.raw === 'style')).toBe(false);
});

test('[no-invalid-attr-value-issue-3189-011] rel=modulepreload as=fetch is invalid (fetch is preload-only)', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="modulepreload" href="/a" as="fetch">');
	expect(violations.some(v => v.raw === 'fetch')).toBe(true);
});

test('[no-invalid-attr-value-issue-3189-012] case-insensitive rel matching: rel=PRELOAD', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="PRELOAD" href="/a.js" as="script">');
	expect(violations.some(v => v.raw === 'script')).toBe(false);
});

test('[no-invalid-attr-value-issue-3629-001] C1 control U+0080 in href', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\u0080">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-issue-3629-002] C1 control U+009F in href', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\u009F">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-issue-3629-003] BMP noncharacter U+FDD0 in href', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\uFDD0">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-issue-3629-004] BMP noncharacter U+FFFE in href', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\uFFFE">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-issue-3629-005] supplementary plane noncharacter U+1FFFE in href', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\u{1FFFE}">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-issue-3629-006] trailing vertical tab U+000B in href is not silently stripped', async () => {
	// Regression for JavaScript String.prototype.trim() stripping U+000B
	// before the forbidden-code-point check.
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\u000B">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-issue-3629-007] PUA code point in href is accepted', async () => {
	// Guard against over-broad regex: U+E000 (BMP PUA) is not forbidden.
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\uE000">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(false);
});

test('[no-invalid-attr-value-issue-3629-008] emoji (U+1F4A9) in href is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\u{1F4A9}">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(false);
});

test('[no-invalid-attr-value-issue-3734-001] refresh: bare integer is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="refresh" content="30">');
	expect(violations.some(v => v.raw === '30')).toBe(false);
});

test('[no-invalid-attr-value-issue-3734-002] refresh: integer + "; URL=<url>" is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="refresh" content="0; URL=https://example.com/">');
	expect(violations.some(v => v.raw === '0; URL=https://example.com/')).toBe(false);
});

test('[no-invalid-attr-value-issue-3734-003] refresh: empty content is invalid', async () => {
	// Fixture: html/elements/meta/refresh-empty-novalid.html.
	// Assert on `raw` rather than on a substring of the message — the
	// human wording comes from the type registration and is subject to
	// wording changes, whereas `raw` is the concrete value the rule
	// flagged.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="refresh" content="">');
	expect(violations.some(v => v.raw === '')).toBe(true);
});

test('[no-invalid-attr-value-issue-3734-004] refresh: missing separator is invalid', async () => {
	// Fixture: html/elements/meta/refresh-missing-semicolon-novalid.html
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="refresh" content="5 url=http://example.com">');
	expect(violations.some(v => v.raw === '5 url=http://example.com')).toBe(true);
});

test('[no-invalid-attr-value-issue-3734-005] refresh: whitespace after ";" is optional (nu over-detects)', async () => {
	// Fixture: html/elements/meta/refresh-missing-space-novalid.html.
	// HTML LS §4.2.5.3 clause 3.2 marks the whitespace optional — this
	// fixture is a nu over-detection recorded in excluded-ids.json.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="refresh" content="5;url=http://example.com">');
	expect(violations.some(v => v.raw === '5;url=http://example.com')).toBe(false);
});

test('[no-invalid-attr-value-issue-3734-006] content-type: canonical form is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-type" content="text/html; charset=utf-8">',
	);
	expect(violations.some(v => v.raw === 'text/html; charset=utf-8')).toBe(false);
});

test('[no-invalid-attr-value-issue-3734-007] content-type: malformed MIME is invalid', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="content-type" content="not a mime">');
	expect(violations.some(v => v.raw === 'not a mime')).toBe(true);
});

test('[no-invalid-attr-value-issue-3734-008] content-type: wrong MIME type is invalid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-type" content="text/plain; charset=utf-8">',
	);
	expect(violations.some(v => v.raw === 'text/plain; charset=utf-8')).toBe(true);
});

test('[no-invalid-attr-value-issue-3734-009] x-ua-compatible: "IE=edge" is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="x-ua-compatible" content="IE=edge">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3734-010] x-ua-compatible: ASCII case-insensitive match is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="x-ua-compatible" content="ie=EDGE">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3734-011] x-ua-compatible: "IE=10" is invalid', async () => {
	// Fixture: html/elements/meta/x-ua-compatible-not-ie-edge-novalid.html.
	// `raw` is returned lower-cased because the enum matcher normalises the
	// input for its case-insensitive comparison and reports the normalised
	// token; this is the same behaviour observed in the sibling `-014` and
	// `-015` case-insensitive tests. The full-object `toStrictEqual` pin
	// documents that behaviour and catches any future normalisation drift.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="x-ua-compatible" content="IE=10">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "content" attribute expects IE=edge',
			line: 1,
			col: 45,
			raw: 'ie=10',
		},
	]);
});

test('[no-invalid-attr-value-issue-3734-012] x-ua-compatible: http-equiv attribute value match is ASCII case-insensitive', async () => {
	// Reflects the shape of the bench fixture, which uses the mixed-case
	// `X-UA-Compatible`. spec.meta.jsonc's condition is
	// `[http-equiv='x-ua-compatible' i]`; the `i` flag must flow through so
	// the enum still fires on mixed-case http-equiv values.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="X-UA-Compatible" content="IE=10">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "content" attribute expects IE=edge',
			line: 1,
			col: 45,
			raw: 'ie=10',
		},
	]);
});

test('[no-invalid-attr-value-issue-3734-013] x-ua-compatible: empty content is invalid', async () => {
	// Boundary case: the enum requires exactly `IE=edge`; the empty string
	// is not that. `disallowToSurroundBySpaces` (default true on the enum
	// checker) does not apply here because the value has no content to
	// surround — the empty string fails the enum equality on its own.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="x-ua-compatible" content="">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "content" attribute expects IE=edge',
			line: 1,
			col: 45,
			raw: '',
		},
	]);
});

test('[no-invalid-attr-value-issue-3734-014] http-equiv="default-style" content falls through to Any', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="default-style" content="preferred">');
	expect(violations.length).toBe(0);
});

test('[no-invalid-attr-value-issue-3734-015] name= variants fall through to Any', async () => {
	// name=viewport / description / keywords — ConditionalAttributeType
	// array does not match, Any applies, anything passes.
	const { violations } = await mlRuleTest(rule, '<meta name="description" content="arbitrary description text">');
	expect(violations.length).toBe(0);
});

test('[no-invalid-attr-value-issue-3734-016] itemprop= variants fall through to Any', async () => {
	// itemprop is the third <meta> identifier besides name / http-equiv
	// / charset. ConditionalAttributeType[] array does not match, Any
	// applies, anything passes.
	const { violations } = await mlRuleTest(
		rule,
		'<div itemscope><meta itemprop="version" content="anything goes"></div>',
	);
	expect(violations.length).toBe(0);
});

test('[no-invalid-attr-value-issue-3734-017] http-equiv value match is ASCII case-insensitive', async () => {
	// spec.meta.jsonc condition uses `[http-equiv='refresh' i]`. Legacy
	// HTML commonly writes `<META HTTP-EQUIV="REFRESH">`; the `i` flag
	// must flow through the selector engine so the refresh validator
	// still fires and we do not silently miss these elements.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="REFRESH" content="garbage">');
	expect(violations.some(v => v.raw === 'garbage')).toBe(true);
});

test('[no-invalid-attr-value-issue-3734-018] content-type value match is ASCII case-insensitive', async () => {
	// Same guarantee on the content-type branch.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="Content-Type" content="not a mime">');
	expect(violations.some(v => v.raw === 'not a mime')).toBe(true);
});

test('[no-invalid-attr-value-issue-3942-001] a single keyword-source directive is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="default-src \'self\'">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3942-002] an unrecognized directive name is invalid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-invalid-directive-haswarn.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="default-src \'self\'; invalid-directive \'none\'">',
	);
	// `raw`/`col` point at the specific offending token
	// (`invalid-directive`), not the whole content value — the checker
	// tracks real offsets via `Token`, the same as its sibling
	// `check-serialized-permissions-policy.ts`.
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message:
				'The directive-name part of the "content" attribute expects registered CSP directive name (https://www.w3.org/TR/CSP3/#framework-policy)',
			line: 1,
			col: 73,
			raw: 'invalid-directive',
		},
	]);
});

test('[no-invalid-attr-value-issue-3942-003] an unrecognized source-expression is invalid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-invalid-source-novalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="default-src \'invalid-keyword\'">',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message:
				'The source-expression part includes unexpected characters. It expects the source-expression format (https://www.w3.org/TR/CSP3/#framework-policy)',
			line: 1,
			col: 65,
			raw: "'invalid-keyword'",
		},
	]);
});

test('[no-invalid-attr-value-issue-3942-004] a non-ASCII host authority is invalid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-non-ascii-novalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="default-src \'self\'; img-src https://例え.com">',
	);
	// `raw` is the single offending non-ASCII character (`例`) — the ASCII
	// guard reports the first code point that fails, not the whole
	// multi-byte host label.
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message:
				'The "content" attribute expects the ASCII-only Content Security Policy format (https://www.w3.org/TR/CSP3/#framework-policy)',
			line: 1,
			col: 89,
			raw: '例',
		},
	]);
});

test('[no-invalid-attr-value-issue-3942-005] the http-equiv attribute value match is ASCII case-insensitive', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="Content-Security-Policy" content="default-src \'invalid-keyword\'">',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message:
				'The source-expression part includes unexpected characters. It expects the source-expression format (https://www.w3.org/TR/CSP3/#framework-policy)',
			line: 1,
			col: 65,
			raw: "'invalid-keyword'",
		},
	]);
});

test('[no-invalid-attr-value-issue-3942-006] an empty policy is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-empty-isvalid.html
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="content-security-policy" content="">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3942-007] a comma-separated policy list is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-policy-list-isvalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="default-src \'self\', script-src \'unsafe-inline\'">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3942-008] the sandbox directive with recognized tokens is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-sandbox-isvalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="sandbox allow-forms allow-popups allow-scripts">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3942-009] trusted-types with allow-duplicates is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-trusted-types-isvalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="trusted-types myPolicy \'allow-duplicates\'">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3942-010] a hash-source directive is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-with-hash-isvalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="script-src \'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=\'">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3942-011] a nonce-source directive is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-with-nonce-isvalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="script-src \'nonce-rAnd0m123\'">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3803-001] nodeRule allowAttrs permits property/content on meta[property]', async () => {
	// Reproduces the structure of preset.rdfa.jsonc: an unnamed nodeRule
	// whose options reach the base `invalid-attr` rule so spec validation
	// treats `property` and `content` as allowed on meta[property].
	const { violations } = await mlRuleTest(rule, '<meta property="og:title" content="Hello">', {
		nodeRule: [
			{
				selector: ':where(meta[property])',
				rule: {
					options: {
						allowAttrs: [
							{ name: 'property', value: 'NoEmptyAny' },
							{ name: 'content', value: 'NoEmptyAny' },
						],
					},
				},
			},
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-3803-002] empty property value is still flagged as NoEmptyAny violation', async () => {
	// The allowAttrs override uses `NoEmptyAny`, not `Any`: empty values
	// must still be flagged so we do not silently allow `<meta property="">`.
	const { violations } = await mlRuleTest(rule, '<meta property="" content="Hello">', {
		nodeRule: [
			{
				selector: ':where(meta[property])',
				rule: {
					options: {
						allowAttrs: [
							{ name: 'property', value: 'NoEmptyAny' },
							{ name: 'content', value: 'NoEmptyAny' },
						],
					},
				},
			},
		],
	});
	// Still reports on the empty property value via attrCheck
	expect(violations.length).toBeGreaterThan(0);
	expect(violations.some(v => v.raw === '')).toBe(true);
});

test('[no-invalid-attr-value-invalid-021] bdo dir="auto" is forbidden', async () => {
	const { violations } = await mlRuleTest(rule, '<bdo dir="auto">x</bdo>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 11,
			message: 'The "dir" attribute expects either "ltr", "rtl"',
			raw: 'auto',
		},
	]);
});

test('[no-invalid-attr-value-valid-014] bdo dir="ltr" and dir="rtl" are accepted', async () => {
	expect((await mlRuleTest(rule, '<bdo dir="ltr">x</bdo>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<bdo dir="rtl">x</bdo>')).violations.length).toBe(0);
});

test('[no-invalid-attr-value-invalid-022] input[type=date][min] rejects out-of-range month', async () => {
	// Mirrors html/datatypes/date-month-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="date" min="2024-13-01">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('month part');
});

test('[no-invalid-attr-value-invalid-023] input[type=date][min] rejects out-of-range day', async () => {
	// Mirrors html/datatypes/date-day-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="date" min="2024-02-30">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('date part');
});

test('[no-invalid-attr-value-invalid-024] input[type=date][min] rejects wrong format', async () => {
	// Mirrors html/datatypes/date-invalid-format-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="date" min="12-31-2024">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('year part');
});

test('[no-invalid-attr-value-invalid-025] input[type=time][min] rejects out-of-range hour', async () => {
	// Mirrors html/datatypes/time-hour-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="time" min="25:00">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('hour part');
});

test('[no-invalid-attr-value-invalid-026] input[type=month][min] rejects month 0', async () => {
	// Mirrors html/datatypes/month-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="month" min="2024-00">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('month part');
});

test('[no-invalid-attr-value-invalid-027] input[type=week][min] rejects week 54', async () => {
	// Mirrors html/datatypes/week-invalid-format-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="week" min="2024-W54">');
	expect(violations.length).toBe(1);
	// week-string week-number is internally validated under the "date" component.
	expect(violations[0]?.message).toContain('date part');
});

test('[no-invalid-attr-value-invalid-028] input[type=date][min] rejects Feb 29 in non-leap year', async () => {
	// markuplint-only edge: no dedicated bench fixture, pin the leap-year branch.
	const { violations } = await mlRuleTest(rule, '<input type="date" min="2023-02-29">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('date part');
});

test('[no-invalid-attr-value-invalid-029] input[type=datetime-local][min] rejects out-of-range month', async () => {
	// Mirrors html/datatypes/datetime-local-invalid-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="datetime-local" min="2024-13-01T12:00">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('month part');
});

test('[no-invalid-attr-value-invalid-030] input[type=time][min] rejects out-of-range minute', async () => {
	// Mirrors html/datatypes/time-minute-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="time" min="12:60">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('minute part');
});

test('[no-invalid-attr-value-invalid-031] input[type=time][min] rejects out-of-range second', async () => {
	// Mirrors html/datatypes/time-second-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="time" min="12:30:60">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('second part');
});

test('[no-invalid-attr-value-valid-015] input[type=date] min/max accepts well-formed values', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="date" min="2024-01-01" max="2024-12-31">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-016] input[type=month] min/max accepts well-formed values', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="month" min="2024-01" max="2024-12">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-017] input[type=week] min/max accepts well-formed values', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="week" min="2024-W01" max="2024-W52">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-018] input[type=time] min/max accepts well-formed values', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="time" min="00:00" max="23:59">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-019] input[type=datetime-local] min/max accepts well-formed values', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<input type="datetime-local" min="2024-01-01T00:00" max="2024-12-31T23:59">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-020] input[type=number] min/max accepts integer floats', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="number" min="0" max="100">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-021] input[type=range] min/max accepts negative floats', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="range" min="-5" max="5">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-022] input[type=date][min] accepts Feb 29 in leap year', async () => {
	// Pin the leap-year branch of datetimeTokenCheck.date so a future refactor
	// that drops the year-aware day-of-month calculation is caught here.
	const { violations } = await mlRuleTest(rule, '<input type="date" min="2024-02-29">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-032] progress max="0" is rejected', async () => {
	// Mirrors html/datatypes/float-positive-zero-novalid.html
	const { violations } = await mlRuleTest(rule, '<progress max="0"></progress>');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('greater than 0');
});

test('[no-invalid-attr-value-invalid-033] progress max="-5" is rejected', async () => {
	// Mirrors html/datatypes/float-positive-negative-novalid.html
	const { violations } = await mlRuleTest(rule, '<progress max="-5"></progress>');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('greater than 0');
});

test('[no-invalid-attr-value-valid-023] progress max="1" is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<progress max="1"></progress>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-024] progress max="100" is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<progress max="100"></progress>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-025] progress max="0.5" is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<progress max="0.5"></progress>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-034] itemref token list rejects duplicate ids (HTML LS §5.2.2 Items)', async () => {
	// Mirrors html/microdata/itemref-redundant-novalid.html. Locks down the
	// `unique: true` flag added to the itemref token spec.
	// Uses substring-only `.some(...)` (matches the invalid-039 pattern)
	// so the test stays stable when invalid-attr's surrounding wording is
	// tuned elsewhere.
	const { violations } = await mlRuleTest(
		rule,
		'<div itemscope itemref="ref1 ref1"></div><div id="ref1" itemprop="name">x</div>',
	);
	expect(
		violations.some(v => v.raw === 'ref1' && typeof v.message === 'string' && v.message.includes('duplicated')),
	).toBe(true);
});

test('[no-invalid-attr-value-invalid-035] itemtype="" rejects empty token set (HTML LS §5.2.2 Items)', async () => {
	// Mirrors html/microdata/itemtype-empty-novalid.html. Locks down the
	// `allowEmpty: false` flag added to the itemtype token spec.
	// Uses substring-only match (see invalid-040 for rationale).
	const { violations } = await mlRuleTest(rule, '<div itemtype="" itemscope></div>');
	expect(
		violations.some(
			v =>
				typeof v.message === 'string' &&
				v.message.includes('itemtype') &&
				v.message.includes('must not be empty'),
		),
	).toBe(true);
});

test('[no-invalid-attr-value-valid-026] del[datetime] accepts a valid date string', async () => {
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-11-12">x</del>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-027] del[datetime] accepts a valid global date and time string', async () => {
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-11-12T14:54:39.929+0000">x</del>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-036] del[datetime] rejects a date string without hyphens', async () => {
	// Mirrors html/elements/del/date-iso8601-YYYYMMDD-no-hyphen-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="20020929">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-037] del[datetime] rejects a duration P-form string', async () => {
	// Mirrors html/elements/del/duration-P-form-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="PT4H18M3S">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-038] del[datetime] rejects a duration component-list string', async () => {
	// Mirrors html/elements/del/duration-time-component-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="4h 18m 3s">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-039] del[datetime] rejects a comma fraction separator', async () => {
	// Mirrors html/elements/del/global-date-and-time-bad-fraction-separator-novalid.html.
	// Also locks down the parallel fix in `checkGlobalDateAndTimeString` so the
	// catch-all `DateTime` type no longer accepts comma as a fraction separator.
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-11-12T14:54:39,929+0000">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-040] del[datetime] rejects a local date and time string', async () => {
	// Mirrors html/elements/del/local-date-and-time-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-11-12T14:54">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-041] del[datetime] rejects a month-only string', async () => {
	// Mirrors html/elements/del/month-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-11">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-042] del[datetime] rejects a time-only string', async () => {
	// Mirrors html/elements/del/time-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="14:54:39">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-043] del[datetime] rejects a week string', async () => {
	// Mirrors html/elements/del/week-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-W46">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-044] del[datetime] rejects a year-only string', async () => {
	// Mirrors html/elements/del/year-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="2006">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-045] del[datetime] rejects a yearless date string', async () => {
	// Mirrors html/elements/del/yearless-date-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="07-15">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-046] ins[datetime] applies the same narrowed type', async () => {
	// Spec-level mirror of `<del>`; one ins sample keeps the parallel coverage
	// honest without duplicating all 9 reject cases.
	const { violations } = await mlRuleTest(rule, '<ins datetime="2011-11">x</ins>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-valid-028] form[action] accepts a regular URL', async () => {
	const { violations } = await mlRuleTest(rule, '<form action="/submit"></form>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-029] button[formaction] accepts a regular URL', async () => {
	const { violations } = await mlRuleTest(rule, '<button formaction="/submit"></button>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-030] object[data] accepts a regular URL', async () => {
	const { violations } = await mlRuleTest(rule, '<object data="resource.swf"></object>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-031] link[href] accepts a regular URL', async () => {
	const { violations } = await mlRuleTest(rule, '<link href="/style.css" rel="stylesheet">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-032] video[poster] accepts a regular URL', async () => {
	const { violations } = await mlRuleTest(rule, '<video poster="/poster.jpg" src="movie.mp4"></video>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-047] form[action] rejects empty string', async () => {
	// Mirrors html/elements/form/action-empty-novalid.html.
	const { violations } = await mlRuleTest(rule, '<form action=""></form>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-048] form[action] rejects whitespace-only', async () => {
	// Mirrors html/elements/form/action-whitespace-only-novalid.html.
	const { violations } = await mlRuleTest(rule, '<form action="\t \n"></form>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-049] button[formaction] rejects empty string', async () => {
	// Mirrors html/elements/button/formaction-empty-novalid.html.
	const { violations } = await mlRuleTest(rule, '<button formaction=""></button>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-050] input[formaction] rejects empty string', async () => {
	// Mirrors html/elements/input/type-image-formaction-empty-novalid.html.
	const { violations } = await mlRuleTest(rule, '<input type="image" alt="foo" formaction="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-051] object[data] rejects empty string', async () => {
	// Mirrors html/elements/object/data-empty-novalid.html.
	const { violations } = await mlRuleTest(rule, '<object data=""></object>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-052] link[href] rejects empty string', async () => {
	// Mirrors html/elements/link/href-empty-novalid.html.
	const { violations } = await mlRuleTest(rule, '<link href="" rel>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-053] video[poster] rejects empty string', async () => {
	// HTML LS §4.8.9 video: poster must be a "valid non-empty URL".
	// Same bug class as the other URL→NonEmptyURL reclassifications;
	// no nu fixture covers it directly but the spec wording is identical.
	const { violations } = await mlRuleTest(rule, '<video poster="" src="movie.mp4"></video>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-valid-033] progress value="0.5" max="1" is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<progress value="0.5" max="1">50%</progress>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-054] progress value="-10" is rejected', async () => {
	// Mirrors html/elements/progress/value-negative-novalid.html.
	const { violations } = await mlRuleTest(rule, '<progress value="-10" max="100">-10%</progress>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-valid-034] img with srcset+sizes is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="x.jpg" srcset="x.jpg 1x" sizes="100vw" alt="x">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-035] picture > source with srcset+sizes is accepted', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<picture><source srcset="x.jpg 100w" sizes="100vw"><img src="x.jpg" alt="x"></picture>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-036] autocomplete="name webauthn" is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<input autocomplete="name webauthn">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-055] autocomplete="webauthn" alone is rejected', async () => {
	// Mirrors html/elements/input/autocomplete-webauthn-only-novalid.html.
	// Spec: "the webauthn token must appear along with at least one other
	// token; an autocomplete attribute whose value consists solely of the
	// webauthn token is non-conforming."
	const { violations } = await mlRuleTest(rule, '<input autocomplete="webauthn">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-valid-037] input[name="username"] is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" name="username">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-038] input[name="Isindex"] is accepted (case-sensitive per spec literal)', async () => {
	// Spec uses the literal value `isindex` without an ASCII
	// case-insensitive qualifier, so capitalised variants are allowed.
	const { violations } = await mlRuleTest(rule, '<input type="text" name="Isindex">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-056] input[name="isindex"] is rejected', async () => {
	// Mirrors html/elements/input/name-isindex-novalid.html.
	// Spec: input element's name attribute "must not be the value isindex".
	const { violations } = await mlRuleTest(rule, '<input type="text" name="isindex">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-057] input[name=""] is rejected (empty preserved by Pattern override)', async () => {
	// The Pattern override drops the inherited NoEmptyAny; the `.+` arm of
	// the regex must keep the empty case rejected. Pin this so a future
	// rewrite of the Pattern does not silently widen the contract.
	const { violations } = await mlRuleTest(rule, '<input type="text" name="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-valid-039] srcset with distinct densities is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="x.jpg" srcset="a.jpg 1x, b.jpg 2x" alt="">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-058] srcset with duplicate density (omitted + 1x) is rejected', async () => {
	// Mirrors html/elements/picture/srcset-microsyntax-unique-descriptors-1x-and-omitted-novalid.html.
	// Omitted descriptor implies density 1x; pairing with explicit 1x is a duplicate.
	const { violations } = await mlRuleTest(rule, '<img srcset="x 1x, y" src="x" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-059] srcset with duplicate explicit density is rejected', async () => {
	// Mirrors html/elements/picture/srcset-microsyntax-unique-descriptors-2x-novalid.html.
	const { violations } = await mlRuleTest(rule, '<img srcset="x 2x, y 2x" src="x" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-060] srcset with integer and decimal density equal in value is rejected', async () => {
	// Mirrors html/elements/picture/srcset-microsyntax-unique-descriptors-integer-and-decimals-x-novalid.html.
	// 1x and 1.0x normalise to the same numeric pixel density.
	const { violations } = await mlRuleTest(rule, '<img srcset="x 1x, y 1.0x" src="x" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-061] srcset with duplicate width descriptor is rejected', async () => {
	// Mirrors html/elements/picture/srcset-microsyntax-unique-descriptors-w-novalid.html.
	const { violations } = await mlRuleTest(rule, '<img srcset="x 1w, y 1w" sizes="100vw" src="x" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-062] srcset with explicit "1x, 1x" duplicate is rejected', async () => {
	// The simplest duplicate-density case — most common shape that real
	// projects accidentally hit. No nu fixture pins this directly (only
	// `1x, y` / `2x, 2x` / `1x, 1.0x` are in the corpus), but the rule
	// guarantee should fire on the canonical shape too.
	const { violations } = await mlRuleTest(rule, '<img srcset="a.jpg 1x, b.jpg 1x" src="a.jpg" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-063] srcset with decimal-only duplicate density is rejected', async () => {
	// Pins the decimal-equality branch independently from the
	// integer-vs-decimal normalisation case (invalid-072).
	const { violations } = await mlRuleTest(rule, '<img srcset="a.jpg 0.5x, b.jpg 0.5x" src="a.jpg" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-064] srcset with duplicate density at end of 3-entry list is rejected', async () => {
	// Duplicate detection must trip on the third entry, not only on the
	// adjacent pair. Pins that the Set is checked for every entry.
	const { violations } = await mlRuleTest(rule, '<img srcset="a.jpg 1x, b.jpg 2x, c.jpg 1x" src="a.jpg" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-invalid-065] link rel="alternate stylesheet" with empty title is rejected', async () => {
	// HTML LS §4.6.7.4 mandates a **non-empty** title. Pins the
	// conditional NoEmptyAny type override on link[title].
	const { violations } = await mlRuleTest(rule, '<link rel="alternate stylesheet" href="x.css" title="">');
	expect(violations.some(v => typeof v.message === 'string' && v.message.toLowerCase().includes('title'))).toBe(true);
});

test('[no-invalid-attr-value-valid-040] template[shadowrootslotassignment="named"] is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<template shadowrootslotassignment="named"></template>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-041] template[shadowrootslotassignment="manual"] is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<template shadowrootslotassignment="manual"></template>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-066] template[shadowrootslotassignment="auto"] is rejected (not in enum)', async () => {
	const { violations } = await mlRuleTest(rule, '<template shadowrootslotassignment="auto"></template>');
	expect(violations).toHaveLength(1);
	expect(violations[0]).toMatchObject({
		severity: 'error',
		message: 'The "shadowrootslotassignment" attribute expects either "named", "manual"',
		raw: 'auto',
	});
});

test('[no-invalid-attr-value-valid-042] template[shadowrootcustomelementregistry] Boolean attribute is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<template shadowrootcustomelementregistry></template>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-invalid-067] select autocomplete containing webauthn is rejected', async () => {
	// HTML LS §attr-fe-autocomplete-webauthn: "webauthn is only valid
	// for input and textarea elements." Mirrors bench fixture
	// html/elements/select/autocomplete-with-webauthn-novalid.html.
	const { violations } = await mlRuleTest(
		rule,
		'<select autocomplete="section-blue billing work tel-country-code webauthn"><option>1</option></select>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 66,
			message:
				'It includes unexpected characters. the "autocomplete" attribute expects autofill field name (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn)',
			raw: 'webauthn',
		},
	]);
});

test('[no-invalid-attr-value-invalid-068] input[type=hidden] autocomplete="on" is rejected', async () => {
	// HTML LS §autofill-anchor-mantle: "the 'on' and 'off' keywords are
	// not allowed." Mirrors bench fixture
	// html/elements/input/type-hidden-autocomplete-on-novalid.html.
	const { violations } = await mlRuleTest(rule, '<input type="hidden" autocomplete="on">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 36,
			message:
				'It includes unexpected characters. the "autocomplete" attribute expects autofill field name (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle)',
			raw: 'on',
		},
	]);
});

test('[no-invalid-attr-value-invalid-069] input[type=hidden] autocomplete="off" is rejected', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="hidden" autocomplete="off">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 36,
			message:
				'It includes unexpected characters. the "autocomplete" attribute expects autofill field name (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle)',
			raw: 'off',
		},
	]);
});

test('[no-invalid-attr-value-invalid-070] input[TYPE=HIDDEN] autocomplete="on" is rejected (case-insensitive)', async () => {
	// The `[type='hidden' i]` selector must match uppercase HTML too;
	// pin so a refactor that drops the `i` flag doesn't slip past.
	const { violations } = await mlRuleTest(rule, '<input TYPE="HIDDEN" autocomplete="on">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 36,
			message:
				'It includes unexpected characters. the "autocomplete" attribute expects autofill field name (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle)',
			raw: 'on',
		},
	]);
});

test('[no-invalid-attr-value-valid-043] input[type=text] autocomplete="on" stays valid', async () => {
	// Non-hidden inputs wear the expectation mantle; on/off remain
	// legal. Regression guard for the `:not([type='hidden' i])`
	// branch of the ConditionalAttributeType[].
	const { violations } = await mlRuleTest(rule, '<input type="text" autocomplete="on">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-044] input (no type) autocomplete="on" stays valid', async () => {
	// Missing `type` defaults to Text state per HTML LS, i.e.
	// expectation mantle. The `:not([type='hidden' i])` selector
	// must match an element that has no `type` attribute at all.
	const { violations } = await mlRuleTest(rule, '<input autocomplete="on">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-045] input[type=hidden] autocomplete="name" stays valid', async () => {
	// Detail tokens are still allowed under the anchor mantle.
	const { violations } = await mlRuleTest(rule, '<input type="hidden" autocomplete="name">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-046] textarea autocomplete="name webauthn" stays valid', async () => {
	// Regression guard: webauthn remains legal on <textarea> because
	// its autocomplete continues to use the permissive AutoComplete
	// type (unchanged by this branch).
	const { violations } = await mlRuleTest(rule, '<textarea autocomplete="name webauthn"></textarea>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-047] select autocomplete="name" stays valid', async () => {
	// The AutoCompleteNoWebauthn override on <select> must not
	// regress the base grammar; only webauthn-bearing values are
	// rejected.
	const { violations } = await mlRuleTest(rule, '<select autocomplete="name"><option>1</option></select>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-valid-048] a value is never checked for an attribute disallowed for other reasons', async () => {
	// Complement of no-disallowed-attr's issue-3733-008: itemtype without
	// itemscope is disallowed by an unmet condition regardless of its own
	// value, and this rule only ever checks a value once
	// resolveAttrEligibility resolves to 'ok' — which never happens here, so
	// this rule stays silent and no-disallowed-attr owns the report.
	const { violations } = await mlRuleTest(rule, '<div itemtype="not-absolute"></div>');
	expect(violations).toStrictEqual([]);
});
