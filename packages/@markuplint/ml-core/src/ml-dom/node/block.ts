import type { MLDocument } from './document.js';
import type { MLElement } from './element.js';
import type { MarkuplintPreprocessorBlockType } from './types.js';
import type { MLASTPreprocessorSpecificBlock, MLASTPreprocessorSpecificBlockConditionalType } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { after, before, remove, replaceWith } from '../manipulations/child-node-methods.js';

import { MLNode } from './node.js';

export class MLBlock<T extends RuleConfigValue, O extends PlainData = undefined> extends MLNode<
	T,
	O,
	MLASTPreprocessorSpecificBlock
> {
	readonly conditionalType: MLASTPreprocessorSpecificBlockConditionalType;
	readonly isTransparent: boolean;

	constructor(
		astNode: MLASTPreprocessorSpecificBlock,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: MLDocument<T, O>,
	) {
		super(astNode, document, astNode.isFragment);
		// TODO:
		this.isTransparent = true;
		this.conditionalType = astNode.conditionalType;
	}

	/**
	 * Returns a string appropriate for the type of node as `MLBlock`
	 *
	 * @implements `@markuplint/ml-core` API: `MLBlock`
	 */
	get nodeName() {
		return '#ml-block' as const;
	}

	/**
	 * Returns a number appropriate for the type of `MLBlock`
	 *
	 * @implements `@markuplint/ml-core` API: `MLBlock`
	 */
	get nodeType(): MarkuplintPreprocessorBlockType {
		return this.MARKUPLINT_PREPROCESSOR_BLOCK;
	}

	/**
	 * @implements DOM API: `ChildNode`
	 */
	after(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		after(this, ...nodes);
	}

	/**
	 * @implements DOM API: `ChildNode`
	 */
	before(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		before(this, ...nodes);
	}

	/**
	 * @implements DOM API: `ChildNode`
	 */
	remove(): void {
		remove(this);
	}

	/**
	 * @implements DOM API: `ChildNode`
	 */
	replaceWith(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		replaceWith(this, ...nodes);
	}
}
