import { describe, expect, test } from 'vitest';

import { extractDeclaration, isSourcePage } from './extract-source.ts';

describe('isSourcePage', () => {
	test('[extract-source-001] tells a raw source file from the page of a specification', () => {
		expect(isSourcePage('https://raw.githubusercontent.com/withastro/astro/main/packages/astro/src/util.ts')).toBe(
			true,
		);
		expect(isSourcePage('https://html.spec.whatwg.org/multipage/syntax.html')).toBe(false);
		expect(isSourcePage('https://github.com/withastro/astro/blob/main/packages/astro/src/util.ts')).toBe(false);
	});
});

describe('extractDeclaration', () => {
	test('[extract-source-002] returns the text of a function declaration without the comment above it', () => {
		const source = [
			'// renders an attribute',
			'function addAttribute(value, key) {',
			'\treturn `${key}="${value}"`;',
			'}',
			'',
			'function other() {}',
		].join('\n');
		expect(extractDeclaration(source, 'addAttribute')).toStrictEqual({
			status: 'found',
			unit: 'function addAttribute(value, key) {\n\treturn `${key}="${value}"`;\n}',
			scope: 'function addAttribute(value, key) {\n\treturn `${key}="${value}"`;\n}',
			secno: null,
		});
	});

	test('[extract-source-003] returns the whole statement of a variable by the name of its declarator', () => {
		const source =
			"const A = 1;\nexport const htmlBooleanAttributes = new Set([\n\t'disabled',\n\t'hidden',\n]);\n";
		expect(extractDeclaration(source, 'htmlBooleanAttributes')).toMatchObject({
			status: 'found',
			unit: "export const htmlBooleanAttributes = new Set([\n\t'disabled',\n\t'hidden',\n]);",
		});
	});

	test('[extract-source-004] finds a class, an enum, a type and a default-exported function by name', () => {
		const source = [
			'export class Renderer {}',
			'enum Mode { A, B }',
			'type Chunk = string | number;',
			'interface Props { a: string }',
			'export default function render() {}',
		].join('\n');
		for (const name of ['Renderer', 'Mode', 'Chunk', 'Props', 'render']) {
			expect(extractDeclaration(source, name).status, name).toBe('found');
		}
	});

	test('[extract-source-005] is missing for a name that is not declared at the top level', () => {
		const source = 'function outer() {\n\tfunction inner() {}\n\tconst local = 1;\n}\nconst o = { member() {} };\n';
		expect(extractDeclaration(source, 'inner')).toStrictEqual({ status: 'missing' });
		expect(extractDeclaration(source, 'local')).toStrictEqual({ status: 'missing' });
		expect(extractDeclaration(source, 'member')).toStrictEqual({ status: 'missing' });
		expect(extractDeclaration(source, 'absent')).toStrictEqual({ status: 'missing' });
	});

	test('[extract-source-006] does not let trailing whitespace or the line ending change the text', () => {
		const unix = 'function f() {\n\treturn 1;\n}\n';
		const windows = 'function f() {  \r\n\treturn 1;\t\r\n}\r\n';
		expect(extractDeclaration(windows, 'f')).toStrictEqual(extractDeclaration(unix, 'f'));
	});

	test('[extract-source-007] finds a function that a CommonJS file assigns to exports', () => {
		const source = [
			"'use strict';",
			'exports.attr = function pug_attr(key, val) {',
			'\treturn key + val;',
			'};',
			'module.exports.merge = function (a, b) {',
			'\treturn a + b;',
			'};',
		].join('\n');
		expect(extractDeclaration(source, 'attr')).toMatchObject({
			status: 'found',
			unit: 'exports.attr = function pug_attr(key, val) {\n\treturn key + val;\n};',
		});
		expect(extractDeclaration(source, 'merge')).toMatchObject({
			status: 'found',
			unit: 'module.exports.merge = function (a, b) {\n\treturn a + b;\n};',
		});
		expect(extractDeclaration(source, 'other')).toStrictEqual({ status: 'missing' });
	});

	test('[extract-source-008] finds the names that a destructuring declaration binds', () => {
		const source = 'const { first, second: renamed, ...rest } = table;\nconst [head] = list;\n';
		for (const name of ['first', 'renamed', 'rest', 'head']) {
			expect(extractDeclaration(source, name).status, name).toBe('found');
		}
		expect(extractDeclaration(source, 'second')).toStrictEqual({ status: 'missing' });
	});

	test('[extract-source-009] takes the implementation with the overload signatures that precede it', () => {
		const source = [
			'function f(a: string): void;',
			'function f(a: number): void;',
			'function f(a: any) {',
			'\treturn a;',
			'}',
		].join('\n');
		expect(extractDeclaration(source, 'f')).toMatchObject({
			status: 'found',
			unit: source,
		});
		const changed = source.replace('return a;', 'return String(a);');
		expect(extractDeclaration(changed, 'f')).not.toStrictEqual(extractDeclaration(source, 'f'));
	});

	test('[extract-source-010] does not take an export list, an exported object or an anonymous default as a declaration', () => {
		const source = [
			'function x() {}',
			'export { x as y };',
			'module.exports = { z };',
			'export default function () {}',
		].join('\n');
		for (const name of ['y', 'z', 'default']) {
			expect(extractDeclaration(source, name), name).toStrictEqual({ status: 'missing' });
		}
		expect(extractDeclaration(source, 'x').status).toBe('found');
	});

	test('[extract-source-011] finds a function written as an arrow, an async function and a generator', () => {
		const source = [
			'export const arrow = async (a) => a;',
			'async function* generate() {}',
			'export async function load() {}',
		].join('\n');
		expect(extractDeclaration(source, 'arrow')).toMatchObject({ unit: 'export const arrow = async (a) => a;' });
		expect(extractDeclaration(source, 'generate')).toMatchObject({ unit: 'async function* generate() {}' });
		expect(extractDeclaration(source, 'load')).toMatchObject({ unit: 'export async function load() {}' });
	});

	test('[extract-source-012] joins the declarations of a type and of a value that share a name', () => {
		const source = 'type Chunk = string;\nconst Chunk = 1;\n';
		expect(extractDeclaration(source, 'Chunk')).toMatchObject({ unit: 'type Chunk = string;\nconst Chunk = 1;' });
	});

	test('[extract-source-013] keeps a comment inside a declaration, and leaves out the one above it', () => {
		const source = [
			'// above the function',
			'function f() {',
			'\t// Global opt out of hoisting',
			'\treturn 1;',
			'}',
		].join('\n');
		const section = extractDeclaration(source, 'f');
		expect(section).toMatchObject({ status: 'found' });
		expect(section.status === 'found' ? section.unit : '').toContain('// Global opt out of hoisting');
		expect(section.status === 'found' ? section.unit : '').not.toContain('above the function');
	});

	test('[extract-source-014] still locates a declaration in a file with Flow type annotations', () => {
		const source = [
			'// @flow',
			"import type {Chunk} from './types';",
			'function pushAttribute(',
			'  target: Array<Chunk>,',
			'  name: string,',
			'  value: string | boolean | number | Function | Object,',
			'): void {',
			'  target.push(name);',
			'}',
			'function after(x: ?string): void {}',
		].join('\n');
		expect(extractDeclaration(source, 'pushAttribute')).toMatchObject({ status: 'found' });
		expect(extractDeclaration(source, 'after')).toMatchObject({ status: 'found' });
	});
});
