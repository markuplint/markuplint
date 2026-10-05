import type {
	Expression,
	JsxChild,
	JsxOpeningElement,
	JsxSelfClosingElement,
	Node,
	SignatureDeclaration,
	SourceFile,
} from 'typescript';

import ts from 'typescript';

const {
	forEachChild,
	isArrowFunction,
	isAsExpression,
	isBinaryExpression,
	isBlock,
	isCallExpression,
	isConditionalExpression,
	isFunctionDeclaration,
	isFunctionExpression,
	isFunctionLike,
	isJsxElement,
	isJsxExpression,
	isJsxFragment,
	isJsxSelfClosingElement,
	isJsxText,
	isNonNullExpression,
	isParenthesizedExpression,
	isReturnStatement,
	isSatisfiesExpression,
	SyntaxKind,
} = ts;

/**
 * A place a component can render its root from.
 *
 * - `element`: a single root element.
 * - `fragment`: several roots (a fragment that has more than one significant child).
 */
export type Root =
	| {
			readonly type: 'element';
			readonly element: JsxOpeningElement | JsxSelfClosingElement;
	  }
	| {
			readonly type: 'fragment';
			readonly children: readonly JsxChild[];
	  };

/**
 * Finds the function that renders the component, looking through the wrappers
 * that do not change what is rendered: parentheses, `as`, `satisfies`, `!`, and
 * calls such as `memo(fn)`, `forwardRef(fn)`, or `withTheme(options)(fn)`.
 *
 * It never descends into other expressions (object literals, tagged templates),
 * so a function nested somewhere in them is not taken for the component.
 */
export function findComponentFunction(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Node | undefined,
): SignatureDeclaration | undefined {
	if (!node) {
		return undefined;
	}
	if (isFunctionDeclaration(node) || isFunctionExpression(node) || isArrowFunction(node)) {
		return node;
	}
	if (
		isParenthesizedExpression(node) ||
		isAsExpression(node) ||
		isSatisfiesExpression(node) ||
		isNonNullExpression(node)
	) {
		return findComponentFunction(node.expression);
	}
	if (isCallExpression(node)) {
		for (const arg of node.arguments) {
			const found = findComponentFunction(arg);
			if (found) {
				return found;
			}
		}
		return findComponentFunction(node.expression);
	}
	return undefined;
}

/**
 * The expressions the component returns: the body of a concise arrow function, or
 * every `return` of the function body. A nested function or class is skipped, so
 * `items.map(item => <li />)` or a `useCallback` render helper is not a return of
 * the component.
 */
export function collectReturnExpressions(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	fn: SignatureDeclaration,
): Expression[] {
	const { body } = fn as { readonly body?: Node };
	if (!body) {
		return [];
	}
	if (!isBlock(body)) {
		return [body as Expression];
	}

	const returns: Expression[] = [];
	const walk = (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		node: Node,
	) => {
		if (isFunctionLike(node) || ts.isClassLike(node)) {
			return;
		}
		if (isReturnStatement(node)) {
			if (node.expression) {
				returns.push(node.expression);
			}
			return;
		}
		forEachChild(node, walk);
	};
	forEachChild(body, walk);
	return returns;
}

/**
 * Resolves what a returned expression renders, as the roots it can render.
 *
 * Expressions whose result is not statically known (identifiers, calls,
 * `null`, `false`, ...) resolve to nothing: they are not a branch that decides
 * which element the component is.
 *
 * @param isFragmentTag - Whether a tag is transparent (`asFragment` providers)
 */
export function resolveRoots(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	expression: Node,
	sourceFile: SourceFile,
	isFragmentTag: (tag: string) => boolean,
): Root[] {
	if (
		isParenthesizedExpression(expression) ||
		isAsExpression(expression) ||
		isSatisfiesExpression(expression) ||
		isNonNullExpression(expression)
	) {
		return resolveRoots(expression.expression, sourceFile, isFragmentTag);
	}

	if (isConditionalExpression(expression)) {
		return [
			...resolveRoots(expression.whenTrue, sourceFile, isFragmentTag),
			...resolveRoots(expression.whenFalse, sourceFile, isFragmentTag),
		];
	}

	if (isBinaryExpression(expression)) {
		switch (expression.operatorToken.kind) {
			case SyntaxKind.AmpersandAmpersandToken: {
				return resolveRoots(expression.right, sourceFile, isFragmentTag);
			}
			case SyntaxKind.BarBarToken:
			case SyntaxKind.QuestionQuestionToken: {
				return [
					...resolveRoots(expression.left, sourceFile, isFragmentTag),
					...resolveRoots(expression.right, sourceFile, isFragmentTag),
				];
			}
			default: {
				return [];
			}
		}
	}

	if (isJsxSelfClosingElement(expression)) {
		return isFragmentTag(expression.tagName.getText(sourceFile)) ? [] : [{ type: 'element', element: expression }];
	}

	if (isJsxElement(expression)) {
		return isFragmentTag(expression.openingElement.tagName.getText(sourceFile))
			? resolveFragmentChildren(expression.children, sourceFile, isFragmentTag)
			: [{ type: 'element', element: expression.openingElement }];
	}

	if (isJsxFragment(expression)) {
		return resolveFragmentChildren(expression.children, sourceFile, isFragmentTag);
	}

	return [];
}

/**
 * The children of a fragment that matter: text and empty expressions such as
 * `{/* comment *\/}` are not roots. One child is the root itself; several
 * children are a `fragment` root.
 */
export function getSignificantChildren(children: readonly JsxChild[]): JsxChild[] {
	return children.filter(child => {
		if (isJsxText(child)) {
			return false;
		}
		if (isJsxExpression(child) && !child.expression) {
			return false;
		}
		return true;
	});
}

function resolveFragmentChildren(
	children: readonly JsxChild[],
	sourceFile: SourceFile,
	isFragmentTag: (tag: string) => boolean,
): Root[] {
	const significant = getSignificantChildren(children);
	const [only] = significant;
	if (significant.length === 0 || !only) {
		return [];
	}
	if (significant.length > 1) {
		return [{ type: 'fragment', children: significant }];
	}
	return isJsxExpression(only) && only.expression
		? resolveRoots(only.expression, sourceFile, isFragmentTag)
		: resolveRoots(only, sourceFile, isFragmentTag);
}
