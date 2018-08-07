import * as markuplint from './ml-engine';

describe('basic test', async () => {
	it('is empty result of 001.html', async () => {
		const r = await markuplint.verify({
			files: 'test/fixture/001.html',
		});
		expect(r.length).toBe(0);
	});

	it('is reported from 003.html', async () => {
		const r = await markuplint.verify({
			files: 'test/fixture/003.html',
		});
		expect(r).toEqual([
			{
				severity: 'warning',
				message: 'Required async attribute',
				line: 12,
				col: 2,
				raw: '<script src="/path/to/js/lib/jquery.min.js">',
				ruleId: 'async-attr-in-script',
			},
		]);
	});
});
