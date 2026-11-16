import type { MLNode } from '../node/node.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { hasDirectiveTemplate } from './tree-scope.js';

/**
 * Whether the node is a conditional block: a preprocessor block that has a `blockBehavior` other than
 * `each` and `end`. `MLNode#childNodes` keeps such a block as a node, of which at most one branch is
 * rendered, as against a loop body, which it flattens into the parent.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param node - The node to ask about
 * @returns `true` if the node is a conditional block
 */
export function isConditionalBlock<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): boolean {
	return (
		node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK) &&
		!!node.blockBehavior &&
		!['each', 'end'].includes(node.blockBehavior.type)
	);
}

/**
 * The nodes with every conditional block, and every `template` that has a directive, replaced by the nodes
 * of its branches or of its content, recursively, as if every branch were rendered at once. Which branch is
 * rendered is not known from the markup, so a caller that must not report on what it cannot know reads them
 * all. A `template` with a directive (Vue's `<template v-if>`) is rendered away: its children are children of
 * the element that holds it. A block that has no behavior stays: it is unknown by itself
 * (`MLElement#hasMutableChildren`).
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param nodes - The nodes to expand, such as `MLNode#childNodes`
 * @returns The nodes of every branch, in the order they are written
 */
export function expandConditionalBlocks<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodes: Iterable<MLNode<T, O>>,
): MLNode<T, O>[] {
	const expanded: MLNode<T, O>[] = [];
	for (const node of nodes) {
		if (isConditionalBlock(node) || isRenderedAwayTemplate(node)) {
			expanded.push(...expandConditionalBlocks(node.childNodes));
		} else {
			expanded.push(node);
		}
	}
	return expanded;
}

/**
 * Whether the node is a `template` of a framework that renders it away: one with a directive of a
 * template engine (`hasDirectiveTemplate`, which needs the spec of the framework to know the attribute is
 * one), or one that the parser marks with a behavior (`v-if`, `v-for`), which it does without the spec.
 */
function isRenderedAwayTemplate<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): boolean {
	return (
		node.is(node.ELEMENT_NODE) &&
		node.localName === 'template' &&
		(hasDirectiveTemplate(node) || !!node.blockBehavior)
	);
}

/**
 * Whether a conditional render may leave the node out: a block or an element that carries a
 * `blockBehavior` other than `end`. A loop (`each`) is one as well: it may render nothing, and
 * `MLNode#childNodes` flattens its body, so the body is in the parent as if it were always there.
 * An element carries a behavior when its language marks it by an attribute (`v-if` and `v-for` of Vue).
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param node - The node to ask about
 * @returns `true` if the node may not be rendered
 */
export function mayBeLeftOut<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): boolean {
	return (
		(node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK) || node.is(node.ELEMENT_NODE)) &&
		!!node.blockBehavior &&
		node.blockBehavior.type !== 'end'
	);
}

/**
 * Whether `absent` may not be rendered while `rendered` is: it may be left out itself, or something it is
 * in may be left out and does not hold `rendered` (they are in different branches, or `rendered` is outside of it).
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param absent - The node that may be absent
 * @param rendered - The node that is rendered
 * @returns `true` if a render of `rendered` may leave `absent` out
 */
export function mayBeAbsentWith<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	absent: MLNode<T, O>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	rendered: MLNode<T, O>,
): boolean {
	if (absent !== rendered && mayBeLeftOut(absent)) {
		return true;
	}
	const leftOutAboveRendered = new Set(leftOutAncestors(rendered));
	return leftOutAncestors(absent).some(ancestor => !leftOutAboveRendered.has(ancestor));
}

function leftOutAncestors<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): MLNode<T, O>[] {
	const ancestors: MLNode<T, O>[] = [];
	let current: MLNode<T, O> | null = node;
	while (current && !current.is(current.DOCUMENT_NODE)) {
		const parent: MLNode<T, O> | null = current.syntacticalParentNode;
		if (!parent || parent === current) {
			break;
		}
		if (mayBeLeftOut(parent)) {
			ancestors.push(parent);
		}
		current = parent;
	}
	return ancestors;
}
