import type { MLDocument } from '../node/document.js';
import type { MappedNode } from '../node/types.js';
import type { MLASTNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { MLBlock } from '../node/block.js';
import { MLComment } from '../node/comment.js';
import { MLDocumentType } from '../node/document-type.js';
import { MLElement } from '../node/element.js';
import { MLText } from '../node/text.js';

export function createNode<N extends MLASTNode, T extends RuleConfigValue, O extends PlainData = undefined>(
	astNode: N,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: MLDocument<T, O>,
): MappedNode<N, T, O> {
	switch (astNode.type) {
		case 'doctype': {
			return new MLDocumentType<T, O>(astNode, document) as MappedNode<N, T, O>;
		}
		case 'starttag': {
			return new MLElement<T, O>(astNode, document) as MappedNode<N, T, O>;
		}
		case 'psblock': {
			return new MLBlock<T, O>(astNode, document) as MappedNode<N, T, O>;
		}
		case 'comment': {
			return new MLComment<T, O>(astNode, document) as MappedNode<N, T, O>;
		}
		case 'text': {
			return new MLText<T, O>(astNode, document) as MappedNode<N, T, O>;
		}
		case 'invalid': {
			switch (astNode.kind) {
				case 'starttag': {
					return new MLElement<T, O>(
						{
							...astNode,
							type: 'starttag',
							nodeName: 'x-invalid',
							namespace: 'http://www.w3.org/1999/xhtml',
							elementType: 'web-component',
							attributes: [],
							childNodes: [],
							pairNode: null,
							tagOpenChar: '',
							tagCloseChar: '',
							isGhost: false,
							isFragment: false,
						},
						document,
					) as MappedNode<N, T, O>;
				}
				default: {
					return new MLText<T, O>(
						{
							...astNode,
							type: 'text',
							nodeName: '#text',
						},
						document,
					) as MappedNode<N, T, O>;
				}
			}
		}
	}
	throw new TypeError(`Invalid AST node types "${astNode.type}"`);
}
