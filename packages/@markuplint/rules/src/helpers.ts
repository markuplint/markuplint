import type { FixToken, IRuleFixer, PlainData, TextEdit } from '@markuplint/ml-config';
import type { Attr, ChildNode, Element, RuleConfigValue } from '@markuplint/ml-core';
import type { ARIAVersion, Attribute, MLMLSpec } from '@markuplint/ml-spec';
import type { WritableDeep } from 'type-fest';

import { expandConditionalBlocks, getDOMValue, getRenderedChildNodes } from '@markuplint/ml-core';
import {
	getComputedRole,
	getOwningParentElement,
	hasElementOfUnknownId,
	isTransparentForOwnership,
} from '@markuplint/ml-spec';
import { asciiLowerCase, decodeEntities } from '@markuplint/shared';

export { getDOMValue };

/**
 * The element that an id reference written in an attribute of `el` resolves to: the first element
 * of the tree `el` is in whose id is the reference. The content of a `template` element and a
 * declarative shadow root are trees of their own, so a reference there does not reach an id of the
 * document, nor the other way around.
 *
 * The reference is compared with the character references in the markup resolved, as the id is.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param el - The element that has the attribute
 * @param reference - The value of the attribute, or one token of it, as written in the markup
 * @param isExpression - Whether the value is written as code, which has no character reference in it
 * @returns The element, or `null` when the tree has none, or `el` is in no tree
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */
export function getElementByIdInTree<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
	reference: string,
	isExpression = false,
): Element<T, O> | null {
	const root = el.getRootNode();
	if (root.is(root.DOCUMENT_NODE) || root.is(root.DOCUMENT_FRAGMENT_NODE)) {
		return root.getElementById(isExpression ? reference : decodeEntities(reference));
	}
	return null;
}

/**
 * Whether the element is a component whose output is not known, so that it may render an element that
 * a rule looks for among the ancestors (`MLElement#isUnresolvedComponent`). What the parser sees as a
 * component but renders its children in place is not one: what `MLElement#isRenderedAway` says (a
 * fragment such as `React.Fragment` or Astro's `Fragment`, a `template` that Vue renders away).
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param el - An ancestor of the element
 * @returns `true` if the element may render what is not known
 */
export function isUnknownOutput<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
): boolean {
	return !el.isRenderedAway && el.isUnresolvedComponent();
}

/**
 * The elements that match the selector in the tree `el` is in (see {@link getElementByIdInTree}).
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param el - An element of the tree
 * @param selectors - A selector
 * @returns The elements in the order of the markup, none when `el` is in no tree
 */
export function querySelectorAllInTree<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
	selectors: string,
): readonly Element<T, O>[] {
	const root = el.getRootNode();
	if (root.is(root.DOCUMENT_NODE) || root.is(root.DOCUMENT_FRAGMENT_NODE)) {
		return [...root.querySelectorAll(selectors)] as Element<T, O>[];
	}
	return [];
}

/** A `null`/`undefined` condition means the attribute applies unconditionally. */
export function attrMatches<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Element<T, O>,
	condition: Attribute['condition'],
) {
	if (condition == null) {
		return true;
	}

	// Multiple condition selectors are OR-ed: joined with ',' as a selector list, any match enables the attribute.
	const condSelector = typeof condition === 'string' ? condition : condition.join(',');

	return node.matches(condSelector);
}

/**
 * Conditions are evaluated against literal attribute values, so when a referenced
 * attribute's value is dynamic (template-interpolated) the condition result is
 * indeterminate and must not be used to report a violation.
 */
export function conditionDependsOnDynamicAttr<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Element<T, O>,
	condition: NonNullable<Attribute['condition']>,
) {
	const selectors = typeof condition === 'string' ? [condition] : condition;
	const referencedNames = new Set<string>();
	for (const selector of selectors) {
		// Collect attribute names from attribute selectors (e.g. `[type='module' i]` -> `type`)
		for (const matched of selector.matchAll(/\[\s*([^\s\]=~|^$*]+)/g)) {
			const name = matched[1];
			if (name) {
				referencedNames.add(name);
			}
		}
	}
	// Whether the attribute is the one that the selector names is up to the attribute (`isNamedBy`).
	// An attribute that the framework does not output (`type={null}`) is known not to be there, so the
	// condition is decided: it is not met.
	const names = [...referencedNames];
	return node.attributes.some(
		attr => attr.isDynamicValue && !attr.isAbsent && names.some(name => attr.isNamedBy(name)),
	);
}

/**
 * Memoizes `fn` by the identity of its argument. Use it for an object that is one object for every
 * caller, such as the array `getAttrSpecs` hands out for an element name. The options of the
 * elements a `nodeRule` selects are not: each element gets a copy, so use {@link memoizeByContent} for them.
 *
 * @param fn - The function to memoize
 * @returns The function that computes `fn` once per object
 */
export function memoizeByObject<K extends object, V>(fn: (key: K) => V): (key: K) => V {
	const cache = new WeakMap<K, V>();
	return key => {
		if (cache.has(key)) {
			return cache.get(key) as V;
		}
		const value = fn(key);
		cache.set(key, value);
		return value;
	};
}

/**
 * Memoizes `fn` by the content of its argument, which must be JSON data (a rule option is). The
 * options of the elements a `nodeRule` selects arrive as a copy for each element, so keying by
 * identity alone would rebuild the table for every element; identity stays as the first, cheap
 * lookup, and the content is serialised only for an object not seen before. The cache lives as long
 * as the memoized function, which a rule creates once per `verify` call, so it is bounded by the
 * options of one document. Two contents that differ only in key order are two entries, which is
 * harmless for a table read by name. JSON keeps `['a', 'b']` and `['a\0b']` apart, which a joined
 * string would not.
 *
 * @param fn - The function to memoize
 * @returns The function that computes `fn` once per content
 */
export function memoizeByContent<K extends object, V>(fn: (key: K) => V): (key: K) => V {
	const byContent = new Map<string, V>();
	return memoizeByObject((key: K) => {
		const content = JSON.stringify(key);
		if (byContent.has(content)) {
			return byContent.get(content) as V;
		}
		const value = fn(key);
		byContent.set(content, value);
		return value;
	});
}

const exactSpecsOf = memoizeByObject((attrSpecs: readonly Attribute[]) => {
	const exact = new Map<string, Attribute>();
	for (const spec of attrSpecs) {
		if (!exact.has(spec.name)) {
			exact.set(spec.name, spec);
		}
	}
	return exact;
});

/**
 * Finds the spec of an attribute: the spec named as the attribute is written, and otherwise the
 * first one that the attribute says it is (`MLAttr#isNamedBy`). The case of a name is decided by
 * the attribute, so the rules that look an attribute up share one answer.
 *
 * `getAttrSpecs` hands out the same array for every element of a name, so the exact names are
 * indexed once per array and the scan runs only for a name that is not written as the spec spells it.
 *
 * @param attrSpecs - The specs of the attributes of the element
 * @param attr - The attribute
 * @returns The spec, or `undefined` if the attribute has none
 */
export function findAttrSpec<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attrSpecs: readonly Attribute[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: Attr<T, O>,
): Attribute | undefined {
	return exactSpecsOf(attrSpecs).get(attr.name) ?? attrSpecs.find(spec => attr.isNamedBy(spec.name));
}

/**
 * The name that a namespace of names (`data-*`, `aria-*`, the predefined groups of `attr-order`)
 * is told by: the name that the DOM gives the attribute (`nameKey`). For the prop of a component it
 * is the name as written in ASCII lower case instead, because
 * `nameKey` camelizes it in Vue (`data-x` is `dataX`) and a prefix cannot be told then.
 *
 * @param attr - The attribute, with the element type of its owner
 * @returns The name to test against a namespace
 */
export function namespaceKeyOf(
	attr: Pick<Attr<RuleConfigValue, PlainData>, 'name' | 'nameKey'> & {
		readonly ownerElement: { readonly elementType: string };
	},
): string {
	return attr.ownerElement.elementType === 'authored' ? asciiLowerCase(attr.name) : attr.nameKey;
}

/**
 * The `aria-*` attributes that the element has. An attribute that the framework does not output
 * (`aria-label={null}`, `MLAttr#isAbsent`) is not one of them: the DOM does not have it, so what a rule
 * says of an attribute of the element (it is unsupported, deprecated, redundant, or its value is
 * invalid) is not said of it.
 *
 * @param el - The element
 * @returns The `aria-*` attributes that are output
 */
export function getAriaAttrs<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
): Attr<T, O>[] {
	return el.attributes.filter(attr => !attr.isAbsent && isAriaAttr(attr));
}

/**
 * Whether the attribute is an `aria-*` one, told by {@link namespaceKeyOf}.
 *
 * @param attr - The attribute
 * @returns `true` if the attribute is an `aria-*` one
 */
export function isAriaAttr<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: Attr<T, O>,
): boolean {
	return namespaceKeyOf(attr).startsWith('aria-');
}

/**
 * Whether the role of the element is not known until it is rendered: its `role` attribute has a value
 * that code gives (`role={props.role}`), a spread attribute (`{...props}`) comes after its `role`
 * attribute, or it has no `role` attribute but a spread attribute: the spread may carry or override one.
 *
 * `getComputedRole` takes the code of such a value for a role that does not exist and falls back to
 * the implicit role, so a rule that judges what the role supports, deprecates or allows would judge
 * the element by a role that it may not have. That the role is not known is a decision of markuplint,
 * as it does not decide what it cannot know, and not text of a specification: the specification's
 * "Handling Author Errors" is about the tokens that the attribute has when it is rendered. The same
 * premise is at `hasElementOfUnknownId` of `@markuplint/ml-spec`, which lists the code that follows it:
 * a change to the criterion belongs to all of them.
 *
 * An element that has a `role` attribute written in the markup is judged by it when no spread attribute
 * comes after it: an attribute that a spread brings overrides the one written before it, as the later
 * one wins for every language that has a spread attribute (`MLAttr#isSpread`: the order is assumed, and is
 * not checked for each language), so `<div role="button" {...props}>` may have another role, while in
 * `<div {...props} role="button">` the written role is what the element has. The exception is a spread that
 * declares `MLAttr#spreadOverridesWritten` (`x-bind="obj"` of Alpine.js): it overrides the attributes
 * before it and after it, so it makes the role unknown wherever it is. A `role` that the framework
 * does not output (`role={undefined}`, `MLAttr#isAbsent`) is not returned by `getAttributeNode`, so the
 * element has no role attribute and is judged by its implicit role. `getAttributeNode` returns the
 * first `role` attribute, so a second one is not looked at.
 *
 * The spread is read from `el.attributes`, as the role is by `getAttributeNode`, so that both follow a
 * pretender: `MLElement#hasSpreadAttr` reads the attributes that are written on the element itself and
 * does not, which is why it is not used here.
 *
 * @param el - The element
 * @returns `true` if the role of the element is not known
 */
export function isRoleUnknown<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
): boolean {
	const roleAttr = el.getAttributeNode('role');
	if (roleAttr?.isDynamicValue === true) {
		return true;
	}
	const attrs = el.attributes;
	const roleIndex = roleAttr ? attrs.indexOf(roleAttr) : -1;
	return attrs.some(
		(attr, index) => attr.isSpread === true && (index > roleIndex || attr.spreadOverridesWritten === true),
	);
}

/**
 * Whether the ancestors of the element may satisfy a "Required Accessibility Parent Role" when the
 * role of an ancestor is not known ({@link isRoleUnknown}): that ancestor may be an element that
 * only passes the context through (`presentation`, `none`, and `generic` in ARIA 1.3), or the role
 * that the condition asks for next, and both are tried. An ancestor whose role the markup tells is
 * compared as `matchesContextRole` of `@markuplint/ml-spec` compares it, and a condition is a chain
 * (`"menu > group"`), so an unknown ancestor above a `group` may still be the `menu`.
 *
 * It mirrors `matchesContextRole` (the chain and the owner that `aria-owns` resolves, else the parent
 * of the accessibility tree), which cannot take an element that is not known: a change to one belongs
 * to the other. With no ancestor of an unknown role it returns what `matchesContextRole` returns.
 *
 * @param el - The element that has a role that requires a parent
 * @param conditions - The required parent roles, each a chain separated by ` > ` (`requiredContextRole`)
 * @param specs - The full markup language specification
 * @param version - The ARIA specification version
 * @returns `true` if the ancestors may satisfy any of the conditions
 */
export function mayMatchContextRole<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
	conditions: readonly string[],
	specs: MLMLSpec,
	version: ARIAVersion,
): boolean {
	const parent = getOwningParentElement(el, specs, version) as Element<T, O> | null;
	return conditions.some(condition => mayMatchChain(condition.split(/\s+>\s+/).toReversed(), parent, specs, version));
}

function mayMatchChain<T extends RuleConfigValue, O extends PlainData>(
	chain: readonly string[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parent: Element<T, O> | null,
	specs: MLMLSpec,
	version: ARIAVersion,
): boolean {
	// An unknown ancestor branches in two (it passes the context through, or it is the next role of the
	// chain), and branches that meet at the same element with the same entries left give the same answer:
	// each pair is answered once, so a run of unknown ancestors costs the length of the run times the chain.
	const branched = new Map<Element<T, O>, Map<number, boolean>>();
	const walk = (next: number, from: Element<T, O> | null): boolean => {
		let index = next;
		let current = from;
		while (index < chain.length) {
			if (!current) {
				return false;
			}
			const above = getOwningParentElement(current, specs, version) as Element<T, O> | null;
			if (isRoleUnknown(current)) {
				const answers = branched.get(current) ?? new Map<number, boolean>();
				branched.set(current, answers);
				const known = answers.get(index);
				if (known !== undefined) {
					return known;
				}
				const answer = walk(index, above) || walk(index + 1, above);
				answers.set(index, answer);
				return answer;
			}
			// `matchesContextRole` computes the role of an ancestor as a single node, in every version
			const role = getComputedRole(specs, current, version, true).role;
			if (!isTransparentForOwnership(role?.name, version)) {
				if (chain[index] !== role?.name) {
					return false;
				}
				index++;
			}
			current = above;
		}
		return true;
	};
	return walk(0, parent);
}

/**
 * The shape of an option that lists attributes (`allowAttrs`, `disallowAttrs`): bare names, which
 * carry no value of their own, `{ name, value }` pairs, or a record of name to value.
 */
type NameValueOption<V> = (string | { readonly name: string; readonly value: V })[] | Record<string, V>;

/**
 * Creates a lookup of an attribute in a `NameValueOption`.
 *
 * A name of an option is compared as the DOM compares attribute names (`MLAttr#isNamedBy`): ASCII
 * case-insensitive in the HTML syntax and for an HTML element that code sets through the DOM API
 * (JSX, MDX, Vue), exact for an SVG or MathML element there, and the props of a component are not
 * folded. The README of `no-unknown-attr` states it for users.
 *
 * Among the entries, one spelled as the attribute is written wins over any other, and the last of
 * the same spelling wins. With no such entry, the last entry that the attribute accepts wins.
 * The table of an option is built once per content (`memoizeByContent`).
 *
 * @param stringValue - The value of a bare name
 * @returns The lookup, which gives the value for the attribute, or `undefined` if no entry names it
 */
export function createNameOptionLookup<V>(stringValue: V): <T extends RuleConfigValue, O extends PlainData>(
	option: NameValueOption<V> | undefined,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: Attr<T, O>,
) => V | undefined {
	const tableOf = memoizeByContent((option: NameValueOption<V>) => {
		const entries: [string, V][] = Array.isArray(option)
			? option.map(entry => (typeof entry === 'string' ? [entry, stringValue] : [entry.name, entry.value]))
			: Object.entries(option);
		// `new Map` keeps the later of two entries of one spelling. Across spellings, the exact
		// spelling is looked up first and the scan below keeps the last that the attribute accepts.
		return { entries, exact: new Map(entries) };
	});
	return (option, attr) => {
		if (!option) {
			return;
		}
		const { entries, exact } = tableOf(option);
		if (exact.has(attr.name)) {
			return exact.get(attr.name);
		}
		let found: V | undefined;
		for (const [name, value] of entries) {
			if (attr.isNamedBy(name)) {
				found = value;
			}
		}
		return found;
	};
}

/**
 * Creates a test of whether an attribute has one of the prefixes of an option
 * (`ignoreAttrNamePrefix`), which `MLAttr#isPrefixedBy` decides.
 *
 * @returns The test, which takes the prefixes of the option and the attribute
 */
export function createPrefixMatcher(): <T extends RuleConfigValue, O extends PlainData>(
	prefixes: string | readonly string[] | undefined,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: Attr<T, O>,
) => boolean {
	return (prefixes, attr) => {
		if (prefixes == null) {
			return false;
		}
		return (typeof prefixes === 'string' ? [prefixes] : prefixes).some(prefix => attr.isPrefixedBy(prefix));
	};
}

/** `pattern` is a regex literal of the form `/pattern/flags` if it matches that shape, otherwise an exact string. */
export function match(needle: string, pattern: string) {
	const matches = pattern.match(/^\/(.*)\/([gim])*$/);
	if (matches && matches[1]) {
		const re = matches[1];
		const flag = matches[2];
		return new RegExp(re, flag).test(needle);
	}
	return needle === pattern;
}

/**
 * PotentialCustomElementName
 *
 * @see https://spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname
 *
 * > PotentialCustomElementName ::=
 * >   [a-z] (PCENChar)* '-' (PCENChar)*
 * > PCENChar ::=
 * >   "-" | "." | [0-9] | "_" | [a-z] | #xB7 | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x37D] |
 * >   [#x37F-#x1FFF] | [#x200C-#x200D] | [#x203F-#x2040] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
 * > This uses the EBNF notation from the XML specification. [XML]
 *
 * ASCII-case-insensitively.
 * Originally, it is not possible to define a name including ASCII upper alphas in the custom element, but it is not treated as illegal by the HTML parser.
 */
export const rePCENChar = [
	'\\-',
	'\\.',
	'[0-9]',
	'_',
	'[a-z]',
	'\u00B7',
	'[\u00C0-\u00D6]',
	'[\u00D8-\u00F6]',
	'[\u00F8-\u037D]',
	'[\u037F-\u1FFF]',
	'[\u200C-\u200D]',
	'[\u203F-\u2040]',
	'[\u2070-\u218F]',
	'[\u2C00-\u2FEF]',
	'[\u3001-\uD7FF]',
	'[\uF900-\uFDCF]',
	'[\uFDF0-\uFFFD]',
	'[\uD800-\uDBFF][\uDC00-\uDFFF]',
].join('|');

export function toNormalizedValue(value: string, spec: Attribute) {
	let normalized = value;

	if (!spec.caseSensitive) {
		normalized = normalized.toLowerCase();
	}

	// When spec.type is an array (AttributeType[] or ConditionalAttributeType[]),
	// type-specific normalization is skipped — only caseSensitive applies above.
	if (typeof spec.type === 'string') {
		if (spec.type[0] === '<') {
			normalized = normalized.toLowerCase().trim().replaceAll(/\s+/g, ' ');
		}
	} else {
		if ('separator' in spec.type) {
			if (spec.type.caseInsensitive) {
				normalized = normalized.toLowerCase();
			}
			if (!spec.type.disallowToSurroundBySpaces) {
				normalized = normalized.trim();
			}
			if (spec.type.separator === 'space') {
				normalized = normalized.replaceAll(/\s+/g, ' ');
			}
			if (spec.type.separator === 'comma') {
				normalized = normalized.replaceAll(/\s*,\s*/g, ',');
			}
		}
	}

	return normalized;
}

/**
 * Whether a child of an element may stand for children that are not known: a block of a preprocessor
 * that has no `blockBehavior` (an output such as `{value}` or an `include`), a `slot`, a `<template v-slot>`
 * for a slot other than the default one, or a component whose output is not known
 * (`MLElement#isUnresolvedComponent`).
 *
 * It is for a rule that asks which children an element has (the required children, the elements that
 * satisfy a query). It looks at the child alone: a descendant of the child is not a child of the
 * element, so what it renders cannot become the child that the rule asks for, and the attributes of
 * a child do not decide whether the child exists. `MLElement#hasMutableChildren` looks at every
 * descendant, which is the question for a rule that asks what the descendants are or have.
 * `require-datetime` asks about the text, which any descendant may change, and looks at every
 * descendant for an unresolved component itself.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param node - A child node of the element
 * @param components - Whether a component whose output is not known counts. It does not when the
 * rule evaluates the components by the name that they are written with
 * @returns True if the node may stand for children that are not known
 */
export function mayRenderUnknownChildren<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ChildNode<T, O>,
	components = true,
): boolean {
	if (node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK)) {
		return !node.blockBehavior;
	}
	return (
		node.is(node.ELEMENT_NODE) &&
		(node.localName === 'slot' || isSlotTemplateOfOtherSlot(node) || (components && node.isUnresolvedComponent()))
	);
}

/**
 * Whether the element is a `<template v-slot>` for a slot other than the default one, or for one whose name is
 * written as code. The component renders it where it places that slot, which is not known from the markup.
 *
 * @param el - An element
 * @returns True for such a `template`
 */
function isSlotTemplateOfOtherSlot<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
): boolean {
	return el.isRenderedAway && el.slotTarget !== undefined && el.slotTarget !== 'default';
}

export function accnameMayBeMutable(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<any, any>,
) {
	if (el.hasMutableAttributes() || el.hasMutableChildren(true, isSlotOfUnknownAssignment)) {
		return true;
	}

	const ownedLabel = getOwnedLabel(el);
	if (
		ownedLabel &&
		(ownedLabel.hasMutableAttributes() || ownedLabel.hasMutableChildren(true, isSlotOfUnknownAssignment))
	) {
		return true;
	}

	return false;
}

/**
 * Whether a `slot` renders what the markup does not tell: the nodes assigned to it, or its children, are
 * not known (`MLElement#getAssignedNodes` is `null`). A slot whose assignment is known renders them, which
 * the rule reads itself.
 *
 * @param slot - A `slot` element
 * @returns `true` if what the slot renders is not known
 */
function isSlotOfUnknownAssignment(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	slot: Element<any, any>,
): boolean {
	return slot.getAssignedNodes() === null;
}

/**
 * Whether the accessible name of `el` may be rendered by content the pretender
 * does not know: an unknown entry (`{ dynamic: true }`) in the `contents` of
 * `el`, of a pretended descendant among the children the name computation
 * traverses, of an element `aria-labelledby` refers to, or of the owned label.
 *
 * A token of `aria-labelledby` that refers to no element may refer to one whose `id`
 * the markup does not tell (`hasElementOfUnknownId` of `@markuplint/ml-spec` says which: `<h2 id={x}>`,
 * `<h2 {...props}>`, a component that no pretender resolved, content that is not known): such an
 * element is not found by an id, and what it renders is not known either.
 * `no-refer-to-non-existent-id` reports no reference in such a tree for the same reason. An
 * element whose attribute the framework does not output (`id={undefined}`, `isAbsent`) has no id
 * to be referred to.
 *
 * Not folded into {@link accnameMayBeMutable}: a component with an unknown
 * entry and a static name (`aria-label`, static text) is still decidable and
 * must stay checked (and reported as redundant by `no-redundant-accessible-name`).
 * Call it only once the static name has been computed and found empty.
 */
export function accnameMayComeFromUnknownContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<any, any>,
) {
	if (hasUnknownContent(el)) {
		return true;
	}

	const labelledbyAttr = el.getAttributeNode('aria-labelledby');
	const labelledby = labelledbyAttr?.value;
	if (labelledby) {
		const referenced = labelledby
			.trim()
			.split(/\s+/)
			.map(id => getElementByIdInTree(el, id, labelledbyAttr.isExpressionValue));
		if (referenced.some(target => target && hasUnknownContent(target))) {
			return true;
		}
		if (referenced.some(target => !target) && hasElementOfUnknownId(el)) {
			return true;
		}
	}

	const ownedLabel = getOwnedLabel(el);
	return !!ownedLabel && hasUnknownContent(ownedLabel);
}

/**
 * Walks the children {@link getRenderedChildNodes} returns, with the branches of the conditional
 * blocks read as one (`everyBranch`): which branch is rendered is not known, so an element in any of
 * them may be the one whose content is unknown. A hidden child is
 * skipped because the name computation never reads it (`isHidden` in that resolver).
 *
 * A `template` whose shadow root is only maybe attached returns `true` before
 * that walk. Its content is omitted from the computed name, so an ancestor
 * whose computed name is empty is not reported: the rule calls this only after
 * the computed name is empty. Light DOM text that remains in the computed name
 * is still a name, and the rule does not reach this function.
 *
 * Unknown `contents` of a pretended component count only when no declarative
 * shadow root is attached to it: the shadow root is rendered in their place.
 */
function hasUnknownContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<any, any>,
): boolean {
	const context = el.pretenderContext;
	if (context?.type === 'pretender' && context.slotContent?.mutable && !el.declarativeShadowRoot) {
		return true;
	}
	if (context?.type !== 'pretender' && el.isHTMLTemplateElement && el.declarativeShadowRootAttachment === 'unknown') {
		return true;
	}
	const children = [...getRenderedChildNodes(el, { everyBranch: true })];
	return children.some(
		child =>
			child.is(child.ELEMENT_NODE) &&
			child.getAttribute('aria-hidden') !== 'true' &&
			!child.hasAttribute('hidden') &&
			hasUnknownContent(child),
	);
}

/**
 * The text of an element as `Element#textContent` has it, with the branches of the conditional
 * blocks read as one (`expandConditionalBlocks` of `@markuplint/ml-core`): which branch is rendered is not
 * known from the markup, so a rule that must not report on what it cannot know reads every one of them.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param el - The element whose text is asked for
 * @returns The text of every branch, concatenated
 */
export function textContentOfEveryBranch<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
): string {
	let text = '';
	for (const child of expandConditionalBlocks(el.childNodes)) {
		if (child.is(child.ELEMENT_NODE)) {
			text += textContentOfEveryBranch(child);
		} else if (!child.is(child.COMMENT_NODE)) {
			text += child.textContent ?? '';
		}
	}
	return text;
}

export const labelable = ['button', 'input:not([type=hidden])', 'meter', 'output', 'progress', 'select', 'textarea'];
export function getOwnedLabel<V extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<V, O>,
) {
	if (!labelable.some(cond => el.matches(cond))) {
		return null;
	}

	let ownedLabel = el.closest('label');

	if (!ownedLabel) {
		const id = getDOMValue(el.getAttributeNode('id'));
		if (id) {
			// The label is looked for in the tree of the element, and the two values are compared as the DOM has them
			ownedLabel =
				querySelectorAllInTree(el, 'label[for]').find(
					label => getDOMValue(label.getAttributeNode('for')) === id,
				) ?? null;
		}
	}

	return ownedLabel;
}

/** `null`/`undefined` items are silently dropped on add. */
export class Collection<T> {
	#items = new Set<T>();

	constructor(...items: readonly (T | null | undefined)[]) {
		this.add(...items);
	}

	[Symbol.iterator](): Iterator<T> {
		return this.#items.values();
	}

	add(...items: readonly (T | null | undefined)[]) {
		for (const item of items) {
			if (item == null) {
				continue;
			}
			this.#items.add(item);
		}
	}

	toArray() {
		return Object.freeze([...this.#items]);
	}
}

/** Strips read-only modifiers from the result type so the clone can be freely mutated. */
export function deepCopy<T>(value: T): WritableDeep<T> {
	return structuredClone(value as any) as WritableDeep<T>;
}

function tokenRange(tokens: readonly (FixToken | null | undefined)[]): readonly [number, number] | null {
	const valid = tokens.filter((t): t is FixToken => t != null && t.raw.length > 0);
	const first = valid[0];
	const last = valid.at(-1);
	if (!first || !last) {
		return null;
	}
	return [first.startOffset, last.startOffset + last.raw.length];
}

export function removeAttr(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	fixer: IRuleFixer,
	attr: {
		readonly spacesBeforeName: FixToken | null;
		readonly nameNode: FixToken | null;
		readonly spacesBeforeEqual: FixToken | null;
		readonly equal: FixToken | null;
		readonly spacesAfterEqual: FixToken | null;
		readonly startQuote: FixToken | null;
		readonly valueNode: FixToken | null;
		readonly endQuote: FixToken | null;
	},
): TextEdit | TextEdit[] {
	const range = tokenRange([
		attr.spacesBeforeName,
		attr.nameNode,
		attr.spacesBeforeEqual,
		attr.equal,
		attr.spacesAfterEqual,
		attr.startQuote,
		attr.valueNode,
		attr.endQuote,
	]);
	if (!range) {
		return [];
	}
	return fixer.removeRange(range);
}

export function removeAttrValue(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	fixer: IRuleFixer,
	attr: {
		readonly spacesBeforeEqual: FixToken | null;
		readonly equal: FixToken | null;
		readonly spacesAfterEqual: FixToken | null;
		readonly startQuote: FixToken | null;
		readonly valueNode: FixToken | null;
		readonly endQuote: FixToken | null;
	},
): TextEdit | TextEdit[] {
	const range = tokenRange([
		attr.spacesBeforeEqual,
		attr.equal,
		attr.spacesAfterEqual,
		attr.startQuote,
		attr.valueNode,
		attr.endQuote,
	]);
	if (!range) {
		return [];
	}
	return fixer.removeRange(range);
}

/**
 * Whether a rule that reads a status flag of the spec data (`no-obsolete-element`,
 * `no-deprecated-element`, `no-nonstandard-features`, `no-experimental-features`) looks at the
 * element. The data describes the elements of HTML, SVG and MathML, and `getSpec` /
 * `getAttrSpecs` resolve each of them by its namespace, so the namespace is not a condition here.
 *
 * A web component or an authored element (JSX, Vue, Svelte) is looked at only when `pretenders`
 * makes it stand for a known element, so that the spec lookup resolves it by `el.localName`. It is
 * not looked at otherwise: the data knows nothing of it.
 *
 * @param el - The element to check
 * @returns `true` when the flags of the element's spec apply to it
 */
export function isFlagCheckedElement<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
): boolean {
	return el.elementType === 'html' || el.pretenderContext?.type === 'pretender';
}

/** The parts of the keys of `ignoreFeatures`: `dialog` is an element, `img[loading]` an attribute of one. */
interface IgnoreFeaturesTable {
	/** The element parts of the keys that name an element, as written and ASCII-folded. */
	readonly elements: { readonly exact: ReadonlySet<string>; readonly folded: ReadonlySet<string> };
	/** The attribute parts of the keys that name an attribute, by the element part, as written and ASCII-folded. */
	readonly attrs: {
		readonly exact: ReadonlyMap<string, readonly string[]>;
		readonly folded: ReadonlyMap<string, readonly string[]>;
	};
}

function parseIgnoreFeatures(features: readonly string[]): IgnoreFeaturesTable {
	const elements = { exact: new Set<string>(), folded: new Set<string>() };
	const attrs = { exact: new Map<string, string[]>(), folded: new Map<string, string[]>() };
	const push = (map: Map<string, string[]>, element: string, attrName: string) => {
		const names = map.get(element);
		if (names) {
			names.push(attrName);
		} else {
			map.set(element, [attrName]);
		}
	};
	for (const feature of features) {
		const open = feature.indexOf('[');
		if (open === -1 || !feature.endsWith(']')) {
			elements.exact.add(feature);
			elements.folded.add(asciiLowerCase(feature));
			continue;
		}
		const element = feature.slice(0, open);
		const attrName = feature.slice(open + 1, -1);
		push(attrs.exact, element, attrName);
		push(attrs.folded, asciiLowerCase(element), attrName);
	}
	return { elements, attrs };
}

/**
 * Creates the lookup of `ignoreFeatures`, whose keys are an element (`dialog`) or an attribute of
 * an element (`img[loading]`). The element part of a key is compared as the document compares tag
 * names (`tagNameCaseSensitive`), so `DIALOG` is not `<dialog>` in Svelte. The attribute part is
 * compared by the attribute that is checked (`MLAttr#isNamedBy`). An element key does not ignore
 * the attributes of the element.
 *
 * The option of an element replaces the option of the rule for that element. The options of the
 * elements a `nodeRule` selects arrive as a copy for each element, so the table of an option is built
 * once per content (`memoizeByContent`).
 *
 * @param tagNameCaseSensitive - `MLDocument#tagNameCaseSensitive`
 * @param ruleOption - `ignoreFeatures` of the rule
 * @returns The lookup for an element and for an attribute of an element
 */
export function createIgnoreFeaturesLookup(
	tagNameCaseSensitive: boolean,
	ruleOption: readonly string[] | undefined,
): {
	/** Whether the element is ignored. */
	isElementIgnored(elementOption: readonly string[] | undefined, elementName: string): boolean;
	/** Whether the attribute of the element is ignored. */
	isAttrIgnored<T extends RuleConfigValue, O extends PlainData>(
		elementOption: readonly string[] | undefined,
		elementName: string,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		attr: Attr<T, O>,
	): boolean;
} {
	const tableOf = memoizeByContent(parseIgnoreFeatures);
	const ruleTable = tableOf(ruleOption ?? []);
	const pick = (elementOption: readonly string[] | undefined) => (elementOption ? tableOf(elementOption) : ruleTable);
	return {
		isElementIgnored(elementOption, elementName) {
			const { exact, folded } = pick(elementOption).elements;
			return tagNameCaseSensitive ? exact.has(elementName) : folded.has(asciiLowerCase(elementName));
		},
		isAttrIgnored(elementOption, elementName, attr) {
			const { exact, folded } = pick(elementOption).attrs;
			const names = tagNameCaseSensitive ? exact.get(elementName) : folded.get(asciiLowerCase(elementName));
			return names?.some(name => attr.isNamedBy(name)) ?? false;
		},
	};
}
