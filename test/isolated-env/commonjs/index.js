const test = require('node:test');
const assert = require('node:assert');

const { MLEngine } = require('markuplint');

test('commonjs', async () => {
	const file = await MLEngine.toMLFile('../../fixture/002.html');

	const engine = new MLEngine(file, {
		locale: 'en',
	});
	const result = await engine.exec();

	assert.equal(result.violations.length, 6);
});
