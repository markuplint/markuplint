import type { MLDocument } from './document.js';
import type { MarkuplintPreprocessorBlockType } from './types.js';
import type { MLASTPreprocessorSpecificBlock, MLASTBlockBehavior } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { MLNode } from './node.js';

/**
 * Represents a preprocessor-specific block node in the markuplint DOM tree.
 * These nodes correspond to template engine constructs such as conditionals (`if`/`else`),
 * loops (`each`), and other preprocessor directives that are not part of standard HTML.
 *
 * Serves as the bridge between template syntax and HTML content model
 * validation. `isTransparent` is always true, so `parent` walks through
 * every preprocessor block and an element inside a block keeps the element
 * that contains the block as its parent.
 *
 * `childNodes` does not follow that. Only fragments and blocks whose
 * `blockBehavior.type` is `each` or `end` are flattened into the parent.
 * A conditional block stays in `childNodes` so `conditionalChildNodes()` can
 * tell its branches apart. Flattening those branches would make elements
 * that never render together into siblings.
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
	 * Whether `parent` walks through this block. Always true, so an
	 * element inside the block keeps the element that contains the block as
	 * its parent. This flag does not decide `childNodes` flattening: only
	 * fragments and blocks whose `blockBehavior.type` is `each` or `end` are
	 * flattened, and a conditional block stays so its branches can be told
	 * apart.
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
		// `parent` walks through every block. `childNodes` flattens only
		// `each` and `end`; see the class comment.
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
}
