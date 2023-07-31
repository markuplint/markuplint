import { test, expect } from 'vitest';

import { searchCoreRepository } from './search-core-repository.js';

test('searchCoreRepository', async () => {
	expect(await searchCoreRepository()).toBeTruthy();
});
