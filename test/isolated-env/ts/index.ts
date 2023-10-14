import assert from 'node:assert';
import test from 'node:test';

// eslint-disable-next-line import/no-extraneous-dependencies
import { MLEngine } from 'markuplint';

void test('ts', async () => {
	const file = await MLEngine.toMLFile('../../fixture/002.html');

	if (!file) {
		throw new Error('File not found');
	}

	const engine = new MLEngine(file, {
		locale: 'en',
	});
	const result = await engine.exec();

	assert.equal(result?.violations.length, 6);
});
