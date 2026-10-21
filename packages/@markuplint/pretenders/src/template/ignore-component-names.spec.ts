import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { templateScanner } from './index.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'template');
const resolve = (name: string) => path.resolve(fixtureDir, name);

// The name of a component is made of the name of its file (`simple-button.vue` and `SimpleButton.vue` are
// `SimpleButton`), so what is given to ignore it is read the same way, whichever way it is written.
describe('ignoreComponentNames', () => {
	test.each(['SimpleButton', 'simpleButton', 'simple-button', 'Simple-Button'])(
		'%s ignores SimpleButton.vue',
		async name => {
			const result = await templateScanner([resolve('SimpleButton.vue')], { ignoreComponentNames: [name] });

			expect(result).toStrictEqual([]);
		},
	);

	test.each(['SimpleButtons', 'simple', 'simplebutton'])('%s does not ignore SimpleButton.vue', async name => {
		const result = await templateScanner([resolve('SimpleButton.vue')], { ignoreComponentNames: [name] });

		expect(result.map(p => p.selector)).toStrictEqual(['SimpleButton']);
	});
});
