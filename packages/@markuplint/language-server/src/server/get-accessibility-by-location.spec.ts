import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { MLEngine } from 'markuplint';
import { afterEach, describe, expect, test, vi } from 'vitest';

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
		const node = { ...element('button'), startLine: 2, startCol: 53 };
		const document = {
			nodeList: [node],
			searchNodeByLocation: vi.fn(() => node),
			getAccessibilityProp: vi.fn(() => aria),
		};
		const engine = { document, exec: vi.fn() } as unknown as MLEngine;

		const found = await getAccessibilityByLocation(engine, 2, 53, '1.2');

		expect(found).toStrictEqual({ node: 'button', aria });
		expect(document.searchNodeByLocation).not.toHaveBeenCalled();
		expect(document.getAccessibilityProp).toHaveBeenCalledWith(node, '1.2');
	});

	test('lints first when there is no document', async () => {
		const exec = vi.fn(() => Promise.resolve());
		const engine = { document: null, exec } as unknown as MLEngine;

		expect(await getAccessibilityByLocation(engine, 1, 1, '1.3')).toBeNull();
		expect(exec).toHaveBeenCalledTimes(1);
	});
});

describe('getAccessibilityByLocation finds the element by the rule of this version', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// The engine of an older markuplint has the document only, and no `accessibilityAt`.
	const olderEngine = (engine: MLEngine) => ({ document: engine.document, exec: vi.fn() }) as unknown as MLEngine;

	// `<body>` is 1:1–1:7 and `<button>` 1:7–1:15
	const code = '<body><button>Go</button></body>';

	test('finds the element by the rule of this version, not by the engine’s own search', async () => {
		// The engine may be an older markuplint, whose search took the end of a range in:
		// at the column where `<button>` starts it answered `<body>`.
		const engine = await MLEngine.fromCode(code, { name: 'a.html' });
		await engine.exec();
		const body = engine.document!.nodeList.find(n => n.nodeName === 'BODY')!;
		vi.spyOn(engine.document!, 'searchNodeByLocation').mockReturnValue(body);

		const result = await getAccessibilityByLocation(olderEngine(engine), 1, 7, ARIA_RECOMMENDED_VERSION);
		expect(result?.node).toBe('button');
	});

	test.each([
		['an engine that answers by position', (engine: MLEngine) => engine],
		['an older engine that has the document only', olderEngine],
	])('a position in a start tag that spans lines is its element: %s', async (_, wrap) => {
		const engine = await MLEngine.fromCode('<button\n type="button">Go</button>', { name: 'a.html' });
		await engine.exec();
		const result = await getAccessibilityByLocation(wrap(engine), 2, 3, ARIA_RECOMMENDED_VERSION);
		expect(result?.node).toBe('button');
	});
});
