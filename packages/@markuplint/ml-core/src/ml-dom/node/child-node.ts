import type { MLBlock } from './block';
import type { MLCharacterData } from './character-data';
import type { MLDocumentType } from './document-type';
import type { MLElement } from './element';
import type { MLNode } from './node';
import type { MLText } from './text';
import type { RuleConfigValue } from '@markuplint/ml-config';

export type MLChildNode<T extends RuleConfigValue, O = null> =
	| MLDocumentType<T, O>
	| MLCharacterData<T, O>
	| MLText<T, O>
	| MLElement<T, O>
	| MLBlock<T, O>;

export function isChildNode<T extends RuleConfigValue, O = null>(node: MLNode<T, O>): node is MLChildNode<T, O> {
	return (
		node.is(node.DOCUMENT_TYPE_NODE) ||
		node.is(node.TEXT_NODE) ||
		node.is(node.ELEMENT_NODE) ||
		node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK)
	);
}
