/**
 * Fails when a job that gates a pull request is left out of `ci-ok`, the one check that the branch
 * protection requires (`.github/workflows/test.yml` says why it is one). A job that `ci-ok` does
 * not `need` can be red while `ci-ok` is green, and Renovate's automerge merges on `ci-ok` alone.
 *
 * A workflow that `test.yml` calls (`uses: ./.github/workflows/…`) is a gate of the same kind, so
 * it must not also trigger on a pull request by itself: that run would be a check outside `ci-ok`,
 * and a red result there blocks nothing. The set of the called workflows is pinned too: dropping
 * the `uses:` of `rust.yml` while its `needs` entry stays would put the Rust gate outside `ci-ok`
 * again (#4707) and no other check here would notice.
 *
 * A job that `changes` skips reports success, so a mistake in how `changes` reaches the called jobs
 * is a gate that silently never runs: the outputs the jobs read must be the ones `changes` declares
 * and `changes.ts` prints, and the `paths:` of each workflow's own `push` trigger must be the paths
 * that `changes.ts` decides on.
 *
 * The files are read as text, as `scripts/release-lines/consistency.spec.ts` does: the repository
 * has no YAML parser at the root, and these checks need only the keys at a known indent.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { RUST_GATES } from './changes.ts';

const root = path.resolve(import.meta.dirname, '../..');

function read(file: string): string {
	return readFileSync(path.join(root, file), 'utf8');
}

const linesOf = (source: string) => source.split(/\r?\n/);

/** A job key at the indent of the files here, with an optional trailing comment. */
const JOB_KEY = /^ {4}([\w-]+):\s*(?:#.*)?$/;

function jobNames(source: string): readonly string[] {
	const lines = linesOf(source);
	const start = lines.indexOf('jobs:');
	if (start === -1) {
		throw new Error('no `jobs:` in the workflow');
	}
	const rest = lines.slice(start + 1);
	const end = rest.findIndex(line => /^[^\s#]/.test(line));
	return (end === -1 ? rest : rest.slice(0, end))
		.map(line => JOB_KEY.exec(line)?.[1])
		.filter((name): name is string => name !== undefined);
}

/** The lines of one job, from its key to the next job (or the end of the file). */
function jobLines(source: string, job: string): readonly string[] {
	const lines = linesOf(source);
	const start = lines.findIndex(line => JOB_KEY.exec(line)?.[1] === job);
	if (start === -1) {
		throw new Error(`no job \`${job}\` in the workflow`);
	}
	const rest = lines.slice(start + 1);
	const end = rest.findIndex(line => JOB_KEY.test(line) || /^[^\s#]/.test(line));
	return end === -1 ? rest : rest.slice(0, end);
}

/** Only the block form of `needs:` is read; a job without one throws, so it never reads another job's. */
function jobNeeds(source: string, job: string): readonly string[] {
	const lines = jobLines(source, job);
	const needs = lines.findIndex(line => /^ {8}needs:\s*$/.test(line));
	if (needs === -1) {
		throw new Error(`job \`${job}\` has no block-form \`needs:\``);
	}
	const items: string[] = [];
	for (const line of lines.slice(needs + 1)) {
		const item = /^ {12}- ([\w-]+)\s*(?:#.*)?$/.exec(line);
		if (!item) {
			break;
		}
		items.push(item[1] ?? '');
	}
	return items;
}

function calledWorkflows(source: string): readonly string[] {
	return [...source.matchAll(/^ {8}uses: \.\/(\.github\/workflows\/[\w-]+\.ya?ml)\s*$/gm)].map(
		([, file = '']) => file,
	);
}

/** The lines of the `on:` block. A flow form (`on: [push]`) throws: it is not read here. */
function onLines(source: string): readonly string[] {
	const lines = linesOf(source);
	const start = lines.indexOf('on:');
	if (start === -1) {
		throw new Error('no block-form `on:` in the workflow');
	}
	const rest = lines.slice(start + 1);
	const end = rest.findIndex(line => /^[^\s#]/.test(line));
	return end === -1 ? rest : rest.slice(0, end);
}

const triggersOf = (source: string) =>
	onLines(source)
		.map(line => /^ {4}([\w-]+):/.exec(line)?.[1])
		.filter((name): name is string => name !== undefined);

/** The `paths:` of the `push` trigger. */
function pushPaths(source: string): readonly string[] {
	const lines = onLines(source);
	const push = lines.indexOf('    push:');
	const rest = push === -1 ? [] : lines.slice(push + 1);
	const end = rest.findIndex(line => /^ {4}[\w-]+:/.test(line));
	const own = end === -1 ? rest : rest.slice(0, end);
	const paths = own.findIndex(line => /^ {8}paths:\s*$/.test(line));
	if (paths === -1) {
		return [];
	}
	const items: string[] = [];
	for (const line of own.slice(paths + 1)) {
		const item = /^ {12}- (?:'([^']+)'|"([^"]+)"|([^\s'"#]+))\s*(?:#.*)?$/.exec(line);
		if (!item) {
			break;
		}
		items.push(item[1] ?? item[2] ?? item[3] ?? '');
	}
	return items;
}

/** The names under `outputs:` of the `changes` job. */
function changesOutputs(source: string): readonly string[] {
	return jobLines(source, 'changes')
		.map(line => /^ {12}(\w+): \$\{\{ steps\.\w+\.outputs\.\w+ \}\}\s*$/.exec(line)?.[1])
		.filter((name): name is string => name !== undefined);
}

describe('the readers of a workflow', () => {
	const source = [
		'jobs:',
		'    a:',
		'        runs-on: ubuntu-latest',
		'    b:',
		'        needs: a',
		'        uses: ./.github/workflows/b.yml',
		'    ci-ok:',
		'        needs:',
		'            - a',
		'            - b # why',
		'        runs-on: ubuntu-latest',
	].join('\n');

	test('read the jobs, the needs of one, and the called files', () => {
		expect(jobNames(source)).toStrictEqual(['a', 'b', 'ci-ok']);
		expect(jobNeeds(source, 'ci-ok')).toStrictEqual(['a', 'b']);
		expect(calledWorkflows(source)).toStrictEqual(['.github/workflows/b.yml']);
	});

	test('read a CRLF file as an LF file', () => {
		expect(jobNeeds(source.replaceAll('\n', '\r\n'), 'ci-ok')).toStrictEqual(['a', 'b']);
	});

	test('stop at the next top-level key, and do not read the needs of another job', () => {
		expect(jobNames(`${source}\nother:\n    not-a-job:\n`)).toStrictEqual(['a', 'b', 'ci-ok']);
		expect(() => jobNeeds(source, 'a')).toThrow('has no block-form `needs:`');
		expect(() => jobNeeds(source, 'missing')).toThrow('no job `missing`');
		expect(() => jobNeeds('jobs:\n    ci-ok:\n        needs: [a, b]\n', 'ci-ok')).toThrow('has no block-form');
	});

	test('read the triggers, the paths of push, and the outputs of changes', () => {
		const workflow = [
			'on:',
			'    workflow_call:',
			'    pull_request:',
			'        paths:',
			"            - 'x/**'",
			'    push:',
			'        branches:',
			'            - dev',
			'        paths:',
			"            - 'crates/**'",
			"            - '.github/workflows/rust.yml'",
			'    schedule:',
			"        - cron: '17 4 * * 1'",
			'jobs:',
			'    changes:',
			'        outputs:',
			'            rust: ${{ steps.diff.outputs.rust }}',
		].join('\n');
		expect(triggersOf(workflow)).toStrictEqual(['workflow_call', 'pull_request', 'push', 'schedule']);
		expect(pushPaths(workflow)).toStrictEqual(['crates/**', '.github/workflows/rust.yml']);
		expect(changesOutputs(workflow)).toStrictEqual(['rust']);
		expect(() => triggersOf('on: [push]\njobs:\n')).toThrow('no block-form `on:`');
	});

	test('read a job key with a comment, and push paths in any quoting', () => {
		const workflow = [
			'on:',
			'    push:',
			'        paths:',
			'            - a/**',
			'            - "b/**" # why',
			"            - 'c.yml'",
			'jobs:',
			'    first: # why',
			'        runs-on: ubuntu-latest',
			'    second:',
			'        needs: first',
		].join('\n');
		expect(pushPaths(workflow)).toStrictEqual(['a/**', 'b/**', 'c.yml']);
		expect(jobNames(workflow)).toStrictEqual(['first', 'second']);
		expect(jobLines(workflow, 'first')).toStrictEqual(['        runs-on: ubuntu-latest']);
	});
});

describe('test.yml', () => {
	const source = read('.github/workflows/test.yml');

	test('has a ci-ok that needs every other job', () => {
		const others = jobNames(source).filter(name => name !== 'ci-ok');
		expect(jobNeeds(source, 'ci-ok').toSorted()).toStrictEqual(others.toSorted());
	});

	test('calls rust.yml and cargo-deny.yml', () => {
		expect(calledWorkflows(source).toSorted()).toStrictEqual([
			'.github/workflows/cargo-deny.yml',
			'.github/workflows/rust.yml',
		]);
	});

	test.each(['rust', 'cargo-deny'])('%s waits for changes and reads an output that changes declares', job => {
		const lines = jobLines(source, job);
		expect(lines).toContain('        needs: changes');
		const read = lines.flatMap(line =>
			[...line.matchAll(/needs\.changes\.outputs\.(\w+)/g)].map(([, name]) => name),
		);
		expect(read.length).toBeGreaterThan(0);
		expect(changesOutputs(source)).toStrictEqual(expect.arrayContaining(read));
	});

	test('declares the outputs that changes.ts prints', () => {
		expect(changesOutputs(source).toSorted()).toStrictEqual(Object.keys(RUST_GATES).toSorted());
	});
});

describe('a workflow that test.yml calls', () => {
	const called = calledWorkflows(read('.github/workflows/test.yml'));

	test.each(called)('%s is reusable and does not trigger on a pull request by itself', file => {
		const triggers = triggersOf(read(file));
		expect(triggers).toContain('workflow_call');
		expect(triggers).not.toContain('pull_request');
		expect(triggers).not.toContain('pull_request_target');
		expect(triggers).not.toContain('workflow_run');
	});

	test.each(called)('%s has the push paths that changes.ts decides on', file => {
		const gate = path.basename(file, '.yml').replaceAll('-', '_') as keyof typeof RUST_GATES;
		const paths = pushPaths(read(file)).map(entry => entry.replace(/\*\*$/, ''));
		expect(paths.toSorted()).toStrictEqual([...RUST_GATES[gate]].toSorted());
	});
});
