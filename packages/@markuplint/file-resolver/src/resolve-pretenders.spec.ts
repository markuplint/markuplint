import path from 'node:path';

import { test, expect } from 'vitest';

import { resolvePretenders } from './resolve-pretenders.js';

test('files', async () => {
	const pretenders = await resolvePretenders({
		files: [path.resolve(import.meta.dirname, '..', '..', '..', '@markuplint-test', 'react', 'pretenders.json')],
	});
	expect(pretenders).toStrictEqual([
		{
			selector: 'Sample',
			as: 'div',
			filePath: 'sample.jsx:1:16',
		},
	]);
});

test('imports', async () => {
	const pretenders = await resolvePretenders({
		imports: ['@markuplint-test/react'],
	});
	expect(pretenders).toStrictEqual([
		{
			selector: 'Sample',
			as: 'div',
			filePath: 'sample.jsx:1:16',
		},
	]);
});
