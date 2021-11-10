import type { AnonymousNode } from '../types';
import type { RuleConfigValue } from '@markuplint/ml-config';

export type Walker<T extends RuleConfigValue, O = null, N = AnonymousNode<T, O>> = (node: N) => void | Promise<void>;

export type SyncWalker<T extends RuleConfigValue, O = null, N = AnonymousNode<T, O>> = (node: N) => void;

export function syncWalk<T extends RuleConfigValue, O = null>(
	nodeList: AnonymousNode<T, O>[],
	walker: SyncWalker<T, O>,
) {
	for (const node of nodeList) {
		if (node.type === 'Element' || node.type === 'OmittedElement') {
			syncWalk(node.childNodes, walker);
		}
		walker(node);
	}
}
