/**
 * @module dynamic-import-name
 *
 * Names a dynamic `import('...')` after the component it loads. A dynamic import has no
 * binding of its own, but the way a component is loaded gives it one: the variable the
 * loading call is assigned to, the key it is registered under in the `components` option of
 * Vue, or the variable the awaited import is read into.
 *
 * - React presents `lazy(() => import('./X'))` as the replacement of the static `import` of the
 *   same component, and requires the module to have the component as its default export
 *   (https://react.dev/reference/react/lazy)
 * - Vue's `defineAsyncComponent` takes a loader function, or an options object with a `loader`
 *   (https://vuejs.org/guide/components/async.html)
 * - `import()` fulfills to a module namespace object, so `(await import('./X')).default` and
 *   `const { default: X } = await import('./X')` read the same export a static
 *   `import X from './X'` binds
 *   (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
 *
 * A loader call is judged by its name ({@link LOADERS}), and a renamed import of one is followed,
 * because its shape cannot tell `lazy(() => import('./X'))` from `useMemo(() => import('./X'), [])`,
 * which holds a Promise, not a component (https://react.dev/reference/react/useMemo). A loader that
 * a project writes itself is not named, and a function that merely shares a loader's name (or a
 * member call ending in it, `x.lazy(…)`) is taken for one: the name is not traced to the module it
 * comes from, as the import may be missing altogether (auto-imports of Nuxt).
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
 * The calls that load a component lazily, by the name they are called under: React's `lazy`,
 * Vue's `defineAsyncComponent`, Next.js' `dynamic`, Loadable Components' `loadable` and
 * react-loadable's `Loadable` (its `loader` option is that of `defineAsyncComponent`). A member
 * call (`React.lazy`) is judged by its last name, and a renamed import of one is followed
 * ({@link loaderScope}); a function the file declares under such a name is its own, not a loader.
 */
const LOADERS: ReadonlySet<string> = new Set(['lazy', 'defineAsyncComponent', 'dynamic', 'loadable', 'Loadable']);

/**
 * The modules whose default export is a loader whatever the file calls it
 * (`import load from 'next/dynamic'`).
 */
const LOADER_MODULES: ReadonlySet<string> = new Set(['next/dynamic', '@loadable/component']);

/**
 * Names the dynamic `import()` call after the component it loads, from where its result ends up:
 *
 * - `const X = lazy(() => import('./a'))`: `X` as the default export
 * - `const X = lazy(() => import('./a').then(m => ({ default: m.Y })))` or `.then(m => m.Y)`:
 *   `X` as `Y`; a destructured parameter (`({ Y }) => ({ default: Y })`) reads `Y` the same way
 * - `const X = lazy(() => delayForDemo(import('./a')))`: the loader may pass the import through a
 *   call that takes it first
 * - `const X = lazy(async () => { const m = await import('./a'); return m.default; })`: the module
 *   read in a statement, then returned as the `.then` forms read it
 * - `const X = memo(lazy(() => import('./a')))`: the call that holds the loader may be the first
 *   argument of another
 * - `defineAsyncComponent({ loader: () => import('./a') })`: as the function form
 * - `components: { X: defineAsyncComponent(() => import('./a')) }`: `X`
 * - `const X = (await import('./a')).default`, `const { default: X } = await import('./a')` and
 *   `const { Y: X } = await import('./a')`: `X` as `default`, `default` and `Y`; no loader call
 *   is needed since the variable is bound to the export itself
 *
 * `null` for any other shape (a call that is not a loader, one that is not the initializer of a
 * variable, a `.then` that does more than read one export, a function that does more than return
 * the import, the whole module read into a variable), where the module is not known to be bound
 * to a single name.
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
	if (localName) {
		return { localName, importedName };
	}

	return (thenCall ? null : statementLoaderName(call)) ?? declaredName(loaded, thenCall);
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
 * The export `.then(m => ({ default: m.Y }))` or `.then(m => m.Y)` reads from the module, `Y`
 * (see {@link exportRead}); `null` for any other callback.
 *
 * @param thenCall - The `.then(...)` call
 * @param forLoader - Whether the result is what a loader returns, which React reads the `default`
 *   of; when it is not (`const X = await import('./a').then(…)`), only the callback that returns
 *   the export itself reads one
 */
function namedExportOfThen(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	thenCall: ts.CallExpression,
	forLoader = true,
): string | null {
	const callback = thenCall.arguments[0];
	if (!callback || !isFunctionLike(callback) || callback.parameters.length !== 1) {
		return null;
	}
	const returned = returnedExpression(callback);
	return returned ? exportRead(callback.parameters[0]!.name, returned, forLoader) : null;
}

/**
 * The export of a module that `returned` hands on, when `binding` holds the module (a `.then`
 * parameter, or the variable of `const … = await import(…)`). For a loader (`forLoader`), whose
 * result React reads the `default` of:
 *
 * - `m` (the module as it is): `default`
 * - `m.Y`: `Y`
 * - `{ default: m.Y }`: `Y`
 * - for the pattern `{ Y }`, `{ Y: Z }` or `{ default: Z }`: the export the pattern takes, when
 *   `returned` is the variable it declares, alone or as `{ default: Z }`
 *
 * Otherwise only the export itself is read (`m.Y`, or the variable the pattern declares): the
 * module `m` and the object `{ default: m.Y }` are not a component.
 *
 * `null` for any other binding (two properties, a rest, a nested pattern, a computed key) or
 * return.
 */
function exportRead(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	binding: ts.BindingName,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	returned: ts.Expression,
	forLoader: boolean,
): string | null {
	const value = skipParentheses(returned);
	const defaultOf = forLoader ? defaultProperty(value) : null;

	if (ts.isIdentifier(binding)) {
		if (defaultOf) {
			return memberOf(defaultOf, binding.text);
		}
		return forLoader && identifierText(value) === binding.text ? 'default' : memberOf(value, binding.text);
	}

	const taken = takenExport(binding);
	if (!taken) {
		return null;
	}
	const read = defaultOf ?? value;
	return identifierText(read) === taken.localName ? taken.importedName : null;
}

/** The initializer of the only property of `{ default: … }`, or `null` for any other expression. */
function defaultProperty(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	value: ts.Expression,
): ts.Expression | null {
	if (!ts.isObjectLiteralExpression(value)) {
		return null;
	}
	const [only] = value.properties;
	return value.properties.length === 1 &&
		only &&
		ts.isPropertyAssignment(only) &&
		propertyKey(only.name) === 'default'
		? only.initializer
		: null;
}

/** The text of an identifier (parentheses and type-only wrappers skipped), or `null`. */
function identifierText(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	expression: ts.Expression,
): string | null {
	const target = skipParentheses(expression);
	return ts.isIdentifier(target) ? target.text : null;
}

/**
 * The only export an object pattern takes from a module, and the variable it declares:
 * `{ Y }` is `Y` as `Y`, `{ Y: Z }` is `Y` as `Z`. `null` for a pattern that takes anything else.
 */
function takenExport(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	pattern: ts.BindingName,
): { readonly importedName: string; readonly localName: string } | null {
	if (!ts.isObjectBindingPattern(pattern)) {
		return null;
	}
	const [only] = pattern.elements;
	if (pattern.elements.length !== 1 || !only || only.dotDotDotToken || !ts.isIdentifier(only.name)) {
		return null;
	}
	const importedName = only.propertyName ? propertyKey(only.propertyName) : only.name.text;
	return importedName === null ? null : { importedName, localName: only.name.text };
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

/** The call that takes `node` as its first argument. */
function callTaking(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
): ts.CallExpression | null {
	const target = outer(node);
	const parent = target.parent;
	return parent && ts.isCallExpression(parent) && parent.arguments[0] === target ? parent : null;
}

/**
 * The function that returns `node` and does nothing else, `node` being passed through any number
 * of calls that take it as the first argument (`delayForDemo(import('./a'))`, which the page of
 * `lazy` demonstrates).
 */
function loaderFunction(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
): ts.ArrowFunction | ts.FunctionExpression | null {
	let returned = node;
	for (let holding = callTaking(returned); holding; holding = callTaking(returned)) {
		returned = holding;
	}
	const parent = outer(returned).parent;
	if (!parent) {
		return null;
	}
	if (isFunctionLike(parent)) {
		const body = returnedExpression(parent);
		return body && skipParentheses(body) === returned ? parent : null;
	}
	if (ts.isReturnStatement(parent) && ts.isBlock(parent.parent) && isFunctionLike(parent.parent.parent)) {
		return returnedExpression(parent.parent.parent) === parent.expression ? parent.parent.parent : null;
	}
	return null;
}

/**
 * The call of a loader ({@link LOADERS}) that takes the loader function as its first argument, or
 * as the `loader` of its options.
 */
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

	return holder && ts.isCallExpression(holder) && holder.arguments[0] === argument && isLoaderCall(holder)
		? holder
		: null;
}

/**
 * Whether the call is a call of a loader ({@link LOADERS}), as it is named in its own file: not a
 * function that the file declares itself under the name of a loader.
 */
function isLoaderCall(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	call: ts.CallExpression,
): boolean {
	const callee = skipParentheses(call.expression);
	if (ts.isPropertyAccessExpression(callee)) {
		return LOADERS.has(callee.name.text);
	}
	if (!ts.isIdentifier(callee)) {
		return false;
	}
	const scope = loaderScope(call.getSourceFile());
	return !scope.declared.has(callee.text) && (LOADERS.has(callee.text) || scope.imported.has(callee.text));
}

interface LoaderScope {
	/** The names the file imports a loader under, when that is not its own name. */
	readonly imported: ReadonlySet<string>;
	/** The names of the functions the file declares at its top level. */
	readonly declared: ReadonlySet<string>;
}

const loaderScopeOfFile = new WeakMap<ts.SourceFile, LoaderScope>();

/**
 * What the top level of a file says about the names of loaders: `lazy as l` and the default import
 * of {@link LOADER_MODULES} are loaders under the local name, and `function dynamic() {}` is not
 * the loader of that name.
 */
function loaderScope(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	sourceFile: ts.SourceFile,
): LoaderScope {
	const cached = loaderScopeOfFile.get(sourceFile);
	if (cached) {
		return cached;
	}

	const names = new Set<string>();
	const declared = new Set<string>();
	for (const statement of sourceFile.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name) {
			declared.add(statement.name.text);
			continue;
		}
		if (!ts.isImportDeclaration(statement)) {
			continue;
		}
		const clause = statement.importClause;
		if (!clause || clause.isTypeOnly) {
			continue;
		}
		if (
			clause.name &&
			ts.isStringLiteral(statement.moduleSpecifier) &&
			LOADER_MODULES.has(statement.moduleSpecifier.text)
		) {
			names.add(clause.name.text);
		}
		const bindings = clause.namedBindings;
		if (bindings && ts.isNamedImports(bindings)) {
			for (const element of bindings.elements) {
				if (!element.isTypeOnly && LOADERS.has((element.propertyName ?? element.name).text)) {
					names.add(element.name.text);
				}
			}
		}
	}
	const scope = { imported: names, declared };
	loaderScopeOfFile.set(sourceFile, scope);
	return scope;
}

/**
 * The variable the call initializes, or the key of the Vue `components` option it is registered
 * under. A call that is the first argument of another (`memo(lazy(…))`) is held by that one, as
 * {@link ../export-table.js wrappedIdentifier} follows `memo(Item)`.
 */
function assignedName(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	call: ts.CallExpression,
): string | null {
	let held = call;
	for (let holding = callTaking(held); holding; holding = callTaking(held)) {
		held = holding;
	}
	const target = outer(held);
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

/** Whether `node` is the operand of an `await` (through parentheses and type-only wrappers). */
function isAwaited(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
): boolean {
	let current = node;
	while (current.parent && isTransparent(current.parent) && current.parent.expression === current) {
		current = current.parent;
		if (ts.isAwaitExpression(current)) {
			return true;
		}
	}
	return false;
}

/** The declaration `const … = await <node>` initializes. */
function awaitedDeclaration(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
): ts.VariableDeclaration | null {
	const target = outer(node);
	const holder = target.parent;
	return isAwaited(node) && holder && ts.isVariableDeclaration(holder) && holder.initializer === target
		? holder
		: null;
}

/**
 * The body of the function a variable statement sits directly in, when that function is the
 * loader of a loader call. The variable is local to it, so it is not a name the file renders.
 */
function loaderBodyOf(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	declaration: ts.VariableDeclaration,
): ts.Block | null {
	const block = declaration.parent.parent.parent;
	return ts.isBlock(block) && isFunctionLike(block.parent) && wrapperCall(block.parent) ? block : null;
}

/**
 * Names the import of a loader written as `async () => { const m = await import('./a'); return m; }`:
 * the module is read into a variable in the first statement and the second returns it, which is
 * read as the `.then` callback is ({@link exportRead}). A loader with anything else in it is not
 * named.
 */
function statementLoaderName(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	call: ts.CallExpression,
): DynamicImportName | null {
	const declaration = awaitedDeclaration(call);
	const block = declaration && loaderBodyOf(declaration);
	const list = declaration?.parent;
	if (
		!declaration ||
		!block ||
		!list ||
		!ts.isVariableDeclarationList(list) ||
		list.declarations.length !== 1 ||
		!(list.flags & ts.NodeFlags.Const)
	) {
		return null;
	}

	const [first, second] = block.statements;
	if (
		block.statements.length !== 2 ||
		first !== declaration.parent.parent ||
		!second ||
		!ts.isReturnStatement(second) ||
		!second.expression
	) {
		return null;
	}

	const wrapper = wrapperCall(block.parent as ts.ArrowFunction | ts.FunctionExpression);
	const localName = wrapper && assignedName(wrapper);
	const importedName = exportRead(declaration.name, second.expression, true);
	return localName && importedName ? { localName, importedName } : null;
}

/**
 * Names an awaited import after the variable it is read into, with no loader call: the variable is
 * bound to one export of the module, as a static `import` binds it.
 *
 * - `const X = (await import('./a')).Y`: `X` as `Y`
 * - `const { Y } = await import('./a')` and `const { Y: X } = await import('./a')`: `Y` as `Y`, `X` as `Y`
 * - `const X = await import('./a').then(m => m.Y)`: `X` as `Y`, when `.then` returns the export
 *   itself ({@link namedExportOfThen}; the module, or `{ default: m.Y }`, is not a component)
 *
 * The whole module read into a variable (`const m = await import('./a')`) is not a single name.
 * A variable of the loader function itself (see {@link loaderBodyOf}) is not named.
 *
 * @param loaded - The import call, or its `.then` call
 * @param thenCall - The `.then` call, or `null` when `loaded` is the import itself
 * @returns The names to bind the import under, or `null`
 */
function declaredName(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	loaded: ts.Node,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	thenCall: ts.CallExpression | null,
): DynamicImportName | null {
	if (!isAwaited(loaded)) {
		return null;
	}

	const declaration = awaitedDeclaration(loaded);
	if (declaration) {
		if (loaderBodyOf(declaration)) {
			return null;
		}
		if (thenCall) {
			const importedName = namedExportOfThen(thenCall, false);
			return importedName !== null && ts.isIdentifier(declaration.name)
				? { localName: declaration.name.text, importedName }
				: null;
		}
		return takenExport(declaration.name);
	}

	// `(await import('./a')).Y`: the awaited module is the object of a property read
	const target = outer(loaded);
	const access = target.parent;
	if (thenCall || !access || !ts.isPropertyAccessExpression(access) || access.expression !== target) {
		return null;
	}
	const holder = outer(access).parent;
	return holder &&
		ts.isVariableDeclaration(holder) &&
		holder.initializer === outer(access) &&
		ts.isIdentifier(holder.name) &&
		!loaderBodyOf(holder)
		? { localName: holder.name.text, importedName: access.name.text }
		: null;
}

function propertyKey(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	name: ts.PropertyName,
): string | null {
	return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
}
