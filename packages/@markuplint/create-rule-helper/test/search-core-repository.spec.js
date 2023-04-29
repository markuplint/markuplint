const { searchCoreRepository } = require('../lib/search-core-repository');

test('searchCoreRepository', async () => {
	expect(await searchCoreRepository()).toBeTruthy();
});
