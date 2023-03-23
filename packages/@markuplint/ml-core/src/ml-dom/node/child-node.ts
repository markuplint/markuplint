import type { MLBlock } from './block';
import type { MLCharacterData } from './character-data';
import type { MLDocumentType } from './document-type';
import type { MLElement } from './element';
import type { MLNode } from './node';
import type { MLText } from './text';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

export type MLChildNode<T extends RuleConfigValue, O extends PlainData = undefined> =
	| MLDocumentType<T, O>
	| MLCharacterData<T, O>
	| MLText<T, O>
	| MLElement<T, O>
	| MLBlock<T, O>;

export function isChildNode<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): node is MLChildNode<T, O> {
	return (
		node.is(node.DOCUMENT_TYPE_NODE) ||
		node.is(node.TEXT_NODE) ||
		node.is(node.ELEMENT_NODE) ||
		node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK)
	);
}
