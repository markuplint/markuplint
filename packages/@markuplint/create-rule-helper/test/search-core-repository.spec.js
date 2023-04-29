// @ts-nocheck

import { searchCoreRepository } from './search-core-repository';

test('searchCoreRepository', async () => {
	expect(await searchCoreRepository()).toBeTruthy();
});
