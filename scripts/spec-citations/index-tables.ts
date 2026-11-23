import type { CheerioAPI } from 'cheerio';

import type { Page } from './extract.ts';

import { unlistedSections } from './indices.ts';

/**
 * The tables of the index of the HTML Standard compared with the data of `@markuplint/html-spec`
 * (`packages/@markuplint/html-spec/index.json`).
 *
 * The weekly monitor reads a passage that something cites and says that it changed. It cannot say that the
 * specification gained an element, an event handler or a category that nothing cites yet, and once a lock
 * pull request is merged it is silent about a passage whether or not the data followed. The index lists every
 * element, attribute and event handler content attribute, so the sets are compared on every run, and a
 * difference is reported until the data (or `INDEX_EXCEPTIONS`) answers it. It is not part of the lock: it
 * describes the data, not a change of the page.
 *
 * What is compared, by name only:
 *
 * - The elements (`#elements-3`) with the elements of the data. `math` and `svg` are `mml:math` and `svg:svg`
 *   there. An element that the data flags `obsolete` is not asked for, and is a finding when the index lists it.
 * - The attributes of each element: the union of the `Attributes` column of the elements, the list of attributes and
 *   the list of event handler content attributes, so that a difference is one finding whichever table shows it.
 *   An attribute listed for "HTML elements" is a global one, compared with the global categories of the data.
 *   An attribute that the data flags `obsolete`, `deprecated` or `nonStandard` is not asked for (the data states it
 *   with the passage that says so), and one that the index lists and the data flags `obsolete` or `nonStandard`
 *   is a finding: it must not hide a feature that the specification has adopted since.
 * - The elements of the categories that the data models (`#contentModels`). The condition of an entry (`a` only with
 *   `href`) is not compared, and a category that the data does not model (form-associated, listed, labelable, …)
 *   is read as text by the monitor and nothing more.
 *
 * A table that cannot be read (it is not on the page, it has no rows, a column is gone, a category the data models
 * has no row) is itself a finding, and nothing is compared then: half of a page compared is noise, and the page's
 * markup drifting must not pass as agreement. The unit tests build their pages by hand, so the run against the live
 * page (the pull request job of the workflow, which runs on a change of this script) is what proves the parser.
 */

export type IndexFinding = {
	readonly kind: 'index-section-unlisted' | 'index-table-unreadable' | 'index-data-mismatch';
	/** The id of the section of the page that the finding is about, without `#`. */
	readonly section: string;
	readonly message: string;
};

/**
 * An attribute that the data has on purpose and the index does not list, with the specification that defines it.
 * `element` is left out for a global attribute. Everything that a flag of the data already explains (`obsolete`,
 * `deprecated`, `nonStandard`, each written with its citation) does not belong here. An entry that explains no
 * difference any more is reported, so that the list cannot outlive what it excuses.
 */
export type IndexException = {
	readonly element?: string;
	readonly attribute: string;
	/**
	 * The section that defines the attribute, as the data cites it: another specification's, or the HTML Standard's
	 * own where the index leaves the attribute out.
	 */
	readonly source: string;
};

const globals = (source: (attribute: string) => string, ...attributes: string[]): IndexException[] =>
	attributes.map(attribute => ({ attribute, source: source(attribute) }));

const WEBAPPAPIS = 'https://html.spec.whatwg.org/multipage/webappapis.html';

/**
 * Each `source` is the citation that the attribute carries in `packages/@markuplint/html-spec/src`, which the monitor
 * checks there and `index-tables.spec.ts` holds the entry to. Two kinds of reason for an attribute to be in the data
 * and not in the index:
 *
 * - Another specification defines it: the W3C and the WICG for media, files and capture, CSS Shadow Parts, Element
 *   Timing, Virtual Keyboard, and, for the event handlers of the global category, UI Events, CSS Animations, CSS
 *   Transitions and Touch Events.
 * - The HTML Standard defines it and the index leaves it out: `xmlns`, `xml:lang` and `xml:space` are in the section
 *   on global attributes, `onabort` and the four `onwebkit*` handlers in the section on event handlers. The list of
 *   event handler content attributes in the index is not every one that the HTML Standard defines.
 *
 * An entry is reported as soon as the index lists the attribute it excuses (the index has caught up, or the data
 * flags it): the finding says to remove the entry, so the list never carries one that nothing needs.
 */
export const INDEX_EXCEPTIONS: readonly IndexException[] = [
	{
		element: 'input',
		attribute: 'capture',
		source: 'https://www.w3.org/TR/html-media-capture/#the-capture-attribute',
	},
	...['audio', 'video'].flatMap(element => [
		{
			element,
			attribute: 'controlslist',
			source: 'https://wicg.github.io/controls-list/html-output/multipage/embedded-content.html#attr-media-controlslist',
		},
		{
			element,
			attribute: 'disableremoteplayback',
			source: 'https://w3c.github.io/remote-playback/#the-disableremoteplayback-attribute',
		},
	]),
	{
		element: 'video',
		attribute: 'disablepictureinpicture',
		source: 'https://w3c.github.io/picture-in-picture/#disable-pip',
	},
	{ element: 'input', attribute: 'webkitdirectory', source: 'https://wicg.github.io/entries-api/#html-forms' },
	{
		element: 'iframe',
		attribute: 'privateToken',
		source: 'https://wicg.github.io/trust-token-api/#iframe-private-token',
	},

	{ attribute: 'elementtiming', source: 'https://w3c.github.io/element-timing/#sec-elements-exposed' },
	{ attribute: 'part', source: 'https://drafts.csswg.org/css-shadow-1/#part-attr' },
	{ attribute: 'exportparts', source: 'https://drafts.csswg.org/css-shadow-1/#exportparts-attr' },
	{
		attribute: 'virtualkeyboardpolicy',
		source: 'https://www.w3.org/TR/virtual-keyboard/#dom-elementcontenteditable-virtualkeyboardpolicy',
	},
	{ attribute: 'xmlns', source: 'https://html.spec.whatwg.org/multipage/dom.html#global-attributes:html-documents' },
	{
		attribute: 'xml:lang',
		source: 'https://html.spec.whatwg.org/multipage/dom.html#the-lang-and-xml:lang-attributes',
	},
	{
		attribute: 'xml:space',
		source: 'https://html.spec.whatwg.org/multipage/dom.html#global-attributes:attr-xml-space',
	},

	...globals(() => `${WEBAPPAPIS}#handler-onabort`, 'onabort'),
	...globals(
		attribute => `${WEBAPPAPIS}#handler-${attribute}`,
		'onwebkitanimationend',
		'onwebkitanimationiteration',
		'onwebkitanimationstart',
		'onwebkittransitionend',
	),
	...globals(
		attribute => `https://w3c.github.io/uievents/#${attribute.slice(2)}`,
		'oncompositionend',
		'oncompositionstart',
		'oncompositionupdate',
		'onfocusin',
		'onfocusout',
		'onunload',
	),
	...globals(
		attribute => `https://drafts.csswg.org/css-animations/#dom-document-${attribute}`,
		'onanimationcancel',
		'onanimationend',
		'onanimationiteration',
		'onanimationstart',
	),
	...globals(
		attribute => `https://drafts.csswg.org/css-transitions/#dom-globaleventhandlers-${attribute}`,
		'ontransitioncancel',
		'ontransitionend',
		'ontransitionrun',
		'ontransitionstart',
	),
	...globals(
		() => 'https://www.w3.org/TR/touch-events/',
		'ontouchcancel',
		'ontouchend',
		'ontouchmove',
		'ontouchstart',
	),
];

/** What the index calls each category that the data models, in the table of element content categories. */
const CATEGORIES: Readonly<Record<string, string>> = {
	'#metadata': 'Metadata content',
	'#flow': 'Flow content',
	'#sectioning': 'Sectioning content',
	'#heading': 'Heading content',
	'#phrasing': 'Phrasing content',
	'#embedded': 'Embedded content',
	'#interactive': 'Interactive content',
	'#palpable': 'Palpable content',
	'#script-supporting': 'Script-supporting elements',
};

const ELEMENTS = { caption: 'List of elements', section: 'elements-3' } as const;
const ATTRIBUTES = { caption: 'List of attributes', section: 'attributes-3' } as const;
const HANDLERS = { caption: 'List of event handler content attributes', section: 'attributes-3' } as const;
const CATEGORY_TABLE = {
	caption: 'List of element content categories',
	section: 'element-content-categories',
} as const;

/** The categories of attributes of the data that every HTML element selects by name, not by the attributes it lists. */
const GLOBAL_CATEGORIES = ['#HTMLGlobalAttrs', '#GlobalEventAttrs'] as const;
/** WAI-ARIA is not the HTML Standard's: its attributes are not in the index. */
const ARIA_CATEGORY = '#ARIAAttrs';

/** The elements of the index that stand for an element of the data in another namespace. */
const NAMESPACED: ReadonlyMap<string, string> = new Map([
	['math', 'mml:math'],
	['svg', 'svg:svg'],
]);

type Flags = { readonly obsolete?: boolean; readonly deprecated?: boolean; readonly nonStandard?: boolean };
type DataSpec = {
	readonly name: string;
	readonly obsolete?: boolean;
	readonly attributes?: Readonly<Record<string, Flags>>;
	readonly globalAttrs?: Readonly<Record<string, boolean | readonly string[]>>;
};
type Data = {
	readonly def?: {
		readonly '#globalAttrs'?: Readonly<Record<string, Readonly<Record<string, Flags>>>>;
		readonly '#contentModels'?: Readonly<Record<string, readonly string[]>>;
	};
	readonly specs?: readonly DataSpec[];
};

type Cell = { readonly text: string; readonly codes: readonly string[] };
type Row = Readonly<Record<string, Cell>>;

const clean = (text: string) => text.replaceAll(/\s+/g, ' ').trim();
const ELEMENT_NAME = /^[a-z][a-z0-9-]*$/;
const ATTRIBUTE_NAME = /^[a-z][\w:-]*$/i;

/**
 * The text of every `code` of a cell that is not inside parentheses, in order. A cell names its elements in `code`,
 * and qualifies some in parentheses that hold `code` of their own: `source (in picture)`, `a (if the href attribute
 * is present)`. What stands in the parentheses is the condition, not a member, so it is left out.
 */
function codesOutsideParentheses($: CheerioAPI, cell: ReturnType<CheerioAPI>): string[] {
	const names: string[] = [];
	let depth = 0;
	const walk = (nodes: ReturnType<CheerioAPI>) => {
		for (const node of nodes.toArray()) {
			// Text only: a comment has `data` too, and a parenthesis in it is not part of what the cell says.
			if ('data' in node && node.nodeType === 3) {
				for (const character of node.data) {
					if (character === '(') {
						depth++;
					} else if (character === ')') {
						depth = Math.max(0, depth - 1);
					}
				}
			} else if ('tagName' in node && node.tagName === 'code') {
				if (depth === 0) {
					names.push(clean($(node).text()));
				}
			} else if ('children' in node) {
				walk($(node).contents());
			}
		}
	};
	walk(cell.contents());
	return names;
}

const mismatch = (section: string, message: string): IndexFinding => ({
	kind: 'index-data-mismatch',
	section,
	message,
});

/** The problem that a flag of the data is for the index to list the feature, or `null`. */
function contradiction(flags: Flags | undefined): 'obsolete' | 'nonStandard' | null {
	if (flags?.obsolete === true) {
		return 'obsolete';
	}
	return flags?.nonStandard === true ? 'nonStandard' : null;
}

/** Whether the data says on its own that the feature is not what the specification defines for the element. */
const isFlagged = (flags: Flags | undefined) =>
	flags?.obsolete === true || flags?.deprecated === true || flags?.nonStandard === true;

/**
 * Reads a table by its caption and the headers of the columns wanted. `null` when it cannot be read, with the finding
 * that says why pushed to `findings`: a header is looked for by its text, so that a column that moves is still found
 * and one that is renamed or dropped is not.
 */
function readTable(
	page: Page,
	table: { readonly caption: string; readonly section: string },
	columns: readonly string[],
	findings: IndexFinding[],
): Row[] | null {
	const { $ } = page;
	const found = $('table').filter((_, el) => clean($(el).find('caption').first().text()).startsWith(table.caption));
	const unreadable = (message: string): null => {
		findings.push({ kind: 'index-table-unreadable', section: table.section, message });
		return null;
	};
	if (found.length === 0) {
		return unreadable(`The table \`${table.caption}\` is not on the page`);
	}
	// A cell that spans rows or columns moves what follows it: a column is looked up by its position in the row.
	if (found.first().find('[rowspan], [colspan]').length > 0) {
		return unreadable(
			`The table \`${table.caption}\` has a cell that spans rows or columns, so its columns cannot be told by position`,
		);
	}
	const headers = found
		.first()
		.find('thead th')
		.map((_, th) => clean($(th).text()))
		.get();
	const positions = new Map<string, number>();
	for (const column of columns) {
		const at = headers.indexOf(column);
		if (at === -1) {
			return unreadable(`The table \`${table.caption}\` has no \`${column}\` column`);
		}
		positions.set(column, at);
	}
	const rows = found.first().find('tbody tr');
	if (rows.length === 0) {
		return unreadable(`The table \`${table.caption}\` has no rows`);
	}
	return rows.toArray().map(tr => {
		const cells = $(tr).children('th, td');
		const row: Record<string, Cell> = {};
		for (const [column, at] of positions) {
			const cell = cells.eq(at);
			row[column] = {
				text: clean(cell.text()),
				codes: codesOutsideParentheses($, cell).flatMap(text => text.split(',').map(clean)),
			};
		}
		return row;
	});
}

const elementNames = (cell: Cell | undefined) => (cell?.codes ?? []).filter(name => ELEMENT_NAME.test(name));

/** What the index gives each element, and every HTML element: where it was first read (the id of its section). */
type Expected = {
	readonly perElement: Map<string, Map<string, string>>;
	readonly globals: Map<string, string>;
};

function addTo(map: Map<string, string>, name: string, section: string) {
	if (!map.has(name)) {
		map.set(name, section);
	}
}

function expectedAttributes(elements: readonly Row[], attributes: readonly Row[], handlers: readonly Row[]): Expected {
	const expected: Expected = { perElement: new Map(), globals: new Map() };
	const forElement = (element: string) => {
		const own = expected.perElement.get(element) ?? new Map<string, string>();
		expected.perElement.set(element, own);
		return own;
	};
	for (const row of elements) {
		const names = elementNames(row['Element']);
		const listed = (row['Attributes']?.text ?? '')
			.split(';')
			.map(token => clean(token).replace(/[*†]+$/, ''))
			// `any*` stands for any attribute that the element's author decides (`embed`), not for one named `any`.
			.filter(token => ATTRIBUTE_NAME.test(token) && token !== 'globals' && token !== 'any');
		for (const name of names) {
			for (const attribute of listed) {
				addTo(forElement(name), attribute, ELEMENTS.section);
			}
		}
	}
	for (const [rows, table] of [
		[attributes, ATTRIBUTES],
		[handlers, HANDLERS],
	] as const) {
		for (const row of rows) {
			const attribute = row['Attribute']?.text ?? '';
			if (!ATTRIBUTE_NAME.test(attribute)) {
				continue;
			}
			const cell = row['Element(s)'];
			if (cell?.text.includes('HTML elements') === true) {
				addTo(expected.globals, attribute, table.section);
			}
			for (const name of elementNames(cell)) {
				addTo(forElement(name), attribute, table.section);
			}
		}
	}
	return expected;
}

/** The attributes that a category of the data names, by what the element selects: `true` is all, a list is a subset. */
function selected(
	categories: Readonly<Record<string, Readonly<Record<string, Flags>>>>,
	category: string,
	selection: boolean | readonly string[] | undefined,
): Map<string, Flags> {
	const all = categories[category] ?? {};
	const names = Array.isArray(selection) ? selection : selection === true ? Object.keys(all) : [];
	return new Map(names.map(name => [name, all[name] ?? {}]));
}

/** The attributes of an element of the data: those it lists or selects of its own, and the global ones it selects. */
function attributesOf(spec: DataSpec, categories: Readonly<Record<string, Readonly<Record<string, Flags>>>>) {
	const own = new Map<string, Flags>();
	const global = new Map<string, Flags>();
	for (const [category, selection] of Object.entries(spec.globalAttrs ?? {})) {
		if (category === ARIA_CATEGORY) {
			continue;
		}
		const target = (GLOBAL_CATEGORIES as readonly string[]).includes(category) ? global : own;
		for (const [name, flags] of selected(categories, category, selection)) {
			target.set(name, flags);
		}
	}
	for (const [name, flags] of Object.entries(spec.attributes ?? {})) {
		own.set(name, flags);
	}
	return { own, global };
}

/** How a selector of a content category of the data begins: an element name, with the namespace of SVG or MathML. */
const SELECTOR_START = /^(?:(svg|mml)\|)?([A-Za-z][\w-]*)/;

/**
 * The element that a selector of a content category stands for, as the index names it, or `null` for one that stands
 * for no element of the index: `#text` and `#custom`, and the elements of SVG and MathML other than their roots. A
 * selector that does not begin with an element name is not read here: `compareCategories` reports it.
 */
function elementOfSelector(selector: string): string | null {
	if (selector.startsWith('#')) {
		return null;
	}
	const [, namespace, name] = SELECTOR_START.exec(selector) ?? [];
	if (name === undefined) {
		return null;
	}
	if (namespace === undefined) {
		return name;
	}
	// The index lists the roots of the two foreign vocabularies and none of their elements.
	return (namespace === 'svg' && name === 'svg') || (namespace === 'mml' && name === 'math') ? name : null;
}

const byMessage = (a: IndexFinding, b: IndexFinding) => a.message.localeCompare(b.message);

function compareElements(rows: readonly Row[], specs: readonly DataSpec[]): IndexFinding[] {
	const findings: IndexFinding[] = [];
	const byName = new Map(specs.map(spec => [spec.name, spec]));
	const listed = new Set(rows.flatMap(row => elementNames(row['Element'])));
	for (const name of listed) {
		const spec = byName.get(NAMESPACED.get(name) ?? name);
		if (spec === undefined) {
			findings.push(
				mismatch(ELEMENTS.section, `The index lists the element \`${name}\`, which the data does not have`),
			);
		} else if (spec.obsolete === true) {
			findings.push(
				mismatch(ELEMENTS.section, `The index lists the element \`${name}\`, which the data flags as obsolete`),
			);
		}
	}
	const namespaced = new Set(NAMESPACED.values());
	for (const spec of specs) {
		if (
			ELEMENT_NAME.test(spec.name) &&
			!namespaced.has(spec.name) &&
			spec.obsolete !== true &&
			!listed.has(spec.name)
		) {
			findings.push(
				mismatch(
					ELEMENTS.section,
					`The data has the HTML element \`${spec.name}\`, which the index does not list`,
				),
			);
		}
	}
	return findings.toSorted(byMessage);
}

function compareAttributes(
	expected: Expected,
	data: Data,
	exceptions: readonly IndexException[],
	used: Set<IndexException>,
): IndexFinding[] {
	const findings: IndexFinding[] = [];
	const categories = data.def?.['#globalAttrs'] ?? {};
	const htmlSpecs = (data.specs ?? []).filter(spec => ELEMENT_NAME.test(spec.name));
	const excepted = (element: string | undefined, attribute: string) => {
		const exception = exceptions.find(e => e.element === element && e.attribute === attribute);
		if (exception !== undefined) {
			used.add(exception);
		}
		return exception !== undefined;
	};

	const globalFlags = new Map<string, Flags>();
	for (const category of GLOBAL_CATEGORIES) {
		for (const [name, flags] of Object.entries(categories[category] ?? {})) {
			globalFlags.set(name, flags);
		}
	}
	for (const [attribute, section] of expected.globals) {
		const flags = globalFlags.get(attribute);
		const flagged = contradiction(flags);
		if (!globalFlags.has(attribute)) {
			findings.push(
				mismatch(
					section,
					`The index lists the attribute \`${attribute}\` for every HTML element, which the data does not have`,
				),
			);
		} else if (flagged !== null) {
			findings.push(
				mismatch(
					section,
					`The index lists the attribute \`${attribute}\` for every HTML element, which the data flags as ${flagged}`,
				),
			);
		}
	}
	for (const [attribute, flags] of globalFlags) {
		if (!expected.globals.has(attribute) && !isFlagged(flags) && !excepted(undefined, attribute)) {
			findings.push(
				mismatch(
					ATTRIBUTES.section,
					`The data has the global attribute \`${attribute}\`, which the index does not list`,
				),
			);
		}
	}

	for (const spec of htmlSpecs) {
		const { own, global } = attributesOf(spec, categories);
		const listed = expected.perElement.get(spec.name) ?? new Map<string, string>();
		for (const [attribute, section] of listed) {
			const flags = own.get(attribute) ?? global.get(attribute);
			const flagged = contradiction(flags);
			if (!own.has(attribute) && !global.has(attribute)) {
				findings.push(
					mismatch(
						section,
						`The index lists the attribute \`${attribute}\` for \`${spec.name}\`, which the data does not have`,
					),
				);
			} else if (flagged !== null) {
				findings.push(
					mismatch(
						section,
						`The index lists the attribute \`${attribute}\` for \`${spec.name}\`, which the data flags as ${flagged}`,
					),
				);
			}
		}
		if (spec.obsolete === true) {
			continue;
		}
		for (const [attribute, flags] of own) {
			if (
				!listed.has(attribute) &&
				!expected.globals.has(attribute) &&
				!isFlagged(flags) &&
				!excepted(spec.name, attribute)
			) {
				findings.push(
					mismatch(
						ATTRIBUTES.section,
						`The data has the attribute \`${attribute}\` for \`${spec.name}\`, which the index does not list`,
					),
				);
			}
		}
	}
	return findings.toSorted(byMessage);
}

function compareCategories(rows: readonly Row[], data: Data): IndexFinding[] {
	const findings: IndexFinding[] = [];
	for (const [key, name] of Object.entries(CATEGORIES)) {
		const row = rows.find(r => r['Category']?.text === name);
		if (row === undefined) {
			continue;
		}
		const listed = new Set([...elementNames(row['Elements']), ...elementNames(row['Elements with exceptions'])]);
		const selectors = data.def?.['#contentModels']?.[key] ?? [];
		for (const selector of selectors) {
			if (!selector.startsWith('#') && !SELECTOR_START.test(selector)) {
				findings.push({
					kind: 'index-table-unreadable',
					section: CATEGORY_TABLE.section,
					message: `The selector \`${selector}\` of \`${key}\` in the data does not start with an element name, so it cannot be compared with the table`,
				});
			}
		}
		const modeled = new Set(selectors.flatMap(selector => elementOfSelector(selector) ?? []));
		for (const element of listed) {
			if (!modeled.has(element)) {
				findings.push(
					mismatch(
						CATEGORY_TABLE.section,
						`The index puts \`${element}\` in ${name}, which the data does not`,
					),
				);
			}
		}
		for (const element of modeled) {
			if (!listed.has(element)) {
				findings.push(
					mismatch(
						CATEGORY_TABLE.section,
						`The data puts \`${element}\` in ${name}, which the index does not`,
					),
				);
			}
		}
	}
	return findings.toSorted(byMessage);
}

function staleExceptions(exceptions: readonly IndexException[], used: ReadonlySet<IndexException>): IndexFinding[] {
	return exceptions
		.filter(exception => !used.has(exception))
		.map(({ element, attribute }) =>
			mismatch(
				ATTRIBUTES.section,
				`The exception for the ${element === undefined ? 'global attribute' : 'attribute'} \`${attribute}\`${element === undefined ? '' : ` of \`${element}\``} explains no difference any more; remove it`,
			),
		);
}

/**
 * Compares the page of the index with the data (`indexJson` is the text of `index.json`). Findings are listed by
 * what is wrong with the reading first: the sections the list lacks, then a page or a table that cannot be read,
 * and then, only when every table could be read, the differences, one table after the other.
 */
export function checkIndex(
	page: Page,
	indexJson: string,
	exceptions: readonly IndexException[] = INDEX_EXCEPTIONS,
): IndexFinding[] {
	const unlisted = unlistedSections(page);
	if (unlisted === null) {
		return [
			{
				kind: 'index-table-unreadable',
				section: 'index',
				message: 'The page has no `#index` heading, so its sections and tables cannot be located',
			},
		];
	}
	// A title and an id are the page's own text, and a message is put in a code span of an Issue: a backtick of theirs
	// would close it and let a mention or a link through, which `report.ts` guards the text of a specification against.
	const inCodeSpan = (text: string) => text.replaceAll('`', "'");
	const findings: IndexFinding[] = unlisted.map(({ id, title }) =>
		id === null
			? {
					kind: 'index-section-unlisted',
					section: 'index',
					message: `The index has a section \`${inCodeSpan(title)}\` with no id, which the monitor cannot cite`,
				}
			: {
					kind: 'index-section-unlisted',
					section: id,
					message: `The index has a section \`#${inCodeSpan(id)}\` that the monitor does not list; add it to \`INDEX_SECTIONS\``,
				},
	);

	const unreadable: IndexFinding[] = [];
	const elements = readTable(page, ELEMENTS, ['Element', 'Attributes'], unreadable);
	const attributes = readTable(page, ATTRIBUTES, ['Attribute', 'Element(s)'], unreadable);
	const handlers = readTable(page, HANDLERS, ['Attribute', 'Element(s)'], unreadable);
	const categories = readTable(
		page,
		CATEGORY_TABLE,
		['Category', 'Elements', 'Elements with exceptions'],
		unreadable,
	);
	if (categories !== null) {
		for (const name of Object.values(CATEGORIES)) {
			if (!categories.some(row => row['Category']?.text === name)) {
				unreadable.push({
					kind: 'index-table-unreadable',
					section: CATEGORY_TABLE.section,
					message: `The table \`${CATEGORY_TABLE.caption}\` has no row for \`${name}\``,
				});
			}
		}
	}
	if (unreadable.length > 0 || elements === null || attributes === null || handlers === null || categories === null) {
		return [...findings, ...unreadable];
	}

	const data = JSON.parse(indexJson) as Data;
	const used = new Set<IndexException>();
	return [
		...findings,
		...compareElements(elements, data.specs ?? []),
		...compareAttributes(expectedAttributes(elements, attributes, handlers), data, exceptions, used),
		...compareCategories(categories, data),
		...staleExceptions(exceptions, used),
	];
}
