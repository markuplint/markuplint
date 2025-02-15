import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from 'vitest';

import { resolvePretenders } from './resolve-pretenders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('files', async () => {
	const pretenders = await resolvePretenders({
		files: [path.resolve(__dirname, '..', '..', '..', '@markuplint-test', 'react', 'pretenders.json')],
	});
	expect(pretenders).toStrictEqual([
		{
			selector: 'Sample',
			as: 'div',
			filePath: 'sample.jsx:1:16',
		},
	]);
});

// Skip #2423
// test('imports', async () => {
// 	const pretenders = await resolvePretenders({
// 		imports: ['@markuplint-test/react'],
// 	});
// 	expect(pretenders).toStrictEqual([
// 		{
// 			selector: 'Sample',
// 			as: 'div',
// 			filePath: 'sample.jsx:1:16',
// 		},
// 	]);
// });
