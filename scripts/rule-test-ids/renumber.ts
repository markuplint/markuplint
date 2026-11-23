/**
 * Renumbers the test IDs of the rule specs, and writes the table that maps the IDs of the base to the new ones.
 *
 * ```sh
 * node --experimental-strip-types scripts/rule-test-ids/renumber.ts --base <ref> [--write]
 * ```
 *
 * Why it exists: the tests of the v6 engine (`crates/**\/tests.rs`, `_ID`) and its known divergences
 * (`scripts/rust-rule-parity/setup.ts`) name the tests of these specs by ID, and the convention of the specs
 * changed from `[rule-category-NNN]` (per file, with the issue number in the category) to `[rule-NNN]` (per
 * rule, behavior tests only: `packages/@markuplint/rules/CLAUDE.md`). The v6 line ports its IDs through the
 * table in `id-map.json` (`renamed` and `unnumbered`, besides the `merged` entries of the earlier
 * reorganization), and deletes this directory once it has.
 *
 * What it does: every test of a registered rule's spec that goes through the testing API takes the next number
 * of its rule (the `index.spec.ts` first, then the other files by path, in source order inside a file) and
 * writes it as the `[rule-NNN]` prefix of its name, whatever prefix it had (the non-standard ones too). Every
 * other test (an internal function, a meta spec, a directory that is not a registered rule, and the two specs
 * outside the rules that had IDs of the same kind) loses its prefix. An ID that a comment names follows the
 * test in the same file; one that names a test without an ID, or none in the file, is an error to write by
 * hand. Only names and comments change.
 *
 * It is made to be run again: the numbers come from the order alone, and the table from pairing the tests of
 * the head with those of `--base` by what they pin (`fingerprint.ts`: a test may have moved between the files
 * of its rule and the base's file and ID are what the table records), so a test that moved after a run is
 * numbered and mapped by running it once more. It writes nothing unless the tests of every file pin what they
 * did before (the fingerprints are the same), and every test of the base has a counterpart in the head, which
 * is what `verify-equivalence.ts` checks of the whole change.
 *
 * `file` in the table is a path from the root of the repository, as the base has it.
 *
 * @module
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import ts from 'typescript';

import { scopeOf } from './compare.ts';
import { fingerprintSource } from './fingerprint.ts';
import { parseIdMap } from './id-map.ts';

const SRC = 'packages/@markuplint/rules/src';
/** Specs outside the rules whose tests carried IDs of the same kind. */
const OUTSIDE = [
	'packages/@markuplint/ml-config/src/rule-aliases.spec.ts',
	'packages/@markuplint/types/src/debug.spec.ts',
];
const TESTING_API = new Set(['mlRuleTest', 'mlTest', 'mlTestFile']);
const PREFIX = /^\[([^\]]+)\]/;
const ID_LIKE = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d{3,}$/;

/** An ID of the base and the new one of the test that took its place. */
export interface Renamed {
	readonly file: string;
	readonly id: string;
	readonly to: string;
}

/** An ID of the base whose test has none now. */
export interface Unnumbered {
	readonly file: string;
	readonly id: string;
}

export interface RenumberInput {
	/** The specs of the base, by path from the root of the repository. */
	readonly base: ReadonlyMap<string, string>;
	/** The specs of the working tree, by path from the root of the repository. */
	readonly head: ReadonlyMap<string, string>;
	/** The names of the registered rules (the directories that `src/index.ts` imports). */
	readonly rules: ReadonlySet<string>;
}

export interface RenumberResult {
	/** Every spec of `head`, rewritten. */
	readonly files: ReadonlyMap<string, string>;
	readonly renamed: readonly Renamed[];
	readonly unnumbered: readonly Unnumbered[];
	/** How many tests of the base had an ID: `renamed` and `unnumbered` account for each of them. */
	readonly basePrefixed: number;
}

interface Case {
	readonly file: string;
	readonly line: number;
	readonly name: string;
	readonly hash: string;
	/** The ID at the start of the name, and the range of its `[id]` in the source. */
	readonly prefix: { readonly id: string; readonly start: number; readonly end: number } | undefined;
}

interface Spec {
	readonly file: string;
	readonly text: string;
	readonly usesTestingApi: boolean;
	readonly cases: readonly Case[];
	readonly sourceFile: ts.SourceFile;
}

function leadingLiteral(node: ts.Expression): ts.StringLiteralLike | ts.TemplateHead | undefined {
	if (ts.isStringLiteralLike(node)) {
		return node;
	}
	if (ts.isTemplateExpression(node)) {
		return node.head;
	}
	if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
		return leadingLiteral(node.left);
	}
	if (ts.isParenthesizedExpression(node)) {
		return leadingLiteral(node.expression);
	}
	return undefined;
}

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

/** Where a spec's file is read from the rules' `src`, as `fingerprintSource` takes it. */
function srcRelative(file: string): string {
	return file.startsWith(`${SRC}/`) ? file.slice(SRC.length + 1) : file;
}

function read(file: string, text: string): Spec {
	const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	let usesTestingApi = false;
	const located: { line: number; name: string; prefix: Case['prefix'] }[] = [];
	const visit = (node: ts.Node) => {
		if (ts.isImportDeclaration(node)) {
			const bindings = node.importClause?.namedBindings;
			if (bindings && ts.isNamedImports(bindings)) {
				usesTestingApi ||= bindings.elements.some(element =>
					TESTING_API.has((element.propertyName ?? element.name).text),
				);
			}
		}
		const [nameNode] = ts.isCallExpression(node) ? node.arguments : [];
		if (
			ts.isCallExpression(node) &&
			nameNode &&
			isTestCall(node) &&
			node.arguments.some(argument => ts.isFunctionLike(argument))
		) {
			const literal = leadingLiteral(nameNode);
			const start = literal ? literal.getStart(sourceFile) + 1 : -1;
			const match = literal ? PREFIX.exec(text.slice(start)) : null;
			located.push({
				line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
				name: literal?.text ?? '',
				prefix: match?.[1] === undefined ? undefined : { id: match[1], start, end: start + match[0].length },
			});
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	const hashes = fingerprintSource(srcRelative(file), text);
	if (hashes.length !== located.length) {
		throw new Error(`${file}: read ${located.length} tests but fingerprinted ${hashes.length}`);
	}
	const cases = located.map((test, index) => {
		const fingerprint = hashes[index];
		if (fingerprint?.line !== test.line) {
			throw new Error(`${file}:${test.line}: the test is not where the fingerprint puts it`);
		}
		return { file, ...test, hash: fingerprint.hash };
	});
	return { file, text, usesTestingApi, cases, sourceFile };
}

function ruleOf(spec: Spec, rules: ReadonlySet<string>): string | undefined {
	if (!spec.file.startsWith(`${SRC}/`) || !spec.usesTestingApi) {
		return undefined;
	}
	const [first, ...rest] = srcRelative(spec.file).split('/');
	return rest.length > 0 && first && rules.has(first) ? first : undefined;
}

function scopeOfFile(file: string): string {
	return file.startsWith(`${SRC}/`) ? scopeOf(srcRelative(file)) : file;
}

function order(a: Spec, b: Spec, rule: string): number {
	const rank = (spec: Spec) => (spec.file === `${SRC}/${rule}/index.spec.ts` ? 0 : 1);
	return rank(a) - rank(b) || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}

function commentRanges(spec: Spec): { pos: number; end: number }[] {
	const seen = new Map<number, number>();
	const visit = (node: ts.Node) => {
		for (const position of [node.getFullStart(), node.getEnd()]) {
			for (const range of [
				...(ts.getLeadingCommentRanges(spec.text, position) ?? []),
				...(ts.getTrailingCommentRanges(spec.text, position) ?? []),
			]) {
				seen.set(range.pos, range.end);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(spec.sourceFile);
	return [...seen].map(([pos, end]) => ({ pos, end }));
}

/**
 * @param input - The specs of the base and of the working tree, and the registered rules
 * @returns The rewritten specs and the table
 * @throws When a behavior test has no prefix to number, a comment names an ID that cannot follow, a rewrite would
 *   change what a test pins, or the tests of the base and of the head do not pair up
 */
export function renumber(input: RenumberInput): RenumberResult {
	const specs = [...input.head]
		.toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([file, text]) => read(file, text));

	// The new ID of each behavior test: its rule's next number, in the order of the files and the source.
	const newIds = new Map<Case, string | undefined>();
	const rules = [...new Set(specs.map(spec => ruleOf(spec, input.rules)).filter((rule): rule is string => !!rule))];
	for (const spec of specs) {
		for (const test of spec.cases) {
			newIds.set(test, undefined);
		}
	}
	for (const rule of rules) {
		let number = 0;
		for (const spec of specs
			.filter(candidate => ruleOf(candidate, input.rules) === rule)
			.toSorted((a, b) => order(a, b, rule))) {
			for (const test of spec.cases) {
				if (!test.prefix) {
					throw new Error(
						`${test.file}:${test.line} "${test.name.slice(0, 50)}": a behavior test has no prefix to number`,
					);
				}
				number += 1;
				newIds.set(test, `${rule}-${String(number).padStart(3, '0')}`);
			}
		}
	}

	// A comment may name the new ID of a test of another file, which is left as it is: this is how a run's own result reads.
	const issued = new Set([...newIds.values()].filter((id): id is string => id !== undefined));
	const files = new Map<string, string>();
	for (const spec of specs) {
		const edits: { start: number; end: number; text: string }[] = [];
		const byId = new Map<string, Case[]>();
		for (const test of spec.cases) {
			if (!test.prefix) {
				continue;
			}
			byId.set(test.prefix.id, [...(byId.get(test.prefix.id) ?? []), test]);
			const id = newIds.get(test);
			const afterSpace = spec.text[test.prefix.end] === ' ' ? 1 : 0;
			edits.push(
				id
					? { start: test.prefix.start, end: test.prefix.end, text: `[${id}]` }
					: { start: test.prefix.start, end: test.prefix.end + afterSpace, text: '' },
			);
		}
		for (const range of commentRanges(spec)) {
			const comment = spec.text.slice(range.pos, range.end);
			for (const match of comment.matchAll(/\[([a-z0-9][a-z0-9-]*)\]/g)) {
				const named = byId.get(match[1] ?? '') ?? [];
				if (named.length === 0 && (!ID_LIKE.test(match[1] ?? '') || issued.has(match[1] ?? ''))) {
					continue;
				}
				const [only] = named;
				const id = only ? newIds.get(only) : undefined;
				if (named.length !== 1 || !id) {
					throw new Error(
						`${spec.file}: a comment names [${match[1]}], which is ${named.length === 0 ? 'no test of the file' : named.length > 1 ? 'the ID of several tests of the file' : 'a test that has no ID now'}: write it by hand`,
					);
				}
				const start = range.pos + (match.index ?? 0);
				edits.push({ start, end: start + match[0].length, text: `[${id}]` });
			}
		}
		let text = spec.text;
		for (const edit of edits.toSorted((a, b) => b.start - a.start)) {
			text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
		}
		const after = read(spec.file, text);
		if (after.cases.map(test => test.hash).join(',') !== spec.cases.map(test => test.hash).join(',')) {
			throw new Error(`${spec.file}: the rewrite changed what a test pins`);
		}
		files.set(spec.file, text);
	}

	// Pair the tests of the base with those of the head by what they pin.
	const key = (test: Case) => `${scopeOfFile(test.file)}\u0000${test.hash}`;
	const groups = (cases: readonly Case[]) => {
		const map = new Map<string, Case[]>();
		for (const test of cases) {
			map.set(key(test), [...(map.get(key(test)) ?? []), test]);
		}
		return map;
	};
	const baseCases = [...input.base]
		.toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.flatMap(([file, text]) => read(file, text).cases);
	const headGroups = groups(specs.flatMap(spec => spec.cases));
	const baseGroups = groups(baseCases);
	for (const [group, tests] of [...baseGroups, ...headGroups]) {
		if ((baseGroups.get(group)?.length ?? 0) !== (headGroups.get(group)?.length ?? 0)) {
			const [one] = tests;
			throw new Error(
				`${one?.file}:${one?.line} "${one?.name.slice(0, 50)}": no counterpart between the base and the head (run verify-equivalence.ts)`,
			);
		}
	}
	const renamed: Renamed[] = [];
	const unnumbered: Unnumbered[] = [];
	let basePrefixed = 0;
	for (const baseCase of baseCases) {
		if (!baseCase.prefix) {
			continue;
		}
		basePrefixed += 1;
		const index = (baseGroups.get(key(baseCase)) ?? []).indexOf(baseCase);
		const headCase = headGroups.get(key(baseCase))?.[index];
		const to = headCase ? newIds.get(headCase) : undefined;
		if (to) {
			renamed.push({ file: baseCase.file, id: baseCase.prefix.id, to });
		} else {
			unnumbered.push({ file: baseCase.file, id: baseCase.prefix.id });
		}
	}
	return { files, renamed, unnumbered, basePrefixed };
}

function git(args: string[]): string {
	const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
	if (result.status !== 0) {
		throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
	}
	return result.stdout;
}

function main() {
	const { values } = parseArgs({
		options: { base: { type: 'string' }, write: { type: 'boolean' }, map: { type: 'string' } },
	});
	if (!values.base) {
		throw new Error('--base <ref> is required: the ref of the branch that the work goes to, such as origin/dev');
	}
	process.chdir(git(['rev-parse', '--show-toplevel']).trim());
	const mapFile = values.map ? path.resolve(values.map) : path.join(import.meta.dirname, 'id-map.json');
	const idMap = parseIdMap(readFileSync(mapFile, 'utf8'));
	const policy = new Set((idMap.policy ?? []).map(file => `${SRC}/${file}`));

	const baseFiles = git(['ls-tree', '-r', '--name-only', values.base, '--', SRC, ...OUTSIDE])
		.split('\n')
		.filter(name => name.endsWith('.spec.ts'));
	const base = new Map(baseFiles.map(name => [name, git(['show', `${values.base}:${name}`])]));
	const headFiles = [
		...readdirSync(SRC, { recursive: true, encoding: 'utf8' })
			.map(name => `${SRC}/${name.split(path.sep).join('/')}`)
			.filter(name => name.endsWith('.spec.ts')),
		...OUTSIDE,
	].filter(name => !policy.has(name));
	const head = new Map(headFiles.map(name => [name, readFileSync(name, 'utf8')]));
	const index = readFileSync(path.join(SRC, 'index.ts'), 'utf8');
	const rules = new Set([...index.matchAll(/from '\.\/([^/']+)\/index\.js'/g)].map(match => match[1] ?? ''));

	const result = renumber({ base, head, rules });
	const newIds = result.renamed.map(entry => entry.to);
	if (new Set(newIds).size !== newIds.length) {
		throw new Error('a new ID is given to two tests');
	}
	if (result.renamed.length + result.unnumbered.length !== result.basePrefixed) {
		throw new Error('the table does not account for every test of the base that had an ID');
	}
	let changed = 0;
	for (const [file, text] of result.files) {
		if (text !== head.get(file)) {
			changed += 1;
			if (values.write) {
				writeFileSync(file, text);
			}
		}
	}
	if (values.write) {
		writeFileSync(
			mapFile,
			`${JSON.stringify({ ...idMap, renamed: result.renamed, unnumbered: result.unnumbered }, null, '\t')}\n`,
		);
	}
	process.stdout.write(
		`${values.write ? 'wrote' : 'would write'}: ${changed} specs; renamed: ${result.renamed.length}; unnumbered: ${result.unnumbered.length}; tests of the base with an ID: ${result.basePrefixed}\n`,
	);
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
	main();
}
