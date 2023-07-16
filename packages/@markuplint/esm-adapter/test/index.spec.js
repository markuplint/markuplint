const { MLEngine, getVersion } = require('../cjs/index.cjs');

const path = require('node:path');

describe('test', () => {
	it('MLEngine.exec()', async () => {
		const engine = await MLEngine.fromCode('<span><div></div></span>', {
			name: 'test.html',
			dirname: __dirname,
		});
		expect((await engine.exec())[0].violations).toEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 7,
				message: 'the "div" element is not allowed in the "span" element in this context',
				raw: '<div>',
			},
		]);
		engine.dispose();
	});

	it('getVersion()', async () => {
		const version = await getVersion();
		expect(version).toMatch(/^\d+\.\d+\.\d+(?:-.+)$/);
	});
});
