import type { MLNode } from './node.js';
import type { MappedNode } from './types.js';
import type { MLASTNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { TargetParserError } from '@markuplint/parser-utils';

import { log } from '../../debug.js';

const nodeStoreLog = log.extend('node-store');
const nodeStoreError = nodeStoreLog.extend('error');

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
			astNode.raw.replaceAll('\n', '⏎').replaceAll('\t', '→'),
		);
		this.#store.set(astNode.uuid, node);
	}
}

/**
 * One `NodeStore` per owning document, rather than a single process-wide
 * instance: a document's nodes are only ever looked up through that same
 * document (via `parentNodeUuid` lookups and child-node resolution), so there
 * is no reason for their mapping to outlive the document itself.
 *
 * Keyed by a `WeakMap` so a store is reclaimed together with its document
 * once nothing else references that document — otherwise, in a process that
 * calls `MLEngine#exec()`/`#setCode()` many times (a long-lived language
 * server, or a CLI run across many files), every parsed document's entire
 * node tree would stay reachable forever through a single shared `Map`.
 */
const storesByDocument = new WeakMap<object, NodeStore>();

export function getNodeStoreFor(document: object): NodeStore {
	let store = storesByDocument.get(document);
	if (!store) {
		store = new NodeStore();
		storesByDocument.set(document, store);
	}
	return store;
}
