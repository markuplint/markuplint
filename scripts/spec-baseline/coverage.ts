/**
 * Inputs that reach the parts of the data that hand-written documents do not (`yarn spec-baseline coverage`).
 *
 * A mutation analysis (`mutation.ts`) says which changes of the data no record would notice. Most of them are
 * in the places that a handful of documents cannot use: the attributes of the less common elements, the flags
 * of the elements that a page rarely has, the roles that an element permits. A document that has each
 * element once with each of its attributes, and each element once with each role that it permits, is
 * what puts a rule in front of those places.
 *
 * The documents are written from the data as it is, **once**, and committed: a change of the data does not
 * change them, so a change of how the data is read stays visible as a change of what the rules say about
 * the same documents. Writing them again is a decision to widen what is reached (for an element that the
 * data has since got), and the records are written again with them.
 *
 * Where an element goes is found from the data: a flow element goes in the body, and any other
 * in the nearest element whose content model names it, up to one that goes in the body (a table cell in a row in a
 * table) or in the head. Attributes get the empty value, which no rule needs to be valid.
 *
 * @module
 */

import { roleName } from './layout.ts';

/** What the generator reads of the data. */
export interface CoverageSpec {
	readonly def: { readonly '#contentModels': Readonly<Record<string, readonly string[]>> };
	readonly specs: readonly {
		readonly name: string;
		readonly contentModel?: {
			readonly contents: unknown;
			readonly conditional?: readonly { readonly contents: unknown }[];
		};
		readonly attributes?: Readonly<Record<string, unknown>>;
		readonly aria?: { readonly implicitRole?: unknown; readonly permittedRoles?: unknown };
	}[];
}

/** Where an element goes. */
export interface Placement {
	/** The part of the document that the outermost ancestor goes in, or the element itself when it has none. */
	readonly root: 'body' | 'head';
	/** The elements that it is inside of, from the outermost. */
	readonly ancestors: readonly string[];
}

/** Elements that cannot be an element of the body of a document of its own and have a document of their own. */
const FRAMESET_ELEMENTS = new Set(['frameset', 'frame', 'noframes']);

/**
 * The elements that have no end tag: the void elements of the HTML Standard and the obsolete ones that it still
 * parses as void. This is the parser's list and not the data's (`iframe` has no content in the data and an end tag).
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#void-elements
 */
const VOID_ELEMENTS = new Set([
	'area',
	'base',
	'basefont',
	'bgsound',
	'br',
	'col',
	'embed',
	'frame',
	'hr',
	'img',
	'input',
	'keygen',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);

/** An element that takes the rest of the document, so it is the last in a document of its own. */
const PLAINTEXT = 'plaintext';

/** The elements that the skeleton of every document is made of: they have a document in which their attributes are written. */
const ROOT_ELEMENTS = new Set(['html', 'head', 'body']);

/** Elements that are not a place for another element, whatever their content model says. */
const NOT_A_PARENT = new Set([
	'template',
	'noscript',
	'script',
	'style',
	'slot',
	'object',
	'iframe',
	'textarea',
	'title',
]);

/** How far up from an element to look for a place for it. */
const MAX_DEPTH = 6;

const normalize = (name: string) => name.replace('|', ':');

/** The plain names that a content model permits, directly or by a category. */
function permittedNames(
	contents: unknown,
	categories: ReadonlyMap<string, readonly string[]>,
	found = new Set<string>(),
): Set<string> {
	if (typeof contents === 'string') {
		const named = /^:model\(([^)]+)\)$/.exec(contents);
		const category = named ? `#${named[1]}` : contents.startsWith('#') ? contents : null;
		if (category) {
			for (const member of categories.get(category.toLowerCase()) ?? []) {
				found.add(normalize(member));
			}
		} else if (!/[\s#:[(]/.test(contents)) {
			found.add(normalize(contents));
		} else if (/^[\w-]+:[\w-]+$/.test(contents)) {
			found.add(contents);
		}
	} else if (Array.isArray(contents)) {
		for (const item of contents) {
			permittedNames(item, categories, found);
		}
	} else if (typeof contents === 'object' && contents !== null) {
		for (const value of Object.values(contents)) {
			permittedNames(value, categories, found);
		}
	}
	return found;
}

function categoryMap(spec: CoverageSpec): Map<string, readonly string[]> {
	return new Map(Object.entries(spec.def['#contentModels']).map(([name, members]) => [name.toLowerCase(), members]));
}

/**
 * Finds where an element goes.
 *
 * @param spec - The data
 * @param name - The name of an element of the data, with its namespace prefix where it has one
 * @returns Where it goes, or `null` when no element of the data has it in its content model
 */
export function placementOf(spec: CoverageSpec, name: string): Placement | null {
	const categories = categoryMap(spec);
	const flow = new Set((categories.get('#flow') ?? []).map(member => normalize(member)));
	const parentsOf = new Map<string, string[]>();
	for (const element of spec.specs) {
		if (NOT_A_PARENT.has(element.name)) {
			continue;
		}
		const contents = [
			element.contentModel?.contents,
			...(element.contentModel?.conditional ?? []).map(item => item.contents),
		];
		for (const child of permittedNames(contents, categories)) {
			parentsOf.set(child, [...(parentsOf.get(child) ?? []), element.name]);
		}
	}

	const isRoot = (candidate: string): 'body' | 'head' | null =>
		candidate === 'head' ? 'head' : flow.has(candidate) ? 'body' : null;

	// An element of the body goes in the body, the first place it has, however deep the chain would be otherwise
	const own = isRoot(name);
	if (own) {
		return { root: own, ancestors: [] };
	}
	// The chains are searched from the shortest: each is the elements from the one farthest up to the element itself.
	let frontier: string[][] = [[name]];
	for (let depth = 0; depth < MAX_DEPTH; depth++) {
		const next: string[][] = [];
		for (const chain of frontier) {
			for (const parent of parentsOf.get(chain[0] ?? '') ?? []) {
				if (chain.includes(parent)) {
					continue;
				}
				const root = isRoot(parent);
				if (root === 'head') {
					// the head is in every document already, so it is not one of the elements to write
					return { root, ancestors: chain.slice(0, -1) };
				}
				if (root === 'body') {
					return { root, ancestors: [parent, ...chain.slice(0, -1)] };
				}
				next.push([parent, ...chain]);
			}
		}
		frontier = next;
	}
	return null;
}

const localName = (name: string) => name.slice(name.indexOf(':') + 1);

const SKELETON = (head: string, body: string) =>
	`<!doctype html>\n<html lang="en">\n<head>\n${head}</head>\n<body>\n${body}</body>\n</html>\n`;

/**
 * Writes the documents.
 *
 * @param spec - The data
 * @returns The documents by file name: every element of the data with every attribute that the data lists for it, every
 * element with each role that it permits and its implicit role, and the elements that need a document of their own
 */
export function generateCoverageInputs(spec: CoverageSpec): Record<string, string> {
	const tag = (name: string, attributes: readonly string[]) =>
		`<${localName(name)}${attributes.map(attribute => ` ${attribute}=""`).join('')}>`;
	const end = (name: string) => (VOID_ELEMENTS.has(name) ? '' : `</${localName(name)}>`);

	/** One element, in the elements that it needs. */
	const instance = (
		name: string,
		attributes: readonly string[],
		role?: string,
	): { root: 'body' | 'head'; text: string } => {
		const place = placementOf(spec, name) ?? { root: 'body' as const, ancestors: [] };
		const open = place.ancestors.map(ancestor => tag(ancestor, [])).join('');
		const close = place.ancestors
			.toReversed()
			.map(ancestor => end(ancestor))
			.join('');
		const own = tag(name, attributes);
		const withRole = role === undefined ? own : own.replace(/>$/, ` role="${role}">`);
		return { root: place.root, text: `${open}${withRole}${end(name)}${close}\n` };
	};

	const parts = {
		html: { head: '', body: '' },
		svg: { head: '', body: '' },
		mml: { head: '', body: '' },
		roles: { head: '', body: '' },
	};
	const rootAttributes: Record<string, readonly string[]> = {};
	const framesetAttributes: Record<string, readonly string[]> = {};
	let plaintext = '';

	for (const element of spec.specs) {
		const { name } = element;
		const attributes = Object.keys(element.attributes ?? {});
		if (ROOT_ELEMENTS.has(name)) {
			rootAttributes[name] = attributes;
			continue;
		}
		if (FRAMESET_ELEMENTS.has(name)) {
			framesetAttributes[name] = attributes;
			continue;
		}
		if (name === PLAINTEXT) {
			plaintext = tag(name, attributes);
			continue;
		}

		const namespace = name.startsWith('svg:') ? 'svg' : name.startsWith('mml:') ? 'mml' : 'html';
		const written = instance(name, attributes);
		parts[namespace][written.root] += written.text;

		const aria = element.aria;
		const wanted = [
			...(typeof aria?.implicitRole === 'string' ? [aria.implicitRole] : []),
			...(Array.isArray(aria?.permittedRoles)
				? aria.permittedRoles.map(role => roleName(role)).filter(role => role !== null)
				: []),
		];
		for (const role of new Set(wanted)) {
			const withRole = instance(name, [], role);
			parts.roles[withRole.root] += withRole.text;
		}
	}

	const onRoot = (name: string) => tag(name, rootAttributes[name] ?? []);
	const inFrameset = (name: string) => tag(name, framesetAttributes[name] ?? []);

	return {
		'generated-html.html': SKELETON(parts.html.head, parts.html.body),
		'generated-svg.html': SKELETON(parts.svg.head, parts.svg.body),
		'generated-mathml.html': SKELETON(parts.mml.head, parts.mml.body),
		'generated-roles.html': SKELETON(parts.roles.head, parts.roles.body),
		'generated-root.html': `<!doctype html>\n${onRoot('html')}\n${onRoot('head')}\n<meta charset="utf-8">\n<title>t</title>\n</head>\n${onRoot('body')}\n</body>\n</html>\n`,
		'generated-frameset.html': `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>t</title>\n${inFrameset('noframes')}</noframes>\n</head>\n${inFrameset('frameset')}\n${inFrameset('frame')}\n</frameset>\n`,
		// everything after `<plaintext>` is its text, so the document ends with it
		'generated-plaintext.html': `<!doctype html>\n<html lang="en">\n<head>\n</head>\n<body>\n${plaintext}\n`,
	};
}
