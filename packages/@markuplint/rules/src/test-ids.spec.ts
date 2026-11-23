import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

/**
 * The test ID convention of `packages/@markuplint/rules/CLAUDE.md`, enforced.
 *
 * The behavior tests of a registered rule are the contract that another implementation of the rules (the v6
 * engine) is matched against by ID, so each carries `[<rule-name>-NNN]`, unique within its rule across its
 * files. A test of anything else (an internal function, a shared helper, a repository-wide meta spec, a
 * directory that is not a registered rule) has no such ID: the other implementation does not port it one to
 * one, and an ID on it would be a promise nobody keeps.
 *
 * A behavior spec is a spec of a registered rule (a directory that `src/index.ts` imports) that goes through
 * the testing API (`mlRuleTest`, `mlTest`, `mlTestFile`).
 */
const SRC = path.dirname(fileURLToPath(import.meta.url));
const TESTING_API = new Set(['mlRuleTest', 'mlTest', 'mlTestFile']);
const ID_PREFIX = /^\[([^\]]*)\]/;

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

/** Whether the callee is `test`, `it`, or one of their members (`test.each(table)`, `test.skip`, ...). */
function isTestCall(call: ts.CallExpression): boolean {
	let expression: ts.Expression = call.expression;
	while (ts.isCallExpression(expression) || ts.isTaggedTemplateExpression(expression)) {
		expression = ts.isCallExpression(expression) ? expression.expression : expression.tag;
	}
	while (ts.isPropertyAccessExpression(expression)) {
		expression = expression.expression;
	}
	return ts.isIdentifier(expression) && (expression.text === 'test' || expression.text === 'it');
}

interface Case {
	readonly line: number;
	/** The start of the name; undefined when it cannot be read from the source. */
	readonly name: string | undefined;
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
		if (
			ts.isCallExpression(node) &&
			isTestCall(node) &&
			node.arguments[0] &&
			!ts.isNumericLiteral(node.arguments[0])
		) {
			// `test.each(table)` takes its table in the callee, so the name is always the first argument of the call
			// that has a callback; the callee of the table call is itself a `test` call that is skipped below.
			const hasCallback = node.arguments.some(argument => ts.isFunctionLike(argument));
			if (hasCallback) {
				cases.push({
					line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
					name: leadingText(node.arguments[0]),
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
	test('the registry names rule directories', () => {
		expect(rules.size).toBeGreaterThan(100);
		expect(specs.length).toBeGreaterThan(100);
	});

	test('every test of a behavior spec starts with an ID of its rule', () => {
		const violations: string[] = [];
		for (const spec of specs) {
			const rule = ruleOf(spec);
			if (!rule || !spec.usesTestingApi) {
				continue;
			}
			const pattern = new RegExp(String.raw`^\[${rule}-\d{3,}\]`);
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
