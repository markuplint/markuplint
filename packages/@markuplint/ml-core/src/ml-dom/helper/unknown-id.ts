import type { MLDocument } from '../node/document.js';
import type { MLNode } from '../node/node.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

/**
 * @module
 *
 * Which trees may hold an element whose `id` the markup does not tell.
 *
 * An id is resolved in the tree of the reference (`getRootNode()`), and the tree is known only to the
 * extent that the markup shows it. A tree has such an element when it has one of:
 *
 * - an element whose `id` is a value that code gives (`<h2 id={x}>`);
 * - an element that has a spread attribute that may carry or override the `id`: one after the `id`
 *   attribute, or one without an `id` attribute (`<h2 {...props}>`). One before it is overridden by it
 *   (`<h2 {...props} id="a">` has the id `a`), as the later attribute wins for every language that has a
 *   spread attribute (`MLAttr#isSpread`). A spread of a language where the object overrides the
 *   attributes wherever they are written (`MLAttr#spreadOverridesWritten`, Alpine.js) is counted wherever it is;
 * - an element whose attribute replaces its children with markup that the template does not show
 *   (`MLAttr#isInnerHTML`: `v-html`, `x-html`, `dangerouslySetInnerHTML`);
 * - a component that no pretender resolved (`MLElement#isUnresolvedComponent`), which renders what is not
 *   known. A component that the language says renders what it is given (`MLParser#isPassThroughComponent`,
 *   Vue's built-in components) holds the elements that the markup shows, so it is not counted;
 * - a pretender whose content is not known (`PretenderSlotContent#mutable`), which has no declarative shadow
 *   root in its place: the content that a pretender declares is known, so what it declares stays decidable;
 * - a block of a template language or an expression (`{children}`, `{cond && <i />}`) that has no
 *   `blockBehavior`, which can output any element. What a block that has one holds is a node of the tree
 *   itself, so it is read as any other;
 * - the `slot` of a framework (`MLParser#slotElement` is `'framework'`: Vue, Svelte, Astro), which renders
 *   what the component is given. The HTML `slot` places the nodes of the tree of its shadow host, so it
 *   brings none into its own.
 *
 * Not an attribute whose value is dynamic as a whole (`MLElement#hasMutableAttributes`): `class={x}` cannot
 * give an id.
 *
 * That is a decision of markuplint, as it does not decide what it cannot know, and not text of a
 * specification. The criterion is read through `hasElementOfUnknownId` of `@markuplint/ml-spec`, which
 * lists the code that follows it: a change to it belongs to all of them.
 *
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */

/**
 * The trees of each document that may hold such an element. The nodes of a document do not change after it
 * is parsed, so the answer is computed once.
 */
const cache = new WeakMap<object, ReadonlySet<object>>();

/**
 * Whether the tree of the node may hold an element whose `id` the markup does not tell.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param node - A node of the document
 * @returns `true` if the tree that the node is in may hold such an element
 */
export function treeMayHoldUnknownId<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): boolean {
	const document = node.ownerMLDocument;
	let trees = cache.get(document);
	if (!trees) {
		trees = collectTrees(document);
		cache.set(document, trees);
	}
	return trees.has(node.getRootNode());
}

function collectTrees<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: MLDocument<T, O>,
): ReadonlySet<object> {
	const trees = new Set<object>();
	for (const node of document.nodeList) {
		if (mayBringUnknownId(node)) {
			trees.add(node.getRootNode());
		}
	}
	return trees;
}

function mayBringUnknownId<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): boolean {
	if (node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK)) {
		return !node.blockBehavior;
	}
	if (!node.is(node.ELEMENT_NODE)) {
		return false;
	}

	const idAttr = node.getAttrNode('id');
	if (idAttr?.isDynamicValue) {
		return true;
	}

	// `attributes` follows a pretender, so the spread is the one of the element that the id would be on.
	// An element can write `id` twice (`id="a" :id="x"`): the later one wins in the languages that have
	// a spread attribute, so a dynamic one among them is not known, and a spread is overridden only by
	// the last one
	const attrs = node.attributes;
	let lastIdIndex = -1;
	for (const [index, attr] of attrs.entries()) {
		if (attr.nameKey === 'id' && !attr.isAbsent) {
			if (attr.isDynamicValue) {
				return true;
			}
			lastIdIndex = index;
		}
	}
	if (
		attrs.some(
			(attr, index) => attr.isSpread === true && (index > lastIdIndex || attr.spreadOverridesWritten === true),
		)
	) {
		return true;
	}

	if (attrs.some(attr => attr.isInnerHTML === true && !attr.isAbsent)) {
		return true;
	}

	// The name of an element that a pretender stands for is the pretender's, so only the name written is asked
	if (
		node.isUnresolvedComponent() &&
		(node.pretenderContext?.type === 'pretender' || !node.ownerMLDocument.isPassThroughComponent(node.nodeName))
	) {
		return true;
	}

	const context = node.pretenderContext;
	if (context?.type === 'pretender' && context.slotContent?.mutable && !node.declarativeShadowRoot) {
		return true;
	}

	return node.localName === 'slot' && node.ownerMLDocument.slotElement === 'framework';
}
