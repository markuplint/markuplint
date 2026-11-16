/**
 * @module The status flags that no specification defines: `nonStandard`, `experimental` and the vendor
 * `deprecated`, read from the pinned `@mdn/browser-compat-data` (BCD).
 *
 * Which authority says what:
 *
 * - A flag that a specification defines (`obsolete`; `deprecated` of the HTML Standard's "obsolete but conforming"
 *   features, of SVG 2 and of MathML) is hand-written in `src/spec.*.jsonc` with the citation of the passage. It wins:
 *   an attribute or an element with such a flag takes nothing from BCD, so that `no-obsolete-*` and
 *   `no-deprecated-*` do not report the same thing twice.
 * - What a specification does not define is what browsers implement, which BCD records. `nonStandard` is a feature
 *   that is not on the standards track (`standard_track === false`); `experimental` and `deprecated` are BCD's. This
 *   applies to an attribute that the sources define as well, when it carries no flag of a specification: a
 *   definition in MathML 4, which MathML Core and the browsers leave out, does not turn BCD's `nonStandard` off,
 *   and `nonStandard: true` written in a source stays. A flag written as `false` in a source is the maintainers'
 *   decision against BCD (`experimental: false` of `loading` of `audio`: the HTML Standard defines it).
 * - An obsolete element takes no flag from BCD for itself or its attributes: the specification calls the element
 *   obsolete, and the attributes it defines for it (HTML Standard 16.3) carry no flag of their own.
 * - An attribute that BCD has for an element and the sources lack is added with `nonStandard: true`: the sources
 *   hold what the specifications define, so what only browsers implement is not standard. Before a feature is left
 *   to this rule, it is read against the specifications, and one that a specification defines is written in the
 *   sources instead.
 *
 * BCD is looked up by the direct path only: `<namespace>.elements.<element>.<attribute>`, then
 * `<namespace>.global_attributes.<attribute>`. A fallback to the attribute of another element, or to an event
 * (`api.*_event`), was measured to give wrong matches.
 *
 * The flags are written as `true` or not at all, except where an element takes back a flag that BCD gave a global
 * attribute of its category: `false` is written then, as the maintainers write it to decide against BCD.
 * @see https://github.com/mdn/browser-compat-data/blob/main/schemas/compat-data-schema.md#status-information
 */

/**
 * The `status` block of a BCD feature. BCD has no `obsolete`: a feature removed from browsers is `deprecated`.
 */
export type BCDStatus = {
	readonly deprecated?: boolean;
	readonly experimental?: boolean;
	readonly standard_track?: boolean;
};

/**
 * The `__compat` block of a BCD feature, of which only `status` is read.
 */
export type BCDCompat = { readonly status?: BCDStatus };

/**
 * A node of the BCD tree: a feature has `__compat`, and its children are the features beneath it.
 */
export type BCDNode = {
	readonly __compat?: BCDCompat;
	readonly [key: string]: BCDNode | BCDCompat | undefined;
};

/**
 * The namespace of a BCD tree that an element or a global attribute belongs to.
 */
export type BCDNamespace = 'html' | 'svg' | 'mathml';

/**
 * The flags that BCD gives, each written as `true` or not at all.
 */
export type BCDFlags = {
	nonStandard?: true;
	experimental?: true;
	deprecated?: true;
};

/**
 * The fields of an attribute entry that this module reads and writes.
 */
export type FlagFields = {
	obsolete?: unknown;
	deprecatedWhen?: unknown;
	deprecated?: boolean;
	experimental?: boolean;
	nonStandard?: boolean;
};

/**
 * An attribute of an element or of a global attribute category, as the sources write it.
 */
export type AttributeEntry = FlagFields & { [key: string]: unknown };

/**
 * The global attribute categories (`#HTMLGlobalAttrs`, ...) that elements select from, by category name and attribute
 * name.
 */
export type Categories = Record<string, Record<string, AttributeEntry>>;

/**
 * What this module needs of the spec of an element.
 */
export type ElementLike = FlagFields & {
	readonly name: string;
	globalAttrs?: Record<string, unknown>;
	attributes?: Record<string, AttributeEntry>;
};

const FLAGS = ['nonStandard', 'experimental', 'deprecated'] as const;

/**
 * The category that takes an attribute that BCD has among the global attributes of a namespace and the sources
 * lack.
 */
const ADDED_TO: Readonly<Record<BCDNamespace, string>> = {
	html: '#HTMLGlobalAttrs',
	svg: '#SVGCoreAttrs',
	mathml: '#MathMLGlobalAttrs',
};

let bcdPromise: Promise<BCDNode> | undefined;

/**
 * Reads the installed BCD (`forLegacyNode` reads the JSON with `fs`, which the import attribute of the main entry
 * would need on Node.js 22 and later).
 *
 * @returns The root of the BCD tree
 */
export function loadBCD(): Promise<BCDNode> {
	bcdPromise ??= import('@mdn/browser-compat-data/forLegacyNode').then(
		mod => (mod.default ?? mod) as unknown as BCDNode,
	);
	return bcdPromise;
}

/**
 * @param name - The name of an attribute (`xlink:href`)
 * @returns The key that BCD gives it (`xlink_href`)
 */
export function toBCDKey(name: string) {
	return name.replace(/^(xlink|xml):/, '$1_');
}

/**
 * @param key - A key beneath an element or among the global attributes of BCD
 * @returns The name of the attribute, or `null` when the key is not an attribute: `__compat`, a feature of the
 *   element (`text_fragments`, `data_attributes`, `type_checkbox`) or anything that is not a name
 */
export function fromBCDKey(key: string) {
	if (/^(?:xlink|xml)_[a-z]+$/.test(key)) {
		return key.replace(/^(xlink|xml)_/, '$1:');
	}
	return /^[a-z][a-z0-9-]*$/i.test(key) ? key : null;
}

/**
 * @param node - A feature of BCD
 * @returns The flags it carries, or `undefined` when it has no status (BCD does not have the feature)
 */
export function readStatus(node?: BCDNode): BCDFlags | undefined {
	const status = node?.__compat?.status;
	if (!status) {
		return undefined;
	}
	const flags: BCDFlags = {};
	if (status.standard_track === false) {
		flags.nonStandard = true;
	}
	if (status.experimental) {
		flags.experimental = true;
	}
	if (status.deprecated) {
		flags.deprecated = true;
	}
	return flags;
}

function child(node: BCDNode | undefined, key: string) {
	return node?.[key] as BCDNode | undefined;
}

/**
 * @param bcd - The root of the BCD tree
 * @param ns - The namespace of the element
 * @param element - The local name of the element
 * @param attr - The name of the attribute
 * @returns The flags of the attribute of the element, by the direct path and then among the global attributes of
 *   the namespace; `undefined` when BCD has neither
 */
export function lookupAttributeStatus(bcd: BCDNode, ns: BCDNamespace, element: string, attr: string) {
	const key = toBCDKey(attr);
	return (
		readStatus(child(child(child(bcd, ns), 'elements')?.[element] as BCDNode | undefined, key)) ??
		readStatus(child(child(bcd, ns), 'global_attributes')?.[key] as BCDNode | undefined)
	);
}

/**
 * Decides the flags of one entry.
 *
 * @param manual - The flags written in the sources
 * @param status - What BCD gives; `undefined` when BCD does not have the feature
 * @returns The flags that the entry carries. A flag that a specification defines (`obsolete`, `deprecated`)
 *   closes the entry to BCD. A flag written as `false` is the maintainers' decision against BCD's.
 */
export function resolveFlags(manual: FlagFields, status?: BCDFlags): BCDFlags {
	const specFlag = !!manual.obsolete || manual.deprecated === true || manual.deprecatedWhen !== undefined;
	const flags: BCDFlags = {};
	for (const flag of FLAGS) {
		if (manual[flag] === true || (manual[flag] === undefined && !specFlag && status?.[flag])) {
			flags[flag] = true;
		}
	}
	return flags;
}

/**
 * Replaces the flags of an entry by the resolved ones.
 */
function setFlags<T extends FlagFields>(entry: T, flags: BCDFlags) {
	// `false` is a decision against BCD: it is kept, so that the entry still says it where a category says otherwise
	const decided = FLAGS.filter(flag => entry[flag] === false && flags[flag] === undefined);
	for (const flag of FLAGS) {
		delete entry[flag];
	}
	Object.assign(entry, flags);
	for (const flag of decided) {
		entry[flag] = false;
	}
}

/**
 * The namespace of the BCD global attributes that a category stands for. Only the categories of the attributes that
 * every element of a markup language may have are read (BCD's `global_attributes`): the categories of one group of
 * elements (`#HTMLLinkAndFetchingAttrs`, `#HTMLFormControlElementAttrs`, ...) are flagged per element by the direct
 * path, and `#ARIAAttrs` has no counterpart in BCD.
 */
function categoryNamespace(category: string): BCDNamespace | undefined {
	if (category === '#HTMLGlobalAttrs' || category === '#GlobalEventAttrs') {
		return 'html';
	}
	if (category.startsWith('#SVG') || category === '#XLinkAttrs') {
		return 'svg';
	}
	if (category === '#MathMLGlobalAttrs') {
		return 'mathml';
	}
	return undefined;
}

function getNamespace(name: string): { ns: BCDNamespace; localName: string } {
	if (name.startsWith('svg:')) {
		return { ns: 'svg', localName: name.slice(4) };
	}
	if (name.startsWith('mml:')) {
		return { ns: 'mathml', localName: name.slice(4) };
	}
	return { ns: 'html', localName: name };
}

/**
 * The attributes that the categories an element selects give it.
 */
function selectedAttributes(el: ElementLike, categories: Categories) {
	const selected = new Map<string, { entry: AttributeEntry; category: string }>();
	for (const [category, selection] of Object.entries(el.globalAttrs ?? {})) {
		const attrs = categories[category] ?? {};
		const names = selection === true ? Object.keys(attrs) : Array.isArray(selection) ? (selection as string[]) : [];
		for (const name of names) {
			selected.set(name, { entry: attrs[name] ?? {}, category });
		}
	}
	return selected;
}

/**
 * @returns `given`: the flags that BCD gave to the entries of the categories, as `<category>|<name>|<flag>` (an element
 *   that BCD flags differently has to be able to take them back); `added`: the names that it added to a category, by
 *   category (an element that selects the category by a list of names has to take them).
 */
function applyToCategories(categories: Categories, bcd: BCDNode) {
	const given = new Set<string>();
	const added = new Map<string, string[]>();
	const globals = new Map<BCDNamespace, Map<string, BCDNode>>();
	for (const ns of ['html', 'svg', 'mathml'] as const) {
		const attrs = new Map<string, BCDNode>();
		const node = child(child(bcd, ns), 'global_attributes');
		for (const key of Object.keys(node ?? {})) {
			const name = fromBCDKey(key);
			const attr = child(node, key);
			if (name !== null && attr?.__compat) {
				attrs.set(name, attr);
			}
		}
		globals.set(ns, attrs);
	}

	const known: Record<BCDNamespace, Set<string>> = { html: new Set(), svg: new Set(), mathml: new Set() };
	for (const [category, attrs] of Object.entries(categories)) {
		const ns = categoryNamespace(category);
		if (!ns) {
			continue;
		}
		for (const [name, entry] of Object.entries(attrs)) {
			known[ns].add(name);
			const flags = resolveFlags(entry, readStatus(globals.get(ns)?.get(name)));
			for (const flag of FLAGS) {
				if (flags[flag] && entry[flag] !== true) {
					given.add(`${category}|${name}|${flag}`);
				}
			}
			setFlags(entry, flags);
		}
	}

	for (const ns of ['html', 'svg', 'mathml'] as const) {
		const target = categories[ADDED_TO[ns]];
		if (!target) {
			continue;
		}
		for (const [name, attr] of globals.get(ns) ?? []) {
			if (!known[ns].has(name)) {
				target[name] = { ...readStatus(attr), nonStandard: true };
				added.set(ADDED_TO[ns], [...(added.get(ADDED_TO[ns]) ?? []), name]);
			}
		}
	}
	return { given, added };
}

function applyToElement(
	el: ElementLike,
	categories: Categories,
	given: ReadonlySet<string>,
	added: ReadonlyMap<string, readonly string[]>,
	bcd: BCDNode,
) {
	const { ns, localName } = getNamespace(el.name);
	for (const [category, selection] of Object.entries(el.globalAttrs ?? {})) {
		const names = added.get(category);
		if (names && Array.isArray(selection) && el.globalAttrs) {
			el.globalAttrs[category] = [...selection, ...names.filter(name => !selection.includes(name))];
		}
	}
	const node = child(child(child(bcd, ns), 'elements'), localName);
	const obsolete = !!el.obsolete;

	if (!obsolete) {
		setFlags(el, resolveFlags(el, readStatus(node)));
	}

	const attributes = (el.attributes ??= {});
	const selected = selectedAttributes(el, categories);

	for (const [name, entry] of Object.entries(attributes)) {
		if (!obsolete) {
			setFlags(entry, resolveFlags(entry, lookupAttributeStatus(bcd, ns, localName, name)));
		}
	}

	if (obsolete || !node) {
		return;
	}

	for (const key of Object.keys(node)) {
		const name = fromBCDKey(key);
		const attr = child(node, key);
		if (name === null || !attr?.__compat || name in attributes) {
			continue;
		}
		const status = readStatus(attr);
		const fromCategory = selected.get(name);
		if (fromCategory) {
			// What BCD says of the attribute for this element is more specific than what it says of the global
			// attribute: the flags that BCD gave the category are decided again, the ones of the specification stay.
			const { entry, category } = fromCategory;
			const own: AttributeEntry = { ...entry };
			for (const flag of FLAGS) {
				if (given.has(`${category}|${name}|${flag}`)) {
					delete own[flag];
				}
			}
			const wanted = resolveFlags(own, status);
			const override: Partial<Record<(typeof FLAGS)[number], boolean>> = {};
			for (const flag of FLAGS) {
				if (wanted[flag] && !entry[flag]) {
					override[flag] = true;
				} else if (!wanted[flag] && entry[flag]) {
					override[flag] = false;
				}
			}
			if (Object.keys(override).length > 0) {
				attributes[name] = override;
			}
		} else {
			attributes[name] = { ...status, nonStandard: true };
		}
	}
}

/**
 * Gives the elements and the global attribute categories the status flags that BCD has, by the rules in the
 * module comment.
 *
 * @template T - The element spec
 * @param specs - The element specs, as the generator reads them from the sources
 * @param categories - The global attribute categories (`#globalAttrs`)
 * @param bcd - The root of the BCD tree
 * @returns Copies of both, flagged. What it is given is not changed.
 */
export function applyBCD<T extends ElementLike>(specs: readonly T[], categories: Categories, bcd: BCDNode) {
	const copiedCategories = structuredClone(categories);
	const { given, added } = applyToCategories(copiedCategories, bcd);
	const copiedSpecs = structuredClone(specs) as T[];
	for (const el of copiedSpecs) {
		applyToElement(el, copiedCategories, given, added, bcd);
	}
	return { specs: copiedSpecs, globalAttrs: copiedCategories };
}
