import { describe, test, expect } from 'vitest';

import ts from 'typescript';

import { getExportTable } from './export-table.js';

function sourceFile(code: string) {
	return ts.createSourceFile('test.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

describe('getExportTable', () => {
	test('default export of a named function declaration', () => {
		const table = getExportTable(sourceFile('export default function Item() { return null; }'));
		expect(table.byName.get('default')).toStrictEqual({ kind: 'local', localName: 'Item' });
	});

	test('default export of a previously declared identifier', () => {
		const table = getExportTable(sourceFile('const Item = () => null;\nexport default Item;'));
		expect(table.byName.get('default')).toStrictEqual({ kind: 'local', localName: 'Item' });
	});

	test('named export via export keyword on a variable declaration', () => {
		const table = getExportTable(sourceFile('export const Item = styled.button``;'));
		expect(table.byName.get('Item')).toStrictEqual({ kind: 'local', localName: 'Item' });
	});

	test('named export via export keyword on a function declaration', () => {
		const table = getExportTable(sourceFile('export function Item() { return null; }'));
		expect(table.byName.get('Item')).toStrictEqual({ kind: 'local', localName: 'Item' });
	});

	test('local re-export with alias: export { Item as ListItem }', () => {
		const table = getExportTable(sourceFile('const Item = () => null;\nexport { Item as ListItem };'));
		expect(table.byName.get('ListItem')).toStrictEqual({ kind: 'local', localName: 'Item' });
		expect(table.byName.has('Item')).toBe(false);
	});

	test('local re-export without alias: export { Item }', () => {
		const table = getExportTable(sourceFile('const Item = () => null;\nexport { Item };'));
		expect(table.byName.get('Item')).toStrictEqual({ kind: 'local', localName: 'Item' });
	});

	test('re-export from another module: export { Item } from "./a"', () => {
		const table = getExportTable(sourceFile('export { Item } from "./a";'));
		expect(table.byName.get('Item')).toStrictEqual({ kind: 're-export', source: './a', importedName: 'Item' });
	});

	test('re-export of a default export with alias: export { default as Item } from "./a"', () => {
		const table = getExportTable(sourceFile('export { default as Item } from "./a";'));
		expect(table.byName.get('Item')).toStrictEqual({ kind: 're-export', source: './a', importedName: 'default' });
	});

	test('star re-export: export * from "./a"', () => {
		const table = getExportTable(sourceFile('export * from "./a";'));
		expect(table.starReExportSources).toStrictEqual(['./a']);
	});

	test('namespace re-export: export * as ns from "./a" is recorded under its name', () => {
		const table = getExportTable(sourceFile('export * as ns from "./a";'));
		expect(table.byName.get('ns')).toStrictEqual({ kind: 're-export', source: './a', importedName: '*' });
	});

	test('multiple exports coexist in the same table', () => {
		const table = getExportTable(
			sourceFile('export const A = () => null;\nexport const B = () => null;\nexport default A;'),
		);
		expect(table.byName.get('A')).toStrictEqual({ kind: 'local', localName: 'A' });
		expect(table.byName.get('B')).toStrictEqual({ kind: 'local', localName: 'B' });
		expect(table.byName.get('default')).toStrictEqual({ kind: 'local', localName: 'A' });
	});
});
