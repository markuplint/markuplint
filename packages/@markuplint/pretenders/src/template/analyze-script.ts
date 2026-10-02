import type {
	BindingName,
	CallExpression,
	Expression,
	ObjectBindingPattern,
	ObjectLiteralExpression,
	PropertyName,
	Statement,
	VariableStatement,
} from 'typescript';

import ts from 'typescript';

const {
	createSourceFile,
	isArrayLiteralExpression,
	isAsExpression,
	isBindingElement,
	isCallExpression,
	isClassDeclaration,
	isExpressionStatement,
	isFunctionDeclaration,
	isIdentifier,
	isImportDeclaration,
	isNonNullExpression,
	isObjectBindingPattern,
	isObjectLiteralExpression,
	isParenthesizedExpression,
	isPropertyAccessExpression,
	isPropertyAssignment,
	isPropertySignature,
	isSatisfiesExpression,
	isStringLiteral,
	isTypeLiteralNode,
	isVariableStatement,
	ScriptKind,
	ScriptTarget,
	SyntaxKind,
} = ts;

export type Framework = 'vue' | 'svelte' | 'astro';

/**
 * What the script of a component says about its props, as far as the template can use it.
 */
export type ScriptProps = {
	/**
	 * Each name that the template can refer to a prop by, with the name of the prop:
	 * `label` is `label`, and the alias of `{ title: heading }` is `title`.
	 * A prop with a default value is not here, as the attribute is still rendered
	 * when the usage site omits the prop.
	 */
	readonly locals: ReadonlyMap<string, string>;
	/**
	 * The expressions that are the whole props object: `props` of
	 * `const props = defineProps()`, and `Astro.props`.
	 */
	readonly objects: ReadonlySet<string>;
	/**
	 * The expressions whose spread (`{...rest}`) hands the props over to an element: the rest
	 * of a destructuring, and the objects of all the props.
	 */
	readonly rests: ReadonlySet<string>;
};

/**
 * Collects the props that the script of a component declares.
 *
 * - Vue (`<script setup>`): `defineProps` as an array, an object, or a type literal; `withDefaults`;
 *   the result of it as an object or a destructuring. A type that is not a literal
 *   (`defineProps<Props>()`) says nothing about the names, as no type is resolved. The
 *   Options API (`props: [...]`) is not read.
 * - Svelte: `export let` (Svelte 4); `let { ... } = $props()` (Svelte 5). `$$props` and
 *   `$$restProps` are always there.
 * - Astro: `const { ... } = Astro.props`.
 *
 * A prop is not trusted when the script declares the same name otherwise at the top level
 * (a variable, a function, a class, or an import): the template then refers to that.
 * Nothing nested is read, so it is a limited reading of the script, not scope analysis.
 *
 * A script that is missing or cannot be read says nothing: its template attributes
 * stay `{ dynamic: true }`.
 */
export function analyzeScript(framework: Framework, source: string | undefined): ScriptProps {
	const locals = new Map<string, string>();
	const objects = new Set<string>(BUILTIN_OBJECTS[framework]);
	const rests = new Set<string>(BUILTIN_REST[framework]);
	const declaredElsewhere = new Set<string>();

	if (!source) {
		return { locals, objects, rests };
	}

	const sourceFile = createSourceFile('component-script.ts', source, ScriptTarget.Latest, false, ScriptKind.TS);

	for (const statement of sourceFile.statements) {
		if (isExpressionStatement(statement)) {
			const declared = readProps(framework, statement.expression);
			if (declared) {
				addNames(locals, declared.names, declared.defaults);
			}
			continue;
		}

		if (isVariableStatement(statement)) {
			readVariableStatement(framework, statement, { locals, objects, rests, declaredElsewhere });
			continue;
		}

		for (const name of getDeclaredNames(statement)) {
			declaredElsewhere.add(name);
		}
	}

	for (const name of declaredElsewhere) {
		locals.delete(name);
	}

	return { locals, objects, rests };
}

const BUILTIN_OBJECTS: Readonly<Record<Framework, readonly string[]>> = {
	vue: ['$props'],
	svelte: ['$$props'],
	astro: ['Astro.props'],
};

const BUILTIN_REST: Readonly<Record<Framework, readonly string[]>> = {
	vue: [],
	svelte: ['$$restProps', '$$props'],
	astro: ['Astro.props'],
};

/**
 * Returns the name of the prop that the source of a template expression is just a name
 * of, or `undefined` (see {@link createTemplatePropResolver}).
 */
export type TemplatePropResolver = (expression: string | undefined) => string | undefined;

/**
 * The prop that a template expression is just a name of, or `undefined`:
 * `label`, `props.label`, `$props.label`, `Astro.props.label`. Anything else
 * (`label ?? 'x'`, `props?.label`, a call) is not one.
 *
 * Vue lowercases the name of an attribute at the usage site (`myLabel` and `my-label`
 * are not found by the name of the prop), so a prop with an uppercase letter is not one there.
 *
 * Known limitation: Vue gives a Boolean-typed prop that the usage site omits the value
 * `false`, so `:aria-hidden="flag"` renders `aria-hidden="false"`, while the attribute
 * is omitted here, as for any prop. No type is resolved to tell them apart.
 */
export function createTemplatePropResolver(framework: Framework, props: ScriptProps): TemplatePropResolver {
	return expression => {
		const text = expression?.trim();
		if (!text || !PATH.test(text)) {
			return;
		}

		const dot = text.lastIndexOf('.');
		const prop =
			dot === -1
				? props.locals.get(text)
				: props.objects.has(text.slice(0, dot))
					? text.slice(dot + 1)
					: undefined;

		if (prop === undefined || prop === 'children' || (framework === 'vue' && /[A-Z]/.test(prop))) {
			return;
		}
		return prop;
	};
}

const PATH = /^[$A-Z_][\w$]*(?:\.[$A-Z_][\w$]*)*$/i;

type Collected = {
	readonly locals: Map<string, string>;
	readonly objects: Set<string>;
	readonly rests: Set<string>;
	readonly declaredElsewhere: Set<string>;
};

function readVariableStatement(
	framework: Framework,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	statement: VariableStatement,
	collected: Collected,
) {
	const { locals, objects, rests, declaredElsewhere } = collected;
	const isExported = statement.modifiers?.some(modifier => modifier.kind === SyntaxKind.ExportKeyword) ?? false;

	for (const declaration of statement.declarationList.declarations) {
		const { name, initializer } = declaration;

		// Svelte 4: `export let label;` is a prop; with an initial value it is not trusted
		if (framework === 'svelte' && isExported && isIdentifier(name)) {
			if (!initializer) {
				locals.set(name.text, name.text);
			}
			continue;
		}

		const declared = readProps(framework, initializer);
		if (!declared) {
			for (const bound of getBindingNames(name)) {
				declaredElsewhere.add(bound);
			}
			continue;
		}

		addNames(locals, declared.names, declared.defaults);

		if (isIdentifier(name)) {
			objects.add(name.text);
			rests.add(name.text);
		} else if (isObjectBindingPattern(name)) {
			readDestructuring(name, locals, rests);
		}
	}
}

/**
 * `const { label, title: heading, size = 1, ...rest } = props`
 */
function readDestructuring(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	pattern: ObjectBindingPattern,
	locals: Map<string, string>,
	rests: Set<string>,
) {
	for (const element of pattern.elements) {
		if (!isIdentifier(element.name)) {
			continue;
		}
		if (element.dotDotDotToken) {
			rests.add(element.name.text);
			continue;
		}
		const prop = element.propertyName ? getPropertyName(element.propertyName) : element.name.text;
		if (prop === undefined) {
			continue;
		}
		if (element.initializer) {
			// A default value is rendered when the usage site omits the prop
			locals.delete(prop);
			locals.delete(element.name.text);
			continue;
		}
		locals.set(element.name.text, prop);
	}
}

type DeclaredProps = {
	/** The names the declaration gives; empty when it does not say. */
	readonly names: readonly string[];
	/** The names that have a default value. */
	readonly defaults: readonly string[];
};

function addNames(locals: Map<string, string>, names: readonly string[], defaults: readonly string[]) {
	for (const name of names) {
		if (!defaults.includes(name)) {
			locals.set(name, name);
		}
	}
}

/**
 * What an expression that declares the props is: `defineProps(...)` (with `withDefaults`),
 * `$props()`, or `Astro.props`.
 */
function readProps(
	framework: Framework,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	expression: Expression | undefined,
): DeclaredProps | undefined {
	const target = unwrap(expression);
	if (!target) {
		return undefined;
	}

	if (framework === 'astro') {
		return isPropertyAccessExpression(target) &&
			isIdentifier(target.expression) &&
			target.expression.text === 'Astro' &&
			target.name.text === 'props'
			? { names: [], defaults: [] }
			: undefined;
	}

	if (!isCallExpression(target)) {
		return undefined;
	}

	if (framework === 'svelte') {
		return isIdentifier(target.expression) && target.expression.text === '$props'
			? { names: [], defaults: [] }
			: undefined;
	}

	if (!isIdentifier(target.expression)) {
		return undefined;
	}

	if (target.expression.text === 'defineProps') {
		return readDefineProps(target);
	}

	if (target.expression.text === 'withDefaults') {
		const [props, defaults] = target.arguments;
		const inner = props ? readProps(framework, props) : undefined;
		if (!inner) {
			return undefined;
		}
		return {
			names: inner.names,
			defaults: [
				...inner.defaults,
				...(defaults && isObjectLiteralExpression(defaults) ? getKeys(defaults) : []),
			],
		};
	}

	return undefined;
}

function readDefineProps(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	call: CallExpression,
): DeclaredProps {
	const [argument] = call.arguments;
	const [typeArgument] = call.typeArguments ?? [];

	if (argument && isArrayLiteralExpression(argument)) {
		return {
			names: argument.elements.flatMap(element => (isStringLiteral(element) ? [element.text] : [])),
			defaults: [],
		};
	}

	if (argument && isObjectLiteralExpression(argument)) {
		const defaults = argument.properties.flatMap(property =>
			isPropertyAssignment(property) &&
			isObjectLiteralExpression(property.initializer) &&
			getKeys(property.initializer).includes('default')
				? [getPropertyName(property.name)].filter((name): name is string => name !== undefined)
				: [],
		);
		return { names: getKeys(argument), defaults };
	}

	if (typeArgument && isTypeLiteralNode(typeArgument)) {
		return {
			names: typeArgument.members.flatMap(member => {
				const name = isPropertySignature(member) ? getPropertyName(member.name) : undefined;
				return name === undefined ? [] : [name];
			}),
			defaults: [],
		};
	}

	return { names: [], defaults: [] };
}

function getKeys(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	literal: ObjectLiteralExpression,
): string[] {
	return literal.properties.flatMap(property => {
		const name = getPropertyName('name' in property ? property.name : undefined);
		return name === undefined ? [] : [name];
	});
}

function getPropertyName(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	name: PropertyName | undefined,
): string | undefined {
	return name && (isIdentifier(name) || isStringLiteral(name)) ? name.text : undefined;
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
 * The names that a top-level statement that is not a variable statement declares.
 */
function getDeclaredNames(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	statement: Statement,
): string[] {
	if ((isFunctionDeclaration(statement) || isClassDeclaration(statement)) && statement.name) {
		return [statement.name.text];
	}

	if (isImportDeclaration(statement) && statement.importClause) {
		const { name, namedBindings } = statement.importClause;
		return [
			...(name ? [name.text] : []),
			...(namedBindings
				? 'elements' in namedBindings
					? namedBindings.elements.map(element => element.name.text)
					: [namedBindings.name.text]
				: []),
		];
	}

	return [];
}

function getBindingNames(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	name: BindingName,
): string[] {
	if (isIdentifier(name)) {
		return [name.text];
	}
	return name.elements.flatMap(element => (isBindingElement(element) ? getBindingNames(element.name) : []));
}
