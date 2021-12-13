import type {
	MLDOMAttribute,
	MLDOMComment,
	MLDOMDoctype,
	MLDOMElement,
	MLDOMElementCloseTag,
	MLDOMNode,
	MLDOMOmittedElement,
	MLDOMPreprocessorSpecificBlock,
	MLDOMText,
	MLDOMToken,
} from '../tokens';
import type {
	MLASTAbstructNode,
	MLASTAttr,
	MLASTComment,
	MLASTDoctype,
	MLASTElement,
	MLASTElementCloseTag,
	MLASTNode,
	MLASTOmittedElement,
	MLASTParentNode,
	MLASTPreprocessorSpecificBlock,
	MLASTText,
	MLToken,
} from '@markuplint/ml-ast/';
import type { RuleConfigValue } from '@markuplint/ml-config';

// prettier-ignore
export type MappedNode<N, T extends RuleConfigValue, O = null>
	= N extends MLASTElement ? MLDOMElement<T, O>
	: N extends MLASTElementCloseTag ? MLDOMElementCloseTag<T, O>
	: N extends MLASTOmittedElement ? MLDOMOmittedElement<T, O>
	: N extends MLASTParentNode ? (MLDOMElement<T, O> | MLDOMOmittedElement<T, O>)
	: N extends MLASTComment ? MLDOMComment<T, O>
	: N extends MLASTText ? MLDOMText<T, O>
	: N extends MLASTDoctype ? MLDOMDoctype<T, O>
	: N extends MLASTNode ? MLDOMNode<T, O, MLASTNode>
	: N extends MLASTPreprocessorSpecificBlock ? MLDOMPreprocessorSpecificBlock<T, O>
	: N extends MLASTAbstructNode ? MLDOMNode<T, O, MLASTAbstructNode>
	: N extends MLASTAttr ? MLDOMAttribute
	: N extends MLToken ? MLDOMToken<MLToken>
	: never;
