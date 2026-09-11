import type { JsxOpeningElement, JsxSelfClosingElement, Node, SourceFile } from 'typescript';

import ts from 'typescript';

const {
	forEachChild,
	isIdentifier,
	isJsxAttributes,
	isJsxElement,
	isJsxSelfClosingElement,
	isPropertyAccessExpression,
} = ts;

/**
 * Only searches content children (text, expressions, nested elements),
 * NOT attribute values on the element or nested elements.
 *
 * - Self-closing elements (`<Foo />`) cannot have children → returns `null`
 * - Opening elements with `{children}` or `{props.children}` in content → returns `true`
 * - Opening elements without children expressions → returns `null`
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

	// Search only through content children (JsxChild[]),
	// which excludes opening/closing tags and their attributes.
	for (const child of parent.children) {
		if (hasChildrenIdentifier(child, sourceFile)) {
			return true;
		}
	}
	return null;
}

/**
 * Skips JsxAttributes nodes to avoid false positives from
 * `{children}` used as attribute values on nested elements.
 */
function hasChildrenIdentifier(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Node,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	sourceFile: SourceFile,
): boolean {
	// Skip attribute containers — {children} in attrs is not a slot indicator
	if (isJsxAttributes(node)) {
		return false;
	}

	// {children}
	if (isIdentifier(node) && node.getText(sourceFile) === 'children') {
		return true;
	}

	// {props.children}
	if (
		isPropertyAccessExpression(node) &&
		isIdentifier(node.name) &&
		node.name.getText(sourceFile) === 'children' &&
		isIdentifier(node.expression) &&
		node.expression.getText(sourceFile) === 'props'
	) {
		return true;
	}

	let found = false;
	forEachChild(node, child => {
		if (!found && hasChildrenIdentifier(child, sourceFile)) {
			found = true;
		}
	});
	return found;
}
