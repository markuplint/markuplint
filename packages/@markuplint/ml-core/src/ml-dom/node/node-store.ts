import type { MLNode } from './node';
import type { MappedNode } from './types';
import type { MLASTAbstractNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { ParserError } from '@markuplint/parser-utils';

import { log } from '../../debug';

const nodeStoreLog = log.extend('node-store');
const nodeStoreError = nodeStoreLog.extend('error');

class NodeStore {
	#store = new Map<string, MLNode<any, any, any>>();

	getNode<N extends MLASTAbstractNode, T extends RuleConfigValue, O extends PlainData = undefined>(
		astNode: N,
	): MappedNode<N, T, O> {
		// console.log(`Get: ${astNode.uuid} -> ${astNode.raw.trim()}(${astNode.type})`);
		const node = this.#store.get(astNode.uuid);
		if (!node) {
			nodeStoreError('Ref ID: %s (%s: "%s")', astNode.uuid, astNode.nodeName, astNode.raw);
			nodeStoreError(
				'Map: %O',
				Array.from(this.#store.entries()).map(([id, node]) => ({
					id,
					name: node.nodeName,
				})),
			);
			throw new ParserError('Broke mapping nodes.', {
				line: astNode.startLine,
				col: astNode.startCol,
				raw: astNode.raw,
				nodeName: astNode.nodeName,
			});
		}
		return node as MappedNode<N, T, O>;
	}

	setNode<A extends MLASTAbstractNode, T extends RuleConfigValue, O extends PlainData = undefined>(
		astNode: A,
		node: MLNode<T, O, A>,
	) {
		if (node.is(node.DOCUMENT_NODE)) {
			return;
		}

		if (!astNode.uuid) {
			nodeStoreError('UUID is invalid: %s (%s: "%s")', astNode.uuid, astNode.nodeName, astNode.raw);
			nodeStoreError('Invalid node: %O', node);
		}

		nodeStoreLog(
			'Mapped: %s (%s: "%s")',
			astNode.uuid,
			astNode.nodeName,
			astNode.raw.replace(/\n/g, '⏎').replace(/\t/g, '→'),
		);
		this.#store.set(astNode.uuid, node);
	}
}

/**
 * `NodeStore` Singleton
 */
export const nodeStore = new NodeStore();
