import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

test('[no-invalid-attr-value-001] Type check', async () => {
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

test('[no-invalid-attr-value-002] Updated the hidden attribute type to Enum form Boolean', async () => {
	expect((await mlRuleTest(rule, '<div hidden></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden=""></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="hidden"></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="until-found"></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="invalid"></div>')).violations.length).toBe(1);
});

test('[no-invalid-attr-value-003] complex type', async () => {
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

test('[no-invalid-attr-value-004] disable', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{ rule: false },
	);

	expect(violations.length).toBe(0);
});

test('[no-invalid-attr-value-005] the input element type case-insensitive', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked>');

	expect(violations.length).toBe(0);

	const { violations: violations2 } = await mlRuleTest(rule, '<input type="checkBox" checked>');

	expect(violations2.length).toBe(0);
});

test('[no-invalid-attr-value-006] custom rule', async () => {
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

test('[no-invalid-attr-value-007] custom rule', async () => {
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

test('[no-invalid-attr-value-008] custom rule: type', async () => {
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

test('[no-invalid-attr-value-009] custom element and custom rule', async () => {
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

test('[no-invalid-attr-value-010] custom element and custom rule', async () => {
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

test('[no-invalid-attr-value-011] URL attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="https://sample.com/path/to">');
	expect(violations.length).toBe(0);

	const { violations: violations2 } = await mlRuleTest(rule, '<img src="//sample.com/path/to">');
	expect(violations2.length).toBe(0);

	// `//user:pass@sample.com/path/to` has credentials, which the URL Standard reports as
	// invalid-credentials.
	// https://url.spec.whatwg.org/#invalid-credentials
	const { violations: violations3 } = await mlRuleTest(rule, '<img src="//user:pass@sample.com/path/to">');
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

test('[no-invalid-attr-value-012] URL Living Standard validation errors', async () => {
	// invalid-credentials with non-empty userinfo (`//user:pass@host`) is
	// already asserted in [no-invalid-attr-value-011] violations3 — we do not
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

	// invalid-URL-unit — `|` is not a URL code point.
	// https://url.spec.whatwg.org/#invalid-url-unit
	const { violations: windowsDrive } = await mlRuleTest(rule, '<a href="file:///C|/foo"></a>');
	expect(windowsDrive.length).toBe(1);

	// multiple `#` — second `#` is invalid-URL-unit in fragment grammar.
	// https://url.spec.whatwg.org/#invalid-url-unit
	const { violations: multipleHash } = await mlRuleTest(rule, '<a href="http://example.com/#a#b"></a>');
	expect(multipleHash.length).toBe(1);
});

test('[no-invalid-attr-value-013] URL types other than a plain URL are validated by the URL Living Standard', async () => {
	// `BaseURL` validates by `checkURL` what passes its data:/javascript: scheme filter.
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

	// `AbsoluteURL` validates by `checkURL`, so itemtype tokens get the
	// URL LS validation surface (multi-hash etc.).
	const { violations: itemtypeMultiHash } = await mlRuleTest(
		rule,
		'<div itemscope itemtype="http://example.com/#a#b"></div>',
	);
	expect(itemtypeMultiHash.length).toBe(1);
});

test('[no-invalid-attr-value-014] Overwrite type', async () => {
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

test('[no-invalid-attr-value-015] Overwrite type', async () => {
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

test('[no-invalid-attr-value-016] svg', async () => {
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

test('[no-invalid-attr-value-017] svg', async () => {
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

test('[no-invalid-attr-value-018] regexSelector', async () => {
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

test('[no-invalid-attr-value-019] regexSelector', async () => {
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

test('[no-invalid-attr-value-020] Booleanish', async () => {
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

test('[no-invalid-attr-value-021] HTML: contenteditable="inherit" is invalid (no spec override)', async () => {
	const { violations } = await mlRuleTest(rule, '<div contenteditable="inherit"></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.raw).toBe('inherit');
	expect(violations[0]!.message).toMatch(/contenteditable/);
});

test('[no-invalid-attr-value-022] React: contentEditable="inherit" is valid via react-spec override', async () => {
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

test('[no-invalid-attr-value-023] React: contentEditable="banana" is still invalid', async () => {
	const { violations } = await mlRuleTest(rule, '<div contentEditable="banana"></div>', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		specs: {
			'.*': '@markuplint/react-spec',
		},
	});
	expect(violations.length).toBe(1);
	expect(violations[0]!.raw).toBe('banana');
	expect(violations[0]!.message).toMatch(/contenteditable/);
});

test('[no-invalid-attr-value-024] Svelte: contentEditable="inherit" is valid via svelte-spec override', async () => {
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

test('[no-invalid-attr-value-025] Svelte: contenteditable="inherit" is valid (lowercase content attribute name)', async () => {
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

test('[no-invalid-attr-value-026] Multiple Type', async () => {
	expect((await mlRuleTest(rule, '<button command="toggle-popover"></button>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<button command="--custom"></button>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<button command="invalid"></button>')).violations).toStrictEqual([
		{
			severity: 'error',
			col: 18,
			line: 1,
			message:
				'The "command" attribute expects either "toggle-popover", "show-popover", "hide-popover", "close", "request-close", "show-modal". Or, the "command" attribute expects the custom command format. Did you mean "--invalid"? (https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-command-custom)',
			raw: 'invalid',
		},
	]);
});

test('[no-invalid-attr-value-027] CSS Functions', async () => {
	expect((await mlRuleTest(rule, '<div style="prop: var(--x)"></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-028] the destinations that as accepts depend on whether rel is preload or modulepreload', async () => {
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
	expect(
		(await mlRuleTest(rule, '<link rel="modulepreload" as="text" href="/data.txt" />')).violations,
	).toStrictEqual([]);

	// Invalid: values not valid for preload (condition-specific enum)
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

test('[no-invalid-attr-value-029] referrerpolicy is valid on a script and on an img', async () => {
	expect(
		(await mlRuleTest(rule, '<script src="foo.js" referrerpolicy="no-referrer"></script>')).violations,
	).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<img src="foo.png" referrerpolicy="no-referrer"></img>')).violations).toStrictEqual(
		[],
	);
});

test('[no-invalid-attr-value-030] the transform attribute of an SVG element in the legacy syntax, a list of functions, is valid', async () => {
	expect(
		(await mlRuleTest(rule, '<svg><rect transform="translate(300 300) rotate(180)" /></svg>')).violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-031] command="request-close" is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<dialog id="d"><button command="request-close" commandfor="d">Close</button></dialog>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-032] command="close" is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<dialog id="d"><button command="close" commandfor="d">Close</button></dialog>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-033] command="invalid-value" is invalid', async () => {
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
				'The "command" attribute expects either "toggle-popover", "show-popover", "hide-popover", "close", "request-close", "show-modal". Or, the "command" attribute expects the custom command format. Did you mean "--invalid-value"? (https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-command-custom)',
			raw: 'invalid-value',
		},
	]);
});

test('[no-invalid-attr-value-034] headingoffset with valid value is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<section headingoffset="1"><h2>Title</h2></section>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-035] headingoffset="0" is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<div headingoffset="0"><h1>Title</h1></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-036] headingoffset="8" is valid (max)', async () => {
	const { violations } = await mlRuleTest(rule, '<div headingoffset="8"><h1>Title</h1></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-037] headingoffset with non-integer value is invalid', async () => {
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

test('[no-invalid-attr-value-038] headingreset is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<div headingreset><h1>Title</h1></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-039] focusgroup with valid behavior keyword', async () => {
	expect((await mlRuleTest(rule, '<div focusgroup="toolbar"></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-040] focusgroup with multiple valid tokens', async () => {
	expect((await mlRuleTest(rule, '<div focusgroup="tablist inline wrap"></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-041] focusgroup with all valid tokens', async () => {
	expect((await mlRuleTest(rule, '<ul focusgroup="menu block nowrap nomemory"></ul>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-042] focusgroup with invalid token', async () => {
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

test('[no-invalid-attr-value-043] focusgroup with valid and invalid tokens mixed', async () => {
	const { violations } = await mlRuleTest(rule, '<div focusgroup="toolbar invalidmod"></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.raw).toBe('invalidmod');
});

test('[no-invalid-attr-value-044] focusgroup="none" is valid', async () => {
	expect((await mlRuleTest(rule, '<li focusgroup="none"></li>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-045] focusgroup is case-insensitive', async () => {
	expect((await mlRuleTest(rule, '<div focusgroup="TOOLBAR"></div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div focusgroup="Menu Inline Wrap"></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-046] focusgroup rejects duplicate tokens', async () => {
	const { violations } = await mlRuleTest(rule, '<div focusgroup="toolbar toolbar"></div>');
	expect(violations.length).toBeGreaterThanOrEqual(1);
});

test('[no-invalid-attr-value-047] focusgroup with empty value is valid (zero tokens allowed)', async () => {
	expect((await mlRuleTest(rule, '<div focusgroup=""></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-048] focusgroupstart boolean attribute is valid', async () => {
	expect((await mlRuleTest(rule, '<button focusgroupstart></button>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-049] focusgroup on any element (global attribute)', async () => {
	expect((await mlRuleTest(rule, '<nav focusgroup="menubar"></nav>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<span focusgroupstart></span>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-050] empty lang attribute is valid (language set to unknown)', async () => {
	expect((await mlRuleTest(rule, '<html lang=""></html>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<html lang></html>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div lang=""></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-051] script type="speculationrules" is valid', async () => {
	expect(
		(await mlRuleTest(rule, '<script type="speculationrules">{"prerender":[{"urls":["/page"]}]}</script>'))
			.violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-052] crossorigin enum value is still validated when a condition overrides the global attribute', async () => {
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

test('[no-invalid-attr-value-053] fetchpriority enum value is still validated when a condition overrides the global attribute', async () => {
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

test('[no-invalid-attr-value-054] empty type is a classic script: defer is allowed', async () => {
	// HTML LS: "Omitting the attribute, setting it to the empty string, or
	// setting it to a JavaScript MIME type essence match means that the script
	// is a classic script" — so defer must NOT be flagged here, and neither
	// is the empty type value itself: the type attribute's enum lists the
	// empty string beside the keywords.
	const { violations } = await mlRuleTest(rule, '<script type="" src="app.js" defer></script>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-055] srcset rejects zero width descriptor', async () => {
	const { violations } = await mlRuleTest(rule, '<img srcset="x 0w" sizes="100vw" src=x alt=x>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-056] srcset rejects zero density descriptor', async () => {
	const { violations } = await mlRuleTest(rule, '<img srcset="x 0x" src=x alt=x>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-057] srcset accepts valid width descriptor', async () => {
	expect((await mlRuleTest(rule, '<img srcset="x 100w" sizes="100vw" src=x alt=x>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-058] integrity rejects md5 hash', async () => {
	const { violations } = await mlRuleTest(rule, '<script src="x" integrity="md5-abc123"></script>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-059] integrity accepts sha256 hash', async () => {
	expect((await mlRuleTest(rule, '<script src="x" integrity="sha256-abc123"></script>')).violations).toStrictEqual(
		[],
	);
});

test('[no-invalid-attr-value-060] input[type=color] with a CSS color keyword', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="color" value="red">');
	const valueViolation = violations.find(v => v.raw === 'red');
	expect(valueViolation).toBeUndefined();
});

test('[no-invalid-attr-value-061] input[type=color] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="color" value="#ff0000">');
	expect(violations.some(v => v.raw === '#ff0000')).toBe(false);
});

test('[no-invalid-attr-value-062] input[type=url] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="url" value="http://example.com/path with space">');
	expect(violations.some(v => v.raw === 'http://example.com/path with space')).toBe(true);
});

test('[no-invalid-attr-value-063] input[type=url] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="url" value="https://example.com">');
	expect(violations.some(v => v.raw === 'https://example.com')).toBe(false);
});

test('[no-invalid-attr-value-064] input[type=number] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="number" value="abc">');
	expect(violations.some(v => v.raw === 'abc')).toBe(true);
});

test('[no-invalid-attr-value-065] input[type=number] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="number" value="42">');
	expect(violations.some(v => v.raw === '42')).toBe(false);
});

test('[no-invalid-attr-value-066] input[type=text] value is not validated (Any fallback)', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" value="anything goes">');
	expect(violations.some(v => v.raw === 'anything goes')).toBe(false);
});

test('[no-invalid-attr-value-067] input without type: value is not validated (Any fallback)', async () => {
	const { violations } = await mlRuleTest(rule, '<input value="anything">');
	expect(violations.some(v => v.raw === 'anything')).toBe(false);
});

test('[no-invalid-attr-value-068] input[type=email] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="email" value="not-an-email">');
	expect(violations.some(v => v.raw === 'not-an-email')).toBe(true);
});

test('[no-invalid-attr-value-069] input[type=email] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="email" value="user@example.com">');
	expect(violations.some(v => v.raw === 'user@example.com')).toBe(false);
});

test('[no-invalid-attr-value-070] input[type=date] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="date" value="2024/01/15">');
	expect(violations.some(v => v.raw === '2024/01/15')).toBe(true);
});

test('[no-invalid-attr-value-071] input[type=date] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="date" value="2024-01-15">');
	expect(violations.some(v => v.raw === '2024-01-15')).toBe(false);
});

test('[no-invalid-attr-value-072] input[type=range] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="range" value="50">');
	expect(violations.some(v => v.raw === '50')).toBe(false);
});

test('[no-invalid-attr-value-073] input[type=range] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="range" value="abc">');
	expect(violations.some(v => v.raw === 'abc')).toBe(true);
});

test('[no-invalid-attr-value-074] input[type=time] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="time" value="12:30">');
	expect(violations.some(v => v.raw === '12:30')).toBe(false);
});

test('[no-invalid-attr-value-075] input[type=time] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="time" value="25:99">');
	// Token-based checker reports the first invalid part ("25"), not the whole value.
	expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
});

test('[no-invalid-attr-value-076] input[type=month] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="month" value="2024-01">');
	expect(violations.some(v => v.raw === '2024-01')).toBe(false);
});

test('[no-invalid-attr-value-077] input[type=month] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="month" value="2024-13">');
	expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
});

test('[no-invalid-attr-value-078] input[type=week] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="week" value="2024-W03">');
	expect(violations.some(v => v.raw === '2024-W03')).toBe(false);
});

test('[no-invalid-attr-value-079] input[type=week] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="week" value="2024-03">');
	expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
});

test('[no-invalid-attr-value-080] input[type=datetime-local] with valid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="datetime-local" value="2024-01-15T12:30">');
	expect(violations.some(v => v.raw === '2024-01-15T12:30')).toBe(false);
});

test('[no-invalid-attr-value-081] input[type=datetime-local] with invalid value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="datetime-local" value="2024-01-15">');
	expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
});

test('[no-invalid-attr-value-082] input[type=color] with a value that is no CSS color', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="color" value="not-a-color">');
	const valueViolation = violations.find(v => v.raw === 'not-a-color');
	expect(valueViolation).toBeDefined();
	expect(valueViolation!.message).toContain('CSS color');
});

test('[no-invalid-attr-value-083] input[type=color] with a three-digit hex color', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="color" value="#fff">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-084] input[type=color] with six hex digits but no number sign', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="color" value="ff0000">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 28,
			message:
				'The "value" attribute expects the CSS color format (https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color))',
			raw: 'ff0000',
		},
	]);
});

test('[no-invalid-attr-value-085] rel=preload with valid as value', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="preload" href="/a.js" as="script">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-086] rel=preload with invalid as value (json is modulepreload-only)', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="preload" href="/a.json" as="json">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 40,
			message: 'The "as" attribute expects either "fetch", "font", "image", "script", "style", "track"',
			raw: 'json',
		},
	]);
});

test('[no-invalid-attr-value-087] rel=modulepreload with valid as value', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="modulepreload" href="/a.js" as="script">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-088] rel=modulepreload with valid as=json', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="modulepreload" href="/a.json" as="json">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-089] rel=modulepreload with invalid as value (track is preload-only)', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="modulepreload" href="/a.vtt" as="track">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 45,
			message:
				'The "as" attribute expects either "audioworklet", "json", "paintworklet", "script", "serviceworker", "sharedworker", "style", "text", "worker"',
			raw: 'track',
		},
	]);
});

test('[no-invalid-attr-value-090] rel=preload with all valid preload destinations', async () => {
	for (const dest of ['fetch', 'font', 'image', 'script', 'style', 'track']) {
		const { violations } = await mlRuleTest(rule, `<link rel="preload" href="/a" as="${dest}">`);
		expect(violations).toStrictEqual([]);
	}
});

test('[no-invalid-attr-value-091] rel=modulepreload with all valid module destinations', async () => {
	for (const dest of [
		'json',
		'style',
		'text',
		'audioworklet',
		'paintworklet',
		'script',
		'serviceworker',
		'sharedworker',
		'worker',
	]) {
		const { violations } = await mlRuleTest(rule, `<link rel="modulepreload" href="/a" as="${dest}">`);
		expect(violations).toStrictEqual([]);
	}
});

test('[no-invalid-attr-value-092] rel=preload with completely bogus as value', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="preload" href="/a" as="bogus">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 35,
			message: 'The "as" attribute expects either "fetch", "font", "image", "script", "style", "track"',
			raw: 'bogus',
		},
	]);
});

test('[no-invalid-attr-value-093] rel with multiple tokens: preload + stylesheet', async () => {
	// condition uses ~= (space-separated token match), so "preload stylesheet" must match
	const { violations } = await mlRuleTest(rule, '<link rel="preload stylesheet" href="/a.css" as="style">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-094] rel=modulepreload as=fetch is invalid (fetch is preload-only)', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="modulepreload" href="/a" as="fetch">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 41,
			message:
				'The "as" attribute expects either "audioworklet", "json", "paintworklet", "script", "serviceworker", "sharedworker", "style", "text", "worker"',
			raw: 'fetch',
		},
	]);
});

test('[no-invalid-attr-value-095] case-insensitive rel matching: rel=PRELOAD', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="PRELOAD" href="/a.js" as="script">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-096] C1 control U+0080 in href', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\u0080">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-097] C1 control U+009F in href', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\u009F">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-098] BMP noncharacter U+FDD0 in href', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\uFDD0">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-099] BMP noncharacter U+FFFE in href', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\uFFFE">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-100] supplementary plane noncharacter U+1FFFE in href', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\u{1FFFE}">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-101] trailing vertical tab U+000B in href is not silently stripped', async () => {
	// Regression for JavaScript String.prototype.trim() stripping U+000B
	// before the forbidden-code-point check.
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\u000B">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(true);
});

test('[no-invalid-attr-value-102] PUA code point in href is accepted', async () => {
	// Guard against over-broad regex: U+E000 (BMP PUA) is not forbidden.
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\uE000">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(false);
});

test('[no-invalid-attr-value-103] emoji (U+1F4A9) in href is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="http://example.com/\u{1F4A9}">x</a>');
	expect(violations.some(v => v.message.includes('unexpected characters'))).toBe(false);
});

test('[no-invalid-attr-value-104] refresh: bare integer is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="refresh" content="30">');
	expect(violations.some(v => v.raw === '30')).toBe(false);
});

test('[no-invalid-attr-value-105] refresh: integer + "; URL=<url>" is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="refresh" content="0; URL=https://example.com/">');
	expect(violations.some(v => v.raw === '0; URL=https://example.com/')).toBe(false);
});

test('[no-invalid-attr-value-106] refresh: empty content is invalid', async () => {
	// Fixture: html/elements/meta/refresh-empty-novalid.html.
	// Assert on `raw` rather than on a substring of the message — the
	// human wording comes from the type registration and is subject to
	// wording changes, whereas `raw` is the concrete value the rule
	// flagged.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="refresh" content="">');
	expect(violations.some(v => v.raw === '')).toBe(true);
});

test('[no-invalid-attr-value-107] refresh: missing separator is invalid', async () => {
	// Fixture: html/elements/meta/refresh-missing-semicolon-novalid.html
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="refresh" content="5 url=http://example.com">');
	expect(violations.some(v => v.raw === '5 url=http://example.com')).toBe(true);
});

test('[no-invalid-attr-value-108] refresh: whitespace after ";" is optional (nu over-detects)', async () => {
	// Fixture: html/elements/meta/refresh-missing-space-novalid.html.
	// HTML LS §4.2.5.3 clause 3.2 marks the whitespace optional — this
	// fixture is a nu over-detection recorded in excluded-ids.json.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="refresh" content="5;url=http://example.com">');
	expect(violations.some(v => v.raw === '5;url=http://example.com')).toBe(false);
});

test('[no-invalid-attr-value-109] content-type: canonical form is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-type" content="text/html; charset=utf-8">',
	);
	expect(violations.some(v => v.raw === 'text/html; charset=utf-8')).toBe(false);
});

test('[no-invalid-attr-value-110] content-type: malformed MIME is invalid', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="content-type" content="not a mime">');
	expect(violations.some(v => v.raw === 'not a mime')).toBe(true);
});

test('[no-invalid-attr-value-111] content-type: wrong MIME type is invalid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-type" content="text/plain; charset=utf-8">',
	);
	expect(violations.some(v => v.raw === 'text/plain; charset=utf-8')).toBe(true);
});

test('[no-invalid-attr-value-112] x-ua-compatible: "IE=edge" is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="x-ua-compatible" content="IE=edge">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-113] x-ua-compatible: ASCII case-insensitive match is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="x-ua-compatible" content="ie=EDGE">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-114] x-ua-compatible: "IE=10" is invalid', async () => {
	// Fixture: html/elements/meta/x-ua-compatible-not-ie-edge-novalid.html.
	// The comparison is ASCII case-insensitive. The reported raw is the authored text.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="x-ua-compatible" content="IE=10">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "content" attribute expects IE=edge',
			line: 1,
			col: 45,
			raw: 'IE=10',
		},
	]);
});

test('[no-invalid-attr-value-115] x-ua-compatible: http-equiv attribute value match is ASCII case-insensitive', async () => {
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
			raw: 'IE=10',
		},
	]);
});

test('[no-invalid-attr-value-116] x-ua-compatible: empty content is invalid', async () => {
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

test('[no-invalid-attr-value-117] http-equiv="default-style" content falls through to Any', async () => {
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="default-style" content="preferred">');
	expect(violations.length).toBe(0);
});

test('[no-invalid-attr-value-118] name= variants fall through to Any', async () => {
	// name=viewport / description / keywords — ConditionalAttributeType
	// array does not match, Any applies, anything passes.
	const { violations } = await mlRuleTest(rule, '<meta name="description" content="arbitrary description text">');
	expect(violations.length).toBe(0);
});

test('[no-invalid-attr-value-119] itemprop= variants fall through to Any', async () => {
	// itemprop is the third <meta> identifier besides name / http-equiv
	// / charset. ConditionalAttributeType[] array does not match, Any
	// applies, anything passes.
	const { violations } = await mlRuleTest(
		rule,
		'<div itemscope><meta itemprop="version" content="anything goes"></div>',
	);
	expect(violations.length).toBe(0);
});

test('[no-invalid-attr-value-120] http-equiv value match is ASCII case-insensitive', async () => {
	// spec.meta.jsonc condition uses `[http-equiv='refresh' i]`. Legacy
	// HTML commonly writes `<META HTTP-EQUIV="REFRESH">`; the `i` flag
	// must flow through the selector engine so the refresh validator
	// still fires and we do not silently miss these elements.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="REFRESH" content="garbage">');
	expect(violations.some(v => v.raw === 'garbage')).toBe(true);
});

test('[no-invalid-attr-value-121] content-type value match is ASCII case-insensitive', async () => {
	// Same guarantee on the content-type branch.
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="Content-Type" content="not a mime">');
	expect(violations.some(v => v.raw === 'not a mime')).toBe(true);
});

test('[no-invalid-attr-value-122] a single keyword-source directive is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="default-src \'self\'">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-123] an unrecognized directive name is invalid', async () => {
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

test('[no-invalid-attr-value-124] an unrecognized source-expression is invalid', async () => {
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

test('[no-invalid-attr-value-125] a non-ASCII host authority is invalid', async () => {
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

test('[no-invalid-attr-value-126] the http-equiv attribute value match is ASCII case-insensitive', async () => {
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

test('[no-invalid-attr-value-127] an empty policy is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-empty-isvalid.html
	const { violations } = await mlRuleTest(rule, '<meta http-equiv="content-security-policy" content="">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-128] a comma-separated policy list is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-policy-list-isvalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="default-src \'self\', script-src \'unsafe-inline\'">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-129] the sandbox directive with recognized tokens is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-sandbox-isvalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="sandbox allow-forms allow-popups allow-scripts">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-130] trusted-types with allow-duplicates is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-trusted-types-isvalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="trusted-types myPolicy \'allow-duplicates\'">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-131] a hash-source directive is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-with-hash-isvalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="script-src \'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=\'">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-132] a nonce-source directive is valid', async () => {
	// Fixture: html/elements/meta/content-security-policy/csp-with-nonce-isvalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<meta http-equiv="content-security-policy" content="script-src \'nonce-rAnd0m123\'">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-133] nodeRule allowAttrs permits property/content on meta[property]', async () => {
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

test('[no-invalid-attr-value-134] empty property value is still flagged as NoEmptyAny violation', async () => {
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

test('[no-invalid-attr-value-135] bdo dir="auto" is forbidden', async () => {
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

test('[no-invalid-attr-value-136] bdo dir="ltr" and dir="rtl" are accepted', async () => {
	expect((await mlRuleTest(rule, '<bdo dir="ltr">x</bdo>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<bdo dir="rtl">x</bdo>')).violations.length).toBe(0);
});

test('[no-invalid-attr-value-137] input[type=date][min] rejects out-of-range month', async () => {
	// Mirrors html/datatypes/date-month-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="date" min="2024-13-01">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('month part');
});

test('[no-invalid-attr-value-138] input[type=date][min] rejects out-of-range day', async () => {
	// Mirrors html/datatypes/date-day-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="date" min="2024-02-30">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('date part');
});

test('[no-invalid-attr-value-139] input[type=date][min] rejects wrong format', async () => {
	// Mirrors html/datatypes/date-invalid-format-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="date" min="12-31-2024">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('year part');
});

test('[no-invalid-attr-value-140] input[type=time][min] rejects out-of-range hour', async () => {
	// Mirrors html/datatypes/time-hour-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="time" min="25:00">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('hour part');
});

test('[no-invalid-attr-value-141] input[type=month][min] rejects month 0', async () => {
	// Mirrors html/datatypes/month-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="month" min="2024-00">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('month part');
});

test('[no-invalid-attr-value-142] input[type=week][min] rejects week 54', async () => {
	// Mirrors html/datatypes/week-invalid-format-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="week" min="2024-W54">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('week part');
});

test('[no-invalid-attr-value-143] input[type=date][min] rejects Feb 29 in non-leap year', async () => {
	// markuplint-only edge: no dedicated bench fixture, pin the leap-year branch.
	const { violations } = await mlRuleTest(rule, '<input type="date" min="2023-02-29">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('date part');
});

test('[no-invalid-attr-value-144] input[type=datetime-local][min] rejects out-of-range month', async () => {
	// Mirrors html/datatypes/datetime-local-invalid-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="datetime-local" min="2024-13-01T12:00">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('month part');
});

test('[no-invalid-attr-value-145] input[type=time][min] rejects out-of-range minute', async () => {
	// Mirrors html/datatypes/time-minute-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="time" min="12:60">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('minute part');
});

test('[no-invalid-attr-value-146] input[type=time][min] rejects out-of-range second', async () => {
	// Mirrors html/datatypes/time-second-out-of-range-novalid.html
	const { violations } = await mlRuleTest(rule, '<input type="time" min="12:30:60">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('second part');
});

test('[no-invalid-attr-value-147] input[type=date] min/max accepts well-formed values', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="date" min="2024-01-01" max="2024-12-31">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-148] input[type=month] min/max accepts well-formed values', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="month" min="2024-01" max="2024-12">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-149] input[type=week] min/max accepts well-formed values', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="week" min="2024-W01" max="2024-W52">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-150] input[type=time] min/max accepts well-formed values', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="time" min="00:00" max="23:59">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-151] input[type=datetime-local] min/max accepts well-formed values', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<input type="datetime-local" min="2024-01-01T00:00" max="2024-12-31T23:59">',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-152] input[type=number] min/max accepts integer floats', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="number" min="0" max="100">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-153] input[type=range] min/max accepts negative floats', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="range" min="-5" max="5">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-154] input[type=date][min] accepts Feb 29 in leap year', async () => {
	// Pin the leap-year branch of datetimeTokenCheck.date so a future refactor
	// that drops the year-aware day-of-month calculation is caught here.
	const { violations } = await mlRuleTest(rule, '<input type="date" min="2024-02-29">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-155] progress max="0" is rejected', async () => {
	// Mirrors html/datatypes/float-positive-zero-novalid.html
	const { violations } = await mlRuleTest(rule, '<progress max="0"></progress>');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('greater than 0');
});

test('[no-invalid-attr-value-156] progress max="-5" is rejected', async () => {
	// Mirrors html/datatypes/float-positive-negative-novalid.html
	const { violations } = await mlRuleTest(rule, '<progress max="-5"></progress>');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toContain('greater than 0');
});

test('[no-invalid-attr-value-157] progress max="1" is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<progress max="1"></progress>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-158] progress max="100" is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<progress max="100"></progress>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-159] progress max="0.5" is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<progress max="0.5"></progress>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-160] itemref token list rejects duplicate ids (HTML LS §5.2.2 Items)', async () => {
	// Mirrors html/microdata/itemref-redundant-novalid.html. Locks down the
	// `unique: true` flag added to the itemref token spec.
	// Uses substring-only `.some(...)` (matches the pattern of [no-invalid-attr-value-167])
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

test('[no-invalid-attr-value-161] itemtype="" rejects empty token set (HTML LS §5.2.2 Items)', async () => {
	// Mirrors html/microdata/itemtype-empty-novalid.html. Locks down the
	// `allowEmpty: false` flag added to the itemtype token spec.
	// Uses substring-only match (see [no-invalid-attr-value-168] for rationale).
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

test('[no-invalid-attr-value-162] del[datetime] accepts a valid date string', async () => {
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-11-12">x</del>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-163] del[datetime] accepts a valid global date and time string', async () => {
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-11-12T14:54:39.929+0000">x</del>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-164] del[datetime] rejects a date string without hyphens', async () => {
	// Mirrors html/elements/del/date-iso8601-YYYYMMDD-no-hyphen-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="20020929">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-165] del[datetime] rejects a duration P-form string', async () => {
	// Mirrors html/elements/del/duration-P-form-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="PT4H18M3S">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-166] del[datetime] rejects a duration component-list string', async () => {
	// Mirrors html/elements/del/duration-time-component-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="4h 18m 3s">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-167] del[datetime] rejects a comma fraction separator', async () => {
	// Mirrors html/elements/del/global-date-and-time-bad-fraction-separator-novalid.html.
	// `checkGlobalDateAndTimeString` rejects it too, so the catch-all `DateTime`
	// type does not accept a comma as a fraction separator.
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-11-12T14:54:39,929+0000">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-168] del[datetime] rejects a local date and time string', async () => {
	// Mirrors html/elements/del/local-date-and-time-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-11-12T14:54">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-169] del[datetime] rejects a month-only string', async () => {
	// Mirrors html/elements/del/month-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-11">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-170] del[datetime] rejects a time-only string', async () => {
	// Mirrors html/elements/del/time-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="14:54:39">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-171] del[datetime] rejects a week string', async () => {
	// Mirrors html/elements/del/week-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="2011-W46">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-172] del[datetime] rejects a year-only string', async () => {
	// Mirrors html/elements/del/year-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="2006">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-173] del[datetime] rejects a yearless date string', async () => {
	// Mirrors html/elements/del/yearless-date-novalid.html.
	const { violations } = await mlRuleTest(rule, '<del datetime="07-15">x</del>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-174] ins[datetime] applies the same narrowed type', async () => {
	// Spec-level mirror of `<del>`; one ins sample keeps the parallel coverage
	// honest without duplicating all 9 reject cases.
	const { violations } = await mlRuleTest(rule, '<ins datetime="2011-11">x</ins>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-175] form[action] accepts a regular URL', async () => {
	const { violations } = await mlRuleTest(rule, '<form action="/submit"></form>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-176] button[formaction] accepts a regular URL', async () => {
	const { violations } = await mlRuleTest(rule, '<button formaction="/submit"></button>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-177] object[data] accepts a regular URL', async () => {
	const { violations } = await mlRuleTest(rule, '<object data="resource.swf"></object>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-178] link[href] accepts a regular URL', async () => {
	const { violations } = await mlRuleTest(rule, '<link href="/style.css" rel="stylesheet">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-179] video[poster] accepts a regular URL', async () => {
	const { violations } = await mlRuleTest(rule, '<video poster="/poster.jpg" src="movie.mp4"></video>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-180] form[action] rejects empty string', async () => {
	// Mirrors html/elements/form/action-empty-novalid.html.
	const { violations } = await mlRuleTest(rule, '<form action=""></form>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-181] form[action] rejects whitespace-only', async () => {
	// Mirrors html/elements/form/action-whitespace-only-novalid.html.
	const { violations } = await mlRuleTest(rule, '<form action="\t \n"></form>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-182] button[formaction] rejects empty string', async () => {
	// Mirrors html/elements/button/formaction-empty-novalid.html.
	const { violations } = await mlRuleTest(rule, '<button formaction=""></button>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-183] input[formaction] rejects empty string', async () => {
	// Mirrors html/elements/input/type-image-formaction-empty-novalid.html.
	const { violations } = await mlRuleTest(rule, '<input type="image" alt="foo" formaction="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-184] object[data] rejects empty string', async () => {
	// Mirrors html/elements/object/data-empty-novalid.html.
	const { violations } = await mlRuleTest(rule, '<object data=""></object>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-185] link[href] rejects empty string', async () => {
	// Mirrors html/elements/link/href-empty-novalid.html.
	const { violations } = await mlRuleTest(rule, '<link href="" rel>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-186] video[poster] rejects empty string', async () => {
	// HTML LS §4.8.9 video: poster must be a "valid non-empty URL".
	// Same bug class as the other URL→NonEmptyURL reclassifications;
	// no nu fixture covers it directly but the spec wording is identical.
	const { violations } = await mlRuleTest(rule, '<video poster="" src="movie.mp4"></video>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-187] progress value="0.5" max="1" is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<progress value="0.5" max="1">50%</progress>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-188] progress value="-10" is rejected', async () => {
	// Mirrors html/elements/progress/value-negative-novalid.html.
	const { violations } = await mlRuleTest(rule, '<progress value="-10" max="100">-10%</progress>');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-189] img with srcset+sizes is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="x.jpg" srcset="x.jpg 1x" sizes="100vw" alt="x">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-190] picture > source with srcset+sizes is accepted', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<picture><source srcset="x.jpg 100w" sizes="100vw"><img src="x.jpg" alt="x"></picture>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-191] autocomplete="name webauthn" is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<input autocomplete="name webauthn">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-192] autocomplete="webauthn" alone is rejected', async () => {
	// Mirrors html/elements/input/autocomplete-webauthn-only-novalid.html.
	// Spec: "the webauthn token must appear along with at least one other
	// token; an autocomplete attribute whose value consists solely of the
	// webauthn token is non-conforming."
	const { violations } = await mlRuleTest(rule, '<input autocomplete="webauthn">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-193] input[name="username"] is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" name="username">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-194] input[name="Isindex"] is accepted (case-sensitive per spec literal)', async () => {
	// Spec uses the literal value `isindex` without an ASCII
	// case-insensitive qualifier, so capitalised variants are allowed.
	const { violations } = await mlRuleTest(rule, '<input type="text" name="Isindex">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-195] input[name="isindex"] is rejected', async () => {
	// Mirrors html/elements/input/name-isindex-novalid.html.
	// Spec: input element's name attribute "must not be the value isindex".
	const { violations } = await mlRuleTest(rule, '<input type="text" name="isindex">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-196] input[name=""] is rejected (empty preserved by Pattern override)', async () => {
	// The Pattern override drops the inherited NoEmptyAny; the `.+` arm of
	// the regex must keep the empty case rejected. Pin this so a future
	// rewrite of the Pattern does not silently widen the contract.
	const { violations } = await mlRuleTest(rule, '<input type="text" name="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-197] srcset with distinct densities is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="x.jpg" srcset="a.jpg 1x, b.jpg 2x" alt="">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-198] srcset with duplicate density (omitted + 1x) is rejected', async () => {
	// Mirrors html/elements/picture/srcset-microsyntax-unique-descriptors-1x-and-omitted-novalid.html.
	// Omitted descriptor implies density 1x; pairing with explicit 1x is a duplicate.
	const { violations } = await mlRuleTest(rule, '<img srcset="x 1x, y" src="x" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-199] srcset with duplicate explicit density is rejected', async () => {
	// Mirrors html/elements/picture/srcset-microsyntax-unique-descriptors-2x-novalid.html.
	const { violations } = await mlRuleTest(rule, '<img srcset="x 2x, y 2x" src="x" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-200] srcset with integer and decimal density equal in value is rejected', async () => {
	// Mirrors html/elements/picture/srcset-microsyntax-unique-descriptors-integer-and-decimals-x-novalid.html.
	// 1x and 1.0x normalise to the same numeric pixel density.
	const { violations } = await mlRuleTest(rule, '<img srcset="x 1x, y 1.0x" src="x" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-201] srcset with duplicate width descriptor is rejected', async () => {
	// Mirrors html/elements/picture/srcset-microsyntax-unique-descriptors-w-novalid.html.
	const { violations } = await mlRuleTest(rule, '<img srcset="x 1w, y 1w" sizes="100vw" src="x" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-202] srcset with explicit "1x, 1x" duplicate is rejected', async () => {
	// The simplest duplicate-density case — most common shape that real
	// projects accidentally hit. No nu fixture pins this directly (only
	// `1x, y` / `2x, 2x` / `1x, 1.0x` are in the corpus), but the rule
	// guarantee should fire on the canonical shape too.
	const { violations } = await mlRuleTest(rule, '<img srcset="a.jpg 1x, b.jpg 1x" src="a.jpg" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-203] srcset with decimal-only duplicate density is rejected', async () => {
	// Pins the decimal-equality branch independently from the
	// integer-vs-decimal normalisation case ([no-invalid-attr-value-200]).
	const { violations } = await mlRuleTest(rule, '<img srcset="a.jpg 0.5x, b.jpg 0.5x" src="a.jpg" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-204] srcset with duplicate density at end of 3-entry list is rejected', async () => {
	// Duplicate detection must trip on the third entry, not only on the
	// adjacent pair. Pins that the Set is checked for every entry.
	const { violations } = await mlRuleTest(rule, '<img srcset="a.jpg 1x, b.jpg 2x, c.jpg 1x" src="a.jpg" alt="">');
	expect(violations.length).toBeGreaterThan(0);
});

test('[no-invalid-attr-value-205] link rel="alternate stylesheet" with empty title is rejected', async () => {
	// HTML LS §4.6.7.4 mandates a **non-empty** title. Pins the
	// conditional NoEmptyAny type override on link[title].
	const { violations } = await mlRuleTest(rule, '<link rel="alternate stylesheet" href="x.css" title="">');
	expect(violations.some(v => typeof v.message === 'string' && v.message.toLowerCase().includes('title'))).toBe(true);
});

test('[no-invalid-attr-value-206] template[shadowrootslotassignment="named"] is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<template shadowrootslotassignment="named"></template>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-207] template[shadowrootslotassignment="manual"] is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<template shadowrootslotassignment="manual"></template>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-208] template[shadowrootslotassignment="auto"] is rejected (not in enum)', async () => {
	const { violations } = await mlRuleTest(rule, '<template shadowrootslotassignment="auto"></template>');
	expect(violations).toHaveLength(1);
	expect(violations[0]).toMatchObject({
		severity: 'error',
		message: 'The "shadowrootslotassignment" attribute expects either "named", "manual"',
		raw: 'auto',
	});
});

test('[no-invalid-attr-value-209] template[shadowrootcustomelementregistry] Boolean attribute is accepted', async () => {
	const { violations } = await mlRuleTest(rule, '<template shadowrootcustomelementregistry></template>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-210] select autocomplete containing webauthn is rejected', async () => {
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

test('[no-invalid-attr-value-211] input[type=hidden] autocomplete="on" is rejected', async () => {
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

test('[no-invalid-attr-value-212] input[type=hidden] autocomplete="off" is rejected', async () => {
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

test('[no-invalid-attr-value-213] input[TYPE=HIDDEN] autocomplete="on" is rejected (case-insensitive)', async () => {
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

test('[no-invalid-attr-value-214] input[type=text] autocomplete="on" stays valid', async () => {
	// Non-hidden inputs wear the expectation mantle; on/off remain
	// legal. Regression guard for the `:not([type='hidden' i])`
	// branch of the ConditionalAttributeType[].
	const { violations } = await mlRuleTest(rule, '<input type="text" autocomplete="on">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-215] input (no type) autocomplete="on" stays valid', async () => {
	// Missing `type` defaults to Text state per HTML LS, i.e.
	// expectation mantle. The `:not([type='hidden' i])` selector
	// must match an element that has no `type` attribute at all.
	const { violations } = await mlRuleTest(rule, '<input autocomplete="on">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-216] input[type=hidden] autocomplete="name" stays valid', async () => {
	// Detail tokens are still allowed under the anchor mantle.
	const { violations } = await mlRuleTest(rule, '<input type="hidden" autocomplete="name">');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-217] textarea autocomplete="name webauthn" stays valid', async () => {
	// Regression guard: webauthn remains legal on <textarea> because
	// its autocomplete continues to use the permissive AutoComplete
	// type (unchanged by this branch).
	const { violations } = await mlRuleTest(rule, '<textarea autocomplete="name webauthn"></textarea>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-218] select autocomplete="name" stays valid', async () => {
	// The AutoCompleteNoWebauthn override on <select> must not
	// regress the base grammar; only webauthn-bearing values are
	// rejected.
	const { violations } = await mlRuleTest(rule, '<select autocomplete="name"><option>1</option></select>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-219] a value is never checked for an attribute disallowed for other reasons', async () => {
	// Complement of [no-disallowed-attr-053]: itemtype without
	// itemscope is disallowed by an unmet condition regardless of its own
	// value, and this rule only ever checks a value once
	// resolveAttrEligibility resolves to 'ok' — which never happens here, so
	// this rule stays silent and no-disallowed-attr owns the report.
	const { violations } = await mlRuleTest(rule, '<div itemtype="not-absolute"></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-220] HTML: allowAttrs checks the value of the name in any spelling the DOM makes the same', async () => {
	const violation = {
		severity: 'error',
		line: 1,
		col: 14,
		message: 'It includes unexpected characters. the "X-ATTR" attribute expects integer',
		raw: 'a',
	};
	expect(
		(
			await mlRuleTest(rule, '<div X-ATTR="a"></div>', {
				rule: { options: { allowAttrs: [{ name: 'x-attr', value: 'Int' }] } },
			})
		).violations,
	).toStrictEqual([violation]);
	expect(
		(await mlRuleTest(rule, '<div X-ATTR="a"></div>', { rule: { options: { allowAttrs: { 'x-attr': 'Int' } } } }))
			.violations,
	).toStrictEqual([violation]);
	expect(
		(
			await mlRuleTest(rule, '<div x-attr="a"></div>', {
				rule: { options: { allowAttrs: [{ name: 'X-ATTR', value: 'Int' }] } },
			})
		).violations,
	).toStrictEqual([
		{ ...violation, message: 'It includes unexpected characters. the "x-attr" attribute expects integer' },
	]);
	expect(
		(await mlRuleTest(rule, '<div X-ATTR="1"></div>', { rule: { options: { allowAttrs: { 'x-attr': 'Int' } } } }))
			.violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-221] HTML: a bare name of allowAttrs accepts any value whatever its spelling', async () => {
	expect(
		(await mlRuleTest(rule, '<div X-ATTR="a"></div>', { rule: { options: { allowAttrs: ['x-attr'] } } }))
			.violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-222] HTML: the value of an upper-case spec attribute is checked', async () => {
	expect((await mlRuleTest(rule, '<input TYPE="bogus">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message:
				'The "TYPE" attribute expects either "hidden", "text", "search", "tel", "url", "email", "password", "date", "month", "week", "time", "datetime-local", "number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"',
			raw: 'bogus',
		},
	]);
});

test('[no-invalid-attr-value-223] JSX: allowAttrs folds the name on an HTML element', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(
			await mlRuleTest(rule, '<div X-ATTR="1" />', {
				parser,
				rule: { options: { allowAttrs: { 'x-attr': 'Int' } } },
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<div X-ATTR="a" />', {
				parser,
				rule: { options: { allowAttrs: { 'x-attr': 'Int' } } },
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message: 'It includes unexpected characters. the "X-ATTR" attribute expects integer',
			raw: 'a',
		},
	]);
});

test('[no-invalid-attr-value-224] JSX: allowAttrs keeps the name as written on an SVG element', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(
			await mlRuleTest(rule, '<svg X-ATTR="a" />', {
				parser,
				rule: { options: { allowAttrs: { 'x-attr': 'Int' } } },
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<svg X-ATTR="a" />', {
				parser,
				rule: { options: { allowAttrs: { 'X-ATTR': 'Int' } } },
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message: 'It includes unexpected characters. the "X-ATTR" attribute expects integer',
			raw: 'a',
		},
	]);
});

// https://html.spec.whatwg.org/multipage/images.html#sizes-attributes
// > The auto keyword may be specified in the sizes attribute of source elements and sizes
// > attribute of img elements, if the following conditions are met. Otherwise, auto must not be
// > specified.
test('[no-invalid-attr-value-309] link: imagesizes does not accept "auto"', async () => {
	const link = (sizes: string) =>
		`<link rel="preload" as="image" href="a.png" imagesrcset="a.png 480w" imagesizes="${sizes}">`;
	const message =
		'It includes unexpected characters. the "imagesizes" attribute expects the source size list without "auto" format (https://html.spec.whatwg.org/multipage/images.html#sizes-attributes)';
	expect((await mlRuleTest(rule, link('100vw'))).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, link('auto'))).violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 82, message, raw: 'auto' },
	]);
	expect((await mlRuleTest(rule, link('auto, 100vw'))).violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 82, message, raw: 'auto' },
	]);
	expect((await mlRuleTest(rule, link(String.raw` \61 uto, 100vw`))).violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 83, message, raw: String.raw`\61 uto` },
	]);
});

// https://html.spec.whatwg.org/multipage/embedded-content.html#attr-img-sizes
// > If the srcset attribute is not specified, and the loading attribute is in the Lazy state, the
// > sizes attribute may be specified with the value "auto" (ASCII case-insensitive).
test('[no-invalid-attr-value-225] img: without srcset, sizes accepts "auto" in any case', async () => {
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" loading="lazy" sizes="auto">')).violations).toStrictEqual(
		[],
	);
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" loading="lazy" sizes="AUTO">')).violations).toStrictEqual(
		[],
	);
});

test('[no-invalid-attr-value-226] img: without srcset, sizes accepts no value but "auto"', async () => {
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" loading="lazy" sizes="100vw">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 47,
			message: 'The "sizes" attribute expects auto',
			raw: '100vw',
		},
	]);
	expect(
		(await mlRuleTest(rule, '<img src="a.png" alt="" loading="lazy" sizes="auto, 100vw">')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 47,
			message: 'The "sizes" attribute expects auto',
			raw: 'auto, 100vw',
		},
	]);
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" loading="lazy" sizes="">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 47,
			message: 'The "sizes" attribute expects auto',
			raw: '',
		},
	]);
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" loading="lazy" sizes>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 45,
			message: 'The "sizes" attribute expects auto',
			raw: '',
		},
	]);
});

test('[no-invalid-attr-value-227] img: with srcset, sizes still takes a source size list', async () => {
	expect(
		(await mlRuleTest(rule, '<img src="a.png" srcset="a.png 100w" alt="" loading="lazy" sizes="auto, 100vw">'))
			.violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-228] JSX: without srcset, a sizes value but "auto" is reported even when loading is dynamic', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(await mlRuleTest(rule, '<img src="a.png" alt="" loading={loading} sizes="100vw" />', { parser })).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 50,
			message: 'The "sizes" attribute expects auto',
			raw: '100vw',
		},
	]);
});

test('[no-invalid-attr-value-229] img: a sizes that no-disallowed-attr reports is not reported again for its value', async () => {
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" sizes="100vw">')).violations).toStrictEqual([]);
});

// @see https://html.spec.whatwg.org/multipage/links.html#link-type-modulepreload
// > A module preload destination is "json", "style", "text", or a script-like destination.
test('[no-invalid-attr-value-230] rel=modulepreload accepts as=text', async () => {
	expect((await mlRuleTest(rule, '<link rel="modulepreload" href="a.txt" as="text">')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-231] rel=modulepreload accepts as=TEXT (ASCII case-insensitive)', async () => {
	expect((await mlRuleTest(rule, '<link rel="modulepreload" href="a.txt" as="TEXT">')).violations).toStrictEqual([]);
});

// @see https://html.spec.whatwg.org/multipage/media.html#attr-media-preload
// > The attribute's empty value default is the Automatic state.
// @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#keywords-and-enumerated-attributes
// > The empty string and the attribute must have an empty value default defined.
test('[no-invalid-attr-value-232] video[preload=""] is the Automatic state', async () => {
	expect((await mlRuleTest(rule, '<video src="a.mp4" preload=""></video>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-233] audio[preload=""] is the Automatic state', async () => {
	expect((await mlRuleTest(rule, '<audio src="a.mp3" preload=""></audio>')).violations).toStrictEqual([]);
});

// @see https://html.spec.whatwg.org/multipage/scripting.html#attr-script-type
// > Omitting the attribute, setting it to the empty string, or setting it to a JavaScript MIME type
// > essence match means that the script is a classic script
test('[no-invalid-attr-value-234] script[type=""] is a classic script', async () => {
	expect((await mlRuleTest(rule, '<script type=""></script>')).violations).toStrictEqual([]);
});

// @see https://html.spec.whatwg.org/multipage/input.html#email-state-(type=email)
// > The value attribute, if specified, must have a value that is a valid email address list.
// @see https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address-list
// > A valid email address list is a set of comma-separated tokens, where each token is itself a valid email address.
test('[no-invalid-attr-value-235] input[type=email][multiple] accepts comma-separated addresses', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="email" multiple value="a@example.com,b@example.com">')).violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-236] input[type=email][multiple] accepts spaces around the commas', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="email" multiple value="a@example.com, b@example.com">')).violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-237] input[type=email][multiple] accepts a single address', async () => {
	expect((await mlRuleTest(rule, '<input type="email" multiple value="a@example.com">')).violations).toStrictEqual(
		[],
	);
});

// @see https://html.spec.whatwg.org/multipage/input.html#email-state-(type=email)
// > The value attribute, if specified and not empty, must have a value that is a single valid email address.
test('[no-invalid-attr-value-238] input[value=""] is valid for the types that qualify the value requirement with not empty', async () => {
	expect((await mlRuleTest(rule, '<input type="email" value="">')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<input type="email" multiple value="">')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<input type="color" value="">')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<input type="url" value="">')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<input type="number" value="">')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<input type="date" value="">')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<input type="month" value="">')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<input type="week" value="">')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<input type="time" value="">')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<input type="datetime-local" value="">')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-239] input[type=email][multiple] reports the address that is not valid', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="email" multiple value="a@example.com,not-an-email">')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 51,
			message:
				'The "value" attribute expects comma-separated list. the content of the list expects the email address format (https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address)',
			raw: 'not-an-email',
		},
	]);
});

test('[no-invalid-attr-value-240] input[type=email][multiple] reports a trailing comma', async () => {
	expect((await mlRuleTest(rule, '<input type="email" multiple value="a@example.com,">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 50,
			message: 'The "value" attribute expects comma-separated list. Found extra token ","',
			raw: ',',
		},
	]);
});

test('[no-invalid-attr-value-241] input[type=email][multiple] reports consecutive commas', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="email" multiple value="a@example.com,,b@example.com">')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 51,
			message: 'The "value" attribute expects comma-separated list. Found unexpected comma',
			raw: ',',
		},
	]);
});

test('[no-invalid-attr-value-242] input[type=email] without multiple reports a comma-separated list', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="email" value="a@example.com,b@example.com">')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 28,
			message:
				'The "value" attribute expects the email address format (https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address)',
			raw: 'a@example.com,b@example.com',
		},
	]);
});

test('[no-invalid-attr-value-243] script[type] still reports a value that is not a MIME type', async () => {
	expect((await mlRuleTest(rule, '<script type="not a mime"></script>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message:
				'The "type" attribute expects the MIME Type format (https://mimesniff.spec.whatwg.org/#valid-mime-type). Or, the "type" attribute expects either "", "module", "importmap", "speculationrules"',
			raw: 'not a mime',
		},
	]);
});

test('[no-invalid-attr-value-244] video[preload] still reports an unknown keyword', async () => {
	expect((await mlRuleTest(rule, '<video src="a.mp4" preload="foo"></video>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 29,
			message: 'The "preload" attribute expects either "", "none", "metadata", "auto"',
			raw: 'foo',
		},
	]);
});

// @see https://html.spec.whatwg.org/multipage/input.html#number-state-(type=number)
// > The value attribute, if specified and not empty, must have a value that is a valid floating-point number.
test('[no-invalid-attr-value-245] input[type=number] still reports a whitespace-only value', async () => {
	expect((await mlRuleTest(rule, '<input type="number" value=" ">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 29,
			message: 'It includes unexpected characters. the "value" attribute expects float',
			raw: ' ',
		},
	]);
});

// @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#comma-separated-tokens
// > A set of comma-separated tokens is a string containing zero or more tokens each separated from the next by a single U+002C COMMA character (,) […]
// > and optionally surrounded by ASCII whitespace.
test('[no-invalid-attr-value-246] input[type=email][multiple] accepts whitespace around the whole list and each token', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="email" multiple value=" a@example.com , b@example.com ">')).violations,
	).toStrictEqual([]);
});

// @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#keywords-and-enumerated-attributes
// > An ASCII case-insensitive match for one of the conforming keywords for that attribute, with no leading or trailing whitespace.
test('[no-invalid-attr-value-247] video[preload] still reports a whitespace-only value', async () => {
	expect((await mlRuleTest(rule, '<video src="a.mp4" preload=" "></video>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 29,
			message: 'The "preload" attribute expects either "", "none", "metadata", "auto"',
			raw: ' ',
		},
	]);
});

// @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#keywords-and-enumerated-attributes
// > The empty string and the attribute must have an empty value default defined.
// The enumerated attributes that define an empty value default are preload, contenteditable, popover,
// hidden, translate, the CORS settings attributes, spellcheck, writingsuggestions and autocorrect.
test('[no-invalid-attr-value-248] the enumerated attributes that define an empty value default still accept the empty string', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div contenteditable="" popover="" hidden="" translate="" spellcheck="" writingsuggestions="" autocorrect=""></div>',
			)
		).violations,
	).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" crossorigin="">')).violations).toStrictEqual([]);
});

// @see https://html.spec.whatwg.org/multipage/input.html#range-state-(type=range)
// > The value attribute, if specified, must have a value that is a valid floating-point number.
test('[no-invalid-attr-value-249] input[type=range] still reports an empty value', async () => {
	expect((await mlRuleTest(rule, '<input type="range" value="">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 28,
			message: 'The "value" attribute must not be empty. It expects float',
			raw: '',
		},
	]);
});

// @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#keywords-and-enumerated-attributes
// > An ASCII case-insensitive match for one of the conforming keywords for that attribute, with no leading or trailing whitespace.
test('[no-invalid-attr-value-250] input[type=RANGE] still reports an empty value (the type is matched ASCII case-insensitively)', async () => {
	expect((await mlRuleTest(rule, '<input type="RANGE" value="">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 28,
			message: 'The "value" attribute must not be empty. It expects float',
			raw: '',
		},
	]);
});

test('[no-invalid-attr-value-251] input[type=EMAIL][MULTIPLE] accepts comma-separated addresses', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="EMAIL" MULTIPLE value="a@example.com,b@example.com">')).violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-252] script[type] still reports a whitespace-only value', async () => {
	expect((await mlRuleTest(rule, '<script type=" "></script>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message:
				'The "type" attribute expects the MIME Type format (https://mimesniff.spec.whatwg.org/#valid-mime-type). Or, the "type" attribute expects either "", "module", "importmap", "speculationrules"',
			raw: ' ',
		},
	]);
});

test('[no-invalid-attr-value-253] input[type=email][multiple] reports a trailing comma after whitespace', async () => {
	expect((await mlRuleTest(rule, '<input type="email" multiple value="a@example.com , ">')).violations).toStrictEqual(
		[
			{
				severity: 'error',
				line: 1,
				col: 51,
				message: 'The "value" attribute expects comma-separated list. Found extra token ","',
				raw: ',',
			},
		],
	);
});

test('[no-invalid-attr-value-254] input[type=email][multiple] reports an address with a display name', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="email" multiple value="Foo <a@example.com>">')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 41,
			message:
				'The "value" attribute expects comma-separated list. Missing a comma. Did you mean ",<a@example.com>"?',
			raw: '<a@example.com>',
		},
	]);
});

test('[no-invalid-attr-value-255] React: the value of acceptCharset is checked as that of the accept-charset attribute', async () => {
	const react = { parser: { '.*': '@markuplint/jsx-parser' }, specs: { '.*': '@markuplint/react-spec' } };
	expect(
		(await mlRuleTest(rule, '<form action="/submit" acceptCharset="UTF-8"></form>', react)).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<form action="/submit" acceptCharset="shift_jis"></form>', react)).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 39,
			message: 'The "accept-charset" attribute expects utf-8',
			raw: 'shift_jis',
		},
	]);
	expect(
		(await mlRuleTest(rule, '<form action="/submit" accept-charset="shift_jis"></form>')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 40,
			message: 'The "accept-charset" attribute expects utf-8',
			raw: 'shift_jis',
		},
	]);
});

// The time zones themselves are covered by @markuplint/types (check-datetime/max-week.runtime.spec.ts),
// which runs the check in a process started in each zone.
test('[no-invalid-attr-value-256] input[type=week]: 2021 has 52 weeks', async () => {
	expect((await mlRuleTest(rule, '<input type="week" value="2021-W53">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message:
				'The week part of the "value" attribute expects integer greater than or equal to one less than or equal to 52 (https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#weeks)',
			raw: '53',
		},
	]);
	expect((await mlRuleTest(rule, '<input type="week" value="2026-W53">')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-257] input[type=week]: the week part is named in Japanese', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="week" value="2021-W53">', { rule: true }, false, 'ja')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message:
				'属性「value」の週の部分は1以上で52以下の整数である必要があります (https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#weeks)',
			raw: '53',
		},
	]);
});

test('[no-invalid-attr-value-258] the allowed values are shown as written (`time` is also a keyword) with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="foo">', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message:
				'属性「type」は「hidden」「text」「search」「tel」「url」「email」「password」「date」「month」「week」「time」「datetime-local」「number」「range」「color」「checkbox」「radio」「file」「submit」「image」「reset」「button」のいずれかである必要があります',
			raw: 'foo',
		},
	]);
});

test('[no-invalid-attr-value-259] a URL with a code point that is not a URL code point is rejected', async () => {
	// `|` is not a URL code point: invalid-URL-unit in the path, the query and the fragment.
	// https://url.spec.whatwg.org/#url-code-points
	const path = await mlRuleTest(rule, '<a href="file:///C|/foo"></a>');
	expect(path.violations.length).toBe(1);
	const query = await mlRuleTest(rule, '<a href="http://example.com/?q=a|b"></a>');
	expect(query.violations.length).toBe(1);
	const fragment = await mlRuleTest(rule, '<img src="/a#b{c}" alt="">');
	expect(fragment.violations.length).toBe(1);
});

test('[no-invalid-attr-value-260] a drive letter as the host of a file URL is rejected', async () => {
	// https://url.spec.whatwg.org/#file-invalid-windows-drive-letter-host
	const { violations } = await mlRuleTest(rule, '<a href="file://C:/foo"></a>');
	expect(violations).toMatchObject([{ severity: 'error', line: 1, col: 10, raw: 'file://C:/foo' }]);
});

test('[no-invalid-attr-value-261] JSX: a URL written as an expression is not judged, a literal with braces is', async () => {
	// A value that the parser reads as code (`isDynamicValue`) is skipped; a string literal is the value itself,
	// and `{` and `}` are not URL code points.
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const dynamic = await mlRuleTest(rule, '<a href={`/p/${id}?q=a|b`}></a>', options);
	expect(dynamic.violations).toStrictEqual([]);
	const literal = await mlRuleTest(rule, '<a href="/p/{id}"></a>', options);
	expect(literal.violations.length).toBe(1);
});

test('[no-invalid-attr-value-262] input: capture takes the keywords of HTML Media Capture and the empty string', async () => {
	// https://www.w3.org/TR/html-media-capture/#the-capture-attribute
	for (const html of [
		'<input type="file" accept="image/*" capture="user">',
		'<input type="file" accept="image/*" capture="environment">',
		'<input type="file" accept="image/*" capture="">',
		'<input type="file" accept="image/*" capture>',
		'<input type="file" accept="image/*" capture="USER">',
		'<input type="FILE" accept="image/*" capture="user">',
		'<input type="file" webkitdirectory>',
		'<input type="FILE" webkitdirectory>',
	]) {
		expect((await mlRuleTest(rule, html)).violations, html).toStrictEqual([]);
	}
});

test('[no-invalid-attr-value-263] SVG: x, y, width and height of pattern take a length or a percentage', async () => {
	// https://svgwg.org/svg2-draft/pservers.html#PatternElementXAttribute
	const svg =
		'<svg xmlns="http://www.w3.org/2000/svg"><pattern x="10" y="5%" width="20px" height="2em"></pattern></svg>';
	expect((await mlRuleTest(rule, svg)).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-264] input: capture does not take a keyword other than user and environment', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="file" accept="image/*" capture="front">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 46,
			message: 'The "capture" attribute expects either "", "user", "environment"',
			raw: 'front',
		},
	]);
});

test('[no-invalid-attr-value-265] SVG: x and width of pattern do not take a value that is not a length', async () => {
	const svg = '<svg xmlns="http://www.w3.org/2000/svg"><pattern x="left" width="wide"></pattern></svg>';
	const { violations } = await mlRuleTest(rule, svg);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 53,
			message:
				'The "x" attribute expects the CSS Syntax "<svg-length>" (https://csstree.github.io/docs/syntax/#Type:svg-length). Or, the "x" attribute expects the CSS Syntax "<percentage>" (https://csstree.github.io/docs/syntax/#Type:percentage)',
			raw: 'left',
		},
		{
			severity: 'error',
			line: 1,
			col: 66,
			message:
				'The "width" attribute expects the CSS Syntax "<svg-length>" (https://csstree.github.io/docs/syntax/#Type:svg-length). Or, the "width" attribute expects the CSS Syntax "<percentage>" (https://csstree.github.io/docs/syntax/#Type:percentage)',
			raw: 'wide',
		},
	]);
});

test('[no-invalid-attr-value-266] audio and video: controlslist takes the tokens of the WICG controls-list', async () => {
	const video = await mlRuleTest(rule, '<video controlslist="nodownload nothing"></video>');
	expect(video.violations.map(v => v.raw)).toStrictEqual(['nothing']);
	const { violations } = await mlRuleTest(rule, '<audio controlslist="nodownload nothing"></audio>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message:
				'The "controlslist" attribute expects space-separated list. the content of the list expects either "nodownload", "nofullscreen", "noremoteplayback"',
			raw: 'nothing',
		},
	]);
});

test('[no-invalid-attr-value-267] SVG: mask-type of the mask element takes luminance or alpha', async () => {
	// https://drafts.csswg.org/css-masking-1/#propdef-mask-type
	const svg = '<svg xmlns="http://www.w3.org/2000/svg"><mask mask-type="foo"></mask></svg>';
	expect((await mlRuleTest(rule, svg)).violations.map(v => v.raw)).toStrictEqual(['foo']);
	expect(
		(await mlRuleTest(rule, '<svg xmlns="http://www.w3.org/2000/svg"><mask mask-type="alpha"></mask></svg>'))
			.violations,
	).toStrictEqual([]);
});

test('[no-invalid-attr-value-268] SVG: decoding of the image element takes sync, async or auto', async () => {
	const svg = '<svg xmlns="http://www.w3.org/2000/svg"><image href="a.png" decoding="fast"></image></svg>';
	const { violations } = await mlRuleTest(rule, svg);
	expect(violations.map(v => v.raw)).toStrictEqual(['fast']);
});

test('[no-invalid-attr-value-269] input: the keywords of capture and the type of the input are ASCII case-insensitive', async () => {
	// https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#keywords-and-enumerated-attributes
	for (const html of [
		'<input type="file" capture="USER">',
		'<input type="file" capture="Environment">',
		'<input type="FILE" accept="image/*" capture="user">',
	]) {
		expect((await mlRuleTest(rule, html)).violations, html).toStrictEqual([]);
	}
});

test('[no-invalid-attr-value-270] SVG: in and in2 of feDisplacementMap take a keyword of the filter primitive input or a result name', async () => {
	// https://drafts.csswg.org/filter-effects-1/#feDisplacementMapElement
	const svg =
		'<svg xmlns="http://www.w3.org/2000/svg"><filter><feDisplacementMap in="SourceGraphic" in2="map"></feDisplacementMap></filter></svg>';
	expect((await mlRuleTest(rule, svg)).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-271] SVG: in of feDisplacementMap does not take two words', async () => {
	const svg =
		'<svg xmlns="http://www.w3.org/2000/svg"><filter><feDisplacementMap in="junk junk"></feDisplacementMap></filter></svg>';
	const { violations } = await mlRuleTest(rule, svg);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 72,
			message:
				'The "in" attribute expects either "SourceGraphic", "SourceAlpha", "BackgroundImage", "BackgroundAlpha", "FillPaint", "StrokePaint"',
			raw: 'junk junk',
		},
		{
			severity: 'error',
			line: 1,
			col: 77,
			message:
				'The value part of the "in" attribute expects the CSS Syntax "<custom-ident>" (https://csstree.github.io/docs/syntax/#Type:custom-ident)',
			raw: 'junk',
		},
	]);
});

// https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes
test('[no-invalid-attr-value-272] the value of a boolean attribute is the empty string or the name of the attribute, in any case', async () => {
	for (const html of [
		'<input disabled>',
		'<input disabled="">',
		'<input disabled="disabled">',
		'<input disabled="DISABLED">',
		'<INPUT DISABLED="Disabled">',
		'<img src="a.png" alt="photo" controls="controls">',
		'<video disablepictureinpicture="disablepictureinpicture"></video>',
	]) {
		expect((await mlRuleTest(rule, html)).violations, html).toStrictEqual([]);
	}
});

test('[no-invalid-attr-value-273] a boolean attribute does not take a value other than the empty string and its name', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="foo.jpg" alt="foo" controls="invalid">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 40,
			message: 'The "controls" attribute expects either "", "controls"',
			raw: 'invalid',
		},
	]);
});

test('[no-invalid-attr-value-274] disabled="true" and disabled="false" are reported, since the value is not the name', async () => {
	for (const value of ['true', 'false', '1']) {
		const { violations } = await mlRuleTest(rule, `<button disabled="${value}"></button>`);
		expect(
			violations.map(v => v.raw),
			value,
		).toStrictEqual([value]);
	}
});

test('[no-invalid-attr-value-275] a boolean attribute does not take a name with leading or trailing whitespace', async () => {
	const { violations } = await mlRuleTest(rule, '<input disabled=" disabled ">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.raw).toBe(' disabled ');
});

test('[no-invalid-attr-value-276] the value that the HTML Standard allows for an obsolete but conforming attribute', async () => {
	// https://html.spec.whatwg.org/multipage/obsolete.html#obsolete-but-conforming-features
	const html =
		'<img src="a.png" alt="" border="0"><style type="TEXT/CSS"></style><script src="a.js" charset="UTF-8" language="javascript"></script>';
	expect((await mlRuleTest(rule, html)).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-277] any other value of an obsolete but conforming attribute is non-conforming', async () => {
	const html = '<img src="a.png" alt="" border="1"><style type="text/plain"></style>';
	const { violations } = await mlRuleTest(rule, html);
	expect(violations.map(v => v.raw)).toStrictEqual(['1', 'text/plain']);
});

test('[no-invalid-attr-value-278] exportparts takes part mappings, which do not nest a mapping in a mapping', async () => {
	// https://drafts.csswg.org/css-shadow-1/#exportparts-attr
	const { violations } = await mlRuleTest(rule, '<div exportparts="a:b:c"></div>');
	expect(violations.map(v => v.raw)).toStrictEqual(['a:b:c']);
});

test('[no-invalid-attr-value-279] xml:lang has to have the value of lang, ASCII case-insensitive', async () => {
	// https://html.spec.whatwg.org/multipage/dom.html#the-lang-and-xml:lang-attributes
	const { violations } = await mlRuleTest(rule, '<div lang="en" xml:lang="fr"></div><div lang="en" xml:lang></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "xml:lang" attribute expects "en"',
			raw: 'fr',
		},
		{
			severity: 'error',
			line: 1,
			col: 59,
			message: 'The "xml:lang" attribute expects "en"',
			raw: '',
		},
	]);
});

test('[no-invalid-attr-value-280] xml:lang with the same value as lang, in any ASCII case', async () => {
	expect((await mlRuleTest(rule, '<div lang="en" xml:lang="EN"></div>')).violations).toStrictEqual([]);
	// without lang the attribute is not allowed, which is no-disallowed-attr's to say
	expect((await mlRuleTest(rule, '<div xml:lang="en"></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-281] xml:lang is not compared with a lang that is code', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	expect((await mlRuleTest(rule, '<div lang={l} xml:lang="fr" />', options)).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-282] a literal in {…} is reported as the string is, at the start of the value that is written', async () => {
	const { violations } = await mlRuleTest(rule, '<input type={"bogus"} />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message:
				'The "type" attribute expects either "hidden", "text", "search", "tel", "url", "email", "password", "date", "month", "week", "time", "datetime-local", "number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"',
			raw: '"bogus"',
		},
	]);
});

test('[no-invalid-attr-value-283] a position in a value that has an escape is not an offset of the source', async () => {
	const { violations } = await mlRuleTest(rule, '<input type={"bo\\u0067us"} />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message:
				'The "type" attribute expects either "hidden", "text", "search", "tel", "url", "email", "password", "date", "month", "week", "time", "datetime-local", "number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"',
			raw: '"bo\\u0067us"',
		},
	]);
});

test('[no-invalid-attr-value-284] a string value is reported in JSX', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="bogus" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message:
				'The "type" attribute expects either "hidden", "text", "search", "tel", "url", "email", "password", "date", "month", "week", "time", "datetime-local", "number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"',
			raw: 'bogus',
		},
	]);
});

describe('as of a link that has both preload and modulepreload', () => {
	const intersection = 'The "as" attribute expects either "script", "style"';

	test('[no-invalid-attr-value-285] both keywords accept the destinations they share', async () => {
		for (const dest of ['script', 'style', 'Script']) {
			expect(
				(await mlRuleTest(rule, `<link rel="preload modulepreload" href="a.js" as="${dest}">`)).violations,
				dest,
			).toStrictEqual([]);
		}
	});

	test('[no-invalid-attr-value-286] as=fetch is not a module preload destination', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="preload modulepreload" href="a.js" as="fetch">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 51,
				message: intersection,
				raw: 'fetch',
			},
		]);
	});

	test('[no-invalid-attr-value-287] as=text is not a preload destination', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="preload modulepreload" href="a.txt" as="text">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 52,
				message: intersection,
				raw: 'text',
			},
		]);
	});

	test('[no-invalid-attr-value-288] a destination only one keyword allows is not offered', async () => {
		for (const dest of ['font', 'image', 'track', 'json', 'worker']) {
			const { violations } = await mlRuleTest(
				rule,
				`<link rel="preload modulepreload" href="a.js" as="${dest}">`,
			);
			expect(violations, dest).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 51,
					message: intersection,
					raw: dest,
				},
			]);
		}
	});

	test('[no-invalid-attr-value-289] keyword order does not change the accepted set', async () => {
		expect(
			(await mlRuleTest(rule, '<link rel="modulepreload preload" href="a.js" as="script">')).violations,
		).toStrictEqual([]);
		const { violations } = await mlRuleTest(rule, '<link rel="modulepreload preload" href="a.js" as="text">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 51,
				message: intersection,
				raw: 'text',
			},
		]);
	});

	test('[no-invalid-attr-value-290] another case of both keywords is accepted', async () => {
		expect(
			(await mlRuleTest(rule, '<link rel="PRELOAD MODULEPRELOAD" href="a.js" as="SCRIPT">')).violations,
		).toStrictEqual([]);
		const { violations } = await mlRuleTest(rule, '<link rel="PRELOAD MODULEPRELOAD" href="a.js" as="FETCH">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 51,
				message: intersection,
				raw: 'FETCH',
			},
		]);
	});

	test('[no-invalid-attr-value-291] an empty as and surrounding spaces are not in the intersection', async () => {
		const empty = await mlRuleTest(rule, '<link rel="preload modulepreload" href="a.js" as="">');
		expect(empty.violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 51,
				message: intersection,
				raw: '',
			},
		]);
		const spaced = await mlRuleTest(rule, '<link rel="preload modulepreload" href="a.js" as=" script ">');
		expect(spaced.violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 51,
				message: intersection,
				raw: ' script ',
			},
		]);
	});

	test('[no-invalid-attr-value-292] an enum that allows surrounding spaces reports them in raw', async () => {
		const { violations } = await mlRuleTest(rule, '<svg><text lengthAdjust=" Bad ">x</text></svg>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 26,
				message: 'The "lengthAdjust" attribute expects either "spacing", "spacingAndGlyphs"',
				raw: ' Bad ',
			},
		]);
	});
});

describe('the pattern attribute and the v flag', () => {
	const message =
		'The "pattern" attribute expects regular expression (https://html.spec.whatwg.org/multipage/input.html#compiled-pattern-regular-expression)';

	const verify = async (value: string, prefix = '') =>
		(await mlRuleTest(rule, `<input ${prefix}pattern="${value}">`)).violations;

	const reported = (raw: string, col = 17) => [{ severity: 'error', line: 1, col, message, raw }];

	test('[no-invalid-attr-value-293] `[(]` is not compiled with the `v` flag', async () => {
		expect(await verify('[(]')).toStrictEqual(reported('[(]'));
	});

	test('[no-invalid-attr-value-294] `a{` is not compiled with the `v` flag', async () => {
		expect(await verify('a{')).toStrictEqual(reported('a{'));
	});

	test('[no-invalid-attr-value-295] `{` is not compiled with the `v` flag', async () => {
		expect(await verify('{')).toStrictEqual(reported('{'));
	});

	test('[no-invalid-attr-value-296] an escaped hyphen outside a class is not compiled with the `v` flag', async () => {
		expect(await verify(String.raw`\-`)).toStrictEqual(reported(String.raw`\-`));
	});

	test('[no-invalid-attr-value-297] a trailing hyphen in a class is not compiled with the `v` flag', async () => {
		expect(await verify('[a-]')).toStrictEqual(reported('[a-]'));
	});

	test('[no-invalid-attr-value-298] a trailing hyphen after a class escape is not compiled with the `v` flag', async () => {
		expect(await verify(String.raw`[\w.-]+`)).toStrictEqual(reported(String.raw`[\w.-]+`));
	});

	test('[no-invalid-attr-value-299] a negated class of a lone hyphen is not compiled with the `v` flag', async () => {
		expect(await verify('[^-]')).toStrictEqual(reported('[^-]'));
	});

	test('[no-invalid-attr-value-300] a reserved double punctuator in a class is not compiled with the `v` flag', async () => {
		expect(await verify('[a-z&&[aeiou]]')).toStrictEqual(reported('[a-z&&[aeiou]]'));
	});

	test('[no-invalid-attr-value-301] a value with an unmatched parenthesis is reported although wrapping balances it', async () => {
		expect(await verify('a)|(b')).toStrictEqual(reported('a)|(b'));
	});

	test('[no-invalid-attr-value-302] the violation points at the value after another attribute', async () => {
		expect(await verify('[(]', 'type="text" ')).toStrictEqual(reported('[(]', 29));
	});

	test('[no-invalid-attr-value-303] set subtraction in a class is compiled with the `v` flag', async () => {
		expect(await verify(String.raw`[\p{L}--[a-z]]`)).toStrictEqual([]);
	});

	test('[no-invalid-attr-value-304] set intersection in a class is compiled with the `v` flag', async () => {
		expect(await verify(String.raw`[\p{L}&&\p{ASCII}]`)).toStrictEqual([]);
	});

	test('[no-invalid-attr-value-305] a string literal in a class is compiled with the `v` flag', async () => {
		expect(await verify(String.raw`[\q{abc}]`)).toStrictEqual([]);
	});

	test('[no-invalid-attr-value-306] a trailing escaped hyphen in a class is accepted', async () => {
		expect(await verify(String.raw`[\w.\-]+`)).toStrictEqual([]);
	});

	test('[no-invalid-attr-value-307] a plain pattern is accepted', async () => {
		expect(await verify(String.raw`\d{3}-\d{4}`)).toStrictEqual([]);
	});
});

test('[no-invalid-attr-value-308] customelementregistry is a boolean attribute', async () => {
	// https://html.spec.whatwg.org/multipage/custom-elements.html#the-customelementregistry-attribute
	for (const html of [
		'<div customelementregistry></div>',
		'<section customelementregistry=""></section>',
		'<p customelementregistry="customelementregistry"></p>',
	]) {
		expect((await mlRuleTest(rule, html)).violations, html).toStrictEqual([]);
	}
	const { violations } = await mlRuleTest(rule, '<div customelementregistry="scoped"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 29,
			message: 'The "customelementregistry" attribute expects either "", "customelementregistry"',
			raw: 'scoped',
		},
	]);
});

test.each([
	'<input type="&#99;heckbox">',
	'<button type="&#115;ubmit">a</button>',
	'<div dir="&#108;tr"></div>',
	'<a href="x" rel="&#110;oopener">a</a>',
])('[no-invalid-attr-value-310] a value is read with its character references decoded: %s', async code => {
	expect((await mlRuleTest(rule, code)).violations).toStrictEqual([]);
});

test('[no-invalid-attr-value-311] a part of a value after a character reference is reported where it is written', async () => {
	const { violations } = await mlRuleTest(rule, '<script src="a.js" blocking="&#114;ender bogus"></script>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 42,
			message: 'The "blocking" attribute expects space-separated list. the content of the list expects render',
			raw: 'bogus',
		},
	]);
});

test('[no-invalid-attr-value-312] a value with a character reference is reported as it is written', async () => {
	const { violations } = await mlRuleTest(rule, '<div translate="&#121;es x"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 17,
			message: 'The "translate" attribute expects either "", "yes", "no"',
			raw: '&#121;es x',
		},
	]);
});

test('[no-invalid-attr-value-313] a keyword is compared ASCII case-insensitively: the Kelvin sign is not `k`', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="chec\u212Abox">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message:
				'The "type" attribute expects either "hidden", "text", "search", "tel", "url", "email", "password", "date", "month", "week", "time", "datetime-local", "number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"',
			raw: 'chec\u212Abox',
		},
	]);
});

test('[no-invalid-attr-value-314] a navigable target keyword is compared ASCII case-insensitively', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="x" target="_blan\u212A">a</a>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message:
				'It includes unexpected characters. the "target" attribute expects either "_blank", "_self", "_parent", "_top", "navigable target name". Did you mean "_blank"? (https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword)',
			raw: '_blan\u212A',
		},
	]);
});

test('[no-invalid-attr-value-315] the scheme of a base URL is read without the tabs and newlines in it', async () => {
	const { violations } = await mlRuleTest(rule, '<base href="java&#9;script:alert(1)">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			message:
				'It includes unexpected characters (https://html.spec.whatwg.org/multipage/semantics.html#set-the-frozen-base-url)',
			raw: 'java&#9;script:alert(1)',
		},
	]);
});

test.each([
	'<div customelementregistry="CUSTOMELEMENTREGISTRY"></div>',
	'<my-element customelementregistry></my-element>',
	'<my-element customelementregistry="CustomElementRegistry"></my-element>',
])('[no-invalid-attr-value-316] customelementregistry takes the name of the attribute in any case: %s', async html => {
	// > All HTML elements may have the customelementregistry content attribute set. It is a boolean attribute.
	// @see https://html.spec.whatwg.org/multipage/custom-elements.html#the-customelementregistry-attribute
	//
	// > If the attribute is present, its value must either be the empty string or a value that is an ASCII case-insensitive match for the attribute's canonical name, with no leading or trailing ASCII whitespace.
	// @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes
	expect((await mlRuleTest(rule, html)).violations).toStrictEqual([]);
});

test.each(['true', 'false', 'foo', ' customelementregistry '])(
	'[no-invalid-attr-value-317] customelementregistry takes no value other than the empty string and its name: %j',
	async value => {
		// > If the attribute is present, its value must either be the empty string or a value that is an ASCII case-insensitive match for the attribute's canonical name, with no leading or trailing ASCII whitespace.
		// @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes
		expect((await mlRuleTest(rule, `<div customelementregistry="${value}"></div>`)).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 29,
				message: 'The "customelementregistry" attribute expects either "", "customelementregistry"',
				raw: value,
			},
		]);
	},
);
