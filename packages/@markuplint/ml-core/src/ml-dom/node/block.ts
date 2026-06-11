import type { MLDocument } from './document.js';
import type { MLElement } from './element.js';
import type { MarkuplintPreprocessorBlockType } from './types.js';
import type { MLASTPreprocessorSpecificBlock, MLASTBlockBehavior } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { after, before, remove, replaceWith } from '../manipulations/child-node-methods.js';

import { MLNode } from './node.js';

/**
 * Represents a preprocessor-specific block node in the markuplint DOM tree.
 * These nodes correspond to template engine constructs such as conditionals (`if`/`else`),
 * loops (`each`), and other preprocessor directives that are not part of standard HTML.
 *
 * Serves as the bridge between template syntax and HTML content model
 * validation: transparency keeps the wrapper invisible to DOM traversal so
 * rules such as `permitted-contents` see the effective HTML children, while
 * `blockBehavior` lets `conditionalChildNodes()` enumerate every possible
 * rendering branch.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
export class MLBlock<T extends RuleConfigValue, O extends PlainData = undefined> extends MLNode<
	T,
	O,
	MLASTPreprocessorSpecificBlock
> {
	/**
	 * Block behavior associated with this block, if any.
	 */
	readonly blockBehavior: MLASTBlockBehavior | null;

	/**
	 * Whether this block is transparent, meaning its children are treated
	 * as belonging to the parent node for tree traversal purposes.
	 */
	readonly isTransparent: boolean;

	/**
	 * Creates a new MLBlock instance.
	 *
	 * @param astNode - The AST preprocessor block node to wrap
	 * @param document - The owning document
	 */
	constructor(
		astNode: MLASTPreprocessorSpecificBlock,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: MLDocument<T, O>,
	) {
		super(astNode, document, astNode.isFragment);
		// Always transparent: blockBehavior may restrict child treatment in the future,
		// but currently all preprocessor blocks are transparent for tree traversal.
		this.isTransparent = true;
		this.blockBehavior = astNode.blockBehavior;
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
