import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { parsePage } from './extract.ts';
import { checkIndex, INDEX_EXCEPTIONS } from './index-tables.ts';
import { INDEX_SECTIONS } from './indices.ts';

/** The categories that the data models, and the name that the index gives each. */
const CATEGORIES = {
	'#metadata': 'Metadata content',
	'#flow': 'Flow content',
	'#sectioning': 'Sectioning content',
	'#heading': 'Heading content',
	'#phrasing': 'Phrasing content',
	'#embedded': 'Embedded content',
	'#interactive': 'Interactive content',
	'#palpable': 'Palpable content',
	'#script-supporting': 'Script-supporting elements',
} as const;

type Row = { names: string[]; attributes?: string };

const codes = (names: readonly string[]) => names.map(name => `<code><a href="#x">${name}</a></code>`).join('; ');

const elementsTable = (rows: readonly Row[]) => `
<h3 id="elements-3">Elements</h3>
<table><caption>List of elements</caption>
<thead><tr><th>Element</th><th>Description</th><th>Categories</th><th>Parents†</th><th>Children</th><th>Attributes</th><th>Interface</th></tr></thead>
<tbody>${rows
	.map(
		r =>
			`<tr><th>${r.names.map(n => `<code>${n}</code>`).join(', ')}</th><td>d</td><td>c</td><td>p</td><td>c</td><td>${r.attributes ?? 'globals'}</td><td>HTMLElement</td></tr>`,
	)
	.join('')}</tbody></table>`;

const attributeRows = (rows: readonly [string, string][]) =>
	rows
		.map(
			([attribute, elements]) =>
				`<tr><th><code>${attribute}</code></th><td>${elements}</td><td>d</td><td>Text</td></tr>`,
		)
		.join('');

const ATTRIBUTE_HEAD =
	'<thead><tr><th>Attribute</th><th>Element(s)</th><th>Description</th><th>Value</th></tr></thead>';

const attributesSection = (attributes: readonly [string, string][], handlers: readonly [string, string][]) => `
<h3 id="attributes-3">Attributes</h3>
<table id="attributes-1"><caption>List of attributes (excluding event handler content attributes)</caption>${ATTRIBUTE_HEAD}<tbody>${attributeRows(attributes)}</tbody></table>
<table id="ix-event-handlers"><caption>List of event handler content attributes</caption>${ATTRIBUTE_HEAD}<tbody>${attributeRows(handlers)}</tbody></table>`;

const categoriesTable = (
	members: Readonly<Record<string, readonly string[]>>,
	exceptions: Readonly<Record<string, readonly string[]>> = {},
) => `
<h3 id="element-content-categories">Element content categories</h3>
<table><caption>List of element content categories</caption>
<thead><tr><th>Category</th><th>Elements</th><th>Elements with exceptions</th></tr></thead>
<tbody>${Object.entries(CATEGORIES)
	.map(
		([key, name]) =>
			`<tr><td><a href="#c">${name}</a></td><td>${codes(members[key] ?? [])}</td><td>${(exceptions[key] ?? []).length === 0 ? '—' : (exceptions[key] ?? []).map(n => `<code>${n}</code> (if present)`).join('; ')}</td></tr>`,
	)
	.join('')}</tbody></table>`;

const ANY = '<a href="#h">HTML elements</a>';
const HTML = '<h2 id="index">Index</h2>';

type Parts = {
	elements?: readonly Row[];
	attributes?: readonly [string, string][];
	handlers?: readonly [string, string][];
	members?: Readonly<Record<string, readonly string[]>>;
	exceptions?: Readonly<Record<string, readonly string[]>>;
	/** Section ids that the page has beyond the four tables'. */
	rest?: readonly string[];
};

/** A consistent page of the index; the part a test passes replaces the consistent one. */
const indexPage = (parts: Parts = {}) =>
	parsePage(
		`<!doctype html><html><body>${HTML}${elementsTable(
			parts.elements ?? [
				{ names: ['a'], attributes: 'globals; href' },
				{ names: ['body'], attributes: 'globals; onafterprint' },
			],
		)}${categoriesTable(parts.members ?? { '#flow': ['a', 'body'] }, parts.exceptions)}${attributesSection(
			parts.attributes ?? [
				['href', codes(['a'])],
				['id', ANY],
			],
			parts.handlers ?? [
				['onafterprint', codes(['body'])],
				['onclick', ANY],
			],
		)}${(
			parts.rest ??
			INDEX_SECTIONS.filter(id => !['elements-3', 'element-content-categories', 'attributes-3'].includes(id))
		)
			.map(id => (id.startsWith('<') ? id : `<h3 id="${id}">Section</h3>`))
			.join('')}</body></html>`,
	);

type Spec = {
	name: string;
	obsolete?: boolean;
	attributes?: Record<string, Record<string, unknown>>;
	globalAttrs?: Record<string, true | string[]>;
};

const GLOBAL = { '#HTMLGlobalAttrs': true, '#GlobalEventAttrs': true } as const;

const data = (
	specs: readonly Spec[] = [
		{ name: 'a', attributes: { href: {} }, globalAttrs: GLOBAL },
		{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
	],
	options: {
		globals?: Record<string, Record<string, unknown>>;
		events?: Record<string, Record<string, unknown>>;
		/** Categories of attributes beyond the global ones: what an element selects by name. */
		categories?: Record<string, Record<string, unknown>>;
		models?: Record<string, readonly string[]>;
	} = {},
) =>
	JSON.stringify({
		def: {
			'#globalAttrs': {
				'#HTMLGlobalAttrs': options.globals ?? { id: {} },
				'#GlobalEventAttrs': options.events ?? { onclick: {} },
				'#ARIAAttrs': { 'aria-label': {} },
				...options.categories,
			},
			'#contentModels': {
				...Object.fromEntries(Object.keys(CATEGORIES).map(key => [key, [] as string[]])),
				'#flow': ['a', 'body'],
				...options.models,
			},
		},
		specs,
	});

const messages = (findings: readonly { message: string }[]) => findings.map(f => f.message);

describe('the tables of the index compared with the data of html-spec', () => {
	test('[index-tables-001] reports nothing when the index and the data agree', () => {
		expect(checkIndex(indexPage(), data(), [])).toStrictEqual([]);
	});

	describe('elements', () => {
		test('[index-tables-002] reports an element that the index lists and the data lacks', () => {
			const findings = checkIndex(
				indexPage({ elements: [{ names: ['a'] }, { names: ['body'] }, { names: ['search'] }] }),
				data(),
				[],
			);
			expect(findings).toStrictEqual([
				{
					kind: 'index-data-mismatch',
					section: 'elements-3',
					message: 'The index lists the element `search`, which the data does not have',
				},
			]);
		});

		test('[index-tables-003] reports an element of the data that the index does not list', () => {
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: {} }, globalAttrs: GLOBAL },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
				{ name: 'extra' },
			];
			expect(messages(checkIndex(indexPage(), data(specs), []))).toStrictEqual([
				'The data has the HTML element `extra`, which the index does not list',
			]);
		});

		test('[index-tables-004] does not ask for an obsolete element of the data to be in the index', () => {
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: {} }, globalAttrs: GLOBAL },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
				{ name: 'marquee', obsolete: true },
			];
			expect(checkIndex(indexPage(), data(specs), [])).toStrictEqual([]);
		});

		test('[index-tables-005] reports an element that the index lists and the data flags obsolete', () => {
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: {} }, globalAttrs: GLOBAL },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL, obsolete: true },
			];
			expect(messages(checkIndex(indexPage(), data(specs), []))).toStrictEqual([
				'The index lists the element `body`, which the data flags as obsolete',
			]);
		});

		test('[index-tables-006] matches `math` and `svg` with the namespaced elements of the data', () => {
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: {} }, globalAttrs: GLOBAL },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
				{ name: 'mml:math' },
				{ name: 'svg:svg' },
			];
			const elements = [
				{ names: ['a'], attributes: 'globals; href' },
				{ names: ['body'], attributes: 'globals; onafterprint' },
				{ names: ['math'] },
				{ names: ['svg'] },
			];
			expect(checkIndex(indexPage({ elements }), data(specs), [])).toStrictEqual([]);
		});

		test('[index-tables-007] reads every element that one row names', () => {
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: {} }, globalAttrs: GLOBAL },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
				{ name: 'h1' },
			];
			const elements = [
				{ names: ['a'], attributes: 'globals; href' },
				{ names: ['body'], attributes: 'globals; onafterprint' },
				{ names: ['h1', 'h2'] },
			];
			expect(messages(checkIndex(indexPage({ elements }), data(specs), []))).toStrictEqual([
				'The index lists the element `h2`, which the data does not have',
			]);
		});

		test('[index-tables-008] does not take a row that is not an element for one', () => {
			const elements = [
				{ names: ['a'], attributes: 'globals; href' },
				{ names: ['body'], attributes: 'globals; onafterprint' },
			];
			const html = indexPage({ elements });
			html.$('table')
				.first()
				.find('tbody')
				.append(
					'<tr><th>autonomous custom elements</th><td>d</td><td>c</td><td>p</td><td>c</td><td>globals</td><td>I</td></tr><tr><th>MathML</th><td>d</td><td>c</td><td>p</td><td>c</td><td>globals</td><td>I</td></tr>',
				);
			expect(checkIndex(html, data(), [])).toStrictEqual([]);
		});
	});

	describe('attributes', () => {
		test('[index-tables-009] reports an attribute that the attribute list gives an element and the data lacks', () => {
			const attributes: [string, string][] = [
				['href', codes(['a'])],
				['download', codes(['a'])],
				['id', ANY],
			];
			expect(checkIndex(indexPage({ attributes }), data(), [])).toStrictEqual([
				{
					kind: 'index-data-mismatch',
					section: 'attributes-3',
					message: 'The index lists the attribute `download` for `a`, which the data does not have',
				},
			]);
		});

		test('[index-tables-010] reports an attribute that only the Attributes column of the elements gives', () => {
			const elements = [
				{ names: ['a'], attributes: 'globals; href; ping' },
				{ names: ['body'], attributes: 'globals; onafterprint' },
			];
			expect(checkIndex(indexPage({ elements }), data(), [])).toStrictEqual([
				{
					kind: 'index-data-mismatch',
					section: 'elements-3',
					message: 'The index lists the attribute `ping` for `a`, which the data does not have',
				},
			]);
		});

		test('[index-tables-011] reports a gap once, however many tables show it', () => {
			const elements = [
				{ names: ['a'], attributes: 'globals; href; ping' },
				{ names: ['body'], attributes: 'globals; onafterprint' },
			];
			const attributes: [string, string][] = [
				['href', codes(['a'])],
				['id', ANY],
				['ping', codes(['a'])],
			];
			expect(messages(checkIndex(indexPage({ elements, attributes }), data(), []))).toStrictEqual([
				'The index lists the attribute `ping` for `a`, which the data does not have',
			]);
		});

		test('[index-tables-012] reports an attribute of the data that the index does not give the element', () => {
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: {}, extra: {} }, globalAttrs: GLOBAL },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
			];
			expect(checkIndex(indexPage(), data(specs), [])).toStrictEqual([
				{
					kind: 'index-data-mismatch',
					section: 'attributes-3',
					message: 'The data has the attribute `extra` for `a`, which the index does not list',
				},
			]);
		});

		test('[index-tables-013] does not ask for an attribute that the data flags nonStandard or obsolete', () => {
			const specs: Spec[] = [
				{
					name: 'a',
					attributes: { href: {}, vendor: { nonStandard: true }, old: { obsolete: true } },
					globalAttrs: GLOBAL,
				},
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
			];
			expect(checkIndex(indexPage(), data(specs), [])).toStrictEqual([]);
		});

		test('[index-tables-014] reports an attribute that the index lists and the data flags nonStandard', () => {
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: { nonStandard: true } }, globalAttrs: GLOBAL },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
			];
			expect(messages(checkIndex(indexPage(), data(specs), []))).toStrictEqual([
				'The index lists the attribute `href` for `a`, which the data flags as nonStandard',
			]);
		});

		test('[index-tables-015] finds an attribute that the element takes from a category of the data', () => {
			const specs: Spec[] = [
				{ name: 'a', globalAttrs: { ...GLOBAL, '#Link': ['href'] } },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
			];
			const categories = { '#Link': { href: {}, target: {} } };
			expect(checkIndex(indexPage(), data(specs, { categories }), [])).toStrictEqual([]);
		});

		test('[index-tables-016] reports a global attribute that the index lists and the data lacks', () => {
			const attributes: [string, string][] = [
				['href', codes(['a'])],
				['id', ANY],
				['popover', ANY],
			];
			expect(checkIndex(indexPage({ attributes }), data(), [])).toStrictEqual([
				{
					kind: 'index-data-mismatch',
					section: 'attributes-3',
					message:
						'The index lists the attribute `popover` for every HTML element, which the data does not have',
				},
			]);
		});

		test('[index-tables-017] reports a global attribute of the data that the index does not list', () => {
			expect(
				messages(checkIndex(indexPage(), data(undefined, { globals: { id: {}, extra: {} } }), [])),
			).toStrictEqual(['The data has the global attribute `extra`, which the index does not list']);
		});

		test('[index-tables-018] reads an element before a qualifier and ignores the rest of the cell', () => {
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: {} }, globalAttrs: GLOBAL },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
				{ name: 'source', attributes: { width: {} }, globalAttrs: GLOBAL },
			];
			const elements = [
				{ names: ['a'], attributes: 'globals; href' },
				{ names: ['body'], attributes: 'globals; onafterprint' },
				{ names: ['source'], attributes: 'globals; width' },
			];
			const attributes: [string, string][] = [
				['href', codes(['a'])],
				['id', ANY],
				['width', `${codes(['source'])} (in picture); form-associated custom elements`],
			];
			expect(checkIndex(indexPage({ elements, attributes }), data(specs), [])).toStrictEqual([]);
		});
	});

	describe('what the live page has in a cell besides the names', () => {
		test('[index-tables-019] does not read an element that a qualifier in parentheses names', () => {
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: {} }, globalAttrs: GLOBAL },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
				{ name: 'source', attributes: { width: {} }, globalAttrs: GLOBAL },
				{ name: 'picture' },
			];
			const elements = [
				{ names: ['a'], attributes: 'globals; href' },
				{ names: ['body'], attributes: 'globals; onafterprint' },
				{ names: ['source'], attributes: 'globals; width' },
				{ names: ['picture'] },
			];
			const attributes: [string, string][] = [
				['href', codes(['a'])],
				['id', ANY],
				['width', `${codes(['source'])} (in <code><a href="#p">picture</a></code>)`],
			];
			expect(checkIndex(indexPage({ elements, attributes }), data(specs), [])).toStrictEqual([]);
		});

		test('[index-tables-020] does not read an attribute that the condition of a category entry names', () => {
			const exceptions = { '#flow': ['body'] };
			const html = indexPage({ members: { '#flow': ['a'] }, exceptions });
			html.$('table')
				.filter((_, el) => html.$(el).find('caption').text().includes('categories'))
				.find('tbody tr')
				.eq(1)
				.children()
				.eq(2)
				.html(
					'<code>body</code> (if the <code>href</code> attribute is present); <code>a</code> (if it has <code>li</code> children)',
				);
			expect(checkIndex(html, data(), [])).toStrictEqual([]);
		});

		test('[index-tables-021] does not count a parenthesis in a comment as the start of a condition', () => {
			const html = indexPage({ members: { '#flow': ['a', 'body'] } });
			html.$('table')
				.filter((_, el) => html.$(el).find('caption').text().includes('categories'))
				.find('tbody tr')
				.eq(1)
				.children()
				.eq(1)
				.html('<!-- ( --><code>a</code>; <code>body</code>');
			expect(checkIndex(html, data(), [])).toStrictEqual([]);
		});

		test('[index-tables-022] does not take `any*` of an element for an attribute', () => {
			const elements = [
				{ names: ['a'], attributes: 'globals; href' },
				{ names: ['body'], attributes: 'globals; onafterprint; any*' },
			];
			expect(checkIndex(indexPage({ elements }), data(), [])).toStrictEqual([]);
		});
	});

	describe('event handler content attributes', () => {
		test('[index-tables-023] reports a handler of every element that the data lacks', () => {
			const handlers: [string, string][] = [
				['onafterprint', codes(['body'])],
				['onclick', ANY],
				['onauxclick', ANY],
			];
			expect(checkIndex(indexPage({ handlers }), data(), [])).toStrictEqual([
				{
					kind: 'index-data-mismatch',
					section: 'attributes-3',
					message:
						'The index lists the attribute `onauxclick` for every HTML element, which the data does not have',
				},
			]);
		});

		test('[index-tables-024] reports a handler of one element that the data lacks', () => {
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: {} }, globalAttrs: GLOBAL },
				{ name: 'body', globalAttrs: GLOBAL },
			];
			expect(messages(checkIndex(indexPage(), data(specs), []))).toStrictEqual([
				'The index lists the attribute `onafterprint` for `body`, which the data does not have',
			]);
		});

		test('[index-tables-025] reports a global handler of the data that the index does not list', () => {
			expect(
				messages(checkIndex(indexPage(), data(undefined, { events: { onclick: {}, onextra: {} } }), [])),
			).toStrictEqual(['The data has the global attribute `onextra`, which the index does not list']);
		});
	});

	describe('element content categories', () => {
		test('[index-tables-026] reports an element that a category of the index has and the data lacks', () => {
			expect(
				checkIndex(indexPage({ members: { '#flow': ['a', 'body'], '#phrasing': ['a'] } }), data(), []),
			).toStrictEqual([
				{
					kind: 'index-data-mismatch',
					section: 'element-content-categories',
					message: 'The index puts `a` in Phrasing content, which the data does not',
				},
			]);
		});

		test('[index-tables-027] reports an element that a category of the data has and the index lacks', () => {
			const result = checkIndex(
				indexPage(),
				data(undefined, { models: { '#flow': ['a', 'body'], '#palpable': ['body'] } }),
				[],
			);
			expect(result).toStrictEqual([
				{
					kind: 'index-data-mismatch',
					section: 'element-content-categories',
					message: 'The data puts `body` in Palpable content, which the index does not',
				},
			]);
		});

		test('[index-tables-028] counts an element of the column of exceptions as a member', () => {
			const members = { '#flow': ['a'] };
			const exceptions = { '#flow': ['body'] };
			expect(checkIndex(indexPage({ members, exceptions }), data(), [])).toStrictEqual([]);
		});

		test('[index-tables-029] reads the element out of a selector of the data', () => {
			const models = { '#flow': ['a[href]', 'body:not([hidden])', 'svg|svg', 'mml|math', 'svg|rect', '#text'] };
			const members = { '#flow': ['a', 'body', 'svg', 'math'] };
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: {} }, globalAttrs: GLOBAL },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
				{ name: 'mml:math' },
				{ name: 'svg:svg' },
			];
			const elements = [
				{ names: ['a'], attributes: 'globals; href' },
				{ names: ['body'], attributes: 'globals; onafterprint' },
				{ names: ['math'] },
				{ names: ['svg'] },
			];
			expect(checkIndex(indexPage({ members, elements }), data(specs, { models }), [])).toStrictEqual([]);
		});

		test('[index-tables-030] reports a selector of the data that does not start with an element name', () => {
			const models = { '#flow': ['a', 'body', ':is(a, b)'] };
			expect(checkIndex(indexPage(), data(undefined, { models }), [])).toStrictEqual([
				{
					kind: 'index-table-unreadable',
					section: 'element-content-categories',
					message:
						'The selector `:is(a, b)` of `#flow` in the data does not start with an element name, so it cannot be compared with the table',
				},
			]);
		});

		test('[index-tables-031] does not compare a category that the data does not model', () => {
			const html = indexPage();
			html.$('table')
				.filter((_, el) => html.$(el).find('caption').text().includes('categories'))
				.find('tbody')
				.append('<tr><td>Labelable elements</td><td><code>a</code></td><td>—</td></tr>');
			expect(checkIndex(html, data(), [])).toStrictEqual([]);
		});
	});

	describe('exceptions', () => {
		const specs: Spec[] = [
			{ name: 'a', attributes: { href: {}, extra: {} }, globalAttrs: GLOBAL },
			{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
		];

		test('[index-tables-032] leaves out a difference that an exception explains', () => {
			const exceptions = [{ element: 'a', attribute: 'extra', source: 'https://example.com/spec#extra' }];
			expect(checkIndex(indexPage(), data(specs), exceptions)).toStrictEqual([]);
		});

		test('[index-tables-033] reports an exception that no difference needs any more', () => {
			const exceptions = [{ element: 'a', attribute: 'gone', source: 'https://example.com/spec#gone' }];
			expect(messages(checkIndex(indexPage(), data(), exceptions))).toStrictEqual([
				'The exception for the attribute `gone` of `a` explains no difference any more; remove it',
			]);
		});

		test('[index-tables-034] reads a global attribute for an exception without an element', () => {
			const exceptions = [{ attribute: 'extra', source: 'https://example.com/spec#extra' }];
			expect(
				checkIndex(indexPage(), data(undefined, { globals: { id: {}, extra: {} } }), exceptions),
			).toStrictEqual([]);
		});

		test('[index-tables-035] gives every exception of the module the specification that defines it', () => {
			for (const exception of INDEX_EXCEPTIONS) {
				expect(exception.source).toMatch(/^https:\/\//);
			}
		});

		test('[index-tables-036] gives every exception the citation that the data carries for the attribute', () => {
			const src = new URL('../../packages/@markuplint/html-spec/src/', import.meta.url);
			for (const { element, attribute, source } of INDEX_EXCEPTIONS) {
				const lines = readFileSync(
					new URL(element === undefined ? 'spec-common.attributes.jsonc' : `spec.${element}.jsonc`, src),
					'utf8',
				).split(/\r?\n/);
				// The comment lines right above each entry of the attribute in the file.
				const cited = lines.flatMap((line, at) => {
					if (!line.trim().startsWith(`"${attribute}": {`)) {
						return [];
					}
					const above: string[] = [];
					for (let i = at - 1; i >= 0 && (lines[i] ?? '').trim().startsWith('//'); i--) {
						above.push(lines[i] ?? '');
					}
					return above;
				});
				expect(
					cited.some(line => line.includes(source)),
					`${element ?? '*'}[${attribute}] cites ${source}`,
				).toBe(true);
			}
		});

		test('[index-tables-037] reports an exception for an attribute that the data now flags, which needs none', () => {
			const specs: Spec[] = [
				{ name: 'a', attributes: { href: {}, extra: { nonStandard: true } }, globalAttrs: GLOBAL },
				{ name: 'body', attributes: { onafterprint: {} }, globalAttrs: GLOBAL },
			];
			const exceptions = [{ element: 'a', attribute: 'extra', source: 'https://example.com/spec#extra' }];
			expect(messages(checkIndex(indexPage(), data(specs), exceptions))).toStrictEqual([
				'The exception for the attribute `extra` of `a` explains no difference any more; remove it',
			]);
		});
	});

	describe('a page that cannot be read', () => {
		test('[index-tables-038] reports a page without the index heading', () => {
			const html = parsePage('<!doctype html><html><body><h3 id="elements-3">Elements</h3></body></html>');
			expect(checkIndex(html, data(), []).map(f => f.kind)).toStrictEqual(['index-table-unreadable']);
		});

		test('[index-tables-039] reports a table that the page lacks', () => {
			const html = indexPage();
			html.$('table')
				.filter((_, el) => html.$(el).find('caption').text().startsWith('List of elements'))
				.remove();
			const findings = checkIndex(html, data(), []);
			expect(findings.map(f => f.kind)).toContain('index-table-unreadable');
			expect(messages(findings).join('\n')).toContain('List of elements');
		});

		test('[index-tables-040] reports a table without rows, and compares nothing else', () => {
			const html = indexPage();
			html.$('table')
				.filter((_, el) => html.$(el).find('caption').text().startsWith('List of attributes'))
				.find('tbody')
				.empty();
			expect(checkIndex(html, data(), [])).toStrictEqual([
				{
					kind: 'index-table-unreadable',
					section: 'attributes-3',
					message: 'The table `List of attributes` has no rows',
				},
			]);
		});

		test('[index-tables-041] reports a table that has lost a column', () => {
			const html = indexPage();
			html.$('table')
				.filter((_, el) => html.$(el).find('caption').text().startsWith('List of elements'))
				.find('thead th')
				.filter((_, th) => html.$(th).text() === 'Attributes')
				.text('Properties');
			expect(messages(checkIndex(html, data(), [])).join('\n')).toContain(
				'The table `List of elements` has no `Attributes` column',
			);
		});

		test('[index-tables-042] reports a modeled category that the table lacks', () => {
			const html = indexPage();
			html.$('table')
				.filter((_, el) => html.$(el).find('caption').text().includes('categories'))
				.find('tbody tr')
				.first()
				.remove();
			expect(messages(checkIndex(html, data(), [])).join('\n')).toContain(
				'The table `List of element content categories` has no row for `Metadata content`',
			);
		});

		test('[index-tables-043] reports a table with a cell that spans rows or columns, which would shift the columns', () => {
			const html = indexPage();
			html.$('table')
				.filter((_, el) => html.$(el).find('caption').text().startsWith('List of elements'))
				.find('tbody tr')
				.first()
				.children()
				.first()
				.attr('rowspan', '2');
			expect(checkIndex(html, data(), [])).toStrictEqual([
				{
					kind: 'index-table-unreadable',
					section: 'elements-3',
					message:
						'The table `List of elements` has a cell that spans rows or columns, so its columns cannot be told by position',
				},
			]);
		});

		test('[index-tables-044] compares no table while another cannot be read, so the page is not half compared', () => {
			const html = indexPage({ members: { '#flow': ['a', 'body', 'extra'] } });
			html.$('table')
				.filter((_, el) => html.$(el).find('caption').text().startsWith('List of elements'))
				.find('tbody')
				.empty();
			const kinds = checkIndex(html, data(), []).map(f => f.kind);
			expect(kinds).toStrictEqual(['index-table-unreadable']);
		});

		test('[index-tables-045] still reports a section that the list does not name', () => {
			const html = indexPage({ rest: [...INDEX_SECTIONS.slice(3), 'new-table'] });
			html.$('table')
				.filter((_, el) => html.$(el).find('caption').text().startsWith('List of elements'))
				.find('tbody')
				.empty();
			expect(checkIndex(html, data(), []).map(f => f.kind)).toStrictEqual([
				'index-section-unlisted',
				'index-table-unreadable',
			]);
		});
	});

	describe('sections', () => {
		test('[index-tables-046] reports a section of the index that has no id, by its title', () => {
			const rest = [...INDEX_SECTIONS.slice(3), '<h3>New   table</h3>'];
			expect(checkIndex(indexPage({ rest }), data(), [])).toStrictEqual([
				{
					kind: 'index-section-unlisted',
					section: 'index',
					message: 'The index has a section `New table` with no id, which the monitor cannot cite',
				},
			]);
		});

		test('[index-tables-047] keeps the title and the id of a section from closing the code span that holds them', () => {
			const rest = [...INDEX_SECTIONS.slice(3), '<h3>New `x` @user</h3>', '<h3 id="a`b">Titled</h3>'];
			expect(messages(checkIndex(indexPage({ rest }), data(), []))).toStrictEqual([
				"The index has a section `New 'x' @user` with no id, which the monitor cannot cite",
				"The index has a section `#a'b` that the monitor does not list; add it to `INDEX_SECTIONS`",
			]);
		});

		test('[index-tables-048] reports a section of the index that the list does not name', () => {
			expect(
				checkIndex(indexPage({ rest: [...INDEX_SECTIONS.slice(3), 'new-table'] }), data(), []),
			).toStrictEqual([
				{
					kind: 'index-section-unlisted',
					section: 'new-table',
					message:
						'The index has a section `#new-table` that the monitor does not list; add it to `INDEX_SECTIONS`',
				},
			]);
		});
	});
});
