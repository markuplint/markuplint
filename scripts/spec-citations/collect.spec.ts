import { describe, expect, test } from 'vitest';

import { collectFromMarkdown, collectFromSource, collectFromText, parseSpecUrl } from './collect.ts';

const WHATWG = 'https://html.spec.whatwg.org/multipage';

describe('parseSpecUrl', () => {
	test('[collect-001] splits page, fragment and text directive', () => {
		expect(
			parseSpecUrl(`${WHATWG}/syntax.html#attributes-2:~:text=Attributes%20have%20a,upper%20alphas.`),
		).toStrictEqual({
			url: `${WHATWG}/syntax.html#attributes-2:~:text=Attributes%20have%20a,upper%20alphas.`,
			page: `${WHATWG}/syntax.html`,
			fragment: 'attributes-2',
			textDirective: { start: 'Attributes have a', end: 'upper alphas.' },
		});
	});

	test('[collect-002] reads prefix, suffix and an encoded comma', () => {
		const parsed = parseSpecUrl(`${WHATWG}/a.html#x:~:text=before-,one%2C%20two,-after`);
		expect(parsed?.textDirective).toStrictEqual({ prefix: 'before', start: 'one, two', suffix: 'after' });
	});

	test('[collect-003] decodes a fragment that holds parentheses', () => {
		expect(parseSpecUrl(`${WHATWG}/input.html#file-upload-state-(type=file)`)?.fragment).toBe(
			'file-upload-state-(type=file)',
		);
		expect(parseSpecUrl(`${WHATWG}/input.html#names:-the-itemprop-attribute`)?.fragment).toBe(
			'names:-the-itemprop-attribute',
		);
	});

	test('[collect-004] reports a whole-page link without a fragment', () => {
		expect(parseSpecUrl('https://html.spec.whatwg.org/')?.fragment).toBeNull();
	});

	test('[collect-005] watches the four spec hosts, the documentation of the frameworks and the listed framework repositories, and nothing else', () => {
		expect(parseSpecUrl('https://momdo.github.io/html/syntax.html#a')).not.toBeNull();
		expect(parseSpecUrl('https://www.w3.org/TR/wai-aria-1.2/#tab')).not.toBeNull();
		expect(parseSpecUrl('https://w3c.github.io/aria/#tab')).not.toBeNull();
		expect(parseSpecUrl('https://developer.mozilla.org/en-US/docs/Web/HTML')).toBeNull();
		expect(parseSpecUrl('https://www.w3.org/WAI/WCAG22/Understanding/x.html')).toBeNull();
		expect(parseSpecUrl('https://waic.jp/docs/WCAG20/Overview.html#a')).toBeNull();
		expect(parseSpecUrl('https://momdo.github.io/other/')).toBeNull();
	});
});

describe('collectFromMarkdown', () => {
	test('[collect-006] collects a plain link with its line number', () => {
		const { citations } = collectFromMarkdown(
			`# t\n\nSee [the spec](${WHATWG}/syntax.html#attributes-2).\n`,
			'r/README.md',
		);
		expect(citations).toHaveLength(1);
		expect(citations[0]).toMatchObject({
			file: 'r/README.md',
			line: 3,
			page: `${WHATWG}/syntax.html`,
			fragment: 'attributes-2',
		});
	});

	test('[collect-007] reads an angle-bracket link whose URL holds parentheses', () => {
		const { citations } = collectFromMarkdown(
			`[x](<${WHATWG}/input.html#file-upload-state-(type=file)>)\n`,
			'r/README.md',
		);
		expect(citations.map(c => c.fragment)).toStrictEqual(['file-upload-state-(type=file)']);
	});

	test('[collect-008] reads a link whose URL holds balanced parentheses without angle brackets', () => {
		const { citations } = collectFromMarkdown(
			`[x](${WHATWG}/input.html#file-upload-state-(type=file)) text\n`,
			'r/README.md',
		);
		expect(citations.map(c => c.fragment)).toStrictEqual(['file-upload-state-(type=file)']);
	});

	test('[collect-009] keeps the full stop that ends a text directive', () => {
		const { citations } = collectFromMarkdown(
			`Cite: [x](${WHATWG}/syntax.html#a:~:text=Tags%20contain%20a,are%20case%2Dinsensitive.)\n`,
			'r/README.md',
		);
		expect(citations[0]?.textDirective).toStrictEqual({ start: 'Tags contain a', end: 'are case-insensitive.' });
	});

	test('[collect-010] ignores fenced code, inline code and unwatched hosts', () => {
		const text = [
			'```html',
			`<a href="${WHATWG}/a.html#x">`,
			'```',
			'',
			`\`${WHATWG}/b.html#y\` and [mdn](https://developer.mozilla.org/en-US/docs/Web/HTML).`,
		].join('\n');
		expect(collectFromMarkdown(text, 'r/README.md').citations).toHaveLength(0);
	});

	test('[collect-011] binds a blockquote to the Cite line that follows it', () => {
		const text = [
			'> Attributes have a name.',
			'',
			`Cite: [HTML Living Standard 13.1.2.3 Attributes](${WHATWG}/syntax.html#attributes-2)`,
		].join('\n');
		const { citations, orphanQuotes } = collectFromMarkdown(text, 'r/README.md');
		expect(orphanQuotes).toHaveLength(0);
		expect(citations[0]?.quotes.map(q => q.text)).toStrictEqual(['Attributes have a name.']);
		expect(citations[0]?.secno).toBe('13.1.2.3');
	});

	test('[collect-012] binds a blockquote to the Japanese 引用 line that follows it', () => {
		const text = [
			'> 属性は名前を持つ。',
			'',
			'[HTML Living Standard 13.1.2.3 属性](https://momdo.github.io/html/syntax.html#attributes-2)より引用',
		].join('\n');
		const { citations } = collectFromMarkdown(text, 'r/README.ja.md');
		expect(citations[0]?.quotes.map(q => q.text)).toStrictEqual(['属性は名前を持つ。']);
	});

	test('[collect-013] binds a blockquote to the link of the paragraph before it when none follows', () => {
		const text = [
			`Per [HTML Living Standard §4.10.5.1.17 (File Upload state)](${WHATWG}/input.html#f), the spec reads:`,
			'',
			'> The element must be omitted.',
			'',
			'❌ Examples',
		].join('\n');
		const { citations } = collectFromMarkdown(text, 'r/README.md');
		expect(citations[0]?.quotes.map(q => q.text)).toStrictEqual(['The element must be omitted.']);
		expect(citations[0]?.secno).toBe('4.10.5.1.17');
	});

	test('[collect-014] joins the lines of a multi-line blockquote', () => {
		const text = ['> first line', '> second line', '', `Cite: [x](${WHATWG}/a.html#x)`].join('\n');
		expect(collectFromMarkdown(text, 'r/README.md').citations[0]?.quotes[0]?.text).toBe('first line second line');
	});

	test('[collect-015] reports a blockquote with no spec link next to it', () => {
		const { orphanQuotes } = collectFromMarkdown('Prose.\n\n> A quote.\n\nMore prose.\n', 'r/README.md');
		expect(orphanQuotes.map(q => [q.text, q.line])).toStrictEqual([['A quote.', 3]]);
	});

	test('[collect-016] does not treat alerts and labelled notes as quotes', () => {
		const text = [
			'> [!WARNING]',
			'> Careful.',
			'',
			'> **Note:** something.',
			'',
			'> **注意:** 何か。',
			'',
			`[x](${WHATWG}/a.html#x)`,
		].join('\n');
		const { citations, orphanQuotes } = collectFromMarkdown(text, 'r/README.md');
		expect(orphanQuotes).toHaveLength(0);
		expect(citations[0]?.quotes).toHaveLength(0);
	});

	test('[collect-017] takes a section number from a W3C link only when it follows §', () => {
		const text = [
			'[ARIA 1.2 role](https://www.w3.org/TR/wai-aria-1.2/#tab)',
			'',
			'[WAI-ARIA §5.3.1 tab](https://www.w3.org/TR/wai-aria-1.2/#tab)',
		].join('\n');
		expect(collectFromMarkdown(text, 'r/README.md').citations.map(c => c.secno)).toStrictEqual([null, '5.3.1']);
	});

	test('[collect-029] counts a link whose visible text is the same URL once', () => {
		const url = `${WHATWG}/syntax.html#attributes-2`;
		const { citations } = collectFromMarkdown(`See [${url}](${url}) and ${url}.\n`, 'r/README.md');
		expect(citations.map(c => c.fragment)).toStrictEqual(['attributes-2', 'attributes-2']);
	});

	test('[collect-018] lenient mode does not report orphan blockquotes', () => {
		const { orphanQuotes } = collectFromMarkdown('> unrelated\n', 'website/docs/a.md', { orphanQuotes: false });
		expect(orphanQuotes).toHaveLength(0);
	});
});

describe('collectFromSource', () => {
	test('[collect-019] collects @see, the > quote and the § beside it from a JSDoc block', () => {
		const text = [
			'/**',
			' * Per HTML LS §4.8.13:',
			' * > If the id attribute is also specified, both attributes must have',
			' * > the same value.',
			' *',
			` * @see ${WHATWG}/image-maps.html#the-map-element`,
			' */',
			'export default {};',
		].join('\n');
		const { citations } = collectFromSource(text, 'r/index.ts');
		expect(citations).toHaveLength(1);
		expect(citations[0]).toMatchObject({ line: 6, fragment: 'the-map-element', secno: '4.8.13' });
		expect(citations[0]?.quotes.map(q => q.text)).toStrictEqual([
			'If the id attribute is also specified, both attributes must have the same value.',
		]);
	});

	test('[collect-020] shares one quote group between the URLs of a block', () => {
		const text = [
			'/**',
			` * @see ${WHATWG}/a.html#one`,
			` * @see ${WHATWG}/a.html#two`,
			' * > a quote',
			' */',
			'x;',
		].join('\n');
		const { citations } = collectFromSource(text, 'r/index.ts');
		expect(citations.map(c => c.quotes[0]?.group)).toStrictEqual([
			citations[0]?.quotes[0]?.group,
			citations[0]?.quotes[0]?.group,
		]);
		expect(citations[0]?.quotes[0]?.group).toBeTruthy();
	});

	test('[collect-021] reads a quote from a run of line comments', () => {
		const text = [`// ${WHATWG}/a.html#x`, '// > quoted text', 'x;'].join('\n');
		expect(collectFromSource(text, 'r/index.ts').citations[0]?.quotes.map(q => q.text)).toStrictEqual([
			'quoted text',
		]);
	});

	test('[collect-022] ignores a comment without a spec URL', () => {
		const { citations, inlineQuotes } = collectFromSource(
			'// > has a required attribute specified\nx;\n',
			'r/index.ts',
		);
		expect(citations).toHaveLength(0);
		expect(inlineQuotes).toHaveLength(0);
	});

	test('[collect-023] collects a URL held in a string literal', () => {
		const text = `export default { specConformance: { cites: ['https://w3c.github.io/html-aria/#att-hidden'] } };\n`;
		expect(collectFromSource(text, 'r/meta.ts').citations.map(c => c.fragment)).toStrictEqual(['att-hidden']);
	});

	test('[collect-024] does not mistake the // of a URL string for a comment', () => {
		const text = `const a = '${WHATWG}/a.html#x'; // trailing > not a quote\n`;
		const { citations } = collectFromSource(text, 'r/index.ts');
		expect(citations).toHaveLength(1);
		expect(citations[0]?.quotes).toHaveLength(0);
	});

	test('[collect-025] reports a double-quoted spec sentence as an inline quote', () => {
		const text = [
			'/**',
			' * Per HTML LS §4.8.13: "If the id attribute is also specified, both',
			' * attributes must have the same value."',
			` * @see ${WHATWG}/image-maps.html#the-map-element`,
			' */',
			'x;',
		].join('\n');
		const { citations, inlineQuotes } = collectFromSource(text, 'r/index.ts');
		expect(citations[0]?.quotes).toHaveLength(0);
		expect(inlineQuotes.map(q => q.text)).toStrictEqual([
			'If the id attribute is also specified, both attributes must have the same value.',
		]);
	});

	test('[collect-026] does not report a short quoted token as an inline quote', () => {
		const text = [
			'/**',
			' * The "value" attribute must be omitted.',
			` * @see ${WHATWG}/a.html#x`,
			' */',
			'x;',
		].join('\n');
		expect(collectFromSource(text, 'r/index.ts').inlineQuotes).toHaveLength(0);
	});
});

describe('list markers in a quote', () => {
	test('[collect-028] drops the Markdown list marker of a quoted list item', () => {
		const md = [
			'> Elements that fire an event, including:',
			'> - Elements that are focused.',
			'> - Elements that are targets.',
			'',
			`Cite: [x](${WHATWG}/a.html#x)`,
		].join('\n');
		expect(collectFromMarkdown(md, 'r/README.md').citations[0]?.quotes[0]?.text).toBe(
			'Elements that fire an event, including: Elements that are focused. Elements that are targets.',
		);
		const ts = [
			'/**',
			` * @see ${WHATWG}/a.html#x`,
			' * > including:',
			' * > - Elements that are focused.',
			' */',
			'x;',
		].join('\n');
		expect(collectFromSource(ts, 'r/index.ts').citations[0]?.quotes[0]?.text).toBe(
			'including: Elements that are focused.',
		);
	});
});

describe('line endings', () => {
	test('[collect-030] reads a file with CRLF line endings as it reads one with LF', () => {
		const markdown = ['> A quote.', '', `Cite: [x](${WHATWG}/a.html#x)`, ''].join('\n');
		expect(collectFromMarkdown(markdown.replaceAll('\n', '\r\n'), 'r/README.md')).toStrictEqual(
			collectFromMarkdown(markdown, 'r/README.md'),
		);
		const source = ['/**', ` * @see ${WHATWG}/a.html#x`, ' * > a quote', ' */', 'x;', ''].join('\n');
		expect(collectFromSource(source.replaceAll('\n', '\r\n'), 'r/index.ts')).toStrictEqual(
			collectFromSource(source, 'r/index.ts'),
		);
	});
});

describe('collectFromText', () => {
	test('[collect-027] collects URLs from a data file and trims sentence punctuation', () => {
		const text = `{\n\t"description": "See ${WHATWG}/input.html#f, and ${WHATWG}/a.html#g."\n}\n`;
		expect(collectFromText(text, 'r/schema.json').citations.map(c => [c.line, c.fragment])).toStrictEqual([
			[2, 'f'],
			[2, 'g'],
		]);
	});
});

describe('the documentation and the sources of the frameworks', () => {
	const ASTRO_UTIL = 'packages/astro/src/runtime/server/render/util.ts';

	test('[collect-031] watches the documentation hosts of the frameworks', () => {
		for (const url of [
			'https://react.dev/reference/react-dom/components/common#common-props',
			'https://svelte.dev/docs/svelte/basic-markup#Attributes-and-props',
			'https://vuejs.org/guide/essentials/template-syntax.html#boolean-attributes',
			'https://docs.astro.build/en/reference/astro-syntax/#dynamic-attributes',
			'https://pugjs.org/language/attributes.html#boolean-attributes',
			'https://alpinejs.dev/directives/bind#bind-class-object',
			'https://htmx.org/attributes/hx-on/#event-names-and-dashes',
		]) {
			expect(parseSpecUrl(url), url).toMatchObject({ url, page: url.slice(0, url.indexOf('#')) });
		}
	});

	test('[collect-032] reads the link to a source file as the raw file, and the fragment as the declaration', () => {
		const url = `https://github.com/withastro/astro/blob/main/${ASTRO_UTIL}#addAttribute`;
		expect(parseSpecUrl(url)).toStrictEqual({
			url,
			page: `https://raw.githubusercontent.com/withastro/astro/main/${ASTRO_UTIL}`,
			fragment: 'addAttribute',
			textDirective: null,
		});
	});

	test('[collect-033] watches only the source files of the listed repositories', () => {
		expect(parseSpecUrl('https://github.com/facebook/react/blob/main/packages/shared/x.js#f')).not.toBeNull();
		expect(parseSpecUrl('https://github.com/vuejs/core/blob/main/packages/shared/src/x.ts#f')).not.toBeNull();
		expect(parseSpecUrl('https://github.com/pugjs/pug/blob/master/packages/pug-runtime/index.js#f')).not.toBeNull();
		expect(parseSpecUrl('https://github.com/rviscomi/capo.js/blob/main/src/x.js#f')).toBeNull();
		expect(parseSpecUrl('https://github.com/markuplint/markuplint/blob/main/packages/x.ts#f')).toBeNull();
		expect(parseSpecUrl('https://github.com/withastro/astro/issues/1')).toBeNull();
		expect(parseSpecUrl('https://github.com/withastro/astro/tree/main/packages')).toBeNull();
		expect(parseSpecUrl('https://github.com/withastro/astro')).toBeNull();
	});

	test('[collect-034] reads a line range of a source file as a link to the whole file', () => {
		const parsed = parseSpecUrl(`https://github.com/withastro/astro/blob/main/${ASTRO_UTIL}#L11-L52`);
		expect(parsed?.fragment).toBeNull();
		expect(parseSpecUrl(`https://github.com/withastro/astro/blob/main/${ASTRO_UTIL}`)?.fragment).toBeNull();
	});

	test('[collect-035] collects the citation of a source file from the comment of a declaration file', () => {
		const source = [
			'/**',
			' * How Astro renders a literal.',
			` * @see https://github.com/withastro/astro/blob/main/${ASTRO_UTIL}#addAttribute`,
			' */',
			'export const TABLE = {};',
			'',
		].join('\n');
		expect(collectFromSource(source, 'p/literal-values.ts').citations).toMatchObject([
			{
				file: 'p/literal-values.ts',
				line: 3,
				page: `https://raw.githubusercontent.com/withastro/astro/main/${ASTRO_UTIL}`,
				fragment: 'addAttribute',
			},
		]);
	});

	test('[collect-036] collects the quote under a link to the documentation of a framework', () => {
		const markdown = [
			'> It will also be included if the value is an empty string.',
			'',
			'Cite: [Vue](https://vuejs.org/guide/essentials/template-syntax.html#boolean-attributes)',
			'',
		].join('\n');
		const { citations } = collectFromMarkdown(markdown, 'r/README.md');
		expect(citations).toHaveLength(1);
		expect(citations[0]).toMatchObject({
			page: 'https://vuejs.org/guide/essentials/template-syntax.html',
			fragment: 'boolean-attributes',
		});
		expect(citations[0]?.quotes.map(q => q.text)).toStrictEqual([
			'It will also be included if the value is an empty string.',
		]);
	});

	test('[collect-037] does not read double quotes inside code spans as a quoted sentence', () => {
		const inCodeSpans = [
			'/**',
			' * It is written as `a"b` in a table that lists six words in between and `c"d` here.',
			' * @see https://pugjs.org/language/attributes.html#boolean-attributes',
			' */',
			'export const TABLE = {};',
			'',
		].join('\n');
		expect(collectFromSource(inCodeSpans, 'p/literal-values.ts').inlineQuotes).toStrictEqual([]);

		const quoted = inCodeSpans.replace(
			'It is',
			'The docs say "Boolean attributes are mirrored by Pug as they are" and it is',
		);
		expect(collectFromSource(quoted, 'p/literal-values.ts').inlineQuotes).toHaveLength(1);
	});

	test('[collect-040] counts the words of a code span inside a quoted sentence', () => {
		const source = [
			'/**',
			' * The docs say "the `foo` attribute is always output" in a table.',
			' * @see https://pugjs.org/language/attributes.html#boolean-attributes',
			' */',
			'export const TABLE = {};',
			'',
		].join('\n');
		expect(collectFromSource(source, 'p/literal-values.ts').inlineQuotes).toHaveLength(1);
	});

	test('[collect-041] reads the repository of a source link regardless of case, and needs a file in it', () => {
		const file = 'packages/shared/src/domAttrConfig.ts';
		const page = `https://raw.githubusercontent.com/vuejs/core/main/${file}`;
		expect(parseSpecUrl(`https://github.com/Vuejs/Core/blob/main/${file}#isBooleanAttr`)?.page).toBe(page);
		expect(parseSpecUrl(`https://github.com/vuejs/core/blob/main/${file}#isBooleanAttr`)?.page).toBe(page);
		expect(parseSpecUrl('https://github.com/vuejs/core/blob/main')).toBeNull();
		expect(parseSpecUrl('https://github.com/vuejs/core/blob/main/')).toBeNull();
	});

	test('[collect-042] does not read a text fragment of a source link, which names no passage of a file', () => {
		const url = `https://github.com/withastro/astro/blob/main/${ASTRO_UTIL}#addAttribute:~:text=anything`;
		expect(parseSpecUrl(url)).toMatchObject({ fragment: 'addAttribute', textDirective: null });
	});

	test('[collect-038] reads only a line anchor of GitHub as a line range, and a name like it as a declaration', () => {
		const base = `https://github.com/withastro/astro/blob/main/${ASTRO_UTIL}`;
		for (const anchor of ['L11', 'L11-L52', 'L11C3-L12C5']) {
			expect(parseSpecUrl(`${base}#${anchor}`)?.fragment, anchor).toBeNull();
		}
		expect(parseSpecUrl(`${base}#L10n`)?.fragment).toBe('L10n');
		expect(parseSpecUrl(`${base}#Lines`)?.fragment).toBe('Lines');
	});

	test('[collect-039] does not let a stray backtick hide a quoted sentence in another paragraph', () => {
		const source = [
			'/**',
			' * A stray backtick opens a code span that is never closed: `value.',
			' *',
			' * The docs say "Boolean attributes are mirrored by Pug as they are" and `checked` is one.',
			' * @see https://pugjs.org/language/attributes.html#boolean-attributes',
			' */',
			'export const TABLE = {};',
			'',
		].join('\n');
		expect(collectFromSource(source, 'p/literal-values.ts').inlineQuotes).toHaveLength(1);
	});
});

describe('the other standards that markuplint cites', () => {
	test('[collect-043] watches every WHATWG standard, whatever its subdomain', () => {
		for (const url of [
			'https://dom.spec.whatwg.org/#concept-tree-order',
			'https://url.spec.whatwg.org/#concept-url-parser',
			'https://infra.spec.whatwg.org/#ascii-whitespace',
			'https://fetch.spec.whatwg.org/#request-destination-script-like',
			'https://mimesniff.spec.whatwg.org/#javascript-mime-type',
			'https://fullscreen.spec.whatwg.org/#fullscreen-element',
		]) {
			expect(parseSpecUrl(url), url).toMatchObject({ url, page: url.slice(0, url.indexOf('#')) });
		}
	});

	test('[collect-044] watches the specification hosts that the packages cite besides WHATWG and W3C', () => {
		for (const url of [
			'https://svgwg.org/svg2-draft/struct.html#SVGElement',
			'https://drafts.csswg.org/css-values-4/#lengths',
			'https://microformats.org/wiki/existing-rel-values#HTML5_link_type_extensions',
			'https://datatracker.ietf.org/doc/html/rfc3986#section-3.1',
			'https://www.rfc-editor.org/rfc/rfc5646#section-2.1',
			'https://tc39.es/ecma262/#sec-regexp-pattern-flags',
			'https://wicg.github.io/webcomponents/spec/imports/#link-type-import',
			'https://www.iana.org/assignments/media-types/media-types.xhtml',
		]) {
			expect(parseSpecUrl(url), url).not.toBeNull();
		}
	});

	test('[collect-045] keeps reading a link to a guide, a wiki or a vendor page as informative', () => {
		for (const url of [
			'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
			'https://developer.mozilla.org/en-US/docs/Web/API/Element',
			'https://en.wikipedia.org/wiki/Uniform_Resource_Identifier',
			'https://markuplint.dev/docs/rules/no-duplicate-id',
		]) {
			expect(parseSpecUrl(url), url).toBeNull();
		}
	});
});

describe('which link a section number belongs to', () => {
	test('[collect-046] a § after a URL on the same line belongs to that URL, and is not carried to the next one', () => {
		const text = [
			'/**',
			' * @see https://w3c.github.io/accname/#computation-steps — AccName 1.2 §4.3.2',
			' * @see https://www.w3.org/TR/html-aam/#el-input-text — HTML-AAM label association',
			' */',
			'export default {};',
		].join('\n');
		const { citations } = collectFromSource(text, 'm/index.ts');
		expect(citations.map(c => [c.fragment, c.secno])).toStrictEqual([
			['computation-steps', '4.3.2'],
			['el-input-text', null],
		]);
	});

	test('[collect-047] a § before the URL still belongs to the next URL, and the first § of a URL is the one that is checked', () => {
		const text = [
			'/**',
			' * Per HTML LS §4.8.13',
			` * @see ${WHATWG}/image-maps.html#the-map-element — see also §4.8.14`,
			' */',
			'export default {};',
		].join('\n');
		const { citations } = collectFromSource(text, 'm/index.ts');
		expect(citations.map(c => [c.fragment, c.secno])).toStrictEqual([['the-map-element', '4.8.13']]);
	});
});
