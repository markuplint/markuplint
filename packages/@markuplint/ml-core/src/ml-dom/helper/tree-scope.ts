import type { MLAttr } from '../node/attr.js';
import type { MLElement } from '../node/element.js';
import type { MLNode } from '../node/node.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { isPotentialCustomElementName } from '@markuplint/parser-utils';
import { decodeEntities } from '@markuplint/shared';

/**
 * @module
 *
 * The tree of a node is what its `getRootNode()` returns: the document, the content of an
 * HTML `template` element, or a declarative shadow root. An id is unique in a tree, and an id
 * reference is resolved in a tree, as the specification says of "the element's tree".
 *
 * markuplint keeps the content of a `template` element as the children of the element (the
 * syntax tree has no other place for it), so the boundary is made here and not by the shape of
 * the tree: the queries of `MLParentNode`, `getRootNode()`, `treeParentElement`, the selector
 * engine and `contains()` stop at it. `parentNode` / `parentElement` do not: the content
 * model of a `template` element is validated against the elements that the syntax tree puts
 * in it, so they stay the syntactical ones.
 *
 * @see https://dom.spec.whatwg.org/#concept-tree
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 * @see https://html.spec.whatwg.org/multipage/scripting.html#the-template-element
 */

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

/**
 * Whether a declarative shadow root is attached to the parent element of a `template` element.
 *
 * - `attached`: it is. The `template` element is in no tree, and its content is the shadow root.
 * - `not-attached`: it is not. The `template` element is an ordinary one of the tree it is in.
 * - `unknown`: the markup alone does not tell. The parent element is not in the file (the template is at
 *   the top of a partial), is a component, or `shadowrootmode` is a dynamic value. markuplint does not
 *   decide what it cannot decide, as it does with a dynamic value elsewhere: the element is treated as
 *   in no tree, so its own id is not counted and the references of it are not reported.
 */
export type DeclarativeShadowRootAttachment = 'attached' | 'not-attached' | 'unknown';

/**
 * The names that the DOM accepts as a shadow host, besides a valid custom element name.
 *
 * @see https://dom.spec.whatwg.org/#valid-shadow-host-name
 */
const SHADOW_HOST_NAMES: ReadonlySet<string> = new Set([
	'article',
	'aside',
	'blockquote',
	'body',
	'div',
	'footer',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'header',
	'main',
	'nav',
	'p',
	'section',
	'span',
]);

/**
 * Whether `node` is skipped when the parent of a `template` element is looked for: what the
 * template engine or the framework renders away (a block of a template language, a fragment of
 * JSX, a `template` with a directive such as `v-if`) leaves its children to the next element
 * above.
 *
 * @param node - A node of the syntax tree
 * @returns `true` if the node is not an element of the output
 */
function isTransparent<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): boolean {
	if (node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK)) {
		return true;
	}
	if (node.isFragment) {
		return true;
	}
	return node.is(node.ELEMENT_NODE) && hasDirectiveTemplate(node);
}

/**
 * Whether the element is a `template` that has a directive of a template engine (Vue's `v-if`,
 * `v-for`, `v-slot`). The engine renders its children in place of it and drops it, so it is not
 * an HTML `template` element.
 *
 * @param el - An element
 * @returns `true` if it is such a `template`
 */
function hasDirectiveTemplate<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<T, O>,
): boolean {
	if (el.localName !== 'template') {
		return false;
	}
	for (const attr of el.attributes) {
		if (attr.isDirective) {
			return true;
		}
	}
	return false;
}

/**
 * Whether the element is an HTML `template` element, which holds its children in `content`, a tree
 * of its own.
 *
 * It is not when the element is a fragment, has a directive of a template engine, or the
 * framework puts the children in the element itself (`templateContent: 'in-place'` of the spec).
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param el - An element
 * @returns `true` if the children of the element belong to a tree of their own
 */
export function isHTMLTemplateElement<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<T, O>,
): boolean {
	if (el.isFragment || el.localName !== 'template' || el.namespaceURI !== HTML_NAMESPACE) {
		return false;
	}
	if (el.ownerMLDocument.specs.templateContent === 'in-place') {
		return false;
	}
	return !hasDirectiveTemplate(el);
}

/**
 * The state of the `shadowrootmode` attribute of an HTML `template` element.
 *
 * @param template - A `template` element
 * @returns `open` or `closed`, `none` for a missing or invalid value (the missing value default and
 *   the invalid value default are both the None state), and `dynamic` for a value that is not known
 *   until the template is rendered
 * @see https://html.spec.whatwg.org/multipage/scripting.html#attr-template-shadowrootmode
 */
function getShadowRootModeState<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	template: MLElement<T, O>,
): 'open' | 'closed' | 'none' | 'dynamic' {
	const attr = template.getAttributeNode('shadowrootmode');
	if (!attr || attr.isAbsent) {
		return 'none';
	}
	if (attr.isDynamicValue) {
		return 'dynamic';
	}
	const value = attr.value.toLowerCase();
	return value === 'open' || value === 'closed' ? value : 'none';
}

/**
 * The mode of the declarative shadow root that a `template` element asks for.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param template - An element
 * @returns `open` or `closed`, or `null` when it is not an HTML `template` element, the
 *   attribute is missing or invalid, or its value is dynamic
 */
export function getDeclarativeShadowRootMode<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	template: MLElement<T, O>,
): 'open' | 'closed' | null {
	if (!isHTMLTemplateElement(template)) {
		return null;
	}
	const state = getShadowRootModeState(template);
	return state === 'open' || state === 'closed' ? state : null;
}

/**
 * The element that the HTML parser makes the shadow host of a `template` element: its parent in
 * the output, where what the engine renders away (see {@link isTransparent}) is skipped.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param template - A `template` element
 * @returns The element, or `null` when the file has none above the template
 */
export function getShadowHost<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	template: MLElement<T, O>,
): MLElement<T, O> | null {
	let node = template.syntacticalParentNode;
	while (node) {
		if (node.is(node.DOCUMENT_NODE) || node.is(node.DOCUMENT_FRAGMENT_NODE)) {
			return null;
		}
		if (!isTransparent(node) && node.is(node.ELEMENT_NODE)) {
			return node;
		}
		node = node.syntacticalParentNode;
	}
	return null;
}

/**
 * Whether the host can have a shadow root, judged by what the markup says.
 *
 * @param host - The parent element of a `template` element
 * @returns `true` or `false`, and `null` for an element that is not what it is written as (a
 *   component whose output is not known)
 * @see https://dom.spec.whatwg.org/#concept-attach-a-shadow-root
 */
function canBeShadowHost<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	host: MLElement<T, O>,
): boolean | null {
	if (host.elementType === 'authored' && host.pretenderContext?.type !== 'pretender') {
		return null;
	}
	if (host.namespaceURI !== HTML_NAMESPACE) {
		return false;
	}
	const name = host.localName;
	return SHADOW_HOST_NAMES.has(name) || isPotentialCustomElementName(name);
}

/**
 * The `template` elements that sit in the output under the host, in the order of the markup,
 * seen through what the engine renders away.
 *
 * @param host - A shadow host candidate
 * @returns The `template` elements, which are HTML ones
 */
function getTemplatesOfHost<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	host: MLNode<T, O>,
): MLElement<T, O>[] {
	const templates: MLElement<T, O>[] = [];
	for (const child of host.getPureChildNodes()) {
		if (isTransparent(child)) {
			templates.push(...getTemplatesOfHost(child));
			continue;
		}
		if (child.is(child.ELEMENT_NODE) && isHTMLTemplateElement(child)) {
			templates.push(child);
		}
	}
	return templates;
}

/**
 * Whether a declarative shadow root is attached to the parent of a `template` element, by what
 * the HTML parser does with the start tag of `template` and what the DOM does to attach a shadow
 * root: the mode is `open` or `closed` (ASCII case-insensitive), the parent is an HTML element with
 * a valid shadow host name (a valid custom element name, or one of the names the DOM lists), and no
 * earlier `template` of the same parent has attached one.
 *
 * The file is taken as parsed as a document that was served, so declarative shadow roots are
 * allowed. The parser would not attach one to the top level of a fragment parsed through `innerHTML`,
 * but whether a file is that is not something its markup says.
 *
 * Known limitation: a custom element definition may disable the shadow root (`disable shadow`),
 * which only the script that defines the element tells. It is taken as not disabled.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param template - An element
 * @returns The state. An element that is not an HTML `template` element is `not-attached`
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead
 * @see https://dom.spec.whatwg.org/#concept-attach-a-shadow-root
 */
export function getDeclarativeShadowRootAttachment<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	template: MLElement<T, O>,
): DeclarativeShadowRootAttachment {
	if (!isHTMLTemplateElement(template)) {
		return 'not-attached';
	}
	const mode = getShadowRootModeState(template);
	if (mode === 'none') {
		return 'not-attached';
	}
	const host = getShadowHost(template);
	if (!host) {
		return 'unknown';
	}
	const hostCheck = canBeShadowHost(host);
	if (hostCheck === false) {
		return 'not-attached';
	}
	if (hostCheck === null || mode === 'dynamic') {
		return 'unknown';
	}

	// The first `template` that asks for a shadow root and can have one takes the host.
	let undecided = false;
	for (const earlier of getTemplatesOfHost(host)) {
		if (earlier === template) {
			break;
		}
		const earlierMode = getShadowRootModeState(earlier);
		if (earlierMode === 'none') {
			continue;
		}
		if (earlierMode === 'dynamic') {
			undecided = true;
			continue;
		}
		return 'not-attached';
	}
	return undecided ? 'unknown' : 'attached';
}

/**
 * The `template` element of a host whose declarative shadow root is attached, if there is one.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param host - An element
 * @returns The `template` element whose content is the shadow root of the host, or `null`
 */
export function getShadowRootTemplate<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	host: MLElement<T, O>,
): MLElement<T, O> | null {
	return (
		getTemplatesOfHost(host).find(template => getDeclarativeShadowRootAttachment(template) === 'attached') ?? null
	);
}

/**
 * The string that the DOM has for an attribute: the value with the character references in the markup
 * resolved, so that `a&#x62;` is `ab`. A value that is written as code is a string already, with no
 * character reference in it.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param attr - An attribute, or `null` for one that is missing
 * @param value - A part of the value of the attribute as it is written (one token of a list), which the
 *   attribute decides on whether it has a character reference; the whole value by default
 * @returns The string, or `null` when the attribute is missing, a directive, or its value is not known
 *   until it is rendered (a dynamic value)
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */
export function getDOMValue<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: MLAttr<T, O> | null | undefined,
	value?: string,
): string | null {
	if (!attr || attr.isDynamicValue || attr.isDirective) {
		return null;
	}
	const written = value ?? attr.value;
	return attr.isExpressionValue ? written : decodeEntities(written);
}
