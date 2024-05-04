import assert from 'node:assert';
import test from 'node:test';

// eslint-disable-next-line import/no-extraneous-dependencies
import { MLEngine } from 'markuplint';

test('esm', async () => {
	const file = await MLEngine.toMLFile('../../fixture/002.html');

	const engine = new MLEngine(file, {
		locale: 'en',
	});
	const result = await engine.exec();

	assert.equal(result.violations.length, 6);
});

test('CommonJS Config', async () => {
	const file = await MLEngine.toMLFile('../../fixture/002.html');

	const engine = new MLEngine(file, {
		locale: 'en',
		config: await import('./config.cjs'),
	});
	const result = await engine.exec();

	assert.equal(result.violations.length, 6);
});

test('ESM Config', async () => {
	const file = await MLEngine.toMLFile('../../fixture/002.html');

	const engine = new MLEngine(file, {
		locale: 'en',
		config: await import('./config.mjs'),
	});
	const result = await engine.exec();

	assert.equal(result.violations.length, 6);
});
