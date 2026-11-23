/**
 * What a rule spec pins, as a hash of each test, so that two versions of a spec can be compared without
 * trusting its names.
 *
 * A test is moved between files and groups, renamed, and has its constants renamed when specs are
 * reorganized; the ID and the name of a test are what such a change rewrites, and a flipped assertion or
 * a lost test must not hide behind them. The hash covers what decides the result of the test and nothing
 * that a reorganization rewrites:
 *
 * - the arguments of the call after the name (the body, the options, the table of `test.each`) and the
 *   modifier (`skip`, `each`, ...; `it` is `test`);
 * - what the body reads from outside: a constant, a function or an import is replaced by the hash of its own
 *   definition, read in the scope that declares it, so a renamed constant or one moved into a `describe` leaves
 *   the hash as it is, and a changed value changes it. An import counts as the module it comes from, resolved
 *   against the directory of the file and without its extension;
 * - what runs around the test: a statement of the file or of an enclosing `describe` that is neither a
 *   declaration nor a test (`beforeEach`, `vi.mock`, a hook inside an `if`), the modifier, the options and the
 *   table of an enclosing group, and what a loop or an `if` around the test iterates or tests.
 *
 * The comments, the name of the test, the kind of quotes, redundant parentheses, type assertions, the order of
 * the keys of an object and the line ends are out of it, as a formatter or a tidy-up rewrites them. The reader
 * is syntactic, not the type checker: an identifier that the code binds itself (a parameter, a local) is kept
 * as written, and shadows the scope only where that binding is visible. What it cannot see is listed in the
 * module comment of `verify-equivalence.ts`.
 *
 * @module
 */
import { createHash } from 'node:crypto';
import path from 'node:path';

import ts from 'typescript';

/** One test of a spec: where it is and the hash of what it pins. */
export interface TestFingerprint {
	/** The name as written: the first argument of the call, with its text as it is when it is a literal. */
	readonly name: string;
	/** 1-indexed line of the call. */
	readonly line: number;
	/** The hash of the test with what runs around it. */
	readonly hash: string;
	/** The hash of the test alone, without what runs around it: the same body in another setting has the same one. */
	readonly body: string;
}

const TEST_ROOTS: ReadonlySet<string> = new Set(['test', 'it']);
const GROUP_ROOTS: ReadonlySet<string> = new Set(['describe', 'suite']);
const HOOKS: ReadonlySet<string> = new Set(['beforeEach', 'afterEach', 'beforeAll', 'afterAll']);

/** What a scope keeps around its tests that is not a node: the modifier of a group. */
type Around = ts.Node | string;

interface Declaration {
	/** A hash that is already known (an import), or the node that is read to make one. */
	readonly fixed?: string;
	readonly node?: ts.Node;
	readonly self?: ts.Identifier;
	/** The scope that declares it: its own text is read there, whoever asks. */
	owner?: Scope;
	hash?: string;
	resolving?: boolean;
}

interface Scope {
	readonly parent: Scope | undefined;
	readonly decls: Map<string, Declaration>;
	/** The statements that run around the tests of this scope. */
	readonly effects: ts.Node[];
	/** The modifier, the options and the table of the group that opened this scope. */
	readonly extras: readonly Around[];
	effectsText?: string;
}

interface Context {
	readonly sourceFile: ts.SourceFile;
	readonly file: string;
	readonly printer: ts.Printer;
}

/**
 * @param file - Path of the spec relative to the rules' `src`, with `/`; relative imports resolve against it
 * @param source - The text of the spec
 * @returns The fingerprint of every test of the file, in source order
 * @throws When a group's callback cannot be read, as its tests would be missed without a word
 */
export function fingerprintSource(file: string, source: string): TestFingerprint[] {
	// Git hands back the text of a blob, an editor on Windows may save CRLF: a multi-line literal must not differ.
	const text = source.replaceAll('\r\n', '\n');
	const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const context: Context = {
		sourceFile,
		file,
		printer: ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed }),
	};
	const root = buildScope(context, sourceFile.statements, undefined, []);
	const results: TestFingerprint[] = [];
	visit(context, sourceFile, root, [], results);
	return results;
}

/** The names that a binding introduces, down through a destructuring pattern. */
function boundNames(name: ts.BindingName): ts.Identifier[] {
	if (ts.isIdentifier(name)) {
		return [name];
	}
	return name.elements.flatMap(element => (ts.isOmittedExpression(element) ? [] : boundNames(element.name)));
}

interface CallParts {
	readonly kind: 'test' | 'group';
	/** `test`, `test.each`, `describe.skip`, ...: `it` and `suite` read as `test` and `describe`. */
	readonly chain: string;
	/** The arguments of the calls that come before the one that takes the name (`test.each(table)`). */
	readonly curried: ts.Node[];
	readonly call: ts.CallExpression;
}

/**
 * Reads `test(...)`, `test.skip(...)`, `test.each(table)(...)`, `test.each\`...\`(...)` and their `describe`
 * counterparts.
 */
function readCall(call: ts.CallExpression): CallParts | undefined {
	const curried: ts.Node[] = [];
	let expression: ts.Expression = call.expression;
	while (ts.isCallExpression(expression) || ts.isTaggedTemplateExpression(expression)) {
		if (ts.isCallExpression(expression)) {
			curried.push(...expression.arguments);
			expression = expression.expression;
		} else {
			curried.push(expression.template);
			expression = expression.tag;
		}
	}
	const members: string[] = [];
	while (ts.isPropertyAccessExpression(expression)) {
		members.unshift(expression.name.text);
		expression = expression.expression;
	}
	if (!ts.isIdentifier(expression)) {
		return undefined;
	}
	const rootName = expression.text;
	if (TEST_ROOTS.has(rootName)) {
		return { kind: 'test', chain: ['test', ...members].join('.'), curried, call };
	}
	if (GROUP_ROOTS.has(rootName)) {
		return { kind: 'group', chain: ['describe', ...members].join('.'), curried, call };
	}
	return undefined;
}

function isFunctionNode(node: ts.Node): node is ts.ArrowFunction | ts.FunctionExpression {
	return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

/** Whether a statement holds a hook anywhere in it, such as `if (x) { beforeEach(...) }`. */
function containsHook(node: ts.Node): boolean {
	if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && HOOKS.has(node.expression.text)) {
		return true;
	}
	return ts.forEachChild(node, containsHook) ?? false;
}

/**
 * The scope of a list of statements: what it declares, and what runs in it besides tests and groups.
 */
function buildScope(
	context: Context,
	statements: readonly ts.Statement[],
	parent: Scope | undefined,
	extras: readonly Around[],
): Scope {
	const scope: Scope = { parent, decls: new Map(), effects: [], extras };
	const declare = (name: string, declaration: Declaration) => {
		scope.decls.set(name, { ...declaration, owner: scope });
	};
	for (const statement of statements) {
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				for (const name of boundNames(declaration.name)) {
					declare(name.text, { node: declaration.initializer ?? declaration, self: name });
				}
			}
		} else if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
			if (statement.name) {
				declare(statement.name.text, { node: statement, self: statement.name });
			}
		} else if (ts.isImportDeclaration(statement)) {
			readImport(context, statement, scope, declare);
		} else if (ts.isExpressionStatement(statement)) {
			const parts = ts.isCallExpression(statement.expression) ? readCall(statement.expression) : undefined;
			if (!parts) {
				scope.effects.push(statement);
			}
		} else if (containsHook(statement)) {
			scope.effects.push(statement);
		}
	}
	return scope;
}

function readImport(
	context: Context,
	statement: ts.ImportDeclaration,
	scope: Scope,
	declare: (name: string, declaration: Declaration) => void,
) {
	if (!ts.isStringLiteral(statement.moduleSpecifier)) {
		return;
	}
	const specifier = statement.moduleSpecifier.text;
	const module = specifier.startsWith('.')
		? path.posix
				.normalize(path.posix.join(path.posix.dirname(context.file), specifier))
				.replace(/\.[cm]?[jt]s$/, '')
		: specifier;
	const clause = statement.importClause;
	if (!clause) {
		scope.effects.push(statement);
		return;
	}
	if (clause.name) {
		declare(clause.name.text, { fixed: `import:default:${module}` });
	}
	const bindings = clause.namedBindings;
	if (bindings && ts.isNamespaceImport(bindings)) {
		declare(bindings.name.text, { fixed: `import:*:${module}` });
	} else if (bindings) {
		for (const element of bindings.elements) {
			declare(element.name.text, { fixed: `import:${(element.propertyName ?? element.name).text}:${module}` });
		}
	}
}

function lookup(scope: Scope | undefined, name: string): Declaration | undefined {
	for (let current = scope; current; current = current.parent) {
		const found = current.decls.get(name);
		if (found) {
			return found;
		}
	}
	return undefined;
}

/** The names that a list of statements declares in its own block. */
function declaredIn(statements: readonly ts.Statement[]): string[] {
	return statements.flatMap(statement => {
		if (ts.isVariableStatement(statement)) {
			return statement.declarationList.declarations.flatMap(d => boundNames(d.name).map(n => n.text));
		}
		if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
			return [statement.name.text];
		}
		return [];
	});
}

/** The names that a node binds for what is inside it, or undefined when it opens no scope. */
function scopeNames(node: ts.Node): Set<string> | undefined {
	if (ts.isFunctionLike(node)) {
		const names = new Set(node.parameters.flatMap(p => boundNames(p.name).map(n => n.text)));
		if ((ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) && node.name) {
			names.add(node.name.text);
		}
		if ('body' in node && node.body && ts.isBlock(node.body)) {
			for (const name of declaredIn(node.body.statements)) {
				names.add(name);
			}
		}
		return names;
	}
	if (ts.isBlock(node)) {
		return new Set(declaredIn(node.statements));
	}
	if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
		const initializer = node.initializer;
		return initializer && ts.isVariableDeclarationList(initializer)
			? new Set(initializer.declarations.flatMap(d => boundNames(d.name).map(n => n.text)))
			: new Set();
	}
	if (ts.isCatchClause(node)) {
		return new Set(node.variableDeclaration ? boundNames(node.variableDeclaration.name).map(n => n.text) : []);
	}
	return undefined;
}

function isReference(identifier: ts.Identifier): boolean {
	const parent = identifier.parent;
	if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) {
		return false;
	}
	if (
		(ts.isPropertyAssignment(parent) ||
			ts.isPropertyDeclaration(parent) ||
			ts.isMethodDeclaration(parent) ||
			ts.isPropertySignature(parent) ||
			ts.isEnumMember(parent)) &&
		parent.name === identifier
	) {
		return false;
	}
	if (ts.isQualifiedName(parent) && parent.right === identifier) {
		return false;
	}
	if (ts.isLabeledStatement(parent) || ts.isBreakOrContinueStatement(parent)) {
		return false;
	}
	return true;
}

/** The key of a property that has a name that is known without running anything. */
function staticKey(property: ts.ObjectLiteralElementLike): string | undefined {
	if (!ts.isPropertyAssignment(property)) {
		return undefined;
	}
	const name = property.name;
	return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) ? name.text : undefined;
}

/**
 * The tokens of printed code, joined by a space, without a comma that closes a list.
 *
 * The printer keeps the line breaks that the source has between the elements of a list, and a formatter adds
 * a comma to a list that it breaks over lines: neither changes what the code does, and a formatter's run over a
 * spec must not read as a change of its tests.
 */
function canonicalize(code: string): string {
	const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, code);
	const tokens: { kind: ts.SyntaxKind; text: string }[] = [];
	// Whether each open `{` is the start of a substitution of a template literal, so that its `}` goes on with the template.
	const braces: boolean[] = [];
	for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
		if (kind === ts.SyntaxKind.CloseBraceToken && braces.at(-1) === true) {
			braces.pop();
			kind = scanner.reScanTemplateToken(false);
		} else if (kind === ts.SyntaxKind.OpenBraceToken) {
			braces.push(false);
		} else if (kind === ts.SyntaxKind.CloseBraceToken) {
			braces.pop();
		}
		if (kind === ts.SyntaxKind.TemplateHead || kind === ts.SyntaxKind.TemplateMiddle) {
			braces.push(true);
		}
		if (kind === ts.SyntaxKind.WhitespaceTrivia || kind === ts.SyntaxKind.NewLineTrivia) {
			continue;
		}
		tokens.push({ kind, text: scanner.getTokenText() });
	}
	return tokens
		.filter((token, index) => {
			const next = tokens[index + 1]?.kind;
			return !(
				token.kind === ts.SyntaxKind.CommaToken &&
				(next === ts.SyntaxKind.CloseBracketToken ||
					next === ts.SyntaxKind.CloseBraceToken ||
					next === ts.SyntaxKind.CloseParenToken)
			);
		})
		.map(token => token.text)
		.join(' ');
}

/**
 * The text of a node with the comments removed, every reference to a declaration replaced by the hash of that
 * declaration, and the spellings that mean the same written one way.
 */
function normalize(context: Context, node: ts.Node, scope: Scope | undefined, self?: ts.Identifier): string {
	const transformer: ts.TransformerFactory<ts.Node> = transformation => {
		const bound: Set<string>[] = [];
		const isBound = (name: string) => bound.some(names => names.has(name));
		const resolve = (identifier: ts.Identifier): ts.Identifier => {
			if (identifier === self) {
				return ts.factory.createIdentifier('§self');
			}
			if (isBound(identifier.text) || !isReference(identifier)) {
				return identifier;
			}
			const declaration = lookup(scope, identifier.text);
			return declaration ? ts.factory.createIdentifier(`§${declarationHash(context, declaration)}`) : identifier;
		};
		const rewrite = (child: ts.Node): ts.Node => {
			if (ts.isParenthesizedExpression(child) || ts.isNonNullExpression(child) || ts.isAsExpression(child)) {
				return visitor(child.expression);
			}
			if (ts.isTypeAssertionExpression(child) || ts.isSatisfiesExpression(child)) {
				return visitor(child.expression);
			}
			if (
				(ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) &&
				!ts.isTaggedTemplateExpression(child.parent)
			) {
				return ts.factory.createStringLiteral(child.text);
			}
			if (ts.isShorthandPropertyAssignment(child)) {
				return ts.factory.createPropertyAssignment(child.name.text, resolve(child.name));
			}
			if (ts.isIdentifier(child)) {
				return resolve(child);
			}
			const visited = ts.visitEachChild(child, visitor, transformation);
			if (ts.isObjectLiteralExpression(visited)) {
				const keys = visited.properties.map(staticKey);
				if (keys.every((key): key is string => key !== undefined)) {
					const sorted = visited.properties
						.map((property, index) => ({ property, key: keys[index] ?? '', index }))
						.toSorted((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.index - b.index))
						.map(entry => entry.property);
					return ts.factory.updateObjectLiteralExpression(visited, sorted);
				}
			}
			return visited;
		};
		const visitor = (child: ts.Node): ts.Node => {
			const names = scopeNames(child);
			if (names) {
				bound.push(names);
			}
			try {
				return rewrite(child);
			} finally {
				if (names) {
					bound.pop();
				}
			}
		};
		return root => ts.visitNode(root, visitor) ?? root;
	};
	const result = ts.transform(node, [transformer]);
	try {
		const transformed = result.transformed[0];
		return transformed
			? canonicalize(context.printer.printNode(ts.EmitHint.Unspecified, transformed, context.sourceFile))
			: '';
	} finally {
		result.dispose();
	}
}

function declarationHash(context: Context, declaration: Declaration): string {
	if (declaration.fixed) {
		return hashOf([declaration.fixed]);
	}
	if (declaration.hash) {
		return declaration.hash;
	}
	if (declaration.resolving || !declaration.node) {
		// A declaration reached again while its own hash is being made (a recursive helper) stands for itself
		// by a fixed name. Only that inner reference collapses: the hash of the declaration is made from its
		// whole text, so two different recursive helpers still differ.
		return 'cycle';
	}
	declaration.resolving = true;
	try {
		declaration.hash = hashOf([normalize(context, declaration.node, declaration.owner, declaration.self)]);
	} finally {
		declaration.resolving = false;
	}
	return declaration.hash;
}

function normalizeAround(context: Context, item: Around, scope: Scope): string {
	return typeof item === 'string' ? item : normalize(context, item, scope);
}

function effectsOf(context: Context, scope: Scope): string {
	if (scope.effectsText === undefined) {
		const own = [
			...scope.effects.map(node => normalize(context, node, scope)),
			...scope.extras.map(item => normalizeAround(context, item, scope)),
		];
		// A scope with nothing around the tests adds nothing, so a test moved into a `describe` keeps its hash.
		scope.effectsText = own.length === 0 ? '' : hashOf(own);
	}
	return scope.effectsText;
}

function hashOf(parts: readonly string[]): string {
	// Not a defence against anyone: the hashes only tell the few thousand tests of one run apart, and 64 bits
	// of SHA-1 make a collision among them negligible while keeping the reports short.
	return createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
}

/**
 * What a statement that wraps a test adds to it: the list a loop walks, the condition of an `if`, the receiver
 * of `forEach` / `map`. Its binding stays as written, as the body reads it as a local.
 */
function wrapperExtras(node: ts.Node): ts.Node[] {
	if (ts.isForOfStatement(node) || ts.isForInStatement(node)) {
		return [node.expression];
	}
	if (ts.isForStatement(node)) {
		return [node.initializer, node.condition, node.incrementor].flatMap(part => (part ? [part] : []));
	}
	if (ts.isWhileStatement(node) || ts.isIfStatement(node)) {
		return [node.expression];
	}
	if (
		ts.isCallExpression(node) &&
		ts.isPropertyAccessExpression(node.expression) &&
		['forEach', 'map', 'flatMap'].includes(node.expression.name.text)
	) {
		return [node.expression.expression];
	}
	return [];
}

function lineOf(context: Context, node: ts.Node): number {
	return context.sourceFile.getLineAndCharacterOfPosition(node.getStart(context.sourceFile)).line + 1;
}

function visit(context: Context, node: ts.Node, scope: Scope, extras: readonly Around[], results: TestFingerprint[]) {
	if (ts.isCallExpression(node)) {
		const parts = readCall(node);
		if (parts?.kind === 'test') {
			results.push(fingerprintTest(context, parts, scope, extras));
			return;
		}
		if (parts?.kind === 'group') {
			const fn = node.arguments.find(isFunctionNode);
			if (!fn || !ts.isBlock(fn.body)) {
				throw new Error(
					`${context.file}:${lineOf(context, node)}: the callback of ${parts.chain} is not a function with a block, so its tests cannot be read`,
				);
			}
			const options = node.arguments.slice(1).filter(argument => argument !== fn);
			// A plain `describe` adds nothing around its tests; a modifier, a table or an option does.
			const modifier = parts.chain === 'describe' ? [] : [parts.chain];
			const inner = buildScope(context, fn.body.statements, scope, [
				...extras,
				...modifier,
				...parts.curried,
				...options,
			]);
			visit(context, fn.body, inner, [], results);
			return;
		}
	}
	const added = wrapperExtras(node);
	const nextExtras = added.length > 0 ? [...extras, ...added] : extras;
	ts.forEachChild(node, child => visit(context, child, scope, nextExtras, results));
}

/** The text of the first argument of a test call, with a template literal's substitutions as written. */
function nameOf(context: Context, argument: ts.Expression | undefined): string {
	if (!argument) {
		return '';
	}
	if (ts.isStringLiteralLike(argument)) {
		return argument.text;
	}
	if (ts.isTemplateExpression(argument)) {
		return (
			argument.head.text +
			argument.templateSpans
				.map(span => `\${${span.expression.getText(context.sourceFile)}}${span.literal.text}`)
				.join('')
		);
	}
	return argument.getText(context.sourceFile);
}

function fingerprintTest(context: Context, parts: CallParts, scope: Scope, extras: readonly Around[]): TestFingerprint {
	const { call } = parts;
	const [nameArgument, ...rest] = call.arguments;
	const body = hashOf([parts.chain, JSON.stringify(rest.map(argument => normalize(context, argument, scope)))]);
	const effects: string[] = [];
	for (let current: Scope | undefined = scope; current; current = current.parent) {
		const text = effectsOf(context, current);
		if (text) {
			effects.push(text);
		}
	}
	const around = [...parts.curried, ...extras].map(item => normalizeAround(context, item, scope));
	return {
		name: nameOf(context, nameArgument),
		line: lineOf(context, call),
		hash: hashOf([body, JSON.stringify(around), ...effects]),
		body,
	};
}
