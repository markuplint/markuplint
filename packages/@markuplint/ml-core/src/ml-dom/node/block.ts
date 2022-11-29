import type { MLDocument } from './document';
import type { MLElement } from './element';
import type { MarkuplintPreprocessorBlockType } from './types';
import type { MLASTPreprocessorSpecificBlock } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import { after, before, remove, replaceWith } from '../manipulations/child-node-methods';

import { MLNode } from './node';

export class MLBlock<T extends RuleConfigValue, O = null> extends MLNode<T, O, MLASTPreprocessorSpecificBlock> {
	readonly isTransparent: boolean;

	constructor(astNode: MLASTPreprocessorSpecificBlock, document: MLDocument<T, O>) {
		super(astNode, document);
		// TODO:
		this.isTransparent = true;
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
	after(...nodes: (string | MLElement<any, any>)[]): void {
		after(this, ...nodes);
	}

	/**
	 * @implements DOM API: `ChildNode`
	 */
	before(...nodes: (string | MLElement<any, any>)[]): void {
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
	replaceWith(...nodes: (string | MLElement<any, any>)[]): void {
		replaceWith(this, ...nodes);
	}
}
