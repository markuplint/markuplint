import type { MLNode } from './node.js';
import type { MappedNode } from './types.js';
import type { MLASTNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { TargetParserError } from '@markuplint/parser-utils';

import { log } from '../../debug.js';

const nodeStoreLog = log.extend('node-store');
const nodeStoreError = nodeStoreLog.extend('error');

/**
 * Maps the AST nodes of one document to the `MLNode`s built from them.
 *
 * Each `MLDocument` owns its own store, which `MLNode`'s constructor shares
 * with every node of that document, instead of all documents sharing one
 * process-wide instance. A node is only ever looked up through its own
 * document (`syntacticalParentNode` resolves `parentNodeUuid`,
 * `getPureChildNodes` resolves child AST nodes), so a mapping has no reason to
 * outlive that document. A process-wide `Map` keyed by UUID was never
 * cleared, which kept every document ever parsed — its whole node tree —
 * reachable for the life of the process; a per-document store is reclaimed
 * together with its document when an engine calls `setCode()` / `exec()`
 * repeatedly, as a long-lived editor integration does (see #4074).
 */
export class NodeStore {
	#store = new Map<string, MLNode<any, any, any>>();

	getNode<N extends MLASTNode, T extends RuleConfigValue, O extends PlainData = undefined>(
		astNode: N,
	): MappedNode<N, T, O> {
		// console.log(`Get: ${astNode.uuid} -> ${astNode.raw.trim()}(${astNode.type})`);
		const node = this.#store.get(astNode.uuid);
		if (!node) {
			nodeStoreError('Ref ID: %s (%s: "%s")', astNode.uuid, astNode.nodeName, astNode.raw);
			nodeStoreError(
				'Map: %O',
				[...this.#store.entries()].map(([id, node]) => ({
					id,
					name: node.nodeName,
				})),
			);
			throw new TargetParserError('Broke mapping nodes.', {
				line: astNode.line,
				col: astNode.col,
				raw: astNode.raw,
				nodeName: astNode.nodeName,
			});
		}
		return node as MappedNode<N, T, O>;
	}

	getNodeByUuid<T extends RuleConfigValue, O extends PlainData = undefined>(uuid: string): MLNode<T, O, any> {
		const node = this.#store.get(uuid);
		if (!node) {
			nodeStoreError('Ref UUID: %s', uuid);
			throw new TargetParserError('Broke mapping nodes.', {
				raw: `uuid:${uuid}`,
			});
		}
		return node as MLNode<T, O, any>;
	}

	setNode<A extends MLASTNode, T extends RuleConfigValue, O extends PlainData = undefined>(
		astNode: A,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		node: MLNode<T, O, A>,
	) {
		if (!astNode.uuid) {
			nodeStoreError('UUID is invalid: %s (%s: "%s")', astNode.uuid, astNode.nodeName, astNode.raw);
			nodeStoreError('Invalid node: %O', node);
		}

		nodeStoreLog(
			'Mapped: %s (%s: "%s")',
			astNode.uuid,
			astNode.nodeName,
			astNode.raw.replaceAll('\n', '⏎').replaceAll('\t', '→'),
		);
		this.#store.set(astNode.uuid, node);
	}
}
