import type { MLChildNode } from '../node/child-node.js';
import type { MLElement } from '../node/element.js';
import type { MLNode } from '../node/node.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { isShadowRoot } from '@markuplint/ml-spec';

import { getDOMValue, getShadowHost, getShadowRootTemplate, HTML_NAMESPACE, isTransparent } from './tree-scope.js';

/**
 * @module
 *
 * The slot assignment of a declarative shadow root: which nodes a `slot` places.
 *
 * The DOM assigns each slottable (an element or a text node that is a child of the shadow host) to the
 * first `slot` of the shadow root, in tree order, whose `name` is the `slot` attribute of the slottable
 * (`''` for a text node and for an element that has none), and what a `slot` renders is the slottables
 * assigned to it, or its own children when it has none. Only a slot of a shadow root places the light
 * children of that root's host, and the `slot` of a nested shadow root belongs to the inner one.
 *
 * > If slot's root is not a shadow root, then return result.
 *
 * Each of the following leaves the assignment unknown, as markuplint does not decide what the markup
 * does not tell (a slot has no assigned nodes that a rule can rely on, and a node has no slot):
 *
 * - The `slot` is not the HTML element: the placeholder of a framework's component
 *   (`MLParser#slotElement`)
 * - The slot is not in a shadow root: the content of an ordinary `template` element, where the markup does
 *   not tell where it is inserted, or the document
 * - The shadow root asks for manual assignment (`shadowrootslotassignment="manual"`), which a script
 *   decides with `HTMLSlotElement#assign()`
 * - A `name` or a `slot` attribute is written as code, or an element has a spread attribute that may set
 *   either of them
 * - The host has a child that renders what the markup does not tell: a block of a template language that
 *   has no behavior, or a component that no pretender resolved, whose output may carry any `slot` attribute
 * - A `slot` of the shadow root is in a block of a template language, so that whether it is rendered, and
 *   so which slot is the first of its name, is not known
 * - The `template` that declares the shadow root is not written right in the host, so that whether the
 *   shadow root is attached is not known
 *
 * An unknown assignment is `null`, never an empty list: a rule that must not report what it cannot know
 * asks `MLElement#getAssignedNodes` for it, and a slot with none assigned has its own children for what
 * it renders.
 *
 * The nodes in the branches of a conditional block are candidates, whichever of them is rendered: a
 * rendered one is a child of the host, which is what the assignment reads.
 *
 * @see https://dom.spec.whatwg.org/#find-slotables
 * @see https://dom.spec.whatwg.org/#find-flattened-slotables
 * @see https://dom.spec.whatwg.org/#find-a-slot
 * @see https://dom.spec.whatwg.org/#dom-slot-assignednodes
 */

/**
 * Which slot takes each slottable of a host, and which slottables each slot takes.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
type SlotAssignment<T extends RuleConfigValue, O extends PlainData> = {
	/** The slottables each slot of the shadow root takes, in tree order; a slot that takes none has `[]` */
	readonly slots: ReadonlyMap<MLElement<T, O>, readonly MLChildNode<T, O>[]>;
	/** The slot each slottable of the host is assigned to; `null` when no slot of the shadow root takes it */
	readonly assigned: ReadonlyMap<MLNode<T, O>, MLElement<T, O> | null>;
};

const cache = new WeakMap<object, SlotAssignment<any, any> | null>();

/**
 * Whether the element is the HTML `slot` element: not the placeholder of a framework's component
 * (`MLParser#slotElement`, and what the parser of a framework turns into a fragment).
 *
 * @param el - An element
 * @returns `true` for the HTML `slot` element
 */
function isHTMLSlot<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<T, O>,
): boolean {
	return (
		el.localName === 'slot' &&
		el.namespaceURI === HTML_NAMESPACE &&
		!el.isFragment &&
		el.ownerMLDocument.slotElement === 'html'
	);
}

/**
 * The string that the DOM has for an attribute that names a slot: `''` when it is missing, `null`
 * when it is written as code.
 *
 * @param el - The element
 * @param name - The attribute name (`name` of a `slot`, `slot` of a slottable)
 * @returns The name, or `null` when it is not known
 */
function getSlotName<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<T, O>,
	name: 'name' | 'slot',
): string | null {
	// An attribute that has no name node is a spread (`{...props}`), which may set it
	if (el.attributes.some(attr => !attr.nameNode)) {
		return null;
	}
	const attr = el.getAttrNode(name);
	if (!attr || attr.isAbsent) {
		return '';
	}
	return getDOMValue(attr);
}

/**
 * Collects the HTML `slot` elements of the shadow root in tree order, without entering the content of a
 * `template` element, which is a tree of its own.
 *
 * @param parent - The shadow root, or an element in it
 * @param slots - The slots found so far, which the walk appends to
 * @param inBlock - Whether the walk went through a node that the engine renders away (a block or a
 *   fragment), under which a slot may not be rendered
 * @returns `false` when which slot is the first of its name is not known: a slot in such a node, or
 *   one whose `name` is not known
 */
function collectSlots<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parent: MLNode<T, O>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	slots: MLElement<T, O>[],
	inBlock: boolean,
): boolean {
	for (const child of parent.pureChildren()) {
		if (!child.is(child.ELEMENT_NODE) && !child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK)) {
			continue;
		}
		if (isTransparent(child)) {
			if (!collectSlots(child, slots, true)) {
				return false;
			}
			continue;
		}
		if (!child.is(child.ELEMENT_NODE)) {
			continue;
		}
		if (isHTMLSlot(child)) {
			// Whether it is rendered, and its `name`, are not known
			if (inBlock || getSlotName(child, 'name') === null) {
				return false;
			}
			slots.push(child);
		}
		// The content of a `template` element is a tree of its own, which has its own slots
		if (!child.isHTMLTemplateElement && !collectSlots(child, slots, inBlock)) {
			return false;
		}
	}
	return true;
}

/**
 * The nodes that are the children of the host in the output, seen through what the engine renders away,
 * the nodes in every branch of a conditional block included.
 *
 * @param parent - The host, or a node that the engine renders away in it
 * @param nodes - The nodes found so far
 * @param declaring - The `template` element that declares the shadow root, which is not a child of the host in the tree
 * @returns `false` when the nodes are not known
 */
function collectSlottables<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parent: MLNode<T, O>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodes: MLChildNode<T, O>[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	declaring: MLElement<T, O>,
): boolean {
	for (const child of parent.pureChildren()) {
		if (child === declaring) {
			continue;
		}
		if (child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK)) {
			// A block that has no behavior may be a marker of a language whose blocks the syntax tree does not nest
			if (!child.blockBehavior || !collectSlottables(child, nodes, declaring)) {
				return false;
			}
			continue;
		}
		if (child.is(child.ELEMENT_NODE)) {
			if (isTransparent(child)) {
				if (!collectSlottables(child, nodes, declaring)) {
					return false;
				}
				continue;
			}
			// What it renders may carry any `slot` attribute
			if (child.isUnresolvedComponent()) {
				return false;
			}
			nodes.push(child);
			continue;
		}
		if (child.is(child.TEXT_NODE)) {
			nodes.push(child);
		}
	}
	return true;
}

/**
 * Computes the assignment of the shadow root of a host.
 *
 * @param host - A shadow host
 * @returns The assignment, or `null` when the host has no shadow root or any of the causes in the module
 *   comment leaves the assignment unknown
 */
function compute<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	host: MLElement<T, O>,
): SlotAssignment<T, O> | null {
	const root = host.declarativeShadowRoot;
	const template = getShadowRootTemplate(host);
	if (!root || !template) {
		return null;
	}
	if (host.ownerMLDocument.slotElement !== 'html' || root.slotAssignment === 'manual') {
		return null;
	}
	// A shadow root that a conditional wrapper may not render has no known slots
	if (template.syntacticalParentNode !== host) {
		return null;
	}

	const slotList: MLElement<T, O>[] = [];
	if (!collectSlots(root, slotList, false)) {
		return null;
	}
	const slottables: MLChildNode<T, O>[] = [];
	if (!collectSlottables(host, slottables, template)) {
		return null;
	}

	const names = new Map<MLElement<T, O>, string>();
	for (const slot of slotList) {
		const name = getSlotName(slot, 'name');
		if (name === null) {
			return null;
		}
		names.set(slot, name);
	}

	const slots = new Map<MLElement<T, O>, MLChildNode<T, O>[]>(slotList.map(slot => [slot, []]));
	// The first slot of the shadow root, in tree order, that has each name
	const firstSlotOfName = new Map<string, MLElement<T, O>>();
	for (const slot of slotList) {
		const name = names.get(slot);
		if (name !== undefined && !firstSlotOfName.has(name)) {
			firstSlotOfName.set(name, slot);
		}
	}
	const assigned = new Map<MLNode<T, O>, MLElement<T, O> | null>();
	for (const node of slottables) {
		const name = node.is(node.ELEMENT_NODE) ? getSlotName(node, 'slot') : '';
		if (name === null) {
			return null;
		}
		const slot = firstSlotOfName.get(name) ?? null;
		assigned.set(node, slot);
		if (slot) {
			slots.get(slot)?.push(node);
		}
	}
	return { slots, assigned };
}

/**
 * The assignment of a host, computed once: the document does not change after it is built, as the other
 * getters about trees (`MLElement#declarativeShadowRoot`) assume, so the answer never goes stale.
 *
 * @param host - A shadow host
 * @returns The assignment, or `null` when it is not known
 */
function getSlotAssignment<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	host: MLElement<T, O>,
): SlotAssignment<T, O> | null {
	if (cache.has(host)) {
		return cache.get(host) ?? null;
	}
	// The document does not change once it is built, as the other getters about trees assume
	const assignment = compute(host);
	cache.set(host, assignment);
	return assignment;
}

/**
 * The nodes a `slot` places.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param slot - An element
 * @returns The assigned nodes in tree order (`[]` when it takes none), or `null` when the element is not an
 *   HTML `slot` of a declarative shadow root whose assignment is known (see the module comment)
 * @see https://dom.spec.whatwg.org/#dom-slot-assignednodes
 */
export function getAssignedNodes<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	slot: MLElement<T, O>,
): readonly MLChildNode<T, O>[] | null {
	if (!isHTMLSlot(slot)) {
		return null;
	}
	const root = slot.getRootNode();
	if (!isShadowRoot<MLElement<T, O>>(root)) {
		return null;
	}
	return getSlotAssignment(root.host)?.slots.get(slot) ?? null;
}

/**
 * The slot that places a node, as the flat tree has it.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param node - An element or a text node
 * @returns The slot; `null` when the node is a child of a shadow host that no slot of its shadow root
 *   takes, so that it is not rendered; `undefined` when the node is not a child of a shadow host, or the
 *   assignment is not known
 * @see https://dom.spec.whatwg.org/#find-a-slot
 */
export function getFlatTreeSlot<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): MLElement<T, O> | null | undefined {
	// The parent in the output: a block or a fragment that the engine renders away is not the parent
	const host = getShadowHost(node);
	if (!host?.declarativeShadowRoot) {
		return undefined;
	}
	return getSlotAssignment(host)?.assigned.get(node);
}
