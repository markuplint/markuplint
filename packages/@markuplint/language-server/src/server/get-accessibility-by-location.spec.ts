import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { MLEngine } from 'markuplint';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { getAccessibilityByLocation } from './get-accessibility-by-location.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('getAccessibilityByLocation', () => {
	// `<body>` is 1:1–1:7 and `<button>` 1:7–1:15
	const code = '<body><button>Go</button></body>';

	test('finds the element by the rule of this version, not by the engine’s own search', async () => {
		// The engine may be an older markuplint, whose search took the end of a range in:
		// at the column where `<button>` starts it answered `<body>`.
		const engine = await MLEngine.fromCode(code, { name: 'a.html' });
		await engine.exec();
		const body = engine.document!.nodeList.find(n => n.nodeName === 'BODY')!;
		vi.spyOn(engine.document!, 'searchNodeByLocation').mockReturnValue(body);

		const result = await getAccessibilityByLocation(engine, 1, 7, ARIA_RECOMMENDED_VERSION);
		expect(result?.node).toBe('button');
	});

	test('a position in a start tag that spans lines is its element', async () => {
		const engine = await MLEngine.fromCode('<button\n type="button">Go</button>', { name: 'a.html' });
		await engine.exec();
		const result = await getAccessibilityByLocation(engine, 2, 3, ARIA_RECOMMENDED_VERSION);
		expect(result?.node).toBe('button');
	});
});
