import { test, expect } from 'vitest';

import { generalImport } from './general-import.js';

test('imports a JSON subpath from a package whose exports map does not include it', async () => {
	// @markuplint-test/react has "exports": { ".": "./index.js" } — no ./pretenders.json entry.
	// generalImport should resolve the absolute path via package subpath pre-resolution.
	const result = await generalImport<{ data: unknown[] }>('@markuplint-test/react/pretenders.json');
	expect(result).not.toBeNull();
	expect(result!.data).toStrictEqual([
		{
			selector: 'Sample',
			as: 'div',
			filePath: 'sample.jsx:1:16',
		},
	]);
});

test('returns null for a non-existent subpath in a package with exports map', async () => {
	const result = await generalImport('@markuplint-test/react/does-not-exist.json');
	expect(result).toBeNull();
});

test('imports a JSON subpath from a scoped package without exports map', async () => {
	// @markuplint-test/react-pkg-pretenders has no "exports" field,
	// so direct import of package.json should work normally.
	const result = await generalImport<{ name: string }>('@markuplint-test/react-pkg-pretenders/package.json');
	expect(result).not.toBeNull();
	expect(result!.name).toBe('@markuplint-test/react-pkg-pretenders');
});
