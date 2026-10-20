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
 *   `import X from './X'` binds, and `const UI = await import('./X')` binds the whole object, as
 *   `import * as UI from './X'` does
 *   (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
 *
 * A loader call is judged by its name ({@link LOADERS}), and a loader under another name is
 * followed to where that name comes from ({@link lookup}): a renamed import of one, a variable
 * initialized with one (`const l = React.lazy`, `const { lazy: l } = React`,
 * `const l = require('next/dynamic')`). The shape cannot tell `lazy(() => import('./X'))` from
 * `useMemo(() => import('./X'), [])`, which holds a Promise, not a component
 * (https://react.dev/reference/react/useMemo). A loader that a project writes itself is not named,
 * and a function that merely shares a loader's name (or a member call ending in it, `x.lazy(…)`)
 * is taken for one: the name is not traced to the module it comes from, as the import may be
 * missing altogether (auto-imports of Nuxt).
 *
 * The name of a call is that of the nearest declaration in the lexical scopes around it, so a
 * parameter or a variable of a function that is called `lazy` or holds something else shadows the
 * loader of the file. A name that no scope declares is a loader only when {@link LOADERS} has it.
 */

import ts from 'typescript';

/**
 * The name a dynamic import is bound under: what {@link ./types.js} `ImportBinding` carries as
 * `localName` and `importedName`.
 */
export interface DynamicImportName {
	readonly localName: string;
	readonly importedName: string;
	/**
	 * `'namespace'` when the variable holds the whole module (`const UI = await import('./ui')`, with
	 * `'*'` as the `importedName`), as `import * as UI` binds it. Absent for one export.
	 */
	readonly type?: 'namespace';
}

/**
 * The module a loader call loads and the export of it that the component is: what
 * {@link loadedExport} reads from `lazy(() => import('./b/Item'))`.
 */
export interface LoadedExport {
	readonly source: string;
	readonly importedName: string;
}

/**
 * The calls that load a component lazily, by the name they are called under: React's `lazy`,
 * Vue's `defineAsyncComponent`, Next.js' `dynamic`, Loadable Components' `loadable` and
 * react-loadable's `Loadable` (its `loader` option is that of `defineAsyncComponent`). A member
 * call (`React.lazy`) is judged by its last name. A name is judged by the nearest declaration
 * around the call ({@link lookup}): a loader under another name is followed to its import or its
 * initializer, and a function, a parameter or a variable that holds something else is not one.
 */
const LOADERS: ReadonlySet<string> = new Set(['lazy', 'defineAsyncComponent', 'dynamic', 'loadable', 'Loadable']);

/**
 * The modules whose default export is a loader whatever the file calls it
 * (`import load from 'next/dynamic'`, `const load = require('next/dynamic')`).
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
 * - `const UI = await import('./a')` and `const UI = await import('./a').then(m => m)`: `UI` as
 *   the whole module (`importedName: '*'`, `type: 'namespace'`)
 *
 * `null` for any other shape (a call that is not a loader, one that is not the initializer of a
 * variable, a `.then` that does more than read one export, a function that does more than return
 * the import), where the module is not known to be bound to a single name.
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
	const callback = thenCallback(thenCall);
	const returned = callback && returnedExpression(callback);
	return callback && returned ? exportRead(callback.parameters[0]!.name, returned, forLoader) : null;
}

/**
 * The callback of a `.then` that takes the module as its one parameter. A second argument handles
 * the rejection, as a `.catch` does, so the value is then not the module: `null`.
 */
function thenCallback(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	thenCall: ts.CallExpression,
): ts.ArrowFunction | ts.FunctionExpression | null {
	const callback = thenCall.arguments[0];
	return thenCall.arguments.length === 1 && callback && isFunctionLike(callback) && callback.parameters.length === 1
		? callback
		: null;
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

/** Whether the `.then` callback returns its parameter as it is (`m => m`), which is the module. */
function returnsModule(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	thenCall: ts.CallExpression,
): boolean {
	const callback = thenCallback(thenCall);
	const parameter = callback?.parameters[0]!.name;
	const returned = callback && returnedExpression(callback);
	return !!parameter && ts.isIdentifier(parameter) && !!returned && identifierText(returned) === parameter.text;
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
 * Whether the call is a call of a loader ({@link LOADERS}): a member call is judged by its last
 * name, and a name by what the nearest scope that declares it makes of it ({@link lookup}).
 */
function isLoaderCall(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	call: ts.CallExpression,
): boolean {
	const callee = skipParentheses(call.expression);
	if (ts.isPropertyAccessExpression(callee)) {
		return LOADERS.has(callee.name.text);
	}
	return ts.isIdentifier(callee) && isLoaderName(callee, new Set());
}

/**
 * What a name stands for where a scope declares it. A loader is a name that a scope declares as a
 * loader: an import of one, or a variable that is initialized with one ({@link isLoaderValue}).
 */
type Binding =
	| { readonly kind: 'loader' }
	| { readonly kind: 'declared' }
	| {
			readonly kind: 'variable';
			readonly name: string;
			readonly initializer: ts.Expression | undefined;
			/** The property a name is taken from, for `const { lazy: l } = React` (`lazy`). */
			readonly key?: string;
	  };

const LOADER_IMPORT: Binding = { kind: 'loader' };
const DECLARED: Binding = { kind: 'declared' };

const bindingsOfScope = new WeakMap<ts.Node, ReadonlyMap<string, Binding>>();

/**
 * Whether the identifier names a loader where it is written. A name that no scope declares is a
 * loader when it is the name of one (`lazy` of `React.lazy` as a global, or auto-imported).
 *
 * @param visiting - The variables being judged, so that `const a = b; const b = a;` ends
 */
function isLoaderName(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	identifier: ts.Identifier,
	visiting: Set<Binding>,
): boolean {
	const binding = lookup(identifier);
	if (!binding) {
		return LOADERS.has(identifier.text);
	}
	if (binding.kind !== 'variable') {
		return binding.kind === 'loader';
	}
	if (visiting.has(binding)) {
		return false;
	}
	visiting.add(binding);
	const isLoader = isLoaderValue(binding, visiting);
	visiting.delete(binding);
	return isLoader;
}

/**
 * Whether the variable holds a loader. A variable that has the name of one is, as the name is all
 * that is judged of a loader the file does not import (`const Loadable = require('react-loadable')`),
 * unless it is initialized with a function written in place or with the result of a call other than
 * `require` (`const lazy = createLazy()`). Under another name it is judged by what
 * it is initialized with (through parentheses and type-only wrappers): a member read ending in the
 * name of a loader (`React.lazy`), a name that is one, `require` of a module of
 * {@link LOADER_MODULES} (and its `default`). A destructured name is judged by the property it takes
 * (`const { lazy: l } = React`, `const { default: l } = require('next/dynamic')`). Only the
 * initializer is read: `let l; l = React.lazy` is not followed.
 */
function isLoaderValue(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	variable: Extract<Binding, { kind: 'variable' }>,
	visiting: Set<Binding>,
): boolean {
	const initializer = variable.initializer && skipParentheses(variable.initializer);
	if (initializer && isFunctionLike(initializer)) {
		return false;
	}
	if (initializer && isLoaderInitializer(variable, initializer, visiting)) {
		return true;
	}
	const isOtherCall =
		initializer &&
		ts.isCallExpression(initializer) &&
		!(ts.isIdentifier(initializer.expression) && initializer.expression.text === 'require');
	return !isOtherCall && LOADERS.has(variable.name);
}

function isLoaderInitializer(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	variable: Extract<Binding, { kind: 'variable' }>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	initializer: ts.Expression,
	visiting: Set<Binding>,
): boolean {
	if (variable.key !== undefined) {
		return LOADERS.has(variable.key) || (variable.key === 'default' && isLoaderModuleRequire(initializer));
	}
	if (ts.isPropertyAccessExpression(initializer)) {
		return (
			LOADERS.has(initializer.name.text) ||
			(initializer.name.text === 'default' && isLoaderModuleRequire(skipParentheses(initializer.expression)))
		);
	}
	if (ts.isIdentifier(initializer)) {
		return isLoaderName(initializer, visiting);
	}
	return isLoaderModuleRequire(initializer);
}

/** Whether the expression is `require('next/dynamic')` or another module of {@link LOADER_MODULES}. */
function isLoaderModuleRequire(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	expression: ts.Expression,
): boolean {
	const [specifier] = ts.isCallExpression(expression) ? expression.arguments : [];
	return (
		ts.isCallExpression(expression) &&
		ts.isIdentifier(expression.expression) &&
		expression.expression.text === 'require' &&
		!!specifier &&
		ts.isStringLiteral(specifier) &&
		LOADER_MODULES.has(specifier.text)
	);
}

/**
 * The declaration of the name that is nearest to where it is written, going outwards through the
 * scopes around it; `null` when no scope declares it.
 */
function lookup(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	identifier: ts.Identifier,
): Binding | null {
	for (let node: ts.Node | undefined = identifier.parent; node; node = node.parent) {
		const binding = bindingsOf(node)?.get(identifier.text);
		if (binding) {
			return binding;
		}
	}
	return null;
}

/**
 * The names a node declares as a scope, or `undefined` for a node that is none. The scopes are the
 * file, the blocks (`let`, `const`, functions and classes), the functions (parameters, and the `var`
 * that is hoisted to the function), the heads of `for` loops and the `catch` clause.
 */
function bindingsOf(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
): ReadonlyMap<string, Binding> | undefined {
	const cached = bindingsOfScope.get(node);
	if (cached) {
		return cached;
	}

	const bindings = new Map<string, Binding>();
	if (ts.isSourceFile(node)) {
		declareStatements(node.statements, bindings);
		for (const statement of node.statements) {
			declareImports(statement, bindings);
		}
		declareHoistedVariables(node, bindings);
	} else if (ts.isBlock(node)) {
		declareStatements(node.statements, bindings);
	} else if (ts.isModuleBlock(node)) {
		// a `namespace` body is a scope of its own for `var` too
		declareStatements(node.statements, bindings);
		declareHoistedVariables(node, bindings);
	} else if (ts.isCaseBlock(node)) {
		for (const clause of node.clauses) {
			declareStatements(clause.statements, bindings);
		}
	} else if (ts.isFunctionLike(node)) {
		for (const parameter of node.parameters) {
			declareNames(parameter.name, bindings);
		}
		if (ts.isFunctionExpression(node) && node.name) {
			bindings.set(node.name.text, DECLARED);
		}
		declareHoistedVariables(node, bindings);
	} else if (
		(ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) &&
		node.initializer &&
		ts.isVariableDeclarationList(node.initializer) &&
		node.initializer.flags & ts.NodeFlags.BlockScoped
	) {
		for (const declaration of node.initializer.declarations) {
			declareVariable(declaration, bindings);
		}
	} else if (ts.isCatchClause(node)) {
		if (node.variableDeclaration) {
			declareNames(node.variableDeclaration.name, bindings);
		}
	} else if (ts.isClassExpression(node) && node.name) {
		// the name of a class expression is visible inside the class only
		bindings.set(node.name.text, DECLARED);
	} else {
		return undefined;
	}

	bindingsOfScope.set(node, bindings);
	return bindings;
}

/**
 * Declares what the statements of a block declare in it: `let` and `const`, functions, classes and
 * enums. A function is no loader whatever it is called.
 */
function declareStatements(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	statements: readonly ts.Statement[],
	bindings: Map<string, Binding>,
): void {
	for (const statement of statements) {
		if (
			(ts.isFunctionDeclaration(statement) ||
				ts.isClassDeclaration(statement) ||
				ts.isEnumDeclaration(statement)) &&
			statement.name
		) {
			bindings.set(statement.name.text, DECLARED);
		} else if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.BlockScoped) {
			for (const declaration of statement.declarationList.declarations) {
				declareVariable(declaration, bindings);
			}
		}
	}
}

/**
 * Declares what an `import` of the file binds. A loader is the default import of
 * {@link LOADER_MODULES}, the named import of a name of {@link LOADERS} (under any local name), and
 * a binding that has the name of one, whatever it is imported from (the module is not checked, as
 * for a loader that is not imported). Any other binding, a type-only one too, is some other value.
 */
function declareImports(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	statement: ts.Statement,
	bindings: Map<string, Binding>,
): void {
	if (ts.isImportEqualsDeclaration(statement)) {
		// `import load = require('next/dynamic')`
		const reference = statement.moduleReference;
		const isLoader =
			!statement.isTypeOnly &&
			((ts.isExternalModuleReference(reference) &&
				ts.isStringLiteral(reference.expression) &&
				LOADER_MODULES.has(reference.expression.text)) ||
				LOADERS.has(statement.name.text));
		bindings.set(statement.name.text, isLoader ? LOADER_IMPORT : DECLARED);
		return;
	}
	if (!ts.isImportDeclaration(statement) || !statement.importClause) {
		return;
	}
	const clause = statement.importClause;
	const typeOnly = clause.isTypeOnly;
	if (clause.name) {
		const module = statement.moduleSpecifier;
		bindings.set(
			clause.name.text,
			!typeOnly &&
				((ts.isStringLiteral(module) && LOADER_MODULES.has(module.text)) || LOADERS.has(clause.name.text))
				? LOADER_IMPORT
				: DECLARED,
		);
	}
	const named = clause.namedBindings;
	if (named && ts.isNamespaceImport(named)) {
		bindings.set(named.name.text, DECLARED);
	} else if (named) {
		for (const element of named.elements) {
			bindings.set(
				element.name.text,
				!typeOnly &&
					!element.isTypeOnly &&
					(LOADERS.has((element.propertyName ?? element.name).text) || LOADERS.has(element.name.text))
					? LOADER_IMPORT
					: DECLARED,
			);
		}
	}
}

/**
 * Declares the `var` that `root` holds, wherever in it (a block, the head of a loop): `var` belongs
 * to the function, not to the block. A nested function, `namespace` body or class static block has
 * its own.
 */
function declareHoistedVariables(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	root: ts.Node,
	bindings: Map<string, Binding>,
): void {
	const visit = (node: ts.Node) => {
		if (ts.isFunctionLike(node) || ts.isModuleBlock(node) || ts.isClassStaticBlockDeclaration(node)) {
			return;
		}
		if (ts.isVariableDeclarationList(node) && !(node.flags & ts.NodeFlags.BlockScoped)) {
			for (const declaration of node.declarations) {
				declareVariable(declaration, bindings);
			}
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(root, visit);
}

/**
 * Declares the names of a variable: the name as it is with its initializer, and a name that an
 * object pattern takes by one property (`{ lazy: l }`) with that property. A name of a nested
 * pattern, an array pattern or a rest is some other value.
 */
function declareVariable(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	declaration: ts.VariableDeclaration,
	bindings: Map<string, Binding>,
): void {
	const { name, initializer } = declaration;
	const head = declaration.parent.parent;
	if (ts.isForInStatement(head) || ts.isForOfStatement(head)) {
		// the value comes from the loop, not from an initializer
		declareNames(name, bindings);
		return;
	}
	if (ts.isIdentifier(name)) {
		bindings.set(name.text, { kind: 'variable', name: name.text, initializer });
		return;
	}
	if (!ts.isObjectBindingPattern(name)) {
		declareNames(name, bindings);
		return;
	}
	for (const element of name.elements) {
		const key = element.propertyName ? propertyKey(element.propertyName) : null;
		if (ts.isIdentifier(element.name) && !element.dotDotDotToken && (element.propertyName ? key : true)) {
			bindings.set(element.name.text, {
				kind: 'variable',
				name: element.name.text,
				initializer,
				key: key ?? element.name.text,
			});
		} else {
			declareNames(element.name, bindings);
		}
	}
}

/** Declares every name of a binding name as some other value (a parameter, a `catch` variable). */
function declareNames(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	name: ts.BindingName,
	bindings: Map<string, Binding>,
): void {
	if (ts.isIdentifier(name)) {
		bindings.set(name.text, DECLARED);
		return;
	}
	for (const element of name.elements) {
		if (!ts.isOmittedExpression(element)) {
			declareNames(element.name, bindings);
		}
	}
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
	const statement = declaration.parent.parent;
	const block = statement.parent;
	return ts.isVariableStatement(statement) &&
		ts.isBlock(block) &&
		isFunctionLike(block.parent) &&
		wrapperCall(block.parent)
		? block
		: null;
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
	const loader = statementLoader(call);
	const localName = loader && assignedName(loader.wrapper);
	return loader && localName ? { localName, importedName: loader.importedName } : null;
}

/** The loader call that an import is the one of, and the export of the module that it reads. */
interface LoaderImport {
	readonly wrapper: ts.CallExpression;
	readonly importedName: string;
}

/** The loader call and the export of {@link statementLoaderName}, whatever the call is assigned to. */
function statementLoader(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	call: ts.CallExpression,
): LoaderImport | null {
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
	const importedName = exportRead(declaration.name, second.expression, true);
	return wrapper && importedName ? { wrapper, importedName } : null;
}

/**
 * The loader call that takes the function the import is returned from, and the export of the
 * module that the loader hands on: `default`, or what the `.then` reads. `null` for an import that
 * no loader call takes.
 */
function loaderOf(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	call: ts.CallExpression,
): LoaderImport | null {
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
	if (wrapper) {
		return { wrapper, importedName };
	}
	return thenCall ? null : statementLoader(call);
}

/**
 * The module that a loader call loads and the export of it that the component is, for an
 * expression that is a loader call (`lazy(() => import('./b/Item'))`), or one that holds it as its
 * first argument (`memo(lazy(…))`, `connect(map)(lazy(…))`). That is what a default export or a
 * variable of the file stands for, as a static `import Item from './b/Item'` would.
 *
 * @param expression - An expression in a source file parsed with its parent nodes set
 * @returns The module and the export, or `null` for any other expression, a loader whose import is
 *   not a string literal, and one that is not read as {@link dynamicImportName} reads it
 */
export function loadedExport(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	expression: ts.Expression,
): LoadedExport | null {
	let current = skipParentheses(expression);
	while (ts.isCallExpression(current)) {
		if (isLoaderCall(current)) {
			return loadedByLoader(current);
		}
		const [first] = current.arguments;
		if (!first) {
			return null;
		}
		current = skipParentheses(first);
	}
	return null;
}

const loadedByLoaderCall = new WeakMap<ts.CallExpression, LoadedExport | null>();

/**
 * The module the loader function of a loader call loads (see {@link loadedExport}). The answer is
 * kept per call: the export table, the scanner of a file and the import analysis ask for the same
 * call, and each reads the whole function.
 */
function loadedByLoader(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	loaderCall: ts.CallExpression,
): LoadedExport | null {
	if (loadedByLoaderCall.has(loaderCall)) {
		return loadedByLoaderCall.get(loaderCall) ?? null;
	}
	const loaded = findLoadedModule(loaderCall);
	loadedByLoaderCall.set(loaderCall, loaded);
	return loaded;
}

function findLoadedModule(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	loaderCall: ts.CallExpression,
): LoadedExport | null {
	let found: LoadedExport | null = null;
	const visit = (node: ts.Node) => {
		if (found) {
			return;
		}
		if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			const specifier = node.arguments[0];
			const loader = specifier && ts.isStringLiteral(specifier) ? loaderOf(node) : null;
			if (loader?.wrapper === loaderCall && specifier && ts.isStringLiteral(specifier)) {
				found = { source: specifier.text, importedName: loader.importedName };
				return;
			}
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(loaderCall, visit);
	return found;
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
 * The whole module read into a variable (`const UI = await import('./a')`, or `.then(m => m)`) is
 * bound as a namespace under that name, as `import * as UI from './a'` binds it, so that the member
 * tag `<UI.Button>` is matched to the component `Button` of the module. A variable of the loader
 * function itself (see {@link loaderBodyOf}) is not named.
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
		if (ts.isIdentifier(declaration.name) && (!thenCall || returnsModule(thenCall))) {
			return { localName: declaration.name.text, importedName: '*', type: 'namespace' };
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
