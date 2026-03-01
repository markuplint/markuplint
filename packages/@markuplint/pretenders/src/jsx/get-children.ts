import type { JsxOpeningElement, JsxSelfClosingElement, Node, SourceFile } from 'typescript';

import ts from 'typescript';

const {
	forEachChild,
	isIdentifier,
	isJsxElement,
	isJsxExpression,
	isJsxSelfClosingElement,
	isPropertyAccessExpression,
} = ts;

/**
 * Detects whether a JSX element accepts children by searching for
 * `{children}` or `{props.children}` expressions in its subtree.
 *
 * - Self-closing elements (`<Foo />`) cannot have children → returns `null`
 * - Opening elements with `{children}` or `{props.children}` → returns `true`
 * - Opening elements without children expressions → returns `null`
 *
 * @param el - The JSX opening or self-closing element to inspect
 * @param sourceFile - The TypeScript source file containing the element
 * @returns `true` if children are accepted, `null` otherwise
 */
export function getChildren(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: JsxOpeningElement | JsxSelfClosingElement,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	sourceFile: SourceFile,
): null | true {
	if (isJsxSelfClosingElement(el)) {
		return null;
	}

	const parent = el.parent;
	if (!isJsxElement(parent)) {
		return null;
	}

	return hasChildrenExpression(parent, sourceFile) ? true : null;
}

/**
 * Recursively checks whether a node or its descendants contain a
 * `{children}` or `{props.children}` JSX expression.
 */
function hasChildrenExpression(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Node,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	sourceFile: SourceFile,
): boolean {
	if (isJsxExpression(node) && node.expression) {
		const expr = node.expression;

		// {children}
		if (isIdentifier(expr) && expr.getText(sourceFile) === 'children') {
			return true;
		}

		// {props.children}
		if (
			isPropertyAccessExpression(expr) &&
			isIdentifier(expr.name) &&
			expr.name.getText(sourceFile) === 'children' &&
			isIdentifier(expr.expression) &&
			expr.expression.getText(sourceFile) === 'props'
		) {
			return true;
		}
	}

	let found = false;
	forEachChild(node, child => {
		if (!found && hasChildrenExpression(child, sourceFile)) {
			found = true;
		}
	});
	return found;
}
