import { describe, test, expect } from 'vitest';

import ts from 'typescript';

import { getExportTable, getReExportSources } from './export-table.js';

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

	describe('type-only exports carry no component and are not recorded', () => {
		test('export type { X } from', () => {
			const table = getExportTable(sourceFile("export type { Props } from './a';"));
			expect(table.byName.has('Props')).toBe(false);
		});

		test('export { type X } from, next to a value specifier', () => {
			const table = getExportTable(sourceFile("export { type Props, Item } from './a';"));
			expect(table.byName.has('Props')).toBe(false);
			expect(table.byName.get('Item')).toStrictEqual({ kind: 're-export', source: './a', importedName: 'Item' });
		});

		test('export type * from', () => {
			const table = getExportTable(sourceFile("export type * from './a';"));
			expect(table.starReExportSources).toStrictEqual([]);
		});

		test('export type * as ns from', () => {
			const table = getExportTable(sourceFile("export type * as NS from './a';"));
			expect(table.byName.has('NS')).toBe(false);
		});

		test('export type { X } of a local binding', () => {
			const table = getExportTable(sourceFile('type Props = {};\nexport type { Props };'));
			expect(table.byName.has('Props')).toBe(false);
		});
	});
});

describe('getReExportSources', () => {
	const sources = (code: string) => getReExportSources(getExportTable(sourceFile(code)));

	test('named re-export', () => {
		expect(sources("export { Link, IconButton } from './Base';")).toStrictEqual(['./Base', './Base']);
	});

	test('aliased and default re-exports', () => {
		expect(
			sources("export { default as Button } from './Button';\nexport { Item as ListItem } from './Item';"),
		).toStrictEqual(['./Button', './Item']);
	});

	test('star re-export', () => {
		expect(sources("export * from './a';")).toStrictEqual(['./a']);
	});

	test('namespace re-export', () => {
		expect(sources("export * as NS from './a';")).toStrictEqual(['./a']);
	});

	test('type-only re-exports are skipped', () => {
		expect(
			sources("export type { Props } from './a';\nexport type * from './b';\nexport { type Props2 } from './c';"),
		).toStrictEqual([]);
	});

	test('local exports and imports contribute nothing', () => {
		expect(
			sources(
				"import { A } from './a';\nconst B = () => <b />;\nexport { A, B };\nexport const C = () => <i />;",
			),
		).toStrictEqual([]);
	});
});
