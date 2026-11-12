import type { MLEngine } from 'markuplint';

import { describe, expect, test, vi } from 'vitest';

import { getAccessibilityByLocation } from './get-accessibility-by-location.js';

const aria = { unknown: false, exposedToTree: true, role: 'button' } as const;

describe('getAccessibilityByLocation of a markuplint that answers by position (accessibilityAt)', () => {
	test('asks the engine, whichever engine it runs', async () => {
		const accessibilityAt = vi.fn(() => ({ node: 'button', aria }));
		const engine = { linted: true, exec: vi.fn(), accessibilityAt } as unknown as MLEngine;

		const found = await getAccessibilityByLocation(engine, 2, 53, '1.3');

		expect(found).toStrictEqual({ node: 'button', aria });
		expect(accessibilityAt).toHaveBeenCalledWith(2, 53, '1.3');
	});

	test('lints first when nothing was linted, as it did', async () => {
		const exec = vi.fn(() => Promise.resolve());
		const engine = { linted: false, exec, accessibilityAt: () => null } as unknown as MLEngine;

		await getAccessibilityByLocation(engine, 1, 1, '1.3');

		expect(exec).toHaveBeenCalledTimes(1);
	});

	test('does not lint again when it was linted', async () => {
		const exec = vi.fn();
		const engine = { linted: true, exec, accessibilityAt: () => null } as unknown as MLEngine;

		await getAccessibilityByLocation(engine, 1, 1, '1.3');

		expect(exec).not.toHaveBeenCalled();
	});

	test('is null where there is no element', async () => {
		const engine = { linted: true, exec: vi.fn(), accessibilityAt: () => null } as unknown as MLEngine;

		expect(await getAccessibilityByLocation(engine, 1, 1, '1.3')).toBeNull();
	});
});

describe('getAccessibilityByLocation of a markuplint 5, which has only the document', () => {
	const element = (localName: string) => ({
		ELEMENT_NODE: 1,
		localName,
		is: (type: number) => type === 1,
	});

	test('reads the document of the engine', async () => {
		const node = element('button');
		const document = {
			searchNodeByLocation: vi.fn(() => node),
			getAccessibilityProp: vi.fn(() => aria),
		};
		const engine = { document, exec: vi.fn() } as unknown as MLEngine;

		const found = await getAccessibilityByLocation(engine, 2, 53, '1.2');

		expect(found).toStrictEqual({ node: 'button', aria });
		expect(document.searchNodeByLocation).toHaveBeenCalledWith(2, 53);
		expect(document.getAccessibilityProp).toHaveBeenCalledWith(node, '1.2');
	});

	test('lints first when there is no document', async () => {
		const exec = vi.fn(() => Promise.resolve());
		const engine = { document: null, exec } as unknown as MLEngine;

		expect(await getAccessibilityByLocation(engine, 1, 1, '1.3')).toBeNull();
		expect(exec).toHaveBeenCalledTimes(1);
	});
});
