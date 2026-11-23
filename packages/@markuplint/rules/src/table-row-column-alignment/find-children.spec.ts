import { createTestDocument } from '@markuplint/ml-core';
import { describe, expect, test } from 'vitest';

import { findChildren } from './find-children.js';

/**
 * Runs garbage collection so that a `WeakRef` whose target is no longer referenced can be observed as cleared. A
 * `WeakRef` keeps its target alive until the end of the job, so the collection is run after yielding to the
 * macrotask queue (the same as `node-store.spec.ts` of `@markuplint/ml-core`, which says why).
 */
async function forceGc(): Promise<void> {
	for (let i = 0; i < 3; i++) {
		await new Promise<void>(resolve => setImmediate(resolve));
		globalThis.gc!();
	}
}

const TABLE = '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>';

/** Searches a table in a document of its own and returns a reference that does not keep the document alive. */
function searchedTable(): WeakRef<object> {
	const document = createTestDocument(TABLE);
	const table = document.querySelector('table');
	if (!table) {
		throw new Error('Expected a table');
	}
	const [tbody] = findChildren(table, 'tbody');
	const [row] = findChildren(tbody!, 'tr');
	findChildren(row!, 'td');
	return new WeakRef(table);
}

describe('findChildren', () => {
	test('gives the children of an element that match a selector', () => {
		const document = createTestDocument(TABLE);
		const row = document.querySelector('tr');
		expect(findChildren(row!, 'td').map(cell => cell.textContent)).toStrictEqual(['a', 'b']);
		expect(findChildren(row!, 'th')).toStrictEqual([]);
	});

	test('gives the same answer to the same question', () => {
		const document = createTestDocument(TABLE);
		const row = document.querySelector('tr');
		expect(findChildren(row!, 'td')).toBe(findChildren(row!, 'td'));
	});

	test('does not keep a document alive after the document is gone', async () => {
		const table = searchedTable();
		await forceGc();
		expect(table.deref() === undefined).toBe(true);
	});
});
