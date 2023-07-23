import assert from 'node:assert';
import test from 'node:test';

import { MLEngine } from 'markuplint';

test('esm', async () => {
	const file = await MLEngine.toMLFile('../../fixture/002.html');

	const engine = new MLEngine(file, {
		locale: 'en',
	});
	const result = await engine.exec();

	assert.equal(result.violations.length, 6);
});
