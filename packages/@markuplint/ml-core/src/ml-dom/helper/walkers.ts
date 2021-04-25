import { AnonymousNode, Walker } from '../types';
import { RuleConfigValue } from '@markuplint/ml-config';

export function syncWalk<T extends RuleConfigValue, O = null>(nodeList: AnonymousNode<T, O>[], walker: Walker<T, O>) {
	for (const node of nodeList) {
		if (node.type === 'Element' || node.type === 'OmittedElement') {
			syncWalk(node.childNodes, walker);
		}
		walker(node);
	}
}
