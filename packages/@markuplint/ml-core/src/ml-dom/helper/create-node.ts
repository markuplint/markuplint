import type { Document } from '../';
import type { MappedNode } from './mapped-nodes';
import type { MLASTAbstructNode, MLASTNode } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import {
	MLDOMComment,
	MLDOMDoctype,
	MLDOMElement,
	MLDOMElementCloseTag,
	MLDOMOmittedElement,
	MLDOMText,
} from '../tokens';
import MLDOMPreprocessorSpecificBlock from '../tokens/preprocessor-specific-block';

export function createNode<N extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(
	astNode: N,
	document: Document<T, O>,
	pearNode?: MLDOMElement<T, O>,
): MappedNode<N, T, O> {
	const _astNode = astNode as MLASTNode;
	switch (_astNode.type) {
		case 'doctype': {
			return new MLDOMDoctype<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case 'starttag': {
			return new MLDOMElement<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case 'endtag': {
			return new MLDOMElementCloseTag<T, O>(_astNode, document, pearNode!) as MappedNode<N, T, O>;
		}
		case 'psblock': {
			return new MLDOMPreprocessorSpecificBlock<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case 'comment': {
			return new MLDOMComment<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case 'text': {
			return new MLDOMText<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case 'omittedtag': {
			return new MLDOMOmittedElement<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
	}
	throw new TypeError(`Invalid AST node typs "${astNode.type}"`);
}
