import type { MLDocument } from '../node/document';
import type { MappedNode } from '../node/types';
import type { MLASTAbstractNode, MLASTNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { MLBlock } from '../node/block';
import { MLComment } from '../node/comment';
import { MLDocumentType } from '../node/document-type';
import { MLElement } from '../node/element';
import { MLText } from '../node/text';

export function createNode<N extends MLASTAbstractNode, T extends RuleConfigValue, O extends PlainData = undefined>(
	astNode: N,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: MLDocument<T, O>,
): MappedNode<N, T, O> {
	const _astNode = astNode as MLASTNode;
	switch (_astNode.type) {
		case 'doctype': {
			return new MLDocumentType<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case 'starttag': {
			return new MLElement<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case 'psblock': {
			return new MLBlock<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case 'comment': {
			return new MLComment<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case 'text': {
			return new MLText<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
	}
	throw new TypeError(`Invalid AST node types "${astNode.type}"`);
}
