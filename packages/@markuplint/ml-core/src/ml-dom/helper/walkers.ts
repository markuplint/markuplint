import type { MLNode } from '../node/node.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

export type Walker<T extends RuleConfigValue, O extends PlainData = undefined, N = MLNode<T, O>> = (
	node: N,
) => void | Promise<void> | Promise<void>[];

export type SyncWalker<T extends RuleConfigValue, O extends PlainData = undefined, N = MLNode<T, O>> = (
	node: N,
) => void;

export function syncWalk<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeList: ReadonlyArray<MLNode<T, O>>,
	walker: SyncWalker<T, O>,
) {
	for (const node of nodeList) {
		if (node.is(node.ELEMENT_NODE) || node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK)) {
			syncWalk([...node.childNodes], walker);
		}
		walker(node);
	}
}

/**
 * Walks the nodes in tree order (a node before its descendants), within one tree.
 *
 * Within one tree means it does not go into the children of an HTML `template` element, which
 * are a tree of their own (see `tree-scope.ts`), and it does not report a `template` element that is
 * in no tree (a declarative shadow root is attached to its parent, or whether it is cannot be told).
 * With `across`, it goes into every tree and reports every node, in the order of the markup.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param nodeList - The nodes to start with: the children of the root of the tree
 * @param walker - Called with each node
 * @param across - Whether to go into the trees that other trees hold
 */
export function walkTree<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeList: ReadonlyArray<MLNode<T, O>>,
	walker: SyncWalker<T, O>,
	across = false,
) {
	for (const node of nodeList) {
		if (node.is(node.ELEMENT_NODE)) {
			const holdsOtherTree = node.isHTMLTemplateElement;
			if (across || !node.isInNoTree) {
				walker(node);
			}
			if (across || !holdsOtherTree) {
				walkTree([...node.childNodes], walker, across);
			}
			continue;
		}
		walker(node);
		if (node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK)) {
			walkTree([...node.childNodes], walker, across);
		}
	}
}

export function sequentialWalker<T extends RuleConfigValue, O extends PlainData = undefined, N = MLNode<T, O>>(
	list: ReadonlyArray<N>,
	walker: Walker<T, O, N>,
) {
	if (list.length === 0) {
		return Promise.resolve();
	}

	/**
	 * The following pattern is used to ensure that all rules run sequentially,
	 * no matter it runs asynchronously or synchronously.
	 */
	let _resolve: () => void;
	let _reject: (reason: unknown) => void;

	const promise = new Promise<void>((resolve, reject) => {
		_resolve = resolve;
		_reject = reject;
	});

	const loop = (index = 0) => {
		while (true) {
			if (index >= list.length) {
				_resolve();
				return;
			}

			const node = list[index];
			if (node == null) {
				_resolve();
				return;
			}

			const result = walker(node);
			if (result instanceof Promise) {
				result.then(() => loop(index + 1)).catch(_reject);
				return;
			} else {
				index = index + 1;
			}
		}
	};

	loop();

	return promise;
}
