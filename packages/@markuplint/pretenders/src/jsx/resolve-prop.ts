import type { Expression, Node, SignatureDeclaration } from 'typescript';

import ts from 'typescript';

const {
	forEachChild,
	isAsExpression,
	isBindingElement,
	isClassDeclaration,
	isClassExpression,
	isFunctionDeclaration,
	isFunctionExpression,
	isIdentifier,
	isNonNullExpression,
	isObjectBindingPattern,
	isParameter,
	isParenthesizedExpression,
	isPropertyAccessExpression,
	isSatisfiesExpression,
	isStringLiteral,
	isVariableDeclaration,
} = ts;

/**
 * Returns the name of the prop that an attribute value forwards as it is, or `undefined`
 * when it is anything else (see {@link createPropResolver}).
 */
export type PropResolver = (expression: Expression | undefined) => string | undefined;

/**
 * Creates the function that tells whether the value of a JSX attribute
 * (`aria-label={label}`) is just a prop of the component, which makes the attribute
 * the one the usage site writes: `<IconButton label="Save" />`.
 *
 * A prop is what the first parameter of the component function names:
 *
 * - A destructured property (`({ label })`, `({ label: text })`) is the prop of the
 *   original name. One with a default value (`({ type = 'button' })`) is not trusted:
 *   the usage site may omit it, and the attribute is then still there. Neither is
 *   the rest (`...rest`) or a nested pattern.
 * - A property of the first parameter when it is an identifier (`props.label`).
 *
 * The expression must be only that (parentheses, `as`, `satisfies` and `!` are looked
 * through); `label ?? 'x'` or `` `a-${label}` `` is not the value of the prop.
 * `children` is the content of the element, not an attribute, so it is never a prop here.
 *
 * It is decided by syntax alone, as the scanner does not type-check (a `ts.TypeChecker`
 * has to bind every file of the program, which the scanner avoids for speed). So a name
 * that the body of the component declares again anywhere (a variable,
 * a parameter of a nested function, a function or class) is not trusted to be the prop,
 * rather than resolving which scope it is in: the attribute stays dynamic, as before.
 *
 * The first parameter of a wrapped function is the props as well (`forwardRef(({ label }, ref) => ...)`);
 * a `this` parameter is not a parameter of the call.
 */
export function createPropResolver(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	fn: SignatureDeclaration,
): PropResolver {
	const [first, second] = fn.parameters;
	const props = first && isIdentifier(first.name) && first.name.text === 'this' ? second : first;
	const body = (fn as { readonly body?: Node }).body;
	if (!props || !body) {
		return () => {};
	}

	const declared = collectDeclaredNames(body);
	const destructured = new Map<string, string>();
	let propsName: string | undefined;

	if (isIdentifier(props.name)) {
		propsName = props.name.text;
	} else if (isObjectBindingPattern(props.name)) {
		for (const element of props.name.elements) {
			if (element.dotDotDotToken || element.initializer || !isIdentifier(element.name)) {
				continue;
			}
			const { propertyName } = element;
			if (propertyName && !isIdentifier(propertyName) && !isStringLiteral(propertyName)) {
				continue;
			}
			destructured.set(element.name.text, propertyName ? propertyName.text : element.name.text);
		}
	}

	return expression => {
		const target = unwrap(expression);
		if (!target) {
			return;
		}

		let prop: string | undefined;
		if (isIdentifier(target)) {
			prop = declared.has(target.text) ? undefined : destructured.get(target.text);
		} else if (
			isPropertyAccessExpression(target) &&
			isIdentifier(target.expression) &&
			target.expression.text === propsName &&
			!declared.has(propsName) &&
			isIdentifier(target.name)
		) {
			prop = target.name.text;
		}

		return prop === 'children' ? undefined : prop;
	};
}

function unwrap(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	expression: Expression | undefined,
): Expression | undefined {
	let current = expression;
	while (
		current &&
		(isParenthesizedExpression(current) ||
			isAsExpression(current) ||
			isSatisfiesExpression(current) ||
			isNonNullExpression(current))
	) {
		current = current.expression;
	}
	return current;
}

/**
 * Every name that something inside `node` declares: variables, parameters (also of
 * nested functions), destructured bindings, functions, and classes.
 */
function collectDeclaredNames(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Node,
): Set<string> {
	const names = new Set<string>();
	const walk = (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		child: Node,
	) => {
		if (
			(isVariableDeclaration(child) ||
				isParameter(child) ||
				isBindingElement(child) ||
				isFunctionDeclaration(child) ||
				isFunctionExpression(child) ||
				isClassDeclaration(child) ||
				isClassExpression(child)) &&
			child.name &&
			isIdentifier(child.name)
		) {
			names.add(child.name.text);
		}
		forEachChild(child, walk);
	};
	walk(node);
	return names;
}
