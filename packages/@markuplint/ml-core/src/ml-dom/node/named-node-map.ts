import type { MLAttr } from './attr.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { UnexpectedCallError } from '@markuplint/shared';

export class MLNamedNodeMap<T extends RuleConfigValue, O extends PlainData = undefined>
	extends Array<MLAttr<T, O>>
	implements NamedNodeMap
{
	/**
	 * The attribute of the name that the element has: of two attributes of one name, the first in the HTML
	 * syntax and in Vue, the last in JSX and MDX (`MLDocument#duplicateAttrPrecedence`), and none when the one
	 * that code sets last is not output (`role={undefined}`). `MLElement#getAttributeNode` returns the same one.
	 *
	 * @implements DOM API: `NamedNodeMap`
	 * @see https://dom.spec.whatwg.org/#dom-namednodemap-getnameditem
	 */
	getNamedItem(qualifiedName: string): MLAttr<T, O> | null {
		return findDecidingAttr(this, qualifiedName);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `NamedNodeMap`
	 */
	getNamedItemNS(namespace: string | null, localName: string): Attr | null {
		throw new UnexpectedCallError('Not supported "getNamedItemNS" method');
	}

	item(index: number): MLAttr<T, O> | null {
		return this[index] ?? null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `NamedNodeMap`
	 */
	removeNamedItem(qualifiedName: string): MLAttr<T, O> {
		throw new UnexpectedCallError('Not supported "removeNamedItem" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `NamedNodeMap`
	 */
	removeNamedItemNS(namespace: string | null, localName: string): MLAttr<T, O> {
		throw new UnexpectedCallError('Not supported "removeNamedItemNS" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `NamedNodeMap`
	 */
	setNamedItem(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		attr: MLAttr<T, O>,
	): MLAttr<T, O> | null {
		throw new UnexpectedCallError('Not supported "setNamedItem" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `NamedNodeMap`
	 */
	setNamedItemNS(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		attr: MLAttr<T, O>,
	): MLAttr<T, O> | null {
		throw new UnexpectedCallError('Not supported "setNamedItemNS" method');
	}
}

/**
 * Finds the one attribute of a name that the element has, of the attributes written on it, so that
 * `MLElement#getAttribute` (its value), `MLElement#getAttributeNode`, `MLElement#getAttributePretended` and
 * `getNamedItem` read the same one.
 *
 * An HTML string is read by the HTML parser, which keeps the first of two attributes of one name: the first
 * written one decides. A language whose attributes reach the DOM through code (`MLAttr#isSetThroughDOMAPI`)
 * sets them one key after another, so the key set last decides: of two spellings that the DOM takes for one
 * attribute (`ID` and `id`), the later one. Two attributes written under the same key are one key, whose
 * value is the first or the last as the language says (`MLDocument#duplicateAttrPrecedence`: the first for
 * Vue, the last for JSX), and the key keeps the place where it is first written.
 *
 * A component or a custom element of a language that passes their attributes otherwise (Astro hands them to the
 * component as a props object, where a later key replaces an earlier one) gets the first or the last as
 * `MLDocument#componentDuplicateAttrPrecedence` says, whichever way its attributes are read.
 *
 * A key whose value the framework does not output (`role={undefined}`, `MLAttr#isAbsent`) sets nothing, so the
 * key set before it decides; when no key sets anything, the element has what is written without code, if
 * anything (a static attribute of Svelte, whose dynamic attributes alone are set by code). The value a key
 * keeps is chosen before that, so `role="button" role={undefined}` of JSX keeps the absent one and has no `role`.
 *
 * A directive and an attribute that the framework merges with another of its name (`:class` beside `class`,
 * which `MLAttr#isDuplicatable` marks) are not one of the keys, and the one asked for is the first written
 * attribute (that the framework outputs) when no key is set by code. Whether `name` names an attribute is what
 * `MLAttr#isNamedBy` says.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#attribute-name-state
 * @param attrs - The attributes of the element, in the order written
 * @param name - The name asked for
 * @param isOfName - Whether an attribute is one of the name, when the framework says it otherwise than
 *   `MLAttr#isNamedBy` (the props of a Vue component, whose spellings `my-label` and `myLabel` are one prop)
 * @returns The attribute, or `null` when the element has none of the name
 */
export function findDecidingAttr<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attrs: ReadonlyArray<MLAttr<T, O>>,
	name: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	isOfName: (attr: MLAttr<T, O>) => boolean = attr => attr.isNamedBy(name),
): MLAttr<T, O> | null {
	let first: MLAttr<T, O> | null = null;
	let last: MLAttr<T, O> | null = null;
	// The keys set by code, in the order that they are first written, each with the attribute that it keeps.
	// Made only when there is one, as an HTML string has none.
	let byKey: Map<string, MLAttr<T, O>> | null = null;
	// Whether the element gets the last of two attributes of one name, read once of the element
	let keepsLast: boolean | null = null;
	for (const attr of attrs) {
		if (!isOfName(attr)) {
			continue;
		}
		keepsLast ??= keepsLastOf(attr.ownerElement);
		if (attr.isSetThroughDOMAPI && !attr.isDirective && !attr.isDuplicatable) {
			byKey ??= new Map();
			if (keepsLast || !byKey.has(attr.name)) {
				// `Map#set` of a key that the map has keeps its place, as a key of an object literal does
				byKey.set(attr.name, attr);
			}
			continue;
		}
		if (attr.isAbsent) {
			continue;
		}
		first ??= attr;
		last = attr;
	}
	if (!byKey) {
		// An HTML string keeps the first; the props object of a component of a language that says so, the last
		return keepsLast && !isHtmlElement(attrs) ? last : first;
	}
	const kept = [...byKey.values()];
	for (let i = kept.length - 1; i >= 0; i--) {
		const attr = kept[i];
		if (attr && !attr.isAbsent) {
			return attr;
		}
	}
	// The keys set nothing: what the element has is what the markup gives without code (a static attribute of
	// Svelte, whose dynamic attributes alone are set by code), if anything
	return first;
}

/**
 * @param el - The element of the attributes
 * @returns Whether it gets the last of two attributes of one name
 */
function keepsLastOf(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLAttr<any, any>['ownerElement'],
): boolean {
	const document = el.ownerMLDocument;
	const isComponent = el.elementType === 'authored' || el.elementType === 'web-component';
	return (isComponent ? document.componentDuplicateAttrPrecedence : document.duplicateAttrPrecedence) === 'last';
}

/**
 * @param attrs - The attributes of an element
 * @returns Whether the element is not a component or a custom element, whose attributes an HTML string holds
 */
function isHtmlElement<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attrs: ReadonlyArray<MLAttr<T, O>>,
): boolean {
	const el = attrs[0]?.ownerElement;
	return !el || (el.elementType !== 'authored' && el.elementType !== 'web-component');
}

export function toNamedNodeMap<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodes: ReadonlyArray<MLAttr<T, O>>,
): MLNamedNodeMap<T, O> {
	const namedNodeMap = new MLNamedNodeMap(...nodes);
	return namedNodeMap;
}
