/**
 * @module dynamic-import-name
 *
 * Names a dynamic `import('...')` after the component it loads. A dynamic import has no
 * binding of its own, but the way a component is loaded lazily gives it one: the variable the
 * loading call is assigned to, or the key it is registered under in the `components` option of
 * Vue.
 *
 * - React presents `lazy(() => import('./X'))` as the replacement of the static `import` of the
 *   same component, and requires the module to have the component as its default export
 *   (https://react.dev/reference/react/lazy)
 * - Vue's `defineAsyncComponent` takes a loader function, or an options object with a `loader`
 *   (https://vuejs.org/guide/components/async.html)
 *
 * The wrapper call is judged by its shape alone (a call that takes the loader function as its
 * first argument), not by its name, so that `React.lazy`, `defineAsyncComponent`, Next.js'
 * `dynamic` and a project's own helper are all covered, and a renamed import of them too.
 */

import ts from 'typescript';

/**
 * The name a dynamic import is bound under: what {@link ./types.js} `ImportBinding` carries as
 * `localName` and `importedName`.
 */
export interface DynamicImportName {
	readonly localName: string;
	readonly importedName: string;
}

/**
 * Names the dynamic `import()` call after the component it loads, from where its result ends up:
 *
 * - `const X = lazy(() => import('./a'))`: `X` as the default export
 * - `const X = lazy(() => import('./a').then(m => ({ default: m.Y })))` or `.then(m => m.Y)`:
 *   `X` as `Y`
 * - `defineAsyncComponent({ loader: () => import('./a') })`: as the function form
 * - `components: { X: defineAsyncComponent(() => import('./a')) }`: `X`
 *
 * `null` for any other shape (a call that is not the initializer of a variable, a `.then` that
 * does more than read one export, a function that does more than return the import), where the
 * module is not known to be bound to a single name.
 *
 * @param call - A dynamic `import()` call (its `expression` is the `import` keyword), in a
 *   source file parsed with its parent nodes set
 * @returns The names to bind the import under, or `null`
 */
export function dynamicImportName(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	call: ts.CallExpression,
): DynamicImportName | null {
	let loaded: ts.Node = call;
	let importedName = 'default';

	const thenCall = asThenCall(call);
	if (thenCall) {
		const exportName = namedExportOfThen(thenCall);
		if (exportName === null) {
			return null;
		}
		importedName = exportName;
		loaded = thenCall;
	}

	const loader = loaderFunction(loaded);
	const wrapper = loader && wrapperCall(loader);
	const localName = wrapper && assignedName(wrapper);
	return localName ? { localName, importedName } : null;
}

/**
 * An expression that passes its operand's value through: parentheses, `await`, and the type-only
 * wrappers of TypeScript (`as`, `satisfies`, `!`), so that `async () => await import('./a')` and
 * `import('./a') as Promise<…>` name the import as `() => import('./a')` does.
 */
function isTransparent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
): node is
	| ts.ParenthesizedExpression
	| ts.AwaitExpression
	| ts.AsExpression
	| ts.SatisfiesExpression
	| ts.NonNullExpression {
	return (
		ts.isParenthesizedExpression(node) ||
		ts.isAwaitExpression(node) ||
		ts.isAsExpression(node) ||
		ts.isSatisfiesExpression(node) ||
		ts.isNonNullExpression(node)
	);
}

function outer(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
): ts.Node {
	let current = node;
	while (current.parent && isTransparent(current.parent) && current.parent.expression === current) {
		current = current.parent;
	}
	return current;
}

/** The call of `.then(...)` on the import, when that is what the import is the object of. */
function asThenCall(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	call: ts.CallExpression,
): ts.CallExpression | null {
	const access = outer(call).parent;
	if (
		!access ||
		!ts.isPropertyAccessExpression(access) ||
		access.name.text !== 'then' ||
		outer(access.expression) !== outer(call)
	) {
		return null;
	}
	const thenCall = access.parent;
	return ts.isCallExpression(thenCall) && thenCall.expression === access ? thenCall : null;
}

/**
 * The export `.then(m => ({ default: m.Y }))` or `.then(m => m.Y)` reads from the module, `Y`;
 * `null` for any other callback.
 */
function namedExportOfThen(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	thenCall: ts.CallExpression,
): string | null {
	const callback = thenCall.arguments[0];
	if (!callback || !isFunctionLike(callback) || callback.parameters.length !== 1) {
		return null;
	}
	const param = callback.parameters[0]!.name;
	const returned = returnedExpression(callback);
	if (!ts.isIdentifier(param) || !returned) {
		return null;
	}

	const value = skipParentheses(returned);
	if (ts.isObjectLiteralExpression(value)) {
		const [only] = value.properties;
		if (
			value.properties.length !== 1 ||
			!only ||
			!ts.isPropertyAssignment(only) ||
			propertyKey(only.name) !== 'default'
		) {
			return null;
		}
		return memberOf(only.initializer, param.text);
	}
	return memberOf(value, param.text);
}

/** `Y` of `<object>.Y`, for the identifier `object`. */
function memberOf(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	expression: ts.Expression,
	object: string,
): string | null {
	const target = skipParentheses(expression);
	return ts.isPropertyAccessExpression(target) &&
		ts.isIdentifier(target.expression) &&
		target.expression.text === object
		? target.name.text
		: null;
}

function skipParentheses(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	expression: ts.Expression,
): ts.Expression {
	let current = expression;
	while (isTransparent(current)) {
		current = current.expression;
	}
	return current;
}

function isFunctionLike(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
): node is ts.ArrowFunction | ts.FunctionExpression {
	return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

/** What the function returns when that is all it does: an expression body, or `{ return …; }`. */
function returnedExpression(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	fn: ts.ArrowFunction | ts.FunctionExpression,
): ts.Expression | null {
	if (!ts.isBlock(fn.body)) {
		return fn.body;
	}
	const [only] = fn.body.statements;
	return fn.body.statements.length === 1 && only && ts.isReturnStatement(only) ? (only.expression ?? null) : null;
}

/** The function that returns `node` and does nothing else. */
function loaderFunction(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
): ts.ArrowFunction | ts.FunctionExpression | null {
	const parent = outer(node).parent;
	if (!parent) {
		return null;
	}
	if (isFunctionLike(parent)) {
		const returned = returnedExpression(parent);
		return returned && skipParentheses(returned) === node ? parent : null;
	}
	if (ts.isReturnStatement(parent) && ts.isBlock(parent.parent) && isFunctionLike(parent.parent.parent)) {
		return returnedExpression(parent.parent.parent) === parent.expression ? parent.parent.parent : null;
	}
	return null;
}

/** The call that takes the loader function as its first argument, or as the `loader` of its options. */
function wrapperCall(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	loader: ts.ArrowFunction | ts.FunctionExpression,
): ts.CallExpression | null {
	let holder: ts.Node | undefined = outer(loader).parent;
	let argument: ts.Node = outer(loader);

	if (holder && ts.isPropertyAssignment(holder) && propertyKey(holder.name) === 'loader') {
		const options = holder.parent;
		argument = options;
		holder = options.parent;
	}

	return holder && ts.isCallExpression(holder) && holder.arguments[0] === argument ? holder : null;
}

/** The variable the call initializes, or the key of the Vue `components` option it is registered under. */
function assignedName(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	call: ts.CallExpression,
): string | null {
	const target = outer(call);
	const holder = target.parent;
	if (!holder) {
		return null;
	}
	if (ts.isVariableDeclaration(holder) && holder.initializer && outer(holder.initializer) === target) {
		return ts.isIdentifier(holder.name) ? holder.name.text : null;
	}
	if (ts.isPropertyAssignment(holder) && outer(holder.initializer) === target) {
		const registry = holder.parent.parent;
		return ts.isObjectLiteralExpression(holder.parent) &&
			ts.isPropertyAssignment(registry) &&
			propertyKey(registry.name) === 'components'
			? propertyKey(holder.name)
			: null;
	}
	return null;
}

function propertyKey(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	name: ts.PropertyName,
): string | null {
	return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
}
