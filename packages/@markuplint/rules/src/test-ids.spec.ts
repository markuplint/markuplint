/**
 * The test ID convention of `packages/@markuplint/rules/CLAUDE.md`, enforced.
 *
 * The behavior tests of a registered rule are the contract that another implementation of the rules (the v6
 * engine) is matched against by ID, so each carries `[<rule-name>-NNN]`, unique within its rule across its
 * files. A test of anything else (an internal function, a shared helper, a repository-wide meta spec, a
 * directory that is not a registered rule) has no such ID: the other implementation does not port it one to
 * one, and an ID on it would be a promise nobody keeps.
 *
 * A behavior spec is a spec of a registered rule (a directory that `src/index.ts` imports) that imports the
 * testing API (`mlRuleTest`, `mlTest`, `mlTestFile`), and every test in it goes through the API, directly or
 * through a helper of the file: a test that does not is a unit test and goes to a spec of its own, as the
 * convention says. `.claude/skills/list-rule-test/scripts/list-rule-test.mjs` (and, while it exists,
 * `scripts/rule-test-ids/renumber.ts`) reads the registry and the tests as this does: keep them in step.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const TESTING_API = new Set(['mlRuleTest', 'mlTest', 'mlTestFile']);
const ID_PREFIX = /^\[([^\]]*)\]/;
/** The registry and the specs of a real run are far more than this: it only shows that something was read. */
const LEAST_SPECS = 100;
/**
 * The specs in the directory of a registered rule that do not go through the testing API: they test an
 * internal function or the bundled spec data, and have no IDs. A spec of a rule that reaches the API in a way
 * this does not read (a helper module, a re-export) would be taken for one of these and lose its IDs without a
 * word, so a spec that is not on this list and does not import the API fails the test below. Add a new unit
 * spec here.
 */
const UNIT_SPECS: ReadonlySet<string> = new Set([
	'no-deprecated-aria-prop/spec-data.spec.ts',
	'no-deprecated-element/spec-data.spec.ts',
	'no-unsupported-browser-features/compat-data.spec.ts',
	'no-unsupported-browser-features/format-unsupported-message.spec.ts',
	'no-unsupported-browser-features/resolve-browsers.spec.ts',
	'permitted-contents/choice.spec.ts',
	'permitted-contents/content-model.cache.spec.ts',
	'permitted-contents/count-pattern.spec.ts',
	'permitted-contents/debug.spec.ts',
	'permitted-contents/matches-selector.spec.ts',
	'permitted-contents/order.spec.ts',
	'permitted-contents/recursive-branch.spec.ts',
	'permitted-contents/represent-transparent-nodes.spec.ts',
	'permitted-contents/start.spec.ts',
	'permitted-contents/utils.spec.ts',
	'require-datetime/utils.spec.ts',
]);

function escapeRegExp(text: string): string {
	return text.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
}

function specsUnder(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
		const full = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			return specsUnder(full);
		}
		return entry.name.endsWith('.spec.ts') ? [full] : [];
	});
}

function registeredRules(): Set<string> {
	const index = readFileSync(path.join(SRC, 'index.ts'), 'utf8');
	return new Set([...index.matchAll(/from '\.\/([^/']+)\/index\.js'/g)].map(match => match[1]!));
}

/** The text a name starts with, as far as it can be read without running the spec. */
function leadingText(node: ts.Expression): string | undefined {
	if (ts.isStringLiteralLike(node)) {
		return node.text;
	}
	if (ts.isTemplateExpression(node)) {
		return node.head.text;
	}
	if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
		return leadingText(node.left);
	}
	if (ts.isParenthesizedExpression(node)) {
		return leadingText(node.expression);
	}
	return undefined;
}

/**
 * @param call - A call expression
 * @returns Whether the callee is `test`, `it`, or one of their members (`test.each(table)`, `test.skip`, ...)
 *   (`todo` says it is `.todo`, which has no callback), and undefined when it is not a test
 */
function testCall(call: ts.CallExpression): { todo: boolean } | undefined {
	let expression: ts.Expression = call.expression;
	while (ts.isCallExpression(expression) || ts.isTaggedTemplateExpression(expression)) {
		expression = ts.isCallExpression(expression) ? expression.expression : expression.tag;
	}
	let todo = false;
	while (ts.isPropertyAccessExpression(expression)) {
		todo ||= expression.name.text === 'todo';
		expression = expression.expression;
	}
	return ts.isIdentifier(expression) && (expression.text === 'test' || expression.text === 'it')
		? { todo }
		: undefined;
}

/** Whether a node mentions the testing API, or one of the names given. */
function mentions(node: ts.Node, names: ReadonlySet<string>): boolean {
	if (ts.isIdentifier(node) && names.has(node.text)) {
		return true;
	}
	return ts.forEachChild(node, child => mentions(child, names) || undefined) ?? false;
}

interface Case {
	readonly line: number;
	/** The start of the name; undefined when it cannot be read from the source. */
	readonly name: string | undefined;
	/** Whether the callback runs the testing API, directly or through a function of the file (a todo has none). */
	readonly goesThroughApi: boolean;
}

interface Spec {
	/** Relative to `src`, with `/`. */
	readonly file: string;
	readonly usesTestingApi: boolean;
	readonly cases: readonly Case[];
}

function read(file: string): Spec {
	const sourceFile = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
	let usesTestingApi = false;

	// The functions of the file that run the testing API, so that a test that calls one goes through the API.
	const helpers = new Set<string>();
	const collect = (node: ts.Node) => {
		if (ts.isFunctionDeclaration(node) && node.name && mentions(node, TESTING_API)) {
			helpers.add(node.name.text);
		}
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer &&
			ts.isFunctionLike(node.initializer) &&
			mentions(node.initializer, TESTING_API)
		) {
			helpers.add(node.name.text);
		}
		ts.forEachChild(node, collect);
	};
	collect(sourceFile);
	const entry = new Set([...TESTING_API, ...helpers]);

	const cases: Case[] = [];
	const visit = (node: ts.Node) => {
		if (ts.isImportDeclaration(node)) {
			const bindings = node.importClause?.namedBindings;
			if (bindings && ts.isNamedImports(bindings)) {
				usesTestingApi ||= bindings.elements.some(element =>
					TESTING_API.has((element.propertyName ?? element.name).text),
				);
			}
		}
		const kind = ts.isCallExpression(node) ? testCall(node) : undefined;
		if (ts.isCallExpression(node) && kind && node.arguments[0]) {
			// `test.each(table)` takes its table in the callee, so the name is always the first argument of the call
			// that has a callback; the callee of the table call is itself a `test` call that is skipped here.
			const callback = node.arguments.find(argument => ts.isFunctionLike(argument));
			if (callback || kind.todo) {
				cases.push({
					line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
					name: leadingText(node.arguments[0]),
					goesThroughApi: callback ? mentions(callback, entry) : true,
				});
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return {
		file: path.relative(SRC, file).split(path.sep).join('/'),
		usesTestingApi,
		cases,
	};
}

const rules = registeredRules();
const specs = specsUnder(SRC).map(read);

function ruleOf(spec: Spec): string | undefined {
	const [first, ...rest] = spec.file.split('/');
	return rest.length > 0 && first && rules.has(first) ? first : undefined;
}

describe('the rule spec test IDs', () => {
	test('the registry that this reads is the set of the rule directories, so that no rule is left out of the check', () => {
		// A rule has a `meta.ts`; a registry line that this does not recognize would shrink the set without a word.
		const withMeta = readdirSync(SRC, { withFileTypes: true })
			.filter(entry => entry.isDirectory() && existsSync(path.join(SRC, entry.name, 'meta.ts')))
			.map(entry => entry.name);
		expect([...rules].toSorted()).toStrictEqual(withMeta.toSorted());
		expect(specs.length).toBeGreaterThan(LEAST_SPECS);
	});

	test('every test of a behavior spec starts with an ID of its rule', () => {
		const violations: string[] = [];
		for (const spec of specs) {
			const rule = ruleOf(spec);
			if (!rule || !spec.usesTestingApi) {
				continue;
			}
			const pattern = new RegExp(String.raw`^\[${escapeRegExp(rule)}-\d{3,}\]`);
			for (const { line, name } of spec.cases) {
				if (name === undefined || !pattern.test(name)) {
					violations.push(`${spec.file}:${line} ${JSON.stringify(name?.slice(0, 60))}`);
				}
			}
		}
		expect(violations).toStrictEqual([]);
	});

	test('an ID is unique within its rule, across the files of the rule', () => {
		const seen = new Map<string, string>();
		const duplicates: string[] = [];
		for (const spec of specs) {
			if (!ruleOf(spec) || !spec.usesTestingApi) {
				continue;
			}
			for (const { line, name } of spec.cases) {
				const id = name ? ID_PREFIX.exec(name)?.[1] : undefined;
				if (id === undefined) {
					continue;
				}
				const place = `${spec.file}:${line}`;
				const first = seen.get(id);
				if (first === undefined) {
					seen.set(id, place);
				} else {
					duplicates.push(`[${id}] at ${place}, first at ${first}`);
				}
			}
		}
		expect(duplicates).toStrictEqual([]);
	});

	test('a test of a behavior spec goes through the testing API, so that a unit test is in a spec of its own', () => {
		const violations: string[] = [];
		for (const spec of specs) {
			if (!ruleOf(spec) || !spec.usesTestingApi) {
				continue;
			}
			for (const { line, name, goesThroughApi } of spec.cases) {
				if (!goesThroughApi) {
					violations.push(`${spec.file}:${line} ${JSON.stringify(name?.slice(0, 60))}`);
				}
			}
		}
		expect(violations).toStrictEqual([]);
	});

	test('a spec of a registered rule that does not import the testing API is a known unit spec', () => {
		const unknown = specs
			.filter(spec => ruleOf(spec) && !spec.usesTestingApi && !UNIT_SPECS.has(spec.file))
			.map(spec => spec.file);
		expect(unknown).toStrictEqual([]);
		// A name on the list that no spec has any more, or a spec that came to use the API, is stale
		const present = new Set(specs.filter(spec => !spec.usesTestingApi).map(spec => spec.file));
		expect([...UNIT_SPECS].filter(file => !present.has(file))).toStrictEqual([]);
	});

	test('a test of any other spec has no ID', () => {
		const violations: string[] = [];
		for (const spec of specs) {
			if (ruleOf(spec) && spec.usesTestingApi) {
				continue;
			}
			for (const { line, name } of spec.cases) {
				if (name !== undefined && ID_PREFIX.test(name)) {
					violations.push(`${spec.file}:${line} ${JSON.stringify(name.slice(0, 60))}`);
				}
			}
		}
		expect(violations).toStrictEqual([]);
	});
});
